const state = {
  data: null,
  origin: null,
  destination: null,
  destinationDisplayName: "",
  stopById: new Map(),
  stopIdsByName: new Map(),
  markers: new Map(),
  map: null,
  routeLayer: null,
  markerLayer: null,
  landmarkLayer: null,
  userMarker: null,
  timeMode: "now",
  journeys: [],
  activeJourneyKey: "",
  hasResults: false
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
  originSummary: document.querySelector("#origin-summary"),
  destinationSummary: document.querySelector("#destination-summary"),
  sampleRouteButton: document.querySelector("#sample-route-button"),
  currentLocationButton: document.querySelector("#current-location-button"),
  swapButton: document.querySelector("#swap-button"),
  searchButton: document.querySelector("#search-button"),
  mapSummary: document.querySelector("#map-summary"),
  result: document.querySelector("#result"),
  resultPanel: document.querySelector(".result-panel"),
  frequentStopsList: document.querySelector("#frequent-stops-list"),
  resultEmpty: document.querySelector("#result-empty"),
  timeMode: document.querySelector("#time-mode"),
  timeFields: document.querySelector("#time-fields"),
  mapToggle: document.querySelector("#map-toggle"),
  journeyOrder: document.querySelector("#journey-order")
};

function pad(value) {
  return String(value).padStart(2, "0");
}

// Use Japan wall time regardless of the device's timezone.
function japanNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const part = (name) => Number(parts.find((p) => p.type === name).value);
  return new Date(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
}

function todayInputs() {
  const now = japanNow();
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function selectedDateTime() {
  if (state.timeMode === "now") { todayInputs(); return japanNow(); }
  if (!els.rideDate.value || !els.rideTime.value) return new Date(NaN);
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
  return String(text)
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "");
}

const searchAliases = [
  ["長岡駅大手口", ["長岡駅前"]],
  ["長岡駅", ["長岡駅前"]],
  ["長岡赤十字病院", ["日赤病院前"]],
  ["赤十字病院", ["日赤病院前"]],
  ["日赤", ["日赤病院前"]],
  ["リバーサイド千秋", ["センタープラザ前", "日赤病院前"]],
  ["リバーサイド", ["センタープラザ前", "日赤病院前"]],
  ["千秋", ["センタープラザ前", "日赤病院前"]],
  ["アオーレ長岡", ["アオーレ長岡前"]],
  ["アオーレ", ["アオーレ長岡前"]],
  ["立川病院", ["立川綜合病院"]],
  ["長岡西病院", ["長岡西病院前"]],
  ["イオン長岡", ["イオン長岡店前"]],
  ["長岡イオン", ["イオン長岡店前"]],
  ["丘陵公園", ["越後丘陵公園"]],
  ["国営越後丘陵公園", ["越後丘陵公園"]],
  ["長岡造形大学", ["長岡造形大学前"]],
  ["造形大学", ["長岡造形大学前"]],
  ["北長岡駅", ["北長岡駅角"]]
];

// Facility coordinates are sourced separately from GTFS stops; see docs/data-sources.md.
const landmarks = [
  { name: "長岡駅", aliases: ["長岡駅"], stopNames: ["長岡駅前", "長岡駅東口"], lat: 37.447321, lon: 138.854195 },
  { name: "アオーレ長岡", aliases: ["アオーレ"], stopNames: ["アオーレ長岡前", "長岡駅前"], lat: 37.446389, lon: 138.851111 },
  { name: "リバーサイド千秋", aliases: ["リバーサイド", "千秋"], stopNames: ["センタープラザ前", "日赤病院前"], lat: 37.460722, lon: 138.826750 },
  { name: "長岡赤十字病院", aliases: ["日赤", "赤十字"], stopNames: ["日赤病院前"], lat: 37.460056, lon: 138.82917 },
  { name: "立川綜合病院", aliases: ["立川", "立川総合病院"], stopNames: ["立川綜合病院"], lat: 37.422940, lon: 138.858891 }
];

function landmarkSelection(landmark) {
  const stops = stopsByNames(landmark.stopNames);
  return { ...landmark, id: `landmark:${landmark.name}`, landmark: true, stopNames: stops.map((s) => s.name) };
}

function endpointStops(endpoint) {
  return endpoint?.stopNames ? stopsByNames(endpoint.stopNames) : endpoint ? [endpoint] : [];
}

function endpointIds(endpoint) {
  if (typeof endpoint === "string") endpoint = state.stopById.get(endpoint);
  return new Set(endpointStops(endpoint).flatMap(stopGroupIds));
}

function expandSearchTerms(query) {
  const term = normalize(query);
  if (!term) return [];

  const terms = new Set([term]);
  for (const [alias, stopNames] of searchAliases) {
    const normalizedAlias = normalize(alias);
    if (term.includes(normalizedAlias)) {
      for (const stopName of stopNames) {
        terms.add(normalize(stopName));
      }
    }
  }
  return [...terms];
}

function preferredStopNames(query) {
  const term = normalize(query);
  if (!term) return [];

  const names = [];
  const seen = new Set();
  for (const [alias, stopNames] of searchAliases) {
    if (!term.includes(normalize(alias))) continue;
    for (const stopName of stopNames) {
      if (seen.has(stopName)) continue;
      seen.add(stopName);
      names.push(stopName);
    }
  }
  return names;
}

function stopGroupIds(stop) {
  return state.stopIdsByName.get(stop.name) || [stop.id];
}

function uniqueStopsByName(stops) {
  const seen = new Set();
  const unique = [];
  for (const stop of stops) {
    if (seen.has(stop.name)) continue;
    seen.add(stop.name);
    unique.push(stop);
  }
  return unique;
}

function stopsByNames(names) {
  return uniqueStopsByName(
    names.flatMap((name) => state.data.stops.filter((stop) => stop.name === name))
  );
}

function frequentStops(limit = 8) {
  const countsByName = new Map();
  for (const times of Object.values(state.data.stopTimesByTrip)) {
    for (const time of times) {
      const stop = state.stopById.get(time.stopId);
      if (!stop) continue;
      countsByName.set(stop.name, (countsByName.get(stop.name) || 0) + 1);
    }
  }

  return uniqueStopsByName(state.data.stops)
    .map((stop) => ({
      stop,
      count: countsByName.get(stop.name) || 0
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.stop.name.localeCompare(b.stop.name, "ja"))
    .slice(0, limit);
}

function renderFrequentStops() {
  els.frequentStopsList.innerHTML = "";

  for (const item of frequentStops()) {
    const row = document.createElement("div");
    row.className = "frequent-stop-row";

    const label = document.createElement("div");
    label.className = "frequent-stop-name";
    label.textContent = item.stop.name;

    const count = document.createElement("span");
    count.className = "frequent-stop-count";
    count.textContent = `${item.count}回停車`;
    label.append(count);

    const originButton = document.createElement("button");
    originButton.type = "button";
    originButton.textContent = "出発";
    originButton.addEventListener("click", () => {
      selectOrigin(item.stop);
      if (state.destination) showResults();
    });

    const destinationButton = document.createElement("button");
    destinationButton.type = "button";
    destinationButton.textContent = "目的地";
    destinationButton.addEventListener("click", () => {
      selectDestination(item.stop);
      if (state.origin) {
        showResults();
        return;
      }
      els.status.textContent = `${item.stop.name} を目的地にしました。出発バス停を選んでください。`;
    });

    const timetableButton = document.createElement("button");
    timetableButton.type = "button";
    timetableButton.textContent = "時刻表";
    timetableButton.addEventListener("click", () => renderTimetableAndShow(item.stop));

    row.append(label, originButton, destinationButton, timetableButton);
    els.frequentStopsList.append(row);
  }
}

function stopBadge(stop) {
  const sameNameCount = stopGroupIds(stop).length;
  if (sameNameCount <= 1) return "";
  return `${sameNameCount}乗り場`;
}

function distanceMeters(from, to) {
  const earthRadius = 6371000;
  const fromLat = from.lat * Math.PI / 180;
  const toLat = to.lat * Math.PI / 180;
  const latDiff = (to.lat - from.lat) * Math.PI / 180;
  const lonDiff = (to.lon - from.lon) * Math.PI / 180;
  const a = Math.sin(latDiff / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDiff / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters < 1000) return `約${Math.round(meters / 10) * 10}m`;
  return `約${(meters / 1000).toFixed(1)}km`;
}

function findStops(query, pool = state.data.stops) {
  const terms = expandSearchTerms(query);
  if (!terms.length) return [];
  const preferred = preferredStopNames(query);

  const matches = pool.filter((stop) => {
    const fields = [stop.name, stop.code || "", stop.description || ""].map(normalize);
    return terms.some((term) => fields.some((field) => field.includes(term)));
  });

  const directIds = state.origin ? new Set([...endpointIds(state.origin)].flatMap((id) => state.data.directDestinations[id] || [])) : new Set();
  return uniqueStopsByName(matches)
    .sort((a, b) => {
      const aIndex = preferred.indexOf(a.name);
      const bIndex = preferred.indexOf(b.name);
      const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return aRank - bRank || Number(stopGroupIds(b).some((id) => directIds.has(id))) - Number(stopGroupIds(a).some((id) => directIds.has(id)));
    })
    .slice(0, 24);
}

function renderCandidates(container, stops, onPick, query = "", includeLandmarks = false) {
  container.innerHTML = "";
  container.className = "candidate-list";
  if (includeLandmarks && normalize(query)) {
    for (const landmark of landmarks.filter((item) => [item.name, ...item.aliases].some((name) => normalize(name).includes(normalize(query)) || normalize(query) === normalize(name)))) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "facility-candidate";
      button.textContent = `${landmark.name} — 周辺のバス停をまとめて比較`;
      button.addEventListener("click", () => onPick(landmarkSelection(landmark)));
      container.append(button);
    }
  }
  const directIds = state.origin ? new Set([...endpointIds(state.origin)].flatMap((id) => state.data.directDestinations[id] || [])) : new Set();
  const sorted = includeLandmarks ? [...stops].sort((a, b) => Number(stopGroupIds(b).some((id) => directIds.has(id))) - Number(stopGroupIds(a).some((id) => directIds.has(id)))) : stops;
  for (const stop of sorted) {
    const button = document.createElement("button");
    button.type = "button";
    const badge = stopBadge(stop);
    button.textContent = (badge ? `${stop.name}（${badge}）` : stop.name) + (includeLandmarks && stopGroupIds(stop).some((id) => directIds.has(id)) ? " · 直通路線あり" : "");
    button.addEventListener("click", () => onPick(stop));
    container.append(button);
  }
  if (query && !container.childElementCount) {
    const note = document.createElement("p");
    note.textContent = "候補が見つかりません。名前を短くするか、地図から選んでください。";
    container.append(note);
  }
}

function clearCandidates() {
  document.querySelectorAll(".candidate-list").forEach((container) => { container.innerHTML = ""; });
}

function invalidateResults(message = "条件を変更しました。「次のバスを見る」で検索できます。") {
  state.hasResults = false;
  state.journeys = [];
  state.activeJourneyKey = "";
  clearRouteSigns();
  els.result.innerHTML = "";
  els.result.classList.add("hidden");
  els.resultEmpty.classList.remove("hidden");
  els.status.textContent = message;
}

function updateLabels() {
  els.originLabel.textContent = state.origin ? state.origin.name : "地図か検索で選ぶ";
  els.destinationLabel.textContent = state.destination
    ? destinationTitle()
    : "地図のランドマークか検索で選ぶ";
  els.originSummary.classList.toggle("is-set", Boolean(state.origin));
  els.destinationSummary.classList.toggle("is-set", Boolean(state.destination));
  els.searchButton.disabled = !state.origin || !state.destination;
  els.searchButton.textContent = state.origin && state.destination ? "次のバスを見る" : "出発と目的地を選んでください";
  els.swapButton.disabled = !state.origin || !state.destination;
}

function selectOrigin(stop) {
  state.origin = stop;
  els.originSearch.value = stop.name;
  selectionChanged(stop);
}

function selectDestination(stop) {
  state.destination = stop;
  state.destinationDisplayName = "";
  els.destinationSearch.value = stop.name;
  selectionChanged(stop);
}

function selectionChanged(stop) {
  clearCandidates();
  invalidateResults();
  updateMarkerStyles();
  updateLabels();
  const marker = state.markers.get(endpointStops(stop)[0]?.name);
  if (marker && state.map) state.map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
  if (state.origin && state.destination) renderResult();
  else els.status.textContent = state.origin ? "目的地を選んでください。施設名でも探せます。" : "出発バス停を選んでください。";
}

function openStopPicker(stop, latLng) {
  if (!state.map) return;

  const panel = document.createElement("div");
  panel.className = "stop-picker";

  const title = document.createElement("strong");
  title.textContent = stop.name;
  panel.append(title);

  const actions = document.createElement("div");
  actions.className = "stop-picker-actions";

  const originButton = document.createElement("button");
  originButton.type = "button";
  originButton.textContent = "出発にする";
  originButton.addEventListener("click", () => {
    selectOrigin(stop);
    state.map.closePopup();
    if (state.destination) showResults();
  });

  const destinationButton = document.createElement("button");
  destinationButton.type = "button";
  destinationButton.textContent = "目的地にする";
  destinationButton.addEventListener("click", () => {
    selectDestination(stop);
    state.map.closePopup();
    if (state.origin) showResults();
  });

  actions.append(originButton, destinationButton);
  panel.append(actions);

  const timetableButton = document.createElement("button");
  timetableButton.type = "button";
  timetableButton.className = "secondary-button stop-timetable-button";
  timetableButton.textContent = "このバス停の時刻表を見る";
  timetableButton.addEventListener("click", () => {
    state.map.closePopup();
    renderTimetableAndShow(stop);
  });
  panel.append(timetableButton);

  L.popup({ closeButton: true, autoPan: true })
    .setLatLng(latLng)
    .setContent(panel)
    .openOn(state.map);
}

function openLandmarkPicker(landmark, latLng) {
  if (!state.map) return;
  const panel = document.createElement("div");
  panel.className = "landmark-picker";
  const title = document.createElement("strong");
  title.textContent = landmark.name;
  const note = document.createElement("p");
  note.textContent = `候補: ${landmark.stopNames.join("・")}${landmark.accessPoint ? "（ピンは病院のバス乗降場）" : ""}`;
  const button = document.createElement("button");
  button.className = "secondary-button";
  button.textContent = "ここへ行く · バス停をまとめて比較";
  button.addEventListener("click", () => {
    selectDestination(landmarkSelection(landmark));
    state.map.closePopup();
    if (state.origin) showResults();
  });
  panel.append(title, note, button);
  L.popup({ closeButton: true, autoPan: true }).setLatLng(latLng).setContent(panel).openOn(state.map);
}

function swapStops() {
  if (!state.origin || !state.destination) return;

  const previousOrigin = state.origin;
  state.origin = state.destination;
  state.destination = previousOrigin;
  state.destinationDisplayName = "";
  els.originSearch.value = state.origin.name;
  els.destinationSearch.value = state.destination.name;
  clearCandidates();
  invalidateResults();
  updateMarkerStyles();
  updateLabels();
  renderResultAndShow();
}

function findStopByName(name) {
  return state.data.stops.find((stop) => stop.name === name) || null;
}

function destinationTitle() {
  return state.destination?.name || "";
}

function useSampleRoute() {
  if (!state.data) {
    els.status.textContent = "GTFSデータを読み込み中です。少し待ってからもう一度押してください。";
    return;
  }

  const origin = findStopByName("長岡駅前");
  const destination = findStopByName("日赤病院前");
  if (!origin || !destination) {
    els.status.textContent = "検証用ルートの停留所が見つかりませんでした。GTFSデータを確認してください。";
    return;
  }

  selectOrigin(origin);
  selectDestination(destination);
  showResults();
}

function nearestStop(position) {
  const current = {
    lat: position.coords.latitude,
    lon: position.coords.longitude
  };

  return state.data.stops
    .map((stop) => ({
      stop,
      distance: distanceMeters(current, stop)
    }))
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

function showUserLocation(position) {
  if (!state.map) return;

  const latLng = [position.coords.latitude, position.coords.longitude];
  if (!state.userMarker) {
    state.userMarker = L.circleMarker(latLng, {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#0b6b4f",
      fillOpacity: 0.95
    }).addTo(state.map);
    state.userMarker.bindTooltip("現在地");
  } else {
    state.userMarker.setLatLng(latLng);
  }
}

function useCurrentLocation() {
  if (!state.data) {
    els.status.textContent = "GTFSデータを読み込み中です。少し待ってからもう一度押してください。";
    return;
  }

  if (!navigator.geolocation) {
    els.status.textContent = "このブラウザでは現在地を取得できません。出発バス停を入力してください。";
    return;
  }

  els.currentLocationButton.disabled = true;
  els.status.textContent = "現在地を確認しています。ブラウザの許可が出たら許可してください。";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const nearest = nearestStop(position);
      els.currentLocationButton.disabled = false;

      if (!nearest || nearest.distance > 2000) {
        els.status.textContent = "現在地から2km以内に収録済みのバス停がありません。出発地を入力してください。";
        return;
      }

      showUserLocation(position);
      selectOrigin(nearest.stop);
      const marker = state.markers.get(nearest.stop.name);
      if (marker && state.map) {
        state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 15), { animate: true });
      }
      els.status.textContent = `最寄り候補は ${nearest.stop.name}（直線距離${formatDistance(nearest.distance)}）です。バス停までの移動時間は検索に含みません。`;

      if (state.destination) showResults();
    },
    () => {
      els.currentLocationButton.disabled = false;
      els.status.textContent = "現在地を取得できませんでした。出発バス停を入力してください。";
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

function selectNearestMarker(event) {
  if (!state.map) return;

  const clickPoint = state.map.latLngToLayerPoint(event.latlng);
  let nearest = null;
  const hitRadius = 26;

  for (const marker of state.markers.values()) {
    const markerPoint = state.map.latLngToLayerPoint(marker.getLatLng());
    const distance = clickPoint.distanceTo(markerPoint);
    if (distance <= hitRadius && (!nearest || distance < nearest.distance)) {
      nearest = { marker, distance };
    }
  }

  if (nearest?.marker.representativeStop) {
    openStopPicker(nearest.marker.representativeStop, nearest.marker.getLatLng());
  }
}

function markerStyle(stopName) {
  const isOrigin = endpointStops(state.origin).some((s) => s.name === stopName);
  const isDestination = endpointStops(state.destination).some((s) => s.name === stopName);
  return {
    radius: isOrigin || isDestination ? 8 : 5,
    color: "#ffffff",
    weight: isOrigin || isDestination ? 3 : 1.5,
    fillColor: isOrigin ? "#f5b335" : isDestination ? "#0b6b4f" : "#0f2f5f",
    fillOpacity: isOrigin || isDestination ? 1 : 0.78,
    opacity: 1
  };
}

function updateMarkerStyles() {
  for (const [stopName, marker] of state.markers) {
    marker.setStyle(markerStyle(stopName));
  }
}

function updateMapSummary() {
  if (!state.data) return;
  els.mapSummary.textContent = `${state.markers.size}停留所を表示中（${state.data.stops.length}乗り場を集約）`;
}

function clearRouteSigns() {
  if (state.routeLayer) state.routeLayer.clearLayers();
  updateMapSummary();
}

function routeStops(stops) {
  const route = [];
  const seen = new Set();
  for (const stop of stops) {
    if (!stop || typeof stop.lat !== "number" || typeof stop.lon !== "number") continue;
    const key = stop.id || `${stop.lat},${stop.lon}`;
    if (seen.has(key)) continue;
    seen.add(key);
    route.push(stop);
  }
  return route;
}

function routeSignLabel(segment, index, lastIndex) {
  if (index === 0 && segment.kind !== "second") return "出発";
  if (index === lastIndex && segment.kind === "first") return "乗換";
  if (index === lastIndex) return "到着";
  return "";
}

function routeSignKind(segment, index, lastIndex) {
  if (index === 0 && segment.kind !== "second") return "start";
  if (index === lastIndex && segment.kind === "first") return "transfer";
  if (index === lastIndex) return "goal";
  return segment.kind === "second" ? "via second" : "via";
}

function drawRouteSigns(segments) {
  if (!state.map || !state.routeLayer) return;

  clearRouteSigns();
  const bounds = [];
  for (const segment of segments) {
    const stops = routeStops(segment.stops || []);
    if (stops.length < 2) continue;
    const lastIndex = stops.length - 1;

    stops.forEach((stop, index) => {
      if (segment.kind === "second" && index === 0) return;
      bounds.push([stop.lat, stop.lon]);
      const label = routeSignLabel(segment, index, lastIndex);
      const kind = routeSignKind(segment, index, lastIndex);
      L.marker([stop.lat, stop.lon], {
        interactive: false,
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: "route-stop-sign-wrap",
          html: `<span class="route-stop-sign is-${kind.replace(" ", " is-")}">${escapeHtml(label)}</span>`,
          iconSize: [1, 1],
          iconAnchor: [0, 0]
        })
      }).addTo(state.routeLayer);
    });
  }

  if (bounds.length) {
    state.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    els.mapSummary.textContent = "通るバス停を地図に表示中";
  }
}

function drawTransferRoute(transfer) {
  drawRouteSigns([
    { stops: transfer.firstLeg.pathStops, kind: "first" },
    { stops: transfer.secondLeg.pathStops, kind: "second" }
  ]);
}


function initMap() {
  state.map = L.map(els.map, {
    preferCanvas: true,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(state.map);

  state.routeLayer = L.layerGroup().addTo(state.map);
  state.markerLayer = L.layerGroup().addTo(state.map);
  state.landmarkLayer = L.layerGroup().addTo(state.map);
  state.map.on("click", selectNearestMarker);
}

function plotStops() {
  state.markerLayer.clearLayers();
  state.markers.clear();

  if (!state.data.stops.length) return;

  const bounds = [];
  const groups = new Map();

  for (const stop of state.data.stops) {
    if (!groups.has(stop.name)) groups.set(stop.name, []);
    groups.get(stop.name).push(stop);
  }

  for (const [stopName, stops] of groups) {
    const lat = stops.reduce((sum, stop) => sum + stop.lat, 0) / stops.length;
    const lon = stops.reduce((sum, stop) => sum + stop.lon, 0) / stops.length;
    const representative = stops[0];
    const badge = stops.length > 1 ? `（${stops.length}乗り場）` : "";
    const marker = L.circleMarker([lat, lon], markerStyle(stopName));
    marker.representativeStop = representative;
    marker.bindTooltip(`${stopName}${badge}`);
    marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      openStopPicker(representative, marker.getLatLng());
    });
    marker.addTo(state.markerLayer);
    state.markers.set(stopName, marker);
    bounds.push([lat, lon]);
  }

  state.map.fitBounds(bounds, { padding: [24, 24] });
  updateMapSummary();
}

function plotLandmarks() {
  state.landmarkLayer.clearLayers();

  for (const landmark of landmarks) {
    const stops = stopsByNames(landmark.stopNames);
    if (!stops.length) continue;

    const lat = landmark.lat ?? stops[0].lat;
    const lon = landmark.lon ?? stops[0].lon;
    const marker = L.marker([lat, lon], {
      zIndexOffset: 800,
      icon: L.divIcon({
        className: "landmark-marker-wrap",
        html: `<span class="landmark-marker">${escapeHtml(landmark.name)}${landmark.accessPoint ? " 乗降場" : ""}</span>`,
        iconSize: [1, 1],
        iconAnchor: [0, 0]
      })
    });

    marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      openLandmarkPicker(landmark, marker.getLatLng());
    });
    marker.addTo(state.landmarkLayer);
  }
}

function findDepartures(originId, destinationId, date) {
  const serviceIds = activeServiceIds(date);
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const originIds = endpointIds(originId);
  const destinationIds = endpointIds(destinationId);
  const results = [];

  for (const [tripId, times] of Object.entries(state.data.stopTimesByTrip)) {
    const trip = state.data.trips[tripId];
    if (!trip || !serviceIds.has(trip.serviceId)) continue;

    const originIndex = times.findIndex((time) => originIds.has(time.stopId) && parseGtfsTime(time.departure) >= nowMinutes);
    if (originIndex < 0) continue;

    const destinationIndex = times.findIndex((time, index) => index > originIndex && destinationIds.has(time.stopId));
    if (destinationIndex < 0) continue;

    const originTime = times[originIndex];
    const destinationTime = times[destinationIndex];
    const departMinutes = parseGtfsTime(originTime.departure);
    if (departMinutes < nowMinutes) continue;

    const route = state.data.routes[trip.routeId] || {};
    const actualOrigin = state.stopById.get(originTime.stopId) || state.origin;
    const actualDestination = state.stopById.get(destinationTime.stopId) || state.destination;
    results.push({
      tripId,
      trip,
      route,
      departure: departMinutes,
      arrival: parseGtfsTime(destinationTime.arrival),
      originStop: actualOrigin,
      destinationStop: actualDestination,
      pathStops: times
        .slice(originIndex, destinationIndex + 1)
        .map((time) => state.stopById.get(time.stopId))
        .filter(Boolean),
      platform: actualOrigin.platform,
      headsign: originTime.headsign || trip.headsign,
      stopCount: destinationIndex - originIndex
    });
  }

  return results.sort((a, b) => a.departure - b.departure);
}

function findTransferDepartures(originId, destinationId, date) {
  const serviceIds = activeServiceIds(date);
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const originIds = endpointIds(originId);
  const destinationIds = endpointIds(destinationId);
  const minTransferMinutes = 5;
  const maxTransferMinutes = 90;
  const firstLegs = [];
  const secondLegsByTransfer = new Map();

  for (const [tripId, times] of Object.entries(state.data.stopTimesByTrip)) {
    const trip = state.data.trips[tripId];
    if (!trip || !serviceIds.has(trip.serviceId)) continue;

    const route = state.data.routes[trip.routeId] || {};
    const routeName = route.longName || route.shortName || "路線名未設定";
    const originIndex = times.findIndex((time) => originIds.has(time.stopId) && parseGtfsTime(time.departure) >= nowMinutes);
    if (originIndex >= 0) {
      const departure = parseGtfsTime(times[originIndex].departure);
      if (departure >= nowMinutes) {
        for (let index = originIndex + 1; index < times.length; index += 1) {
          const transferStop = state.stopById.get(times[index].stopId);
          if (!transferStop || destinationIds.has(transferStop.id)) continue;
          firstLegs.push({
            tripId,
            transferName: transferStop.name,
            departure,
            arrival: parseGtfsTime(times[index].arrival),
            originStop: state.stopById.get(times[originIndex].stopId) || state.origin,
            transferStop,
            pathStops: times
              .slice(originIndex, index + 1)
              .map((time) => state.stopById.get(time.stopId))
              .filter(Boolean),
            routeName,
            headsign: times[originIndex].headsign || trip.headsign
          });
        }
      }
    }

    const destinationIndex = times.findIndex((time) => destinationIds.has(time.stopId));
    if (destinationIndex > 0) {
      for (let index = 0; index < destinationIndex; index += 1) {
        const transferStop = state.stopById.get(times[index].stopId);
        if (!transferStop || originIds.has(transferStop.id)) continue;
        const departure = parseGtfsTime(times[index].departure);
        if (departure < nowMinutes) continue;
        const leg = {
          tripId,
          transferName: transferStop.name,
          departure,
          arrival: parseGtfsTime(times[destinationIndex].arrival),
          transferStop,
          destinationStop: state.stopById.get(times[destinationIndex].stopId) || state.destination,
          pathStops: times
            .slice(index, destinationIndex + 1)
            .map((time) => state.stopById.get(time.stopId))
            .filter(Boolean),
          routeName,
          headsign: times[index].headsign || trip.headsign
        };
        if (!secondLegsByTransfer.has(transferStop.name)) secondLegsByTransfer.set(transferStop.name, []);
        secondLegsByTransfer.get(transferStop.name).push(leg);
      }
    }
  }

  for (const legs of secondLegsByTransfer.values()) {
    legs.sort((a, b) => a.departure - b.departure);
  }

  const bestByTransfer = new Map();
  for (const firstLeg of firstLegs) {
    const secondLegs = secondLegsByTransfer.get(firstLeg.transferName) || [];
    const secondLeg = secondLegs.filter((candidate) => {
      const wait = candidate.departure - firstLeg.arrival;
      return candidate.tripId !== firstLeg.tripId && wait >= minTransferMinutes && wait <= maxTransferMinutes
        && distanceMeters(firstLeg.transferStop, candidate.transferStop) <= 400;
    }).sort((a, b) => a.arrival - b.arrival || a.departure - b.departure)[0];
    if (!secondLeg) continue;

    const candidate = {
      transferName: firstLeg.transferName,
      firstLeg,
      secondLeg,
      wait: secondLeg.departure - firstLeg.arrival,
      totalMinutes: secondLeg.arrival - firstLeg.departure
    };
    const current = bestByTransfer.get(firstLeg.transferName);
    if (!current || candidate.secondLeg.arrival < current.secondLeg.arrival) {
      bestByTransfer.set(firstLeg.transferName, candidate);
    }
  }

  return [...bestByTransfer.values()]
    .sort((a, b) => a.secondLeg.arrival - b.secondLeg.arrival || a.firstLeg.departure - b.firstLeg.departure)
    .slice(0, 12);
}

function journeyKey(journey) {
  return `${journey.legs.map((leg) => leg.tripId).join("/")}:${journey.departure}:${journey.destinationStop.id}`;
}

function searchJourneys(date) {
  const origin = state.origin;
  // Search each facility stop independently so an early stop on the same trip does not hide the preferred stop.
  const destinations = endpointStops(state.destination);
  const journeys = [];
  for (const destination of destinations) {
    if (endpointIds(origin).has(destination.id)) continue;
    const direct = findDepartures(origin, destination, date);
    for (const leg of direct) {
      journeys.push({ departure: leg.departure, arrival: leg.arrival, destinationStop: leg.destinationStop,
        transfers: 0, legs: [leg], preference: destinations.indexOf(destination) });
    }
    for (const transfer of findTransferDepartures(origin, destination, date)) {
      journeys.push({ departure: transfer.firstLeg.departure, arrival: transfer.secondLeg.arrival,
        destinationStop: transfer.secondLeg.destinationStop, transfers: 1,
        legs: [transfer.firstLeg, transfer.secondLeg], transfer, preference: destinations.indexOf(destination) });
    }
  }
  // Prefer the designated facility stop when exactly the same bus also serves another nearby stop.
  const unique = new Map();
  for (const journey of journeys.sort((a, b) => a.preference - b.preference)) {
    const key = journey.legs.map((leg) => `${leg.tripId}:${leg.departure}`).join("/");
    if (!unique.has(key)) unique.set(key, journey);
  }
  const list = [...unique.values()];
  const byArrival = els.journeyOrder.value === "arrival";
  return list.sort((a, b) => (byArrival ? a.arrival - b.arrival : a.transfers - b.transfers)
    || (byArrival ? a.transfers - b.transfers : a.departure - b.departure)
    || a.arrival - b.arrival || a.preference - b.preference).slice(0, 8);
}

function platformLabel(stop) {
  return stop.platform ? `${stop.platform}番のりば` : "のりば番号はデータにありません";
}

function routeName(leg) {
  return leg.routeName || leg.route?.longName || leg.route?.shortName || "路線名未設定";
}

function timetableDepartures(stop, date, limit = 300) {
  const serviceIds = activeServiceIds(date);
  const stopIds = endpointIds(stop);
  const rows = [];
  const seen = new Set();

  for (const [tripId, times] of Object.entries(state.data.stopTimesByTrip)) {
    const trip = state.data.trips[tripId];
    if (!trip || !serviceIds.has(trip.serviceId)) continue;

    const route = state.data.routes[trip.routeId] || {};
    times.forEach((time, index) => {
      if (!stopIds.has(time.stopId)) return;
      const departure = parseGtfsTime(time.departure);
      const key = `${tripId}:${time.stopId}:${time.sequence ?? index}`;
      if (seen.has(key)) return;
      seen.add(key);

      const actualStop = state.stopById.get(time.stopId) || stop;
      const lastStopTime = times[times.length - 1];
      const lastStop = state.stopById.get(lastStopTime?.stopId);
      rows.push({
        tripId,
        trip,
        route,
        stop: actualStop,
        departure,
        headsign: time.headsign || trip.headsign || lastStop?.name || "行先表示は現地で確認",
        routeName: route.longName || route.shortName || "路線名未設定",
        directionId: trip.directionId || "",
        sequence: time.sequence ?? index
      });
    });
  }

  return rows
    .sort((a, b) => a.departure - b.departure || a.routeName.localeCompare(b.routeName, "ja") || a.headsign.localeCompare(b.headsign, "ja"))
    .slice(0, limit);
}

function uniqueList(values, limit = 3) {
  const seen = new Set();
  const result = [];
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function timetableGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.stop.id;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        stop: row.stop,
        rows: []
      });
    }
    groups.get(key).rows.push(row);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => a.departure - b.departure || a.headsign.localeCompare(b.headsign, "ja")),
      headsigns: uniqueList(group.rows.map((row) => row.headsign), 4),
      routeNames: uniqueList(group.rows.map((row) => row.routeName), 2)
    }))
    .sort((a, b) => (a.stop.description || a.stop.id).localeCompare(b.stop.description || b.stop.id, "ja"));
}

function timetableSideLabel(group, index, total) {
  const side = total === 2 ? (index === 0 ? "上り側" : "下り側") : `乗り場${index + 1}`;
  const direction = group.headsigns.length ? `${group.headsigns.join("・")}方面` : "方面未設定";
  return `${side} · ${direction}`;
}

function timetableRouteGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.routeName}::${row.headsign}`;
    if (!groups.has(key)) groups.set(key, { key, routeName: row.routeName, headsign: row.headsign, rows: [] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    rows: group.rows.sort((a, b) => a.departure - b.departure)
  })).sort((a, b) => a.rows[0].departure - b.rows[0].departure);
}

function dateInFeedRange(date) {
  const dates = Object.values(state.data.calendar);
  const key = yyyymmdd(date);
  const feed = state.data.feed || {};
  if (feed.feed_start_date && feed.feed_end_date) return key >= feed.feed_start_date && key <= feed.feed_end_date;
  return dates.some((service) => key >= service.startDate && key <= service.endDate) || Object.keys(state.data.calendarDates[key] || {}).length > 0;
}

function renderTimetable(stop) {
  if (!state.data || !stop) return;
  const date = selectedDateTime();
  if (!Number.isFinite(date.getTime())) {
    invalidateResults("時刻表を見るには日付と時刻を入力してください。");
    return;
  }

  state.hasResults = false;
  state.journeys = [];
  state.activeJourneyKey = "";
  clearRouteSigns();
  clearCandidates();
  els.resultEmpty.classList.add("hidden");
  els.result.classList.remove("hidden");

  const basis = `${date.getMonth() + 1}/${date.getDate()}`;
  const rows = timetableDepartures(stop, date);
  const groups = timetableGroups(rows);
  const groupedStops = endpointStops(stop);
  const platformNote = stopGroupIds(stop).length > 1
    ? `<p class="facility-note">${escapeHtml(stop.name)} は ${stopGroupIds(stop).length}乗り場をまとめています。上り/下り相当の切替で、実際に見るバス停側を選んでください。</p>`
    : "";
  els.status.textContent = `${stop.name} の時刻表 · ${basis}（日本時間）`;

  if (!rows.length) {
    const inRange = dateInFeedRange(date);
    els.result.innerHTML = `<h2>${escapeHtml(stop.name)} の時刻表</h2>
      <p class="meta">${basis}（日本時間）の全便<br>GTFSの静的時刻表に基づく予定です。遅延・運休は反映されません。</p>
      ${platformNote}
      <div class="next-card"><h3>${inRange ? "この日の便が見つかりません" : "この日付の時刻表データがありません"}</h3>
      <p>${inRange ? "近くの別のバス停も確認してください。" : "対応期間内の日付を選んでください。運休とは限りません。"}</p></div>`;
    return;
  }

  els.result.innerHTML = `<h2>${escapeHtml(stop.name)} の時刻表</h2>
    <p class="meta">${basis}（日本時間）の全便<br>GTFSの静的時刻表に基づく予定です。遅延・運休は反映されません。</p>
    ${platformNote}
    <p class="meta">今の時刻で絞り込まず、バス停に貼ってある時刻表に近い形で表示します。GTFSに正式な上り/下り名がないため、乗り場側と行先で切り替えます。</p>
    <div class="timetable-actions">
      <button type="button" class="secondary-button" data-timetable-origin>出発にする</button>
      <button type="button" class="secondary-button" data-timetable-destination>目的地にする</button>
    </div>
    <div class="timetable-tabs" role="tablist" aria-label="${escapeHtml(stop.name)} の上り下り切替">
      ${groups.map((group, index) => `<button type="button" role="tab" aria-selected="${index === 0 ? "true" : "false"}" class="${index === 0 ? "is-active" : ""}" data-timetable-tab="${index}">${escapeHtml(timetableSideLabel(group, index, groups.length))}</button>`).join("")}
    </div>
    <div class="timetable-list" aria-label="${escapeHtml(stop.name)} の時刻表">
      ${groups.map((group, groupIndex) => `<section class="timetable-group${groupIndex === 0 ? "" : " hidden"}" data-timetable-panel="${groupIndex}">
        <h3>${escapeHtml(timetableSideLabel(group, groupIndex, groups.length))}</h3>
        <p>${escapeHtml(group.stop.name)} · ${escapeHtml(platformLabel(group.stop))}<br>${escapeHtml(group.routeNames.join(" / ") || "路線名未設定")}</p>
        ${timetableRouteGroups(group.rows).map((routeGroup) => `<div class="timetable-route">
          <strong>${escapeHtml(routeGroup.headsign)} 方面</strong>
          <small>${escapeHtml(routeGroup.routeName)}</small>
          <div class="timetable-times">${routeGroup.rows.map((row) => `<span>${formatGtfsTime(row.departure)}</span>`).join("")}</div>
        </div>`).join("")}
      </section>`).join("")}
    </div>
    ${rows.length >= 300 ? `<p class="meta">表示件数が多いため、300件まで表示しています。</p>` : ""}
    ${groupedStops.length ? `<p class="meta">この停留所グループに含まれる乗り場: ${groupedStops.map((item) => escapeHtml(item.description || item.id)).join(" / ")}</p>` : ""}`;

  els.result.querySelectorAll("[data-timetable-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = button.dataset.timetableTab;
      els.result.querySelectorAll("[data-timetable-tab]").forEach((tab) => {
        const active = tab.dataset.timetableTab === index;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      els.result.querySelectorAll("[data-timetable-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.timetablePanel !== index);
      });
    });
  });
  els.result.querySelector("[data-timetable-origin]")?.addEventListener("click", () => {
    selectOrigin(stop);
    if (state.destination) showResults();
  });
  els.result.querySelector("[data-timetable-destination]")?.addEventListener("click", () => {
    selectDestination(stop);
    if (state.origin) showResults();
  });
}

function legDetails(leg, index) {
  const from = leg.originStop || leg.transferStop;
  const to = leg.destinationStop || leg.transferStop;
  return `<div class="leg-detail">
    <p><strong>${index + 1}本目 · ${formatGtfsTime(leg.departure)}発 → ${formatGtfsTime(leg.arrival)}着</strong></p>
    <p>${escapeHtml(from.name)} → ${escapeHtml(to.name)}</p>
    <p><strong>${escapeHtml(leg.headsign || "行先表示は現地で確認")}</strong></p>
    <p>${escapeHtml(platformLabel(from))}</p>
    <p class="meta">${escapeHtml(routeName(leg))}</p>
    <button type="button" class="secondary-button" data-boarding-index="${index}">乗る場所を地図で見る</button>
  </div>`;
}

function showJourney(index, { drawMap = true } = {}) {
  const journey = state.journeys[index];
  if (!journey) return;
  state.activeJourneyKey = journeyKey(journey);
  els.result.querySelectorAll("[data-journey-index]").forEach((button) => {
    const active = Number(button.dataset.journeyIndex) === index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const detail = els.result.querySelector("#journey-detail");
  detail.innerHTML = `<p class="selected-journey-time"><strong>${formatGtfsTime(journey.departure)}発 → ${formatGtfsTime(journey.arrival)}着</strong></p><h3>${journey.transfers ? "1回乗り換え" : "乗り換えなし"} · ${formatGtfsTime(journey.arrival)} バス停着</h3>
    ${journey.legs.map((leg, i) => legDetails(leg, i) + (i === 0 && journey.transfer
      ? `<p class="transfer-note">${escapeHtml(journey.transfer.transferName)}で乗り換え · 接続時間${journey.transfer.wait}分。乗り場の移動と道路状況を確認してください。</p>` : "")).join("")}
    ${state.destination.landmark ? `<p class="meta">${escapeHtml(journey.destinationStop.name)}で下車 → ${escapeHtml(state.destination.name)}。表示の到着時刻はバス停までです。施設までの徒歩時間は含みません。</p>` : ""}`;
  detail.querySelectorAll("[data-boarding-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const leg = journey.legs[Number(button.dataset.boardingIndex)];
      const stop = leg.originStop || leg.transferStop;
      if (!state.map) return;
      state.map.setView([stop.lat, stop.lon], 18);
      const panel = document.createElement("div");
      panel.textContent = `${stop.name} · ${platformLabel(stop)} · ${leg.headsign || routeName(leg)}`;
      L.popup().setLatLng([stop.lat, stop.lon]).setContent(panel).openOn(state.map);
      document.querySelector(".map-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  if (drawMap) {
    if (journey.transfer) drawTransferRoute(journey.transfer);
    else drawRouteSigns([{ stops: journey.legs[0].pathStops, kind: "direct" }]);
  }
}

function renderResult({ refresh = false } = {}) {
  if (!state.origin || !state.destination) return;
  const date = selectedDateTime();
  if (!Number.isFinite(date.getTime())) {
    invalidateResults("日付と時刻を入力してください。");
    return;
  }
  const originIds = endpointIds(state.origin);
  if ([...endpointIds(state.destination)].every((id) => originIds.has(id))) {
    invalidateResults("出発と目的地が同じです。別の場所を選んでください。");
    return;
  }
  const previousKey = state.activeJourneyKey;
  const focused = document.activeElement;
  const focusedJourney = focused?.dataset?.journeyIndex;
  const focusedKey = focusedJourney === undefined ? null : state.journeys[Number(focusedJourney)] && journeyKey(state.journeys[Number(focusedJourney)]);
  const focusedBoarding = focused?.dataset?.boardingIndex;
  state.journeys = searchJourneys(date);
  state.hasResults = true;
  els.resultEmpty.classList.add("hidden");
  els.result.classList.remove("hidden");
  const basis = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  els.status.textContent = `${state.origin.name} → ${destinationTitle()} · ${basis}（日本時間）で検索`;
  const heading = `<h2>${escapeHtml(state.origin.name)} → ${escapeHtml(destinationTitle())}</h2>
    <p class="meta">${state.timeMode === "now" ? "現在時刻" : "指定日時"} ${basis}（日本時間）<br>時刻表に基づく予定です。遅延・運休は反映されません。バス停までの移動時間は含みません。</p>`;
  if (!state.journeys.length) {
    clearRouteSigns();
    const inRange = dateInFeedRange(date);
    els.result.innerHTML = `${heading}<div class="next-card"><h3>${inRange ? "この日時以降の便が見つかりません" : "この日付の時刻表データがありません"}</h3>
      <p>${inRange ? "当日分の直通・1回乗り換えを検索しました。別の時刻や近くのバス停でもお試しください。" : "対応期間内の日付を選んでください。運休とは限りません。"}</p></div>`;
    return;
  }
  els.result.innerHTML = `${heading}
    ${state.destination.landmark ? `<p class="facility-note">${endpointStops(state.destination).map((stop) => escapeHtml(stop.name)).join("・")}への便を比較。施設までの徒歩は含みません。</p>` : ""}
    <p class="meta">${els.journeyOrder.value === "arrival" ? "バス停への到着が早い順" : "直通を優先し、出発時刻順"} · 候補を押すと詳細と地図が切り替わります。</p>
    <section id="journey-detail" class="next-card" aria-label="選択した便の詳細"></section>
    <h3 class="other-journeys-title">便を選んで比較</h3>
    <div class="journey-list">${state.journeys.map((journey, index) => `
      <button class="transfer-card journey-card" type="button" data-journey-index="${index}" aria-pressed="false">
        <span class="journey-badge">${journey.transfers ? "乗換1回" : "直通"}</span>
        <strong class="journey-time">${formatGtfsTime(journey.departure)}発 → ${formatGtfsTime(journey.arrival)}着</strong>
        <span>${state.timeMode === "now" ? "あと" : "指定時刻から"}${Math.max(0, Math.ceil(journey.departure - nowMinutes))}分 · 乗車・乗換 ${journey.arrival - journey.departure}分</span>
        <span>${escapeHtml(journey.legs[0].headsign || routeName(journey.legs[0]))}</span>
        <span>下車: ${escapeHtml(journey.destinationStop.name)}</span>
      </button>`).join("")}</div>`;
  els.result.querySelectorAll("[data-journey-index]").forEach((button) => {
    button.addEventListener("click", () => {
      showJourney(Number(button.dataset.journeyIndex));
      els.result.querySelector("#journey-detail").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  const retained = state.journeys.findIndex((journey) => journeyKey(journey) === previousKey);
  showJourney(retained >= 0 ? retained : 0, { drawMap: !refresh || retained < 0 });
  if (refresh && focusedKey) {
    const focusIndex = state.journeys.findIndex((journey) => journeyKey(journey) === focusedKey);
    els.result.querySelector(`[data-journey-index="${Math.max(0, focusIndex)}"]`)?.focus({ preventScroll: true });
  } else if (refresh && focusedBoarding !== undefined) {
    els.result.querySelector(`[data-boarding-index="${focusedBoarding}"]`)?.focus({ preventScroll: true });
  }
}

function renderResultAndShow() {
  renderResult();
  showResults();
}

function renderTimetableAndShow(stop) {
  renderTimetable(stop);
  showResults();
}

function showResults() {
  if (!els.result.classList.contains("hidden")) els.resultPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wireSearch() {
  const originCandidates = document.createElement("div");
  els.originSearch.after(originCandidates);
  const destinationCandidates = document.createElement("div");
  els.destinationSearch.after(destinationCandidates);
  function editEndpoint(kind, input, container, onPick) {
    state[kind] = null;
    invalidateResults("入力した名前の候補を選んでください。");
    updateLabels();
    updateMarkerStyles();
    // Never restrict candidates to direct destinations: transfers must remain searchable.
    renderCandidates(container, findStops(input.value), onPick, input.value, kind === "destination");
  }
  els.originSearch.addEventListener("input", () => editEndpoint("origin", els.originSearch, originCandidates, selectOrigin));
  els.destinationSearch.addEventListener("input", () => editEndpoint("destination", els.destinationSearch, destinationCandidates, selectDestination));
  for (const [input, container] of [[els.originSearch, originCandidates], [els.destinationSearch, destinationCandidates]]) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") container.innerHTML = "";
      if (event.key === "ArrowDown") { event.preventDefault(); container.querySelector("button")?.focus(); }
      if (event.key === "Enter") { event.preventDefault(); container.querySelector("button")?.click(); }
    });
  }
  els.searchButton.addEventListener("click", renderResultAndShow);
  els.swapButton.addEventListener("click", swapStops);
  els.sampleRouteButton.addEventListener("click", useSampleRoute);
  els.currentLocationButton.addEventListener("click", useCurrentLocation);
  els.timeMode.addEventListener("change", () => {
    state.timeMode = els.timeMode.value;
    els.timeFields.hidden = state.timeMode === "now";
    if (state.timeMode === "now") todayInputs();
    invalidateResults();
    if (state.origin && state.destination) renderResult();
  });
  for (const input of [els.rideDate, els.rideTime]) {
    input.addEventListener("input", () => invalidateResults("日時を変更しました。「次のバスを見る」で検索してください。"));
  }
  els.journeyOrder.addEventListener("change", () => { if (state.origin && state.destination) renderResult(); });
  els.mapToggle.addEventListener("click", () => {
    const compact = document.body.classList.toggle("compact-map");
    els.mapToggle.textContent = compact ? "地図を大きく" : "地図を小さく";
    els.mapToggle.setAttribute("aria-expanded", String(!compact));
    state.map?.invalidateSize({ pan: false });
  });
  function refreshNow() {
    if (state.timeMode === "now" && state.hasResults && !document.hidden) renderResult({ refresh: true });
  }
  setInterval(refreshNow, 30000);
  document.addEventListener("visibilitychange", refreshNow);
}

async function init() {
  todayInputs();
  els.searchButton.disabled = true;

  const response = await fetch("./data/gtfs-index.json");
  if (!response.ok) throw new Error("時刻表を取得できません。再読み込みしてください。");
  state.data = await response.json();
  state.stopById = new Map(state.data.stops.map((stop) => [stop.id, stop]));
  state.stopIdsByName = new Map();
  for (const stop of state.data.stops) {
    if (!state.stopIdsByName.has(stop.name)) state.stopIdsByName.set(stop.name, []);
    state.stopIdsByName.get(stop.name).push(stop.id);
  }

  initMap();
  plotStops();
  plotLandmarks();
  renderFrequentStops();
  wireSearch();
  updateLabels();

  if (!state.data.stops.length) {
    els.status.textContent = "まだGTFSが取り込まれていません。READMEの手順で public/data/gtfs-index.json を生成してください。";
    return;
  }

  els.status.textContent = `${state.data.stops.length}停留所を読み込みました。出発バス停を検索するか、地図上の点を押してください。`;
}

init().catch((error) => {
  els.status.textContent = `読み込みに失敗しました: ${error.message}`;
});
