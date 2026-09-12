import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/data/feeds/joetsu.json", import.meta.url);
const data = JSON.parse(await readFile(file, "utf8"));

const sourceFeed = "kubiki-route2";
const oldSourceFeed = "kubiki-core";
const serviceWeekday = `${sourceFeed}:weekday`;
const serviceWeekend = `${sourceFeed}:weekend`;
const routeId = `${sourceFeed}:joetsu-odori-2`;
const dash = null;

const stopRows = [
  ["fukuhashi-east", "福橋東", 37.1919, 138.2662],
  ["fukuhashi", "福橋", 37.1907, 138.2637],
  ["fukuda", "福田", 37.1895, 138.2608],
  ["techno-center", "上越テクノセンター前", 37.1885, 138.2575],
  ["mitsuya", "三ツ屋", 37.1872, 138.2542],
  ["yasue-1", "安江一丁目", 37.1854, 138.2511],
  ["komachi-bridge", "小町橋", 37.1831, 138.2488],
  ["kasugashinden-east", "春日新田東", 37.1819, 138.247],
  ["kasugashinden-west", "春日新田西", 37.1809, 138.245],
  ["miyanomae-park", "宮の前公園", 37.1797, 138.2431],
  ["naoetsu-port", "直江津港", 37.1844, 138.2408],
  ["minatomachi-1", "港町一丁目", 37.1818, 138.2418],
  ["kojo-park", "古城公園", 37.1794, 138.2428],
  ["nittetsu-kozai", "日鉄工材前", 37.1772, 138.2436],
  ["kawaramachi", "川原町", 37.1753, 138.2443],
  ["chuo-2", "中央二丁目", 37.1734, 138.2441],
  ["chuo-1", "中央一丁目", 37.1719, 138.2437],
  ["naoetsu-ekimae-dori", "直江津駅前通り", 37.1709, 138.243],
  ["naoetsu", "直江津駅前", 37.170294, 138.242262],
  ["nishihoncho-2", "西本町二丁目", 37.1709, 138.2396],
  ["naoetsu-sc", "直江津ショッピングセンター前", 37.171909, 138.236636],
  ["otate-bridge", "御館橋", 37.1706, 138.2372],
  ["marukei-bus-center", "マルケーバスセンター", 37.169129, 138.239259],
  ["ishibashi", "石橋", 37.1651, 138.2389],
  ["shinkocho", "新光町", 37.1597, 138.2379],
  ["joetsu-city-office", "上越市役所入口", 37.147078, 138.23616],
  ["kida", "木田", 37.143, 138.2371],
  ["takashi-school", "高志小学校入口", 37.1388, 138.2385],
  ["fujimaki-iriguchi", "藤巻入口", 37.1336, 138.2411],
  ["citizen-plaza", "市民プラザ前", 37.1315, 138.2422],
  ["shintsuchihashi", "新土橋", 37.1305, 138.2426],
  ["shinmachi", "新町", 37.1297, 138.2431],
  ["sakaemachi-iriguchi", "栄町入口", 37.1266, 138.2442],
  ["johoku-junior-high", "城北中学校前", 37.1248, 138.2447],
  ["higashihoncho-3", "東本町三丁目", 37.1223, 138.2453],
  ["kitashirocho-3", "北城町三丁目", 37.1196, 138.2461],
  ["saijo-cross", "西城町十字路", 37.1163, 138.2474],
  ["saijo-hospital", "西城病院前", 37.11389, 138.249403],
  ["otemachi-cross", "大手町十字路", 37.1126, 138.2512],
  ["takada-park", "高田城址公園", 37.109382, 138.255276],
  ["regional-office-entry", "上越地域振興局庁舎入口", 37.1076, 138.257],
  ["saijo-1", "西城町一丁目", 37.113, 138.2463],
  ["kitashirocho", "北城町", 37.1109, 138.248],
  ["technical-high-school", "総合技術高校前", 37.1087, 138.2499],
  ["regional-office", "上越地域振興局庁舎前", 37.1077, 138.2526],
  ["takada-high-school", "高田高校前", 37.1064, 138.255],
  ["higashishirocho-1", "東城町一丁目", 37.1047, 138.2581],
  ["higashishirocho-3", "東城町三丁目", 37.1055, 138.2608],
  ["kamoshima-3", "鴨島三丁目", 37.1046, 138.2638],
  ["nursing-university", "看護大学", 37.103936, 138.262766],
  ["central-hospital", "中央病院", 37.103383, 138.26586],
  ["joetsu-myoko", "上越妙高駅前", 37.081566, 138.248653],
  ["wakinoda", "脇野田", 37.0837, 138.2491],
  ["aramachi", "荒町", 37.087, 138.25],
  ["minamihoncho-1", "南本町一丁目", 37.0911, 138.2514],
  ["minamihoncho-1-north", "南本町一丁目北", 37.0932, 138.252],
  ["medical-center-entry", "医療センター入口", 37.0961, 138.2527],
  ["minamihoncho-2", "南本町二丁目", 37.0993, 138.2533],
  ["minamishirocho-1", "南城町一丁目", 37.1023, 138.2539],
  ["minamishirocho-3", "南城町三丁目", 37.1054, 138.2548]
];

const idByName = new Map(stopRows.map(([id, name]) => [name, id]));
const stopId = (id) => `${sourceFeed}:${id}`;

const stops = stopRows.map(([id, name, lat, lon]) => ({
  id: stopId(id),
  code: "",
  name,
  description: "頸城自動車公式時刻表をもとにした上越大通り線2番の試験補完",
  lat,
  lon,
  platform: "",
  sourceFeed
}));

const route = {
  id: routeId,
  shortName: "2",
  longName: "上越大通り線（福橋東・直江津港 - 西城病院前 - 中央病院・上越妙高駅前）",
  color: "0F766E",
  textColor: "FFFFFF",
  sourceFeed
};

const forwardRows = [
  ["福橋東", ["7:05", "8:40", "11:30", dash, "17:29"], [dash, dash]],
  ["福橋", ["7:05", "8:40", "11:30", dash, "17:29"], [dash, dash]],
  ["福田", ["7:05", "8:40", "11:30", dash, "17:29"], [dash, dash]],
  ["上越テクノセンター前", ["7:07", "8:42", "11:32", dash, "17:31"], [dash, dash]],
  ["三ツ屋", ["7:07", "8:42", "11:32", dash, "17:32"], [dash, dash]],
  ["安江一丁目", ["7:08", "8:44", "11:33", dash, "17:34"], [dash, dash]],
  ["小町橋", ["7:10", "8:46", "11:35", dash, "17:36"], [dash, dash]],
  ["春日新田東", ["7:10", "8:46", "11:35", dash, "17:36"], [dash, dash]],
  ["春日新田西", ["7:11", "8:47", "11:36", dash, "17:37"], [dash, dash]],
  ["宮の前公園", ["7:12", "8:48", "11:37", dash, "17:38"], [dash, dash]],
  ["直江津港", [dash, dash, dash, "16:20", dash], ["8:05", "11:00"]],
  ["港町一丁目", [dash, dash, dash, "16:20", dash], ["8:05", "11:00"]],
  ["古城公園", [dash, dash, dash, "16:21", dash], ["8:06", "11:01"]],
  ["日鉄工材前", [dash, dash, dash, "16:22", dash], ["8:07", "11:02"]],
  ["川原町", ["7:15", "8:49", "11:38", "16:23", "17:39"], ["8:08", "11:03"]],
  ["中央二丁目", ["7:17", "8:51", "11:40", "16:25", "17:41"], ["8:10", "11:05"]],
  ["中央一丁目", ["7:18", "8:52", "11:41", "16:26", "17:42"], ["8:11", "11:06"]],
  ["直江津駅前通り", ["7:18", "8:52", "11:41", "16:26", "17:42"], ["8:11", "11:06"]],
  ["直江津駅前", ["7:21", "8:55", "11:44", "16:29", "17:45"], ["8:14", "11:09"]],
  ["西本町二丁目", ["7:22", "8:56", "11:45", "16:30", "17:46"], ["8:15", "11:10"]],
  ["直江津ショッピングセンター前", ["7:26", "9:00", "11:49", "16:34", "17:50"], ["8:19", "11:14"]],
  ["御館橋", ["7:27", "9:01", "11:50", "16:35", "17:51"], ["8:20", "11:15"]],
  ["マルケーバスセンター", ["7:28", "9:02", "11:51", "16:36", "17:52"], ["8:21", "11:16"]],
  ["石橋", ["7:30", "9:04", "11:53", "16:38", "17:54"], ["8:23", "11:18"]],
  ["新光町", ["7:31", "9:05", "11:54", "16:39", "17:55"], ["8:24", "11:19"]],
  ["上越市役所入口", ["7:32", "9:06", "11:55", "16:40", "17:56"], ["8:25", "11:20"]],
  ["木田", ["7:33", "9:07", "11:56", "16:41", "17:57"], ["8:26", "11:21"]],
  ["高志小学校入口", ["7:35", "9:08", "11:57", "16:42", "17:58"], ["8:27", "11:22"]],
  ["藤巻入口", ["7:38", "9:10", "11:59", "16:44", "18:00"], ["8:29", "11:24"]],
  ["市民プラザ前", ["7:39", "9:11", "12:00", "16:45", "18:01"], ["8:30", "11:25"]],
  ["新町", ["7:39", "9:11", "12:00", "16:45", "18:02"], ["8:30", "11:25"]],
  ["栄町入口", ["7:41", "9:12", "12:01", "16:46", "18:03"], ["8:31", "11:26"]],
  ["城北中学校前", ["7:42", "9:13", "12:02", "16:47", "18:04"], ["8:32", "11:27"]],
  ["東本町三丁目", ["7:43", "9:14", "12:03", "16:48", "18:05"], ["8:33", "11:28"]],
  ["北城町三丁目", ["7:44", "9:15", "12:04", "16:49", "18:06"], ["8:34", "11:29"]],
  ["西城町十字路", ["7:45", "9:17", "12:06", "16:51", "18:08"], ["8:36", "11:31"]],
  ["西城病院前", [dash, "9:18", "12:07", "16:52", "18:09"], ["8:37", "11:32"]],
  ["大手町十字路", [dash, "9:19", "12:08", "16:53", "18:10"], ["8:38", "11:33"]],
  ["高田城址公園", [dash, "9:20", "12:09", "16:54", "18:11"], ["8:39", "11:34"]],
  ["上越地域振興局庁舎入口", [dash, "9:21", "12:10", "16:55", "18:12"], ["8:40", "11:35"]],
  ["西城町一丁目", ["7:46", dash, dash, dash, dash], [dash, dash]],
  ["北城町", ["7:47", dash, dash, dash, dash], [dash, dash]],
  ["総合技術高校前", ["7:48", dash, dash, dash, dash], [dash, dash]],
  ["上越地域振興局庁舎前", ["7:48", dash, dash, dash, dash], [dash, dash]],
  ["高田高校前", ["7:51", dash, dash, dash, dash], [dash, dash]],
  ["東城町一丁目", ["7:54", dash, dash, dash, dash], [dash, dash]],
  ["東城町三丁目", [dash, "9:22", "12:11", "16:56", "18:13"], ["8:41", "11:36"]],
  ["鴨島三丁目", ["8:00", "9:24", "12:13", "16:58", "18:15"], ["8:43", "11:38"]],
  ["看護大学", ["8:00", "9:24", "12:13", "16:58", "18:15"], ["8:43", "11:38"]],
  ["中央病院", ["8:02", "9:26", "12:15", "17:00", "18:17"], ["8:45", "11:40"]]
];

const reverseRows = [
  ["上越妙高駅前", ["7:17", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["脇野田", ["7:18", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["荒町", ["7:19", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["南本町一丁目", ["7:20", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["南本町一丁目北", ["7:20", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["医療センター入口", ["7:21", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["南本町二丁目", ["7:22", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["南城町一丁目", ["7:23", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["南城町三丁目", ["7:24", dash, dash, dash, dash, dash, dash, dash, dash, dash], [dash, dash, dash, dash]],
  ["中央病院", [dash, "8:40", "10:40", "11:30", "12:10", "14:20", "15:20", "16:30", "16:50", "18:32"], ["9:20", "11:30", "14:20", "15:40"]],
  ["看護大学", [dash, "8:41", "10:41", "11:31", "12:11", "14:21", "15:21", "16:31", "16:51", "18:33"], ["9:21", "11:31", "14:21", "15:41"]],
  ["鴨島三丁目", [dash, "8:41", "10:41", "11:31", "12:11", "14:21", "15:21", "16:31", "16:51", "18:33"], ["9:21", "11:31", "14:21", "15:41"]],
  ["東城町三丁目", [dash, "8:43", "10:43", "11:33", "12:13", "14:23", "15:23", "16:33", "16:53", "18:35"], ["9:23", "11:33", "14:23", "15:43"]],
  ["上越地域振興局庁舎入口", [dash, "8:44", "10:44", "11:34", "12:14", "14:24", "15:24", "16:34", "16:54", "18:36"], ["9:24", "11:34", "14:24", "15:44"]],
  ["高田城址公園", [dash, "8:45", "10:45", "11:35", "12:15", "14:25", "15:25", "16:35", "16:55", "18:37"], ["9:25", "11:35", "14:25", "15:45"]],
  ["大手町十字路", ["7:26", "8:47", "10:47", "11:37", "12:17", "14:27", "15:27", "16:37", "16:57", "18:39"], ["9:27", "11:37", "14:27", "15:47"]],
  ["西城病院前", ["7:26", "8:47", "10:47", "11:37", "12:17", "14:27", "15:27", "16:37", "16:57", "18:39"], ["9:27", "11:37", "14:27", "15:47"]],
  ["西城町十字路", ["7:27", "8:48", "10:48", "11:38", "12:18", "14:28", "15:28", "16:38", "16:58", "18:40"], ["9:28", "11:38", "14:28", "15:48"]],
  ["北城町三丁目", ["7:28", "8:49", "10:49", "11:39", "12:19", "14:29", "15:29", "16:39", "16:59", "18:41"], ["9:29", "11:39", "14:29", "15:49"]],
  ["東本町三丁目", ["7:29", "8:50", "10:50", "11:40", "12:20", "14:30", "15:30", "16:40", "17:00", "18:42"], ["9:30", "11:40", "14:30", "15:50"]],
  ["城北中学校前", ["7:30", "8:51", "10:51", "11:41", "12:21", "14:31", "15:31", "16:41", "17:01", "18:43"], ["9:31", "11:41", "14:31", "15:51"]],
  ["栄町入口", ["7:31", "8:52", "10:52", "11:42", "12:22", "14:32", "15:32", "16:42", "17:02", "18:44"], ["9:32", "11:42", "14:32", "15:52"]],
  ["新町", ["7:32", "8:53", "10:53", "11:43", "12:23", "14:33", "15:33", "16:43", "17:03", "18:45"], ["9:33", "11:43", "14:33", "15:53"]],
  ["市民プラザ前", ["7:33", "8:54", "10:54", "11:44", "12:24", "14:34", "15:34", "16:44", "17:04", "18:46"], ["9:34", "11:44", "14:34", "15:54"]],
  ["新土橋", ["7:33", "8:54", "10:54", "11:44", "12:24", "14:34", "15:34", "16:44", "17:04", "18:46"], ["9:34", "11:44", "14:34", "15:54"]],
  ["藤巻入口", ["7:35", "8:56", "10:56", "11:46", "12:26", "14:36", "15:36", "16:46", "17:06", "18:48"], ["9:36", "11:46", "14:36", "15:56"]],
  ["高志小学校入口", ["7:36", "8:57", "10:57", "11:47", "12:27", "14:37", "15:37", "16:47", "17:07", "18:49"], ["9:37", "11:47", "14:37", "15:57"]],
  ["木田", ["7:37", "8:58", "10:58", "11:48", "12:28", "14:38", "15:38", "16:48", "17:08", "18:50"], ["9:38", "11:48", "14:38", "15:58"]],
  ["上越市役所入口", ["7:39", "9:00", "11:00", "11:50", "12:30", "14:40", "15:40", "16:50", "17:10", "18:52"], ["9:40", "11:50", "14:40", "16:00"]],
  ["新光町", ["7:40", "9:01", "11:01", "11:51", "12:31", "14:41", "15:41", "16:51", "17:11", "18:53"], ["9:41", "11:51", "14:41", "16:01"]],
  ["石橋", ["7:41", "9:02", "11:02", "11:52", "12:32", "14:42", "15:42", "16:52", "17:12", "18:54"], ["9:42", "11:52", "14:42", "16:02"]],
  ["マルケーバスセンター", ["7:44", "9:04", "11:04", "11:54", "12:34", "14:44", "15:44", "16:54", "17:14", "18:56"], ["9:44", "11:54", "14:44", "16:04"]],
  ["御館橋", ["7:45", "9:05", "11:05", "11:55", "12:35", "14:45", "15:45", "16:55", "17:15", "18:57"], ["9:45", "11:55", "14:45", "16:05"]],
  ["直江津ショッピングセンター前", ["7:46", "9:06", "11:06", "11:56", "12:36", "14:46", "15:46", "16:56", "17:16", "18:58"], ["9:46", "11:56", "14:46", "16:06"]],
  ["西本町二丁目", ["7:48", "9:08", "11:08", "11:58", "12:38", "14:48", "15:48", "16:58", "17:18", "19:00"], ["9:48", "11:58", "14:48", "16:08"]],
  ["直江津駅前", ["7:51", "9:11", "11:11", "12:01", "12:41", "14:51", "15:51", "17:01", "17:21", "19:03"], ["9:51", "12:01", "14:51", "16:11"]],
  ["直江津駅前通り", ["7:51", "9:11", "11:11", "12:01", "12:41", "14:51", "15:51", "17:01", "17:21", "19:03"], ["9:51", "12:01", "14:51", "16:11"]],
  ["中央一丁目", ["7:53", "9:13", "11:13", "12:03", "12:43", "14:53", "15:53", "17:03", "17:23", "19:05"], ["9:53", "12:03", "14:53", "16:13"]],
  ["中央二丁目", ["7:55", "9:14", "11:14", "12:04", "12:44", "14:54", "15:54", "17:04", "17:24", "19:06"], ["9:54", "12:04", "14:54", "16:14"]],
  ["川原町", ["7:56", "9:15", "11:15", "12:05", "12:45", "14:55", "15:55", "17:05", "17:25", "19:07"], ["9:55", "12:05", "14:55", "16:15"]],
  ["日鉄工材前", [dash, dash, "11:16", "12:06", "12:46", "14:56", "15:56", dash, "17:26", "19:08"], ["9:56", "12:06", "14:56", "16:16"]],
  ["古城公園", [dash, dash, "11:17", "12:07", "12:47", "14:57", "15:57", dash, "17:27", "19:09"], ["9:57", "12:07", "14:57", "16:17"]],
  ["直江津港", [dash, dash, "11:19", "12:09", "12:49", "14:59", "15:59", dash, "17:29", "19:11"], ["9:59", "12:09", "14:59", "16:19"]],
  ["宮の前公園", ["7:57", "9:16", dash, dash, dash, dash, dash, "17:06", dash, dash], [dash, dash, dash, dash]],
  ["春日新田西", ["7:58", "9:17", dash, dash, dash, dash, dash, "17:07", dash, dash], [dash, dash, dash, dash]],
  ["春日新田東", ["7:58", "9:17", dash, dash, dash, dash, dash, "17:07", dash, dash], [dash, dash, dash, dash]],
  ["小町橋", ["8:00", "9:19", dash, dash, dash, dash, dash, "17:09", dash, dash], [dash, dash, dash, dash]],
  ["安江一丁目", ["8:01", "9:20", dash, dash, dash, dash, dash, "17:10", dash, dash], [dash, dash, dash, dash]],
  ["三ツ屋", ["8:03", "9:22", dash, dash, dash, dash, dash, "17:12", dash, dash], [dash, dash, dash, dash]],
  ["上越テクノセンター前", ["8:04", "9:23", dash, dash, dash, dash, dash, "17:13", dash, dash], [dash, dash, dash, dash]],
  ["福田", ["8:04", "9:23", dash, dash, dash, dash, dash, "17:13", dash, dash], [dash, dash, dash, dash]],
  ["福橋", ["8:05", "9:24", dash, dash, dash, dash, dash, "17:14", dash, dash], [dash, dash, dash, dash]],
  ["福橋東", ["8:08", "9:27", dash, dash, dash, dash, dash, "17:17", dash, dash], [dash, dash, dash, dash]]
];

function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function tripsFromRows(rows, timetableKey, count, serviceId, directionId, headsign, labelPrefix) {
  return Array.from({ length: count }, (_, tripIndex) => ({
    id: `${sourceFeed}:${labelPrefix}:${tripIndex + 1}`,
    routeId,
    serviceId,
    headsign,
    directionId,
    stops: rows
      .map(([name, weekday, weekend]) => {
        const time = (timetableKey === "weekday" ? weekday : weekend)[tripIndex];
        return time ? [idByName.get(name), time] : null;
      })
      .filter(Boolean)
  })).filter((trip) => trip.stops.length >= 2);
}

function addTrip(trip) {
  data.trips[trip.id] = {
    id: trip.id,
    routeId: trip.routeId,
    serviceId: trip.serviceId,
    headsign: trip.headsign,
    directionId: trip.directionId,
    sourceFeed
  };
  data.stopTimesByTrip[trip.id] = trip.stops.map(([id, time], sequence) => ({
    stopId: stopId(id),
    arrival: formatTime(time),
    departure: formatTime(time),
    sequence: sequence + 1,
    headsign: trip.headsign
  }));
}

function addDirectDestination(origin, destination) {
  if (!data.directDestinations[origin]) data.directDestinations[origin] = [];
  if (!data.directDestinations[origin].includes(destination)) data.directDestinations[origin].push(destination);
}

function isSupplementId(id) {
  return id.startsWith(`${sourceFeed}:`) || id.startsWith(`${oldSourceFeed}:`);
}

data.stops = data.stops.filter((item) => item.sourceFeed !== sourceFeed && item.sourceFeed !== oldSourceFeed);
data.stops.push(...stops);

for (const key of Object.keys(data.routes)) {
  if (isSupplementId(key)) delete data.routes[key];
}
data.routes[routeId] = route;

for (const tripId of Object.keys(data.trips)) {
  if (isSupplementId(tripId)) {
    delete data.trips[tripId];
    delete data.stopTimesByTrip[tripId];
  }
}
for (const key of Object.keys(data.directDestinations)) {
  if (isSupplementId(key)) delete data.directDestinations[key];
}
for (const key of Object.keys(data.calendar)) {
  if (isSupplementId(key)) delete data.calendar[key];
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

const trips = [
  ...tripsFromRows(forwardRows, "weekday", 5, serviceWeekday, "0", "中央病院", "wd-out"),
  ...tripsFromRows(reverseRows, "weekday", 10, serviceWeekday, "1", "直江津港・福橋東", "wd-in"),
  ...tripsFromRows(forwardRows, "weekend", 2, serviceWeekend, "0", "中央病院", "we-out"),
  ...tripsFromRows(reverseRows, "weekend", 4, serviceWeekend, "1", "直江津港", "we-in")
];
trips.forEach(addTrip);

for (const times of Object.values(data.stopTimesByTrip)) {
  for (let i = 0; i < times.length; i += 1) {
    for (let j = i + 1; j < times.length; j += 1) {
      addDirectDestination(times[i].stopId, times[j].stopId);
    }
  }
}

data.generatedAt = new Date().toISOString();
const basePublisher = (data.feed?.feed_publisher_name || "上越市")
  .replace(/\s*\/\s*頸城自動車（主要停留所補完）/g, "")
  .replace(/\s*\/\s*頸城自動車（上越大通り線2番補完）/g, "");
data.feed = {
  ...data.feed,
  feed_publisher_name: `${basePublisher} / 頸城自動車（上越大通り線2番補完）`,
  feed_version: `${data.feed?.feed_version || ""} + kubiki-route2-20260330`.trim()
};

await writeFile(file, `${JSON.stringify(data)}\n`, "utf8");
console.log(`Added ${stops.length} Kubiki Route 2 stops and ${trips.length} trips.`);
