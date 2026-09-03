import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const gtfsDir = process.env.GTFS_DIR;

if (!gtfsDir) {
  console.error("GTFS_DIR=/path/to/extracted/gtfs npm run import:gtfs");
  process.exit(1);
}

const requiredFiles = [
  "stops.txt",
  "routes.txt",
  "trips.txt",
  "stop_times.txt",
  "calendar.txt",
  "calendar_dates.txt",
  "feed_info.txt"
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        value += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  const [headers = [], ...body] = rows.filter((line) => line.some((cell) => cell !== ""));
  return body.map((line) => Object.fromEntries(headers.map((header, index) => [header, line[index] ?? ""])));
}

async function readGtfsFile(name, optional = false) {
  try {
    return parseCsv(await readFile(join(gtfsDir, name), "utf8"));
  } catch (error) {
    if (optional) return [];
    throw new Error(`${name} が読めません: ${error.message}`);
  }
}

function sortStopTimes(a, b) {
  return Number(a.stop_sequence) - Number(b.stop_sequence);
}

function uniqPush(map, key, value) {
  if (!map[key]) map[key] = [];
  if (!map[key].includes(value)) map[key].push(value);
}

for (const file of requiredFiles) {
  await readGtfsFile(file);
}

const [stopsRaw, routesRaw, tripsRaw, stopTimesRaw, calendarRaw, calendarDatesRaw, feedInfoRaw] = await Promise.all([
  readGtfsFile("stops.txt"),
  readGtfsFile("routes.txt"),
  readGtfsFile("trips.txt"),
  readGtfsFile("stop_times.txt"),
  readGtfsFile("calendar.txt"),
  readGtfsFile("calendar_dates.txt"),
  readGtfsFile("feed_info.txt")
]);

const stops = stopsRaw
  .filter((stop) => stop.stop_id && stop.stop_name && stop.stop_lat && stop.stop_lon)
  .map((stop) => ({
    id: stop.stop_id,
    code: stop.stop_code || "",
    name: stop.stop_name,
    lat: Number(stop.stop_lat),
    lon: Number(stop.stop_lon),
    platform: stop.platform_code || ""
  }));

const routes = Object.fromEntries(routesRaw.map((route) => [
  route.route_id,
  {
    id: route.route_id,
    shortName: route.route_short_name || "",
    longName: route.route_long_name || "",
    color: route.route_color || "",
    textColor: route.route_text_color || ""
  }
]));

const trips = Object.fromEntries(tripsRaw.map((trip) => [
  trip.trip_id,
  {
    id: trip.trip_id,
    routeId: trip.route_id,
    serviceId: trip.service_id,
    headsign: trip.trip_headsign || "",
    directionId: trip.direction_id || ""
  }
]));

const stopTimesByTrip = {};
for (const row of stopTimesRaw) {
  if (!row.trip_id || !row.stop_id) continue;
  if (!stopTimesByTrip[row.trip_id]) stopTimesByTrip[row.trip_id] = [];
  stopTimesByTrip[row.trip_id].push({
    stopId: row.stop_id,
    arrival: row.arrival_time,
    departure: row.departure_time || row.arrival_time,
    sequence: Number(row.stop_sequence),
    headsign: row.stop_headsign || ""
  });
}

for (const tripId of Object.keys(stopTimesByTrip)) {
  stopTimesByTrip[tripId].sort(sortStopTimes);
}

const calendar = Object.fromEntries(calendarRaw.map((service) => [
  service.service_id,
  {
    monday: service.monday === "1",
    tuesday: service.tuesday === "1",
    wednesday: service.wednesday === "1",
    thursday: service.thursday === "1",
    friday: service.friday === "1",
    saturday: service.saturday === "1",
    sunday: service.sunday === "1",
    startDate: service.start_date,
    endDate: service.end_date
  }
]));

const calendarDates = {};
for (const item of calendarDatesRaw) {
  if (!item.service_id || !item.date) continue;
  if (!calendarDates[item.date]) calendarDates[item.date] = {};
  calendarDates[item.date][item.service_id] = Number(item.exception_type);
}

const directDestinations = {};
for (const [tripId, times] of Object.entries(stopTimesByTrip)) {
  if (!trips[tripId]) continue;
  for (let i = 0; i < times.length; i += 1) {
    const origin = times[i].stopId;
    for (let j = i + 1; j < times.length; j += 1) {
      uniqPush(directDestinations, origin, times[j].stopId);
    }
  }
}

const index = {
  generatedAt: new Date().toISOString(),
  feed: feedInfoRaw[0] || null,
  stops,
  routes,
  trips,
  stopTimesByTrip,
  calendar,
  calendarDates,
  directDestinations
};

await writeFile(
  join(process.cwd(), "public", "data", "gtfs-index.json"),
  `${JSON.stringify(index)}\n`,
  "utf8"
);

console.log(`Imported ${stops.length} stops, ${Object.keys(routes).length} routes, ${Object.keys(trips).length} trips.`);
