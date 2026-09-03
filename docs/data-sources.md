# データ元・ライセンス確認メモ

## 長岡市GTFS

- 長岡市公式ページ: https://www.city.nagaoka.niigata.jp/shisei/cate10/gtfs.html
- 公式ページ上のライセンス表示: CC BY（表示）
- 越後交通路線バスGTFS: 「ながおかバスi」にて公開と案内

## 越後交通 長岡地区GTFS

- 取得URL: https://bus-vision.jp/gtfs_v2/nagaoka/gtfsFeed
- feed_publisher_name: 越後交通
- feed_start_date: 2026-05-22
- feed_end_date: 2026-12-05
- feed_version: 20260522_20260903
- routes: 41
- stops: 1,520
- trips: 1,042
- stop_times: 32,875

## 最初の動作確認

- `長岡駅前` は同名の12乗り場をまとめて検索対象にする
- `日赤病院前` は同名の2停留所をまとめて検索対象にする
- 2026-09-03 木曜ダイヤでは、長岡駅前から日赤病院前への平日9時以降の直通候補を39本確認

## 実装前に残る確認

- 広告付きWebサービスでの利用可否
- DB保存・加工表示の条件
- 出典表記の正確な文言
- GTFS-Realtimeの第三者利用可否

このMVPでは、静的GTFSを読み込んで直通検索を検証するところまでに限定する。
