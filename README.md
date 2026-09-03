# 長岡バス直感検索 MVP

長岡市・越後交通のGTFSを使い、まずは「バス停を選ぶ → 直通で行ける目的地を選ぶ → 次のバスまで何分か」を表示する試作MVPです。

## できること

- GTFS静的データの読み込み
- バス停一覧の表示
- バス停ごとの直通目的地候補の生成
- 今日有効な `service_id` の判定
- 24時超え表記、例 `25:10:00`、への対応
- 現在時刻以降の次便・次々便表示
- 路線名・経由・停車順の詳細表示

## まだ入れていないもの

- 乗換検索
- 徒歩ルート
- Supabase / PostGIS
- GTFS-Realtime
- 広告
- 施設DBの本格整備

## GTFSの用意

長岡市公式ページでは公共交通GTFSデータがオープンデータとして案内されています。越後交通のGTFSは「ながおかバスi」側で公開されています。

今回の検証では、以下のURLから越後交通 長岡地区GTFSを取得しました。

```bash
mkdir -p data/raw data/gtfs/nagaoka
curl -L --fail --show-error --output data/raw/nagaoka-gtfs.zip https://bus-vision.jp/gtfs_v2/nagaoka/gtfsFeed
unzip -oq data/raw/nagaoka-gtfs.zip -d data/gtfs/nagaoka
GTFS_DIR=data/gtfs/nagaoka npm run import:gtfs
npm run serve
```

ブラウザで `http://localhost:4173` を開きます。

`data/` は作業用の取得・展開場所です。公開するアプリは `public/data/gtfs-index.json` を読み込みます。

基準ルートが取り込めているかは、以下で確認できます。

```bash
npm run check:sample
```

## 最初の検証

まずは以下を確認します。

- 出発: 長岡駅大手口
- 目的地: 長岡赤十字病院、または日赤病院前に相当する停留所
- 表示される次便・次々便が公式時刻表と一致すること

アプリ内では、まず `長岡駅大手口` を `長岡駅前`、`長岡赤十字病院` を `日赤病院前` として検索できるようにしています。同名の複数乗り場はまとめて直通便を探します。

## ファイル構成

- `public/index.html`: 画面
- `public/styles.css`: 見た目
- `public/app.js`: 直通検索UI
- `scripts/import-gtfs.mjs`: GTFS取り込み
- `scripts/serve.mjs`: ローカル確認用サーバー
- `docs/data-sources.md`: データ元・ライセンス確認メモ
