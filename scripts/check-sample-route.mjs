import { readFile } from "node:fs/promises";

const index = JSON.parse(await readFile(new URL("../public/data/gtfs-index.json", import.meta.url), "utf8"));
const originName = "長岡駅前";
const destinationName = "日赤病院前";
const dateKey = "20260903";
const dayName = "thursday";
const nowMinutes = 9 * 60;

function parseGtfsTime(time) {
  const [hours = "0", minutes = "0", seconds = "0"] = String(time).split(":").map(Number);
  return hours * 60 + minutes + Math.floor(seconds / 60);
}

function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function idsByStopName(name) {
  return index.stops.filter((stop) => stop.name === name).map((stop) => stop.id);
}

function activeServiceIds() {
  const active = new Set();

  for (const [serviceId, service] of Object.entries(index.calendar)) {
    if (dateKey >= service.startDate && dateKey <= service.endDate && service[dayName]) {
      active.add(serviceId);
    }
  }

  for (const [serviceId, type] of Object.entries(index.calendarDates[dateKey] || {})) {
    if (type === 1) active.add(serviceId);
    if (type === 2) active.delete(serviceId);
  }

  return active;
}

const originIds = new Set(idsByStopName(originName));
const destinationIds = new Set(idsByStopName(destinationName));
const services = activeServiceIds();
const departures = [];

for (const [tripId, times] of Object.entries(index.stopTimesByTrip)) {
  const trip = index.trips[tripId];
  if (!trip || !services.has(trip.serviceId)) continue;

  const originIndex = times.findIndex((time) => originIds.has(time.stopId));
  if (originIndex < 0) continue;

  const destinationIndex = times.findIndex((time, index) => index > originIndex && destinationIds.has(time.stopId));
  if (destinationIndex < 0) continue;

  const departure = parseGtfsTime(times[originIndex].departure);
  if (departure < nowMinutes) continue;

  const arrival = parseGtfsTime(times[destinationIndex].arrival);
  const route = index.routes[trip.routeId] || {};
  departures.push({
    departure,
    arrival,
    originId: times[originIndex].stopId,
    destinationId: times[destinationIndex].stopId,
    routeName: route.longName || route.shortName || trip.routeId
  });
}

departures.sort((a, b) => a.departure - b.departure);

if (!departures.length) {
  console.error(`${originName} -> ${destinationName} の直通便を見つけられませんでした。`);
  process.exit(1);
}

const next = departures[0];
console.log(`${originName} -> ${destinationName}`);
console.log(`基準: ${dateKey} ${formatTime(nowMinutes)}`);
console.log(`次便: ${formatTime(next.departure)}発 ${formatTime(next.arrival)}着 (${next.departure - nowMinutes}分後)`);
console.log(`停留所ID: ${next.originId} -> ${next.destinationId}`);
console.log(`路線: ${next.routeName}`);
console.log(`9時以降の直通候補: ${departures.length}本`);
