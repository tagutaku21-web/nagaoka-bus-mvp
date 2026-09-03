# データ元・ライセンス確認メモ

## 長岡市GTFS

- 長岡市公式ページ: https://www.city.nagaoka.niigata.jp/shisei/cate10/gtfs.html
- 公式ページ上のライセンス表示: CC BY（表示）
- 越後交通路線バスGTFS: 「ながおかバスi」にて公開と案内

## 越後交通 長岡地区GTFS

- Transitland掲載URL: https://bus-vision.jp/gtfs_v2/nagaoka/gtfsFeed
- Transitland上の掲載情報では、2026-05-22から2026-10-03までのfeedが確認できる
- routes: 41
- stops: 1,520
- trips: 1,042
- stop_times: 32,875

## 実装前に残る確認

- 広告付きWebサービスでの利用可否
- DB保存・加工表示の条件
- 出典表記の正確な文言
- GTFS-Realtimeの第三者利用可否

このMVPでは、静的GTFSを読み込んで直通検索を検証するところまでに限定する。
