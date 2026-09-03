const state = {
  data: null,
  origin: null,
  destination: null,
  stopById: new Map(),
  pins: new Map()
};

const els = {
  map: document.querySelector("#map"),
  status: document.querySelector("#status"),
  originSearch: document.querySelector("#origin-search"),
  destinationSearch: document.querySelector("#destination-search"),
  rideDate: document.querySelector("#ride-date"),
  rideTime: document.querySelector("#ride-time"),
  originLabel: document.querySelector("#origin-label"),
  destinationLabel: document.querySelector("#destination-label"),
  searchButton: document.querySelector("#search-button"),
  result: document.querySelector("#result"),
  resultEmpty: document.querySelector("#result-empty"),
  pinTemplate: document.querySelector("#stop-pin-template")
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayInputs() {
  const now = new Date();
  els.rideDate.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  els.rideTime.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function yyyymmdd(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function parseGtfsTime(time) {
  const [hours = "0", minutes = "0", seconds = "0"] = String(time).split(":");
  return Number(hours) * 60 + Number(minutes) + Math.floor(Number(seconds) / 60);
}

function formatGtfsTime(minutes) {
  const dayOffset = Math.floor(minutes / 1440);
  const inDay = minutes % 1440;
  const label = `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`;
  return dayOffset > 0 ? `${label}+${dayOffset}日` : label;
}

function selectedDateTime() {
  const [year, month, day] = els.rideDate.value.split("-").map(Number);
  const [hour, minute] = els.rideTime.value.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0);
}

function activeServiceIds(date) {
  const data = state.data;
  const dateKey = yyyymmdd(date);
  const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()];
  const active = new Set();

  for (const [serviceId, service] of Object.entries(data.calendar)) {
    if (dateKey >= service.startDate && dateKey <= service.endDate && service[dayName]) {
      active.add(serviceId);
    }
  }

  const exceptions = data.calendarDates[dateKey] || {};
  for (const [serviceId, type] of Object.entries(exceptions)) {
    if (type === 1) active.add(serviceId);
    if (type === 2) active.delete(serviceId);
  }

  return active;
}

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, "");
}

function findStops(query, pool = state.data.stops) {
  const term = normalize(query);
  if (!term) return [];
  return pool
    .filter((stop) => normalize(stop.name).includes(term) || normalize(stop.code).includes(term))
    .slice(0, 24);
}

function renderCandidates(container, stops, onPick) {
  container.innerHTML = "";
  container.className = "candidate-list";
  for (const stop of stops) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = stop.name;
    button.addEventListener("click", () => onPick(stop));
    container.append(button);
  }
}

function updateLabels() {
  els.originLabel.textContent = `出発: ${state.origin ? state.origin.name : "未選択"}`;
  els.destinationLabel.textContent = `目的地: ${state.destination ? state.destination.name : "未選択"}`;
  els.searchButton.disabled = !state.origin || !state.destination;
}

function selectOrigin(stop) {
  state.origin = stop;
  state.destination = null;
  els.originSearch.value = stop.name;
  els.destinationSearch.value = "";

  for (const pin of state.pins.values()) pin.classList.remove("selected");
  state.pins.get(stop.id)?.classList.add("selected");

  const destinationIds = state.data.directDestinations[stop.id] || [];
  const destinations = destinationIds.map((id) => state.stopById.get(id)).filter(Boolean);
  const top = destinations.slice(0, 10).map((item) => item.name).join("、");
  els.status.textContent = destinations.length
    ? `この停留所から直通で行ける候補が ${destinations.length} 件あります。例: ${top}`
    : "この停留所から直通候補を見つけられませんでした。";
  updateLabels();
}

function selectDestination(stop) {
  state.destination = stop;
  els.destinationSearch.value = stop.name;
  updateLabels();
}

function plotStops() {
  els.map.innerHTML = "";
  state.pins.clear();

  if (!state.data.stops.length) return;

  const lats = state.data.stops.map((stop) => stop.lat);
  const lons = state.data.stops.map((stop) => stop.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  for (const stop of state.data.stops) {
    const pin = els.pinTemplate.content.firstElementChild.cloneNode(true);
    const x = ((stop.lon - minLon) / (maxLon - minLon || 1)) * 86 + 7;
    const y = (1 - (stop.lat - minLat) / (maxLat - minLat || 1)) * 86 + 7;
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;
    pin.title = stop.name;
    pin.setAttribute("aria-label", stop.name);
    pin.addEventListener("click", () => selectOrigin(stop));
    els.map.append(pin);
    state.pins.set(stop.id, pin);
  }
}

function findDepartures(originId, destinationId, date) {
  const serviceIds = activeServiceIds(date);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const results = [];

  for (const [tripId, times] of Object.entries(state.data.stopTimesByTrip)) {
    const trip = state.data.trips[tripId];
    if (!trip || !serviceIds.has(trip.serviceId)) continue;

    const originIndex = times.findIndex((time) => time.stopId === originId);
    if (originIndex < 0) continue;

    const destinationIndex = times.findIndex((time, index) => index > originIndex && time.stopId === destinationId);
    if (destinationIndex < 0) continue;

    const originTime = times[originIndex];
    const destinationTime = times[destinationIndex];
    const departMinutes = parseGtfsTime(originTime.departure);
    if (departMinutes < nowMinutes) continue;

    const route = state.data.routes[trip.routeId] || {};
    results.push({
      trip,
      route,
      departure: departMinutes,
      arrival: parseGtfsTime(destinationTime.arrival),
      platform: state.origin.platform,
      headsign: originTime.headsign || trip.headsign,
      stopCount: destinationIndex - originIndex
    });
  }

  return results.sort((a, b) => a.departure - b.departure).slice(0, 5);
}

function renderResult() {
  const date = selectedDateTime();
  const departures = findDepartures(state.origin.id, state.destination.id, date);
  els.resultEmpty.classList.add("hidden");
  els.result.classList.remove("hidden");

  if (!departures.length) {
    els.result.innerHTML = `
      <div class="next-card">
        <h2>直通便が見つかりません</h2>
        <p class="meta">この試作MVPでは乗り換え検索はまだ行いません。出発地か目的地を変えて確認してください。</p>
      </div>
    `;
    return;
  }

  const [next, ...later] = departures;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const routeName = next.route.longName || next.route.shortName || "路線名未設定";
  const rideMinutes = Math.max(0, next.arrival - next.departure);

  els.result.innerHTML = `
    <div class="next-card">
      <p class="meta">${state.origin.name} → ${state.destination.name}</p>
      <h2>次のバスまで</h2>
      <p class="countdown">${next.departure - nowMinutes}<span>分</span></p>
      <p><strong>${formatGtfsTime(next.departure)}発</strong> / ${formatGtfsTime(next.arrival)}着 / 約${rideMinutes}分</p>
      <p class="route-name">${routeName}</p>
      <p class="meta">${next.headsign ? `行先: ${next.headsign}<br>` : ""}${next.platform ? `${next.platform}番乗り場<br>` : ""}${next.stopCount}停留所</p>
      ${later.length ? `<div class="later"><strong>次の便</strong>${later.map((item) => `<p class="meta">${item.departure - nowMinutes}分後 ${formatGtfsTime(item.departure)}発</p>`).join("")}</div>` : ""}
    </div>
  `;
}

function wireSearch() {
  const originCandidates = document.createElement("div");
  els.originSearch.after(originCandidates);

  const destinationCandidates = document.createElement("div");
  els.destinationSearch.after(destinationCandidates);

  els.originSearch.addEventListener("input", () => {
    renderCandidates(originCandidates, findStops(els.originSearch.value), selectOrigin);
  });

  els.destinationSearch.addEventListener("input", () => {
    const destinationIds = state.origin ? state.data.directDestinations[state.origin.id] || [] : [];
    const pool = destinationIds.map((id) => state.stopById.get(id)).filter(Boolean);
    renderCandidates(destinationCandidates, findStops(els.destinationSearch.value, pool.length ? pool : state.data.stops), selectDestination);
  });

  els.searchButton.addEventListener("click", renderResult);
}

async function init() {
  todayInputs();
  els.searchButton.disabled = true;

  const response = await fetch("./data/gtfs-index.json");
  state.data = await response.json();
  state.stopById = new Map(state.data.stops.map((stop) => [stop.id, stop]));

  plotStops();
  wireSearch();

  if (!state.data.stops.length) {
    els.status.textContent = "まだGTFSが取り込まれていません。READMEの手順で public/data/gtfs-index.json を生成してください。";
    return;
  }

  els.status.textContent = `${state.data.stops.length}停留所を読み込みました。出発バス停を検索するか、地図上の点を押してください。`;
}

init().catch((error) => {
  els.status.textContent = `読み込みに失敗しました: ${error.message}`;
});
