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
  userMarker: null
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
  destinationPresets: document.querySelectorAll("[data-destination]"),
  searchButton: document.querySelector("#search-button"),
  mapSummary: document.querySelector("#map-summary"),
  result: document.querySelector("#result"),
  resultEmpty: document.querySelector("#result-empty")
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
  ["長岡駅大手口", "長岡駅前"],
  ["長岡駅", "長岡駅前"],
  ["長岡赤十字病院", "日赤病院前"],
  ["赤十字病院", "日赤病院前"],
  ["日赤", "日赤病院前"],
  ["リバーサイド千秋", "子育ての駅千秋"],
  ["リバーサイド", "子育ての駅千秋"],
  ["アオーレ長岡", "アオーレ長岡前"],
  ["アオーレ", "アオーレ長岡前"],
  ["立川病院", "立川綜合病院"],
  ["長岡西病院", "長岡西病院前"],
  ["イオン長岡", "イオン長岡店前"],
  ["長岡イオン", "イオン長岡店前"],
  ["丘陵公園", "越後丘陵公園"],
  ["国営越後丘陵公園", "越後丘陵公園"],
  ["長岡造形大学", "長岡造形大学前"],
  ["造形大学", "長岡造形大学前"],
  ["北長岡駅", "北長岡駅角"]
];

function expandSearchTerms(query) {
  const term = normalize(query);
  if (!term) return [];

  const terms = new Set([term]);
  for (const [alias, stopName] of searchAliases) {
    const normalizedAlias = normalize(alias);
    if (term.includes(normalizedAlias)) {
      terms.add(normalize(stopName));
    }
  }
  return [...terms];
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

  const matches = pool.filter((stop) => {
    const fields = [stop.name, stop.code, stop.description].map(normalize);
    return terms.some((term) => fields.some((field) => field.includes(term)));
  });

  return uniqueStopsByName(matches).slice(0, 24);
}

function renderCandidates(container, stops, onPick) {
  container.innerHTML = "";
  container.className = "candidate-list";
  for (const stop of stops) {
    const button = document.createElement("button");
    button.type = "button";
    const badge = stopBadge(stop);
    button.textContent = badge ? `${stop.name}（${badge}）` : stop.name;
    button.addEventListener("click", () => onPick(stop));
    container.append(button);
  }
}

function updateLabels() {
  els.originLabel.textContent = state.origin ? state.origin.name : "地図か検索で選ぶ";
  els.destinationLabel.textContent = state.destination
    ? destinationTitle()
    : "目的地ボタンか検索で選ぶ";
  els.originSummary.classList.toggle("is-set", Boolean(state.origin));
  els.destinationSummary.classList.toggle("is-set", Boolean(state.destination));
  els.searchButton.disabled = !state.origin || !state.destination;
  els.searchButton.textContent = state.origin && state.destination ? "次のバスを見る" : "出発と目的地を選んでください";
  els.swapButton.disabled = !state.origin || !state.destination;
  for (const button of els.destinationPresets) {
    const isActive = state.destination?.name === button.dataset.destination;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function selectOrigin(stop, options = {}) {
  const previousDestination = state.destination;
  const previousDestinationDisplayName = state.destinationDisplayName;
  state.origin = stop;
  state.destination = options.keepDestination ? previousDestination : null;
  state.destinationDisplayName = options.keepDestination ? previousDestinationDisplayName : "";
  els.originSearch.value = stop.name;
  if (!options.keepDestination) els.destinationSearch.value = "";

  clearRouteSigns();
  updateMarkerStyles();
  const marker = state.markers.get(stop.name);
  if (marker && state.map) {
    state.map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
    marker.openTooltip();
  }

  const destinationIds = new Set(stopGroupIds(stop).flatMap((id) => state.data.directDestinations[id] || []));
  const destinations = uniqueStopsByName([...destinationIds].map((id) => state.stopById.get(id)).filter(Boolean));
  const top = destinations.slice(0, 10).map((item) => item.name).join("、");
  els.status.textContent = destinations.length
    ? `この停留所から直通で行ける候補が ${destinations.length} 件あります。例: ${top}`
    : "この停留所から直通候補を見つけられませんでした。";
  updateLabels();
}

function selectDestination(stop, options = {}) {
  state.destination = stop;
  state.destinationDisplayName = options.displayName || "";
  els.destinationSearch.value = stop.name;
  clearRouteSigns();
  updateMarkerStyles();
  const marker = state.markers.get(stop.name);
  if (marker && state.map) {
    state.map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
    marker.openTooltip();
  }
  updateLabels();
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
    selectOrigin(stop, { keepDestination: Boolean(state.destination) });
    state.map.closePopup();
    if (state.destination) renderResult();
  });

  const destinationButton = document.createElement("button");
  destinationButton.type = "button";
  destinationButton.textContent = "目的地にする";
  destinationButton.addEventListener("click", () => {
    selectDestination(stop);
    state.map.closePopup();
    if (state.origin) renderResult();
  });

  actions.append(originButton, destinationButton);
  panel.append(actions);

  L.popup({ closeButton: true, autoPan: true })
    .setLatLng(latLng)
    .setContent(panel)
    .openOn(state.map);
}

function swapStops() {
  if (!state.origin || !state.destination) return;

  const previousOrigin = state.origin;
  state.origin = state.destination;
  state.destination = previousOrigin;
  state.destinationDisplayName = "";
  els.originSearch.value = state.origin.name;
  els.destinationSearch.value = state.destination.name;
  updateMarkerStyles();
  updateLabels();
  renderResult();
}

function findStopByName(name) {
  return state.data.stops.find((stop) => stop.name === name) || null;
}

function destinationTitle() {
  if (!state.destination) return "";
  if (!state.destinationDisplayName || state.destinationDisplayName === state.destination.name) {
    return state.destination.name;
  }
  return `${state.destinationDisplayName}（最寄り: ${state.destination.name}）`;
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
  renderResult();
  els.result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useDestinationPreset(stopName, displayName = stopName) {
  if (!state.data) {
    els.status.textContent = "GTFSデータを読み込み中です。少し待ってからもう一度押してください。";
    return;
  }

  const destination = findStopByName(stopName);
  if (!destination) {
    els.status.textContent = `${stopName} に対応する停留所が見つかりませんでした。`;
    return;
  }

  if (!state.origin && destination.name !== "長岡駅前") {
    const defaultOrigin = findStopByName("長岡駅前");
    if (defaultOrigin) selectOrigin(defaultOrigin);
  }

  selectDestination(destination, { displayName });
  if (state.origin) {
    renderResult();
    els.result.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  els.status.textContent = `${destinationTitle()} を目的地にしました。出発バス停を選んでください。`;
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

      if (!nearest) {
        els.status.textContent = "近くのバス停を見つけられませんでした。";
        return;
      }

      showUserLocation(position);
      selectOrigin(nearest.stop, { keepDestination: Boolean(state.destination) });
      const marker = state.markers.get(nearest.stop.name);
      if (marker && state.map) {
        state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 15), { animate: true });
      }
      els.status.textContent = `最寄り候補は ${nearest.stop.name}（${formatDistance(nearest.distance)}）です。`;

      if (state.destination) {
        renderResult();
        els.result.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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
  const isOrigin = state.origin?.name === stopName;
  const isDestination = state.destination?.name === stopName;
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

function findDepartures(originId, destinationId, date) {
  const serviceIds = activeServiceIds(date);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const originIds = new Set(stopGroupIds(state.stopById.get(originId) || state.origin));
  const destinationIds = new Set(stopGroupIds(state.stopById.get(destinationId) || state.destination));
  const results = [];

  for (const [tripId, times] of Object.entries(state.data.stopTimesByTrip)) {
    const trip = state.data.trips[tripId];
    if (!trip || !serviceIds.has(trip.serviceId)) continue;

    const originIndex = times.findIndex((time) => originIds.has(time.stopId));
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

  return results.sort((a, b) => a.departure - b.departure).slice(0, 5);
}

function findTransferDepartures(originId, destinationId, date) {
  const serviceIds = activeServiceIds(date);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const originIds = new Set(stopGroupIds(state.stopById.get(originId) || state.origin));
  const destinationIds = new Set(stopGroupIds(state.stopById.get(destinationId) || state.destination));
  const minTransferMinutes = 5;
  const maxTransferMinutes = 90;
  const firstLegs = [];
  const secondLegsByTransfer = new Map();

  for (const [tripId, times] of Object.entries(state.data.stopTimesByTrip)) {
    const trip = state.data.trips[tripId];
    if (!trip || !serviceIds.has(trip.serviceId)) continue;

    const route = state.data.routes[trip.routeId] || {};
    const routeName = route.longName || route.shortName || "路線名未設定";
    const originIndex = times.findIndex((time) => originIds.has(time.stopId));
    if (originIndex >= 0) {
      const departure = parseGtfsTime(times[originIndex].departure);
      if (departure >= nowMinutes) {
        for (let index = originIndex + 1; index < times.length; index += 1) {
          const transferStop = state.stopById.get(times[index].stopId);
          if (!transferStop || destinationIds.has(transferStop.id)) continue;
          firstLegs.push({
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
    const secondLeg = secondLegs.find((candidate) => {
      const wait = candidate.departure - firstLeg.arrival;
      return wait >= minTransferMinutes && wait <= maxTransferMinutes;
    });
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
    .slice(0, 3);
}

function renderResult() {
  const date = selectedDateTime();
  const departures = findDepartures(state.origin.id, state.destination.id, date);
  clearRouteSigns();
  els.resultEmpty.classList.add("hidden");
  els.result.classList.remove("hidden");

  if (!departures.length) {
    const transfers = findTransferDepartures(state.origin.id, state.destination.id, date);
    if (transfers.length) {
      drawRouteSigns([
        { stops: transfers[0].firstLeg.pathStops, kind: "first" },
        { stops: transfers[0].secondLeg.pathStops, kind: "second" }
      ]);
    }
    els.result.innerHTML = `
      <div class="next-card">
        <h2>直通便が見つかりません</h2>
        <p class="meta">直通はありません。下の候補はGTFS時刻から機械的に拾った1回乗り換え案です。</p>
        <p class="transfer-note">バスは道路状況で遅れることがあります。乗り換え時間には余裕を見てください。</p>
        ${transfers.length ? `<div class="transfer-list">
          ${transfers.map((item) => `
            <div class="transfer-card">
              <h3>${escapeHtml(item.transferName)}で乗り換え</h3>
              <p><strong>${formatGtfsTime(item.firstLeg.departure)}発</strong> ${escapeHtml(item.firstLeg.routeName)}</p>
              <p>${formatGtfsTime(item.firstLeg.arrival)}着 / ${item.wait}分待ち</p>
              <p><strong>${formatGtfsTime(item.secondLeg.departure)}発</strong> ${escapeHtml(item.secondLeg.routeName)}</p>
              <p>${formatGtfsTime(item.secondLeg.arrival)}着 / 合計約${item.totalMinutes}分</p>
            </div>
          `).join("")}
        </div>` : `<p class="meta">1回乗り換え候補も見つかりませんでした。出発地・目的地・時刻を変えて確認してください。</p>`}
      </div>
    `;
    return;
  }

  const [next, ...later] = departures;
  drawRouteSigns([{ stops: next.pathStops, kind: "direct" }]);
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const routeName = next.route.longName || next.route.shortName || "路線名未設定";
  const rideMinutes = Math.max(0, next.arrival - next.departure);

  els.result.innerHTML = `
    <div class="next-card">
      <p class="trip-label">${escapeHtml(state.origin.name)} → ${escapeHtml(destinationTitle())}</p>
      <h2>次のバスまで</h2>
      <p class="countdown">${next.departure - nowMinutes}<span>分</span></p>
      <p class="time-main"><strong>${formatGtfsTime(next.departure)}発</strong> / ${formatGtfsTime(next.arrival)}着 / 約${rideMinutes}分</p>
      <p class="route-name">${escapeHtml(routeName)}</p>
      <dl class="trip-detail">
        ${next.headsign ? `<div><dt>行先</dt><dd>${escapeHtml(next.headsign)}</dd></div>` : ""}
        ${next.platform ? `<div><dt>乗り場</dt><dd>${escapeHtml(next.platform)}番</dd></div>` : ""}
        <div><dt>停留所</dt><dd>${escapeHtml(next.originStop.id)} → ${escapeHtml(next.destinationStop.id)}</dd></div>
        <div><dt>停車数</dt><dd>${next.stopCount}停留所</dd></div>
      </dl>
      ${later.length ? `<div class="later"><strong>次の便</strong>${later.map((item) => `
        <div class="later-row">
          <span>${item.departure - nowMinutes}分後</span>
          <strong>${formatGtfsTime(item.departure)}発</strong>
          <small>${escapeHtml(item.originStop.id)} → ${escapeHtml(item.destinationStop.id)}</small>
        </div>
      `).join("")}</div>` : ""}
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
    const destinationIds = state.origin
      ? new Set(stopGroupIds(state.origin).flatMap((id) => state.data.directDestinations[id] || []))
      : new Set();
    const pool = uniqueStopsByName([...destinationIds].map((id) => state.stopById.get(id)).filter(Boolean));
    renderCandidates(destinationCandidates, findStops(els.destinationSearch.value, pool.length ? pool : state.data.stops), selectDestination);
  });

  els.searchButton.addEventListener("click", renderResult);
  els.swapButton.addEventListener("click", swapStops);
  els.sampleRouteButton.addEventListener("click", useSampleRoute);
  els.currentLocationButton.addEventListener("click", useCurrentLocation);
  for (const button of els.destinationPresets) {
    button.addEventListener("click", () => useDestinationPreset(button.dataset.destination, button.dataset.destinationLabel || button.textContent.trim()));
  }
}

async function init() {
  todayInputs();
  els.searchButton.disabled = true;

  const response = await fetch("./data/gtfs-index.json");
  state.data = await response.json();
  state.stopById = new Map(state.data.stops.map((stop) => [stop.id, stop]));
  state.stopIdsByName = new Map();
  for (const stop of state.data.stops) {
    if (!state.stopIdsByName.has(stop.name)) state.stopIdsByName.set(stop.name, []);
    state.stopIdsByName.get(stop.name).push(stop.id);
  }

  initMap();
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
