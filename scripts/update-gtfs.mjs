import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";

const feeds = [
  {
    id: "nagaoka",
    url: process.env.NAGAOKA_GTFS_URL || "https://bus-vision.jp/gtfs_v2/nagaoka/gtfsFeed"
  },
  {
    id: "tsubame",
    url: process.env.TSUBAME_GTFS_URL || "https://api.gtfs-data.jp/v2/organizations/tsubamecity/feeds/tsubame_bus/files/feed.zip?rid=current"
  },
  {
    id: "murakami",
    url: process.env.MURAKAMI_GTFS_URL || "https://api.gtfs-data.jp/v2/organizations/murakamicity/feeds/murakamisicommunitybus/files/feed.zip?rid=current"
  },
  {
    id: "kamo",
    url: process.env.KAMO_GTFS_URL || "https://api.gtfs-data.jp/v2/organizations/kamocity/feeds/kamonbus/files/feed.zip?rid=current"
  },
  {
    id: "joetsu",
    url: process.env.JOETSU_GTFS_URL || "https://api.gtfs-data.jp/v2/organizations/joetsucity/feeds/joetsu/files/feed.zip?rid=current"
  },
  {
    id: "itoigawa",
    url: process.env.ITOIGAWA_GTFS_URL || "https://api.gtfs-data.jp/v2/organizations/itoigawabus/feeds/itoigawabus/files/feed.zip?rid=current"
  },
  {
    id: "niigata",
    files: [
      {
        id: "ward",
        url: process.env.NIIGATA_WARD_GTFS_URL || "https://www.city.niigata.lg.jp/shisei/seisaku/it/open-data/opendata-kankou/od-busgtfsjp.files/20260401_bus-kubusniigatacity-niigata-jp.zip"
      },
      {
        id: "residents",
        url: process.env.NIIGATA_RESIDENTS_GTFS_URL || "https://www.city.niigata.lg.jp/shisei/seisaku/it/open-data/opendata-kankou/od-busgtfsjp.files/20260401_bus-niigatacity-niigata-jp.zip"
      }
    ]
  }
];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

function prefixIndex(index, prefix) {
  const stopId = (id) => `${prefix}:${id}`;
  const routeId = (id) => `${prefix}:${id}`;
  const tripId = (id) => `${prefix}:${id}`;
  const serviceId = (id) => `${prefix}:${id}`;

  return {
    feed: index.feed,
    stops: index.stops.map((stop) => ({ ...stop, id: stopId(stop.id), sourceFeed: prefix })),
    routes: Object.fromEntries(Object.entries(index.routes).map(([id, route]) => [
      routeId(id),
      { ...route, id: routeId(route.id), sourceFeed: prefix }
    ])),
    trips: Object.fromEntries(Object.entries(index.trips).map(([id, trip]) => [
      tripId(id),
      { ...trip, id: tripId(trip.id), routeId: routeId(trip.routeId), serviceId: serviceId(trip.serviceId), sourceFeed: prefix }
    ])),
    stopTimesByTrip: Object.fromEntries(Object.entries(index.stopTimesByTrip).map(([id, times]) => [
      tripId(id),
      times.map((time) => ({ ...time, stopId: stopId(time.stopId) }))
    ])),
    calendar: Object.fromEntries(Object.entries(index.calendar).map(([id, service]) => [
      serviceId(id),
      service
    ])),
    calendarDates: Object.fromEntries(Object.entries(index.calendarDates).map(([date, services]) => [
      date,
      Object.fromEntries(Object.entries(services).map(([id, type]) => [serviceId(id), type]))
    ])),
    directDestinations: Object.fromEntries(Object.entries(index.directDestinations).map(([id, destinations]) => [
      stopId(id),
      destinations.map(stopId)
    ]))
  };
}

function mergeIndexes(parts) {
  const startDates = parts.map((part) => part.feed?.feed_start_date).filter(Boolean);
  const endDates = parts.map((part) => part.feed?.feed_end_date).filter(Boolean);
  const generatedAt = new Date().toISOString();
  const merged = {
    generatedAt,
    feed: {
      feed_publisher_name: "新潟市",
      feed_publisher_url: "https://www.city.niigata.lg.jp/",
      feed_lang: "ja",
      feed_start_date: startDates.sort()[0] || "",
      feed_end_date: endDates.sort().at(-1) || "",
      feed_version: parts.map((part) => part.feed?.feed_version).filter(Boolean).join(" / ")
    },
    stops: [],
    routes: {},
    trips: {},
    stopTimesByTrip: {},
    calendar: {},
    calendarDates: {},
    directDestinations: {}
  };

  for (const part of parts) {
    merged.stops.push(...part.stops);
    Object.assign(merged.routes, part.routes);
    Object.assign(merged.trips, part.trips);
    Object.assign(merged.stopTimesByTrip, part.stopTimesByTrip);
    Object.assign(merged.calendar, part.calendar);
    Object.assign(merged.directDestinations, part.directDestinations);
    for (const [date, services] of Object.entries(part.calendarDates)) {
      if (!merged.calendarDates[date]) merged.calendarDates[date] = {};
      Object.assign(merged.calendarDates[date], services);
    }
  }

  return merged;
}

async function importGtfs(source, outputId) {
  const rawZip = join(process.cwd(), "data", "raw", `${outputId}-gtfs.zip`);
  const gtfsDir = join(process.cwd(), "data", "gtfs", outputId);
  const outFile = join(process.cwd(), "data", "build", `${outputId}.json`);

  await mkdir(dirname(rawZip), { recursive: true });
  await mkdir(dirname(outFile), { recursive: true });
  await rm(gtfsDir, { recursive: true, force: true });
  await mkdir(gtfsDir, { recursive: true });

  const response = await fetch(source.url);
  if (!response.ok || !response.body) {
    throw new Error(`${outputId} のGTFSを取得できません: ${response.status} ${response.statusText}`);
  }

  await pipeline(response.body, createWriteStream(rawZip));
  await run("unzip", ["-oq", rawZip, "-d", gtfsDir]);
  await run(process.execPath, ["scripts/import-gtfs.mjs"], {
    env: { ...process.env, GTFS_DIR: gtfsDir, GTFS_OUTFILE: outFile }
  });
  return JSON.parse(await readFile(outFile, "utf8"));
}

for (const feed of feeds) {
  const outFile = join(process.cwd(), "public", "data", "feeds", `${feed.id}.json`);
  await mkdir(dirname(outFile), { recursive: true });

  if (!feed.files) {
    await importGtfs(feed, feed.id);
    const built = join(process.cwd(), "data", "build", `${feed.id}.json`);
    await writeFile(outFile, await readFile(built, "utf8"), "utf8");
    continue;
  }

  const parts = [];
  for (const file of feed.files) {
    const index = await importGtfs(file, `${feed.id}-${file.id}`);
    parts.push(prefixIndex(index, `${feed.id}-${file.id}`));
  }
  await writeFile(outFile, `${JSON.stringify(mergeIndexes(parts))}\n`, "utf8");
  console.log(`Merged ${feed.id}: ${parts.reduce((sum, part) => sum + part.stops.length, 0)} stops.`);
}
