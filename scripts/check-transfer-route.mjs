import { readFile } from "node:fs/promises";

const index = JSON.parse(await readFile(new URL("../public/data/gtfs-index.json", import.meta.url), "utf8"));
const originName = "日赤病院前";
const destinationName = "越後丘陵公園";
const dateKey = "20260903";
const dayName = "thursday";
const nowMinutes = 9 * 60;
const minTransferMinutes = 5;
const maxTransferMinutes = 90;

const stopById = new Map(index.stops.map((stop) => [stop.id, stop]));

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

function routeNameForTrip(trip) {
  const route = index.routes[trip.routeId] || {};
  return route.longName || route.shortName || trip.routeId;
}

const originIds = new Set(idsByStopName(originName));
const destinationIds = new Set(idsByStopName(destinationName));
const services = activeServiceIds();
const directDepartures = [];
const firstLegs = [];
const secondLegsByTransfer = new Map();

for (const [tripId, times] of Object.entries(index.stopTimesByTrip)) {
  const trip = index.trips[tripId];
  if (!trip || !services.has(trip.serviceId)) continue;

  const routeName = routeNameForTrip(trip);
  const originIndex = times.findIndex((time) => originIds.has(time.stopId));
  const destinationIndex = times.findIndex((time) => destinationIds.has(time.stopId));

  if (originIndex >= 0) {
    const originDeparture = parseGtfsTime(times[originIndex].departure);
    const directDestinationIndex = times.findIndex((time, indexInTrip) => {
      return indexInTrip > originIndex && destinationIds.has(time.stopId);
    });
    if (directDestinationIndex >= 0 && originDeparture >= nowMinutes) {
      directDepartures.push(originDeparture);
    }

    if (originDeparture >= nowMinutes) {
      for (let indexInTrip = originIndex + 1; indexInTrip < times.length; indexInTrip += 1) {
        const transferStop = stopById.get(times[indexInTrip].stopId);
        if (!transferStop || destinationIds.has(transferStop.id)) continue;
        firstLegs.push({
          transferName: transferStop.name,
          departure: originDeparture,
          arrival: parseGtfsTime(times[indexInTrip].arrival),
          routeName
        });
      }
    }
  }

  if (destinationIndex > 0) {
    for (let indexInTrip = 0; indexInTrip < destinationIndex; indexInTrip += 1) {
      const transferStop = stopById.get(times[indexInTrip].stopId);
      if (!transferStop || originIds.has(transferStop.id)) continue;
      const departure = parseGtfsTime(times[indexInTrip].departure);
      if (departure < nowMinutes) continue;
      const leg = {
        transferName: transferStop.name,
        departure,
        arrival: parseGtfsTime(times[destinationIndex].arrival),
        routeName
      };
      if (!secondLegsByTransfer.has(transferStop.name)) secondLegsByTransfer.set(transferStop.name, []);
      secondLegsByTransfer.get(transferStop.name).push(leg);
    }
  }
}

for (const legs of secondLegsByTransfer.values()) {
  legs.sort((a, b) => a.departure - b.departure);
}

const candidates = [];
for (const firstLeg of firstLegs) {
  const secondLeg = (secondLegsByTransfer.get(firstLeg.transferName) || []).find((candidate) => {
    const wait = candidate.departure - firstLeg.arrival;
    return wait >= minTransferMinutes && wait <= maxTransferMinutes;
  });
  if (!secondLeg) continue;
  candidates.push({
    transferName: firstLeg.transferName,
    firstLeg,
    secondLeg,
    wait: secondLeg.departure - firstLeg.arrival
  });
}

candidates.sort((a, b) => a.secondLeg.arrival - b.secondLeg.arrival || a.firstLeg.departure - b.firstLeg.departure);

if (directDepartures.length) {
  console.error(`${originName} -> ${destinationName} は直通便があるため、乗り換え検証に向きません。`);
  process.exit(1);
}

if (!candidates.length) {
  console.error(`${originName} -> ${destinationName} の1回乗り換え候補を見つけられませんでした。`);
  process.exit(1);
}

const next = candidates[0];
console.log(`${originName} -> ${destinationName}`);
console.log(`基準: ${dateKey} ${formatTime(nowMinutes)}`);
console.log(`直通: なし`);
console.log(`乗り換え: ${next.transferName}`);
console.log(`1本目: ${formatTime(next.firstLeg.departure)}発 ${formatTime(next.firstLeg.arrival)}着 / ${next.firstLeg.routeName}`);
console.log(`待ち時間: ${next.wait}分`);
console.log(`2本目: ${formatTime(next.secondLeg.departure)}発 ${formatTime(next.secondLeg.arrival)}着 / ${next.secondLeg.routeName}`);
