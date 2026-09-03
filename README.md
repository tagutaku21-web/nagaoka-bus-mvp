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

1. GTFS ZIPを入手する
2. ZIPを展開する
3. 展開したフォルダを `GTFS_DIR` に指定して取り込む

```bash
GTFS_DIR=/path/to/extracted/gtfs npm run import:gtfs
npm run serve
```

ブラウザで `http://localhost:4173` を開きます。

## 最初の検証

まずは以下を確認します。

- 出発: 長岡駅大手口
- 目的地: 長岡赤十字病院、または日赤病院前に相当する停留所
- 表示される次便・次々便が公式時刻表と一致すること

## ファイル構成

- `public/index.html`: 画面
- `public/styles.css`: 見た目
- `public/app.js`: 直通検索UI
- `scripts/import-gtfs.mjs`: GTFS取り込み
- `scripts/serve.mjs`: ローカル確認用サーバー
- `docs/data-sources.md`: データ元・ライセンス確認メモ
