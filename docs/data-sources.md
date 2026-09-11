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

## 燕市コミュニティバスGTFS

- GTFSデータリポジトリ組織ID: `tsubamecity`
- feed_id: `tsubame_bus`
- feed_name: 燕市コミュニティバス
- 公開元: 燕市
- 公式ページ: https://www.city.tsubame.niigata.jp/soshiki/toshi_seibi/3/6/12634.html
- 取得URL: https://api.gtfs-data.jp/v2/organizations/tsubamecity/feeds/tsubame_bus/files/feed.zip?rid=current
- ライセンス: CC BY 4.0
- license_url: https://creativecommons.org/licenses/by/4.0/deed.ja
- 有効期間: 2026-09-01 から 2027-08-31
- 今回の取り込み結果: routes 3 / stops 90 / trips 32
- GTFS-Realtime: なし

燕市のランドマーク・施設名補正は未追加。公式アクセス情報とGTFS停留所名の一致を確認してから追加する。

## 2026-09-11 新潟県内の追加GTFS

GTFSデータリポジトリで公開されている有効期間内のデータから追加した。三条市循環バスぐるっとさん、見附市コミュニティバスは確認時点で有効期限切れのため未追加。

| 地域 | 取得URL | ライセンス | 有効期間 | 今回の取り込み結果 |
| --- | --- | --- | --- | --- |
| 村上市 | https://api.gtfs-data.jp/v2/organizations/murakamicity/feeds/murakamisicommunitybus/files/feed.zip?rid=current | CC BY 4.0 | 2026-07-30 から 2027-07-29 | routes 14 / stops 314 / trips 119 |
| 加茂市 | https://api.gtfs-data.jp/v2/organizations/kamocity/feeds/kamonbus/files/feed.zip?rid=current | CC BY 4.0 | 2026-06-01 から 2027-05-31 | routes 6 / stops 128 / trips 50 |
| 上越市 | https://api.gtfs-data.jp/v2/organizations/joetsucity/feeds/joetsu/files/feed.zip?rid=current | CC BY 2.1 JP | 2026-04-01 から 2027-03-31 | routes 7 / stops 272 / trips 50 |
| 糸魚川バス | https://api.gtfs-data.jp/v2/organizations/itoigawabus/feeds/itoigawabus/files/feed.zip?rid=current | CC BY 4.0 | 2026-07-31 から 2027-03-31 | routes 16 / stops 586 / trips 294 |

糸魚川バスの `stops.txt` はUTF-8 BOM付きだったため、`scripts/import-gtfs.mjs` で先頭ヘッダーのBOMを除去するようにした。

## 2026-09-11 上越市街地主要路線の試験補完

上越市のGTFSは市営バス中心で、市街地の主要な一般路線が不足するため、頸城自動車公式ページの「路線図と時刻表」を出典に、上越大通り線の主要停留所だけを試験的に補完した。

- 頸城自動車公式ページ: https://www.marukei-g.com/pages/20/
- 対象PDF:
  - `1.上越大通り線` https://www.marukei-g.com/files/libs/7359/202603161516235576.pdf
  - `2.上越大通り線` https://www.marukei-g.com/files/libs/7361/202603161517485.pdf
- 補完方法: PDF全体の再掲載ではなく、アプリ検索用に主要停留所と一部便だけを構造化する。
- 対象停留所: 上越妙高駅前、高田駅前案内所、本町四丁目、上越市役所入口、マルケーバスセンター、直江津ショッピングセンター前、直江津駅前、西城病院前、高田城址公園、看護大学、中央病院。
- 注意: 補完部分は公式GTFSではない。停留所位置は主要施設・駅・病院等の代表点を使うため、実際の乗り場位置とずれる可能性がある。画面上でも「主要停留所のみの試験表示」と明記する。
- 再生成: `node scripts/add-joetsu-core.mjs`

## 新潟市 区バス・住民バスGTFS-JP

- 新潟市公式ページ: https://www.city.niigata.lg.jp/shisei/seisaku/it/open-data/opendata-kankou/od-busgtfsjp.html
- 公式ページタイトル: GTFS-JPデータ（区バス・住民バス）
- 公式ページ上のライセンス表示: CC-BY（表示）
- 公式ページ本文のライセンスリンク: クリエイティブ・コモンズ・ライセンス 表示 2.1 日本
- 取得URL（区バス）: https://www.city.niigata.lg.jp/shisei/seisaku/it/open-data/opendata-kankou/od-busgtfsjp.files/20260401_bus-kubusniigatacity-niigata-jp.zip
- 取得URL（住民バス）: https://www.city.niigata.lg.jp/shisei/seisaku/it/open-data/opendata-kankou/od-busgtfsjp.files/20260401_bus-niigatacity-niigata-jp.zip
- 区バスの注意書き: 新潟交通延伸路線及び北区バス冬季臨時便は除く
- 住民バスの注意書き: 新潟交通延伸路線は除く
- 今回の取り込み結果（区バス）: routes 14 / stops 713 / trips 147
- 今回の取り込み結果（住民バス）: routes 7 / stops 266 / trips 67

新潟市地域として2つのGTFSを統合して表示する。内部IDの衝突を避けるため、取り込み後に区バスは `niigata-ward:`、住民バスは `niigata-residents:` の接頭辞を付ける。新潟交通の市内一般路線、ときライナー系は今回の対象外。


## 2026-09-06 施設検索の見直し

- リバーサイド千秋: 越後交通の公式案内が「センタープラザ前（リバーサイド千秋）」と明記しているため、ここを優先。隣接する日赤病院前も比較対象にする。以前の「イオン長岡店前」最優先設定と「子育ての駅千秋」は施設の候補から除外（バス停自体は引き続き検索可能）。
  - https://www.echigo-kotsu.co.jp/contents/diagram/route/nagaoka/west.html
  - https://walk-uny.com/riverside-senshu/access/
- 施設ピンは停留所群の平均位置を使用しない。以下で確認した施設の代表点を使用する。入口や徒歩経路の座標ではない。
  - 長岡駅: 37.447321, 138.854195 https://ja.wikipedia.org/wiki/長岡駅
  - アオーレ長岡: 北緯37度26分47秒・東経138度51分4秒（37.446389, 138.851111） https://ja.wikipedia.org/wiki/長岡市シティホールプラザアオーレ長岡
  - リバーサイド千秋: 37.460722, 138.826750 https://ja.wikipedia.org/wiki/リバーサイド千秋
  - 長岡赤十字病院: 37.460056, 138.82917 https://ja.wikipedia.org/wiki/長岡赤十字病院
  - 立川綜合病院: 37.422940, 138.858891 病院公式アクセスページに公開されている施設マーカー座標。Googleの検索結果・APIからの取得ではない。 https://www.tatikawa.or.jp/tatikawa/access/
- 長岡駅の施設候補には大手口の長岡駅前と長岡駅東口を含める。駅両側のバス停を徒歩乗り換え可能とする拡張は行っていない。
- 施設の比較はバス停到着時刻まで。施設入口への徒歩時間は未算出で、表示にも含めない。

## 2026-09-10 ランドマーク追加

公式アクセス情報にバス利用案内があり、かつ現在のGTFSに該当する停留所名が存在する施設だけを追加した。施設入口までの徒歩時間は計算しない。今回追加したピン座標は、施設そのものの入口ではなく、案内に使うGTFS停留所座標の代表点とする。

| 施設 | アプリで使う停留所 | 確認根拠 |
| --- | --- | --- |
| 長岡中央綜合病院 | 長岡中央綜合病院 | 病院公式アクセスページが、長岡駅東口4番線から「川崎～長岡中央綜合病院」方面のバス利用を案内。 https://www.nagachu.jp/access/ |
| ハイブ長岡 | ハイブ長岡 | ハイブ長岡公式アクセスページが、中央循環バス外回り・江陽環状線・与板線で「ハイブ長岡」下車と案内。 https://www.hive.or.jp/access/ |
| 長岡リリックホール | ハイブ長岡、県立近代美術館 | 長岡リリックホール公式アクセスページが、「ハイブ長岡」または「近代美術館」バス停下車、徒歩3分と案内。GTFSの停留所名は「県立近代美術館」のため、この名称を使う。 https://www.nagaoka-caf.or.jp/lyric/access/ |
| 長岡造形大学 | 長岡造形大学前 | 長岡造形大学公式アクセスページが、大手口2番バス乗り場から乗車し「長岡造形大学前」下車、徒歩約1分と案内。 https://www.nagaoka-id.ac.jp/about/access/ |
| 長岡技術科学大学 | 技大前 | 長岡技術科学大学公式アクセスページが、長岡駅大手口7番線から技大前行き乗車、約30分と案内。 https://www.nagaokaut.ac.jp/access/index.html |
| イオン長岡店 | イオン長岡店前 | イオン長岡店公式ページの検索結果で、長岡駅大手口2番線から乗車し「イオン長岡店前」下車と案内されていることを確認。ページ本文は取得時にトップへ正規化されたため、GTFS停留所名との一致を補助根拠にする。 https://www.aeon.com/ |
| 長岡西病院 | 長岡西病院前 | 長岡西病院公式アクセスページが、中央循環バス「くるりん」外回り等で「長岡西病院前」下車、徒歩1分と案内。 https://www.sutokukai.or.jp/ |
| 長岡市立劇場 | 市立劇場前 | 長岡市立劇場公式アクセスページが、長岡駅大手口10番線から「宮内本町線」に乗車し「市立劇場前」下車と案内。 https://www.nagaoka-caf.or.jp/municipal-theater/access/ |
