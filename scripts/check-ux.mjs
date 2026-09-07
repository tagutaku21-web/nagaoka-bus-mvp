// Execute the production code with a minimal DOM adapter. No routing logic is duplicated here.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  constructor() {
    this.value = ''; this.innerHTML = ''; this.textContent = ''; this.children = []; this.dataset = {}; this.events = {};
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => {
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name);
        else classes.delete(name);
        return enabled;
      },
      contains: (name) => classes.has(name)
    };
  }
  addEventListener(name, fn) { this.events[name] = fn; }
  dispatch(name, event = {}) { this.events[name]?.(event); }
  append(...items) { this.children.push(...items); }
  after(item) { this.afterElement = item; }
  get childElementCount() { return this.children.length; }
  querySelector(selector) { return selector === 'button' ? this.children.find((x) => x.type === 'button') : element(selector); }
  querySelectorAll() { return []; }
  setAttribute() {}
  contains() { return false; }
  scrollIntoView() {}
  focus() {}
  click() { this.dispatch('click'); }
}
const elements = new Map();
function element(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }
const document = { querySelector: element, createElement: () => new Element(), querySelectorAll: () => [], addEventListener() {}, hidden: false };
const data = JSON.parse(await readFile(new URL('../public/data/gtfs-index.json', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/init\(\)\.catch\([\s\S]*$/, '');
const context = vm.createContext({ document, console, Intl, assert, data, setInterval() {}, navigator: {} });
vm.runInContext(source + `
state.data = data;
state.stopById = new Map(data.stops.map((s) => [s.id, s]));
for (const stop of data.stops) {
  if (!state.stopIdsByName.has(stop.name)) state.stopIdsByName.set(stop.name, []);
  state.stopIdsByName.get(stop.name).push(stop.id);
}
els.journeyOrder.value = "direct";
state.timeMode = "scheduled";
els.rideDate.value = "2026-09-03";
els.rideTime.value = "09:00";
wireSearch();

selectOrigin(findStopByName("長岡駅前"));
selectDestination(findStopByName("日赤病院前"));
assert(state.hasResults);
assert(state.journeys.some((j) => j.transfers === 0));
assert(els.result.innerHTML.includes("指定日時"));
assert(els.result.innerHTML.includes('09:10'));
assert(els.result.querySelector("#journey-detail").innerHTML.includes("乗る場所を地図で見る"));
const previousDestination = state.destination;
selectOrigin(findStopByName("長岡駅東口"));
assert.equal(state.destination, previousDestination, "Changing origin must preserve destination");

els.originSearch.value = "長岡駅";
els.originSearch.dispatch("input");
assert.equal(state.origin, null);
assert.equal(state.hasResults, false);
assert.equal(els.result.innerHTML, "");
assert.equal(els.searchButton.disabled, true);
assert.equal(state.destination, previousDestination);
selectOrigin(findStopByName("長岡駅前"));
els.destinationSearch.value = "今朝白１丁目";
els.destinationSearch.dispatch("input");
assert(els.destinationSearch.afterElement.children.some((button) => button.textContent.includes("今朝白１丁目")), "Transfer-only destinations must appear");
assert.equal(state.destination, null);
selectDestination(findStopByName("今朝白１丁目"));
assert(state.journeys.some((j) => j.transfers === 1));
assert(state.journeys.every((j) => j.legs.every((leg) => leg.tripId)));

selectDestination(landmarkSelection(landmarks.find((l) => l.name === "リバーサイド千秋")));
assert(state.journeys.length > 1);
assert.equal(state.journeys[0].destinationStop.name, "センタープラザ前");
assert(!state.journeys.some((j) => j.destinationStop.name === "イオン長岡店前"));
assert(els.result.innerHTML.includes("日赤病院前"));
showJourney(1);
assert.equal(state.activeJourneyKey, journeyKey(state.journeys[1]));
assert(els.result.querySelector("#journey-detail").innerHTML.includes(formatGtfsTime(state.journeys[1].departure)));
els.journeyOrder.value = "arrival";
renderResult();
assert(state.journeys.every((j, i, a) => i === 0 || a[i - 1].arrival <= j.arrival));
swapStops();
assert(state.origin.landmark);
assert.equal(state.destination.name, "長岡駅前");
assert(state.journeys.length);

els.rideDate.value = "2027-09-03";
renderResult();
assert(els.result.innerHTML.includes("この日付の時刻表データがありません"));
els.rideDate.value = "";
renderResult();
assert.equal(state.hasResults, false);
assert(els.status.textContent.includes("日付と時刻"));
els.rideDate.value = "2026-09-03";
selectOrigin(findStopByName("長岡駅前"));
selectDestination(findStopByName("長岡駅前"));
assert.equal(state.hasResults, false);
assert(els.status.textContent.includes("同じ"));

const jp = japanNow(new Date("2026-09-03T23:30:00Z"));
assert.equal(jp.getDate(), 4);
assert.equal(jp.getHours(), 8);
els.timeMode.value = "now";
els.timeMode.dispatch("change");
assert.equal(state.timeMode, "now");
assert(els.timeFields.hidden);
assert.equal(yyyymmdd(selectedDateTime()), yyyymmdd(japanNow()));

state.timeMode = "scheduled";
els.rideDate.value = "2026-09-03";
els.rideTime.value = "09:00";
renderTimetable(findStopByName("長岡駅前"));
assert(els.result.innerHTML.includes("長岡駅前 の時刻表"));
assert(els.result.innerHTML.includes("GTFSの静的時刻表"));
assert(els.result.innerHTML.includes("上り下り"));
assert(els.result.innerHTML.includes("バス停に貼ってある時刻表"));
assert(els.result.innerHTML.includes("方面"));
assert(els.result.innerHTML.includes("09:10"));

// An express leaving the transfer stop later must beat a slow earlier bus.
state.data = { calendar: { daily: { startDate: "20260903", endDate: "20260903", thursday: true } }, calendarDates: {},
  stops: [{ id: "a", name: "A", lat: 37, lon: 138 }, { id: "b", name: "B", lat: 37.001, lon: 138 }, { id: "c", name: "C", lat: 37.002, lon: 138 }],
  routes: { r: { longName: "test" } }, trips: { first: { serviceId: "daily", routeId: "r" }, slow: { serviceId: "daily", routeId: "r" }, fast: { serviceId: "daily", routeId: "r" } },
  stopTimesByTrip: { first: [{ stopId: "a", departure: "09:00", arrival: "09:00" }, { stopId: "b", departure: "09:10", arrival: "09:10" }],
    slow: [{ stopId: "b", departure: "09:15", arrival: "09:15" }, { stopId: "c", departure: "10:00", arrival: "10:00" }],
    fast: [{ stopId: "b", departure: "09:20", arrival: "09:20" }, { stopId: "c", departure: "09:30", arrival: "09:30" }] } };
state.stopById = new Map(state.data.stops.map((s) => [s.id, s]));
state.stopIdsByName = new Map(state.data.stops.map((s) => [s.name, [s.id]]));
const transfers = findTransferDepartures("a", "c", new Date(2026, 8, 3, 8, 59));
assert.equal(transfers[0].secondLeg.tripId, "fast");
assert.equal(transfers[0].secondLeg.arrival, 570);
assert.equal(findDepartures("a", "b", new Date(2026, 8, 3, 9, 0, 30)).length, 0, "Departed buses must not appear as upcoming");
`, context);
console.log('UX regression checks passed: selection, transfer-only search, facilities, sorting, details, stop timetables, dates, Japan time, express transfers.');
