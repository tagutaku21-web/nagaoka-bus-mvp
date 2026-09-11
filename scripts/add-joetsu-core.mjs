import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/data/feeds/joetsu.json", import.meta.url);
const data = JSON.parse(await readFile(file, "utf8"));
const sourceFeed = "kubiki-core";
const serviceWeekday = `${sourceFeed}:weekday`;
const serviceWeekend = `${sourceFeed}:weekend`;

const stops = [
  ["joetsu-myoko", "上越妙高駅前", 37.081566, 138.248653],
  ["takada", "高田駅前案内所", 37.115073, 138.242528],
  ["honcho4", "本町四丁目", 37.113548, 138.243478],
  ["joetsu-city-office", "上越市役所入口", 37.147078, 138.23616],
  ["marukei-bus-center", "マルケーバスセンター", 37.169129, 138.239259],
  ["naoetsu-sc", "直江津ショッピングセンター前", 37.171909, 138.236636],
  ["naoetsu", "直江津駅前", 37.170294, 138.242262],
  ["saijo-hospital", "西城病院前", 37.11389, 138.249403],
  ["takada-park", "高田城址公園", 37.109382, 138.255276],
  ["nursing-university", "看護大学", 37.103936, 138.262766],
  ["central-hospital", "中央病院", 37.103383, 138.26586]
].map(([id, name, lat, lon]) => ({
  id: `${sourceFeed}:${id}`,
  code: "",
  name,
  description: "頸城自動車公式時刻表をもとにした主要停留所補完",
  lat,
  lon,
  platform: "",
  sourceFeed
}));

const routes = {
  [`${sourceFeed}:joetsu-odori-1`]: {
    id: `${sourceFeed}:joetsu-odori-1`,
    shortName: "1",
    longName: "上越大通り線（上越妙高駅前・高田駅前・直江津駅前）",
    color: "1D4ED8",
    textColor: "FFFFFF",
    sourceFeed
  },
  [`${sourceFeed}:joetsu-odori-2`]: {
    id: `${sourceFeed}:joetsu-odori-2`,
    shortName: "2",
    longName: "上越大通り線（直江津駅前・西城病院前・中央病院）",
    color: "0F766E",
    textColor: "FFFFFF",
    sourceFeed
  }
};

const stop = (id) => `${sourceFeed}:${id}`;

const weekdayTrips = [
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "06:45"], ["honcho4", "06:56"], ["takada", "07:00"],
      ["joetsu-city-office", "07:13"], ["marukei-bus-center", "07:17"],
      ["naoetsu-sc", "07:19"], ["naoetsu", "07:23"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "08:45"], ["honcho4", "08:56"], ["takada", "09:00"],
      ["joetsu-city-office", "09:16"], ["marukei-bus-center", "09:20"],
      ["naoetsu-sc", "09:22"], ["naoetsu", "09:26"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "10:45"], ["honcho4", "10:56"], ["takada", "11:00"],
      ["joetsu-city-office", "11:16"], ["marukei-bus-center", "11:20"],
      ["naoetsu-sc", "11:22"], ["naoetsu", "11:26"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "12:15"], ["honcho4", "12:26"], ["takada", "12:30"],
      ["joetsu-city-office", "12:52"], ["marukei-bus-center", "12:56"],
      ["naoetsu-sc", "12:58"], ["naoetsu", "13:02"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "17:25"], ["honcho4", "17:36"], ["takada", "17:40"],
      ["joetsu-city-office", "17:57"], ["marukei-bus-center", "18:01"],
      ["naoetsu-sc", "18:03"], ["naoetsu", "18:07"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-2`,
    directionId: "0",
    headsign: "中央病院",
    stops: [
      ["naoetsu", "08:55"], ["joetsu-city-office", "09:06"], ["saijo-hospital", "09:18"],
      ["takada-park", "09:20"], ["nursing-university", "09:24"], ["central-hospital", "09:26"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-2`,
    directionId: "1",
    headsign: "直江津駅前",
    stops: [
      ["central-hospital", "08:40"], ["nursing-university", "08:41"], ["takada-park", "08:45"],
      ["saijo-hospital", "08:47"], ["joetsu-city-office", "09:00"], ["naoetsu", "09:11"]
    ]
  }
];

const weekendTrips = [
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "08:05"], ["honcho4", "08:16"], ["takada", "08:20"],
      ["joetsu-city-office", "08:34"], ["marukei-bus-center", "08:38"],
      ["naoetsu-sc", "08:40"], ["naoetsu", "08:44"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "10:06"], ["honcho4", "10:17"], ["takada", "10:21"],
      ["joetsu-city-office", "10:35"], ["marukei-bus-center", "10:39"],
      ["naoetsu-sc", "10:41"], ["naoetsu", "10:45"]
    ]
  },
  {
    routeId: `${sourceFeed}:joetsu-odori-1`,
    directionId: "0",
    headsign: "直江津駅前",
    stops: [
      ["joetsu-myoko", "16:15"], ["honcho4", "16:26"], ["takada", "16:30"],
      ["joetsu-city-office", "16:44"], ["marukei-bus-center", "16:48"],
      ["naoetsu-sc", "16:50"], ["naoetsu", "16:54"]
    ]
  }
];

function parseMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
}

function addTrip(trip, serviceId, index) {
  const tripId = `${sourceFeed}:${serviceId.split(":").at(-1)}:${index}`;
  data.trips[tripId] = {
    id: tripId,
    routeId: trip.routeId,
    serviceId,
    headsign: trip.headsign,
    directionId: trip.directionId,
    sourceFeed
  };
  data.stopTimesByTrip[tripId] = trip.stops
    .map(([stopId, time], sequence) => ({
      stopId: stop(stopId),
      arrival: formatTime(parseMinutes(time)),
      departure: formatTime(parseMinutes(time)),
      sequence: sequence + 1,
      headsign: trip.headsign
    }))
    .filter((time) => time.arrival !== "NaN:NaN:00");
}

function addDirectDestination(origin, destination) {
  if (!data.directDestinations[origin]) data.directDestinations[origin] = [];
  if (!data.directDestinations[origin].includes(destination)) data.directDestinations[origin].push(destination);
}

data.stops = data.stops.filter((item) => item.sourceFeed !== sourceFeed);
data.stops.push(...stops);
for (const [routeId, route] of Object.entries(routes)) data.routes[routeId] = route;
for (const tripId of Object.keys(data.trips)) {
  if (tripId.startsWith(`${sourceFeed}:`)) {
    delete data.trips[tripId];
    delete data.stopTimesByTrip[tripId];
  }
}
for (const stopId of Object.keys(data.directDestinations)) {
  if (stopId.startsWith(`${sourceFeed}:`)) delete data.directDestinations[stopId];
}

data.calendar[serviceWeekday] = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  startDate: "20260330",
  endDate: "20270331"
};
data.calendar[serviceWeekend] = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: true,
  sunday: true,
  startDate: "20260330",
  endDate: "20270331"
};

weekdayTrips.forEach((trip, index) => addTrip(trip, serviceWeekday, index + 1));
weekendTrips.forEach((trip, index) => addTrip(trip, serviceWeekend, index + 1));

for (const times of Object.values(data.stopTimesByTrip)) {
  for (let i = 0; i < times.length; i += 1) {
    for (let j = i + 1; j < times.length; j += 1) {
      addDirectDestination(times[i].stopId, times[j].stopId);
    }
  }
}

data.generatedAt = new Date().toISOString();
data.feed = {
  ...data.feed,
  feed_publisher_name: `${data.feed?.feed_publisher_name || "上越市"} / 頸城自動車（主要停留所補完）`,
  feed_version: `${data.feed?.feed_version || ""} + kubiki-core-20260330`.trim()
};

await writeFile(file, `${JSON.stringify(data)}\n`, "utf8");
console.log(`Added ${stops.length} Kubiki core stops and ${weekdayTrips.length + weekendTrips.length} trips.`);
