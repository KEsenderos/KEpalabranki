# スペイン語単語アプリ「KEpalabranki」仕様書 v1.0.1（確定版）

作成日: 2026-10-09 / 作成: Claude / 依頼者: KE 様
元資料: 「スペイン語単語アプリ 要件定義書」（2026-10-09）
対象: iPhone用・個人利用・無料運用の単語学習アプリ（Ankiの置き換え）

---

## 0. 改訂履歴・凡例

| 版 | 日付 | 内容 |
|---|---|---|
| v0.1 | 2026-10-09 | 初版ドラフト。ヒアリング結果（方式＝GitHub Pages＋端末内保存＋スプレッドシート同期、出題方向＝定着後に日→スペ追加、間隔＝Anki風の計算式、4択正解は間隔半分、ハズレ選択肢＝同カテゴリ、例文は後で一括作成、アプリ名）と、既存CSV（547語・4列）の分析結果を反映。未確定事項は16章。 |
| v0.2 | 2026-10-09 | 16章 Q1〜Q5 の回答を反映。(1) Q1=C: カテゴリは、取り込み時は品詞を仮に入れ、例文の一括作成のときに意味のカテゴリ（挨拶・食べ物…）を付けて上書き取り込みする（3.1・3.5新設）。(2) Q2=A: テストの「全体」は一度でも学習した単語だけ（4.4・5.6）。(3) Q3=A: 間隔の数値を本書のまま確定（5.2・7.1）。(4) Q4=B: 1日の区切りを午前4時に変更。定数 DAY_START_HOUR を追加し、KP.Utils.dayStr で4時間ずらして日付を決める（2章 D-10・5.1・7.1・8.1・テスト T-36）。目標の初期値30枚は確定。(5) Q5=A: 双方向の同期で確定。APP_VERSION は "0.2"。 |
| v1.0 | 2026-10-09 | 確定版。残っていた【注記】3点（1.1の追加機能＝自動バックアップと復元・予定数の表示・更新のお知らせ帯、D-12 新規カードの出題順、13章 GASの制限の見込み）を依頼者が了承し【確定】にした。未確定事項はなくなった。APP_VERSION は "1.0"。次は本体コードの作成（依頼があった時点で実施）。 |
| v1.0.1 | 2026-10-09 | 本体コード作成に合わせた補足（動きの変更なし）。(1) コードに必要だった補助の関数・定数・idを追記（7.1・8章・4章）: KP.Utils.stripTags／fill、KP.DB.clear、KP.Data.createWords／updateWords／esIndex／now（記録時刻が同じミリ秒にならないよう必ず増える時刻）、recordAnswer は card に null を渡すと回答記録だけ保存（テスト用）、KP.UI.$／current／refresh、定数 FIELD_TYPES、MSG.SYNC_WARN／SYNC_WARN_NEVER／SYNC_WARN_UNSET／NO_STORAGE、id fatal／txt-we-title／box-test-wrong／row-judge。(2) 5.11 GASの上書き規則を「スプレッドシートの updatedAt が同じか新しければ上書きしない」に明確化（同じ記録が2台の間で往復し続けるのを防ぐ）。(3) 設定の「接続テスト」「今すぐ同期」「復元」は、押した時に入力欄のURL・合言葉を先に保存する（iPhoneはボタンを押しても入力欄の確定が起きないことがあるため）。(4) 4択の答えが画面の外に出たときは、答えの位置まで自動でスクロールする。(5) APP_VERSION・CACHE_VERSION を "1.0.1" に。 |

**凡例**　**【確定】**＝依頼者と合意済み。**【注記】**＝Claudeの提案・推定で、依頼者の確認待ち。実装するAIは【確定】【注記】の両方を書かれたとおりに実装し、勝手に変えないこと。

**版の上げ方**　未確定事項が残る間は v0.x（小修正は v0.1.1 のように3桁目）。全て確定したら v1.0。以降、仕様の小修正は v1.0.1、機能追加は v1.1、方式の大きな変更は v2.0。**仕様書の版＝アプリの APP_VERSION＝sw.js の CACHE_VERSION**（例: 仕様書 v1.0.1 → "1.0.1"）。

---

## 1. 目的とスコープ

iPhoneで使う個人用のスペイン語単語学習アプリを作り、Ankiを置き換える。間隔反復は残しつつ1日の上限をなくし、「わかる／わからない」と「マスク付き4択」の2通りで答えられるようにする。ゴールは2027年5〜6月のメキシコ渡航までに日常会話レベルの語彙を身につけること。最優先は「毎日続けられること」。

### 1.1 初版（v1.0）で作るもの＝要件定義書の Must 14項目

| ID | 機能 | 本書の章 |
|---|---|---|
| F-01 | 出題（スペイン語を表に、発音ボタン） | 5.3 |
| F-02 | 自己判定（わかる／わからない） | 5.3 |
| F-03 | マスク付き4択 | 5.3・5.5 |
| F-04 | 答え合わせ（日本語・例文・名詞の性、「次へ」） | 5.3 |
| F-06 | 間隔反復 | 5.2 |
| F-07 | 上限なし（復習→新規を無制限、先取り復習） | 5.4 |
| F-09 | 習得状況（4段階と割合） | 5.7 |
| F-13 | 連続日数（未学習の日はホームで知らせる） | 5.7 |
| F-14 | 1日の目標と達成演出 | 5.7 |
| F-18 | 確認テスト | 5.6 |
| F-19 | テスト結果（正答率・間違い・前回比較・履歴グラフ） | 5.6 |
| F-21 | 読み上げ（メキシコ発音優先） | 5.8 |
| F-25 | CSV取り込み | 5.9 |
| F-26 | 1語ずつの追加・編集 | 5.10 |

加えて、運用に必要な次のものを作る【確定】: スプレッドシートへの自動バックアップと復元（5.11。要件「学習記録を絶対に失わない」のため）、明日・7日以内の復習予定数のホーム表示（画面構成の要件のため。F-08の簡易版）、更新のお知らせ帯（5.12）。

### 1.2 初版で作らないもの（勝手に追加しないこと）

- Should／Could の機能: F-05 判定の訂正、F-08 の詳しい予測、F-10 カテゴリ別進捗、F-11 苦手単語、F-12 学習カレンダー、F-15 バッジ、F-16 連続日数の保護、F-17 効果音・演出、F-20 の設定切替、F-22 名詞の性の色分けの設定、F-23 例文の専用表示枠以外の拡張、F-24 活用表、F-27 出題停止の画面、F-28 ファイルへのバックアップ
- 複数ユーザー、他人との共有、App Store配布、Ankiとの同期、発音の録音・採点、スペイン語以外の言語
- 外部ライブラリ・CDN・フレームワーク

※データの項目（出題停止 suspended など）は、後から機能を足せるよう先に用意しておく（画面は作らない）。

---

## 2. 確定した方針（ヒアリング結果）

| ID | 項目 | 内容 | 区分 |
|---|---|---|---|
| D-01 | 作り方 | PWA（ホーム画面に追加するWebアプリ）。公開は GitHub Pages（依頼者はアカウント所有）。HTML・CSS・JavaScriptのみ。 | 【確定】 |
| D-02 | 記録の保存先 | 本体はiPhone内（IndexedDB）に即保存。Googleスプレッドシートへ自動で送る（Google Apps Script＝GAS）。機種変更時はスプレッドシートから復元。 | 【確定】 |
| D-03 | 出題方向 | 最初は「スペイン語→日本語」だけ。スペ→日が「定着」（間隔7日以上）になった単語だけ、「日本語→スペイン語」のカードも出題する。2方向の記録は別々。 | 【確定】 |
| D-04 | 間隔の決め方 | Anki風の計算式（単語ごとに「易しさ係数 ease」を持つ）。式は5.2。 | 【確定】 |
| D-05 | 4択で正解 | 「わかる」と同じく段階を進めるが、次の間隔は半分（例: 7日→4日）。 | 【確定】 |
| D-06 | 4択のハズレ | 同じカテゴリから選ぶ。足りなければ全体から。 | 【確定】 |
| D-07 | 例文 | 後で別作業としてClaudeで一括作成し、CSVで上書き取り込みする。アプリは例文が空でも動く。 | 【確定】 |
| D-08 | 仕様書の形式 | Markdown（.md）。 | 【確定】 |
| D-09 | アプリ名 | KEpalabranki（フォルダ・リポジトリ名 kepalabranki）。 | 【確定】 |
| D-10 | 1日の区切り | iPhoneの時計で**午前4時**（0:00〜3:59 の学習は前の日に数える）。 | 【確定】 |
| D-11 | 1日の目標の初期値 | 30枚（回答数）。 | 【確定】 |
| D-12 | 新規カードの順 | 取り込んだ順（CSVの行順）。 | 【確定】 |
| D-13 | カテゴリ | 既存CSVにはカテゴリ列がないため、KElupalabras形式の取り込みでは仮に「品詞」をカテゴリにする。後で例文の一括作成のときに、意味のカテゴリ（挨拶・食べ物など）を付けた標準形式CSVを作り、上書き取り込みで置き換える（3.5）。 | 【確定】 |

---

## 3. 既存CSVの形式と取り込み規則

### 3.1 KElupalabras形式（既存の kelupalabras-anki-*.csv）

分析結果: 547行・4列・見出し行なし・UTF-8（BOM付き）。

| 列 | 内容 | 例 |
|---|---|---|
| 1 | スペイン語（動詞は「活用形（原形）」） | `creamos（creer）` ／ `mentira` |
| 2 | 日本語（HTML。`<br>` で行区切り、`<i>…</i>` は記事中の用例。最終行に `〔段落-文〕`） | `うそ（名詞・女性）<br>〔T-1〕` |
| 3 | 品詞（動詞・名詞・熟語・コロケーション・形容詞・副詞・固有名詞・その他・慣用句・接続詞・前置詞） | `名詞` |
| 4 | 出典（段落番号） | `T-1` |

取り込み時の変換（KP.Importer.fromKelupalabrasRow_）:

| 項目 | 規則 |
|---|---|
| es | 列1をそのまま（前後の空白を除く） |
| ja | 列2を `<br>` で分け、`〔…〕` だけの行を除いて、`<br>` でつなぎ直す |
| pos | 列3 |
| category | 列3（品詞）と同じ（仮。3.5で置き換える）【確定】 |
| source | 列4 |
| gender | jaの1行目に「（名詞・女性）」→ `"f"`、「（名詞・男性）」→ `"m"`、それ以外 `""` |
| exEs・exJa・note | 空 |

### 3.2 標準形式（今後の追加・例文の上書き用）

1行目が見出し行。列の順は自由（見出し名で判定）。必須は spanish・japanese・category の3列。

| 見出し | 項目 | 必須 |
|---|---|---|
| spanish | es | 必須 |
| japanese | ja（改行を入れたいときは `<br>`） | 必須 |
| category | category | 必須 |
| pos | pos | 任意 |
| gender | gender（m／f／空） | 任意 |
| example_es | exEs | 任意 |
| example_ja | exJa | 任意 |
| note | note | 任意 |
| source | source | 任意 |

### 3.3 形式の判定

1. CSVを解析（RFC4180。`"` で囲んだ中のカンマ・改行・`""` に対応。先頭のBOMを除く。空行は無視）。
2. 1行目1列目を小文字・空白除去して `spanish` なら標準形式。
3. そうでなく、全行が4列なら KElupalabras形式。
4. どちらでもなければ MSG.IMPORT_BAD_FORMAT。

### 3.4 日本語欄の表示用の加工（KP.Utils）

- **meaningMain**（4択の選択肢・日→スペの問題に使う）: jaの1行目から、末尾の `（名詞・女性）（名詞・男性）（形容詞）（副詞）（固有名詞）（代名詞）（接続詞）（前置詞）（その他）` を除いたもの。
- **jaFront**（日→スペの問題文）: 1行目（meaningMainではなく1行目そのもの）＋2行目。ただし2行目にラテン文字（A–Z, a–z, ÁÉÍÓÚáéíóúÑñÜü）が含まれる場合は2行目を出さない（答えが見えてしまうため）。3行目以降は出さない。
- **esSpeak**（読み上げ用）: esの最初の「（」より前。前後の空白を除く。例 `creamos（creer）` → `creamos`。
- **安全な表示**: ja は HTMLとして表示するが、`<br>` `<i>` `</i>` `<b>` `</b>` 以外のタグは文字としてそのまま見せる（KP.Utils.safeHtml）。

### 3.5 例文とカテゴリの一括作成（後日の別作業）【確定】

1. 既存の単語（スペイン語・日本語・品詞）を元に、Claudeが**標準形式（3.2）**のCSVを作る。列は spanish・japanese・category・pos・gender・example_es・example_ja。
2. spanish は**アプリに登録済みの文字と完全に同じ**にする（違うと重複と判定されず、新しい単語として追加されてしまう）。japanese・pos・gender は元の値をそのまま入れる。
3. category は意味のカテゴリ（例: 挨拶、食べ物、家族、仕事、気持ち、時間、移動、信仰 など。全体で10〜20個程度に揃える）。example_es は短い例文（メキシコで自然な表現）、example_ja はその訳。
4. アプリの「CSV取り込み」で、重複したとき＝**上書き**を選んで取り込む。空でない項目だけ置き換わり、学習記録は変わらない（5.9）。

---

## 4. 画面仕様

### 4.1 全体

- 1ページのアプリ（index.html）。画面は section 要素で切り替える（KP.UI.show）。
- 画面下部にタブ（ホーム・進捗・単語帳・設定）。学習・テスト・単語編集・取り込みの画面ではタブを隠す。
- 縦画面・最大幅480px・中央寄せ。主要ボタンは画面の下半分。タップ領域は44px以上。本文16px以上（入力欄は必ず16px以上。未満だとiPhoneで画面が拡大される）。
- ライト／ダーク: iPhoneの設定に従う（prefers-color-scheme）。色は全て CSS変数（4.9）。
- alert・confirm・prompt は使わない。メッセージは画面下部のトースト（toast。2.5秒で消える）で出す。
- 上下に `env(safe-area-inset-*)` の余白を足す。

### 4.2 ホーム（screen-home）

上から順に:

| id | 部品 | 仕様 |
|---|---|---|
| banner-update | 更新のお知らせ帯 | 通常は非表示。5.12 |
| banner-sync-warn | バックアップ警告 | 最終同期成功から SYNC_WARN_DAYS（3日）以上、または同期未設定のとき表示。「バックアップが{n}日できていません。設定を確認してください」（未設定は「バックアップが未設定です。設定から設定してください」）。タップで設定画面へ |
| txt-streak | 連続日数 | 大きく「🔥 {n}日連続」。0日なら「今日から始めよう」 |
| banner-not-studied | 未学習の知らせ | 今日の回答数が0のとき「今日はまだ学習していません」（差し色の帯） |
| txt-today-count / txt-goal / bar-goal | 今日の目標 | 「今日 {count} / 目標 {goal}」と進み具合のバー。達成後は「目標達成 ✓」 |
| txt-due-count | 復習待ち | 「復習待ち {n}枚」 |
| txt-tomorrow-count / txt-week-count | 予定 | 「明日 {n}枚 ・ 7日以内 {m}枚」（明日〜7日後までの合計） |
| btn-start-study | 学習開始 | 横幅いっぱい・高さ64px・差し色。復習待ちが0のときの表示は「新しい単語を学習」 |
| btn-start-ahead | 先取り復習 | 復習待ちが0で、先取りできるカードがあるときだけ表示。高さ48px・枠線のみ |
| btn-start-test | テスト | 高さ48px・枠線のみ |

### 4.3 学習（screen-study）

| id | 部品 | 仕様 |
|---|---|---|
| btn-study-end | 終了 | 左上「✕ 終了」。押すと学習を終えてホームへ（確認なし。回答済みの記録は保存済み） |
| txt-study-progress | 進み具合 | 右上「今日 {count} / {goal}」 |
| txt-study-phase | 区分 | 「復習」「もう一度」「新規」「先取り」「選んだ単語」のどれか（5.4） |
| badge-dir | 方向 | 「スペ→日」または「日→スペ」（日→スペは差し色の枠で目立たせる） |
| txt-front | 問題 | スペ→日: es（28px・太字）。日→スペ: jaFront（22px） |
| btn-speak | 🔊 | スペ→日の問題のときだけ表示。esSpeak を読み上げ |
| area-choices | 4択の枠 | btn-choice-0〜3 の4つ（縦に並べる、各高さ52px）。最初は伏せる（灰色の帯で中身は「？」） |
| btn-reveal-choices | 4択を見る | 伏せた4択の上に重ねて置く。押すと4択を表示し、btn-ok・btn-ng を隠す |
| btn-ng / btn-ok | わからない / わかる | 画面最下部に横並び（各高さ64px）。左「わからない」、右「わかる」（差し色） |
| area-answer | 答え | 回答後に表示（4択の枠と、わかる／わからないの代わりに出る） |
| txt-result | 結果 | 「○ 正解」（緑）または「× もう一度出ます」（赤） |
| txt-answer-es | 答え（スペイン語） | 名詞の性があれば頭に el（青）／la（赤）を付ける。例「la mentira」 |
| btn-speak-answer | 🔊 | esSpeak を読み上げ（どちらの方向でも） |
| txt-answer-ja | 答え（日本語） | ja を safeHtml で表示（用例の `<i>` も含む） |
| txt-answer-ex | 例文 | exEs と exJa があれば「例文 / 訳」を表示。無ければ欄ごと隠す |
| btn-next | 次へ | 画面最下部・横幅いっぱい・高さ64px |
| overlay-goal | 目標達成の演出 | 5.7 |

4択を選んだ後: 選んだボタンを、正解なら緑、不正解なら赤にし、正解のボタンも緑にする。その下に area-answer を出す。

### 4.4 テスト（screen-test）

3つの段（section）を切り替える。

**設定の段（test-setup）**: 範囲 `btn-range-all`（全体＝学習した単語）/ `btn-range-mastered`（習得済み）/ `btn-range-category`（カテゴリ）＋ `sel-test-category`（カテゴリを選ぶ。カテゴリ選択時だけ表示）、問題数 `btn-count-10` / `btn-count-20` / `btn-count-50`、`btn-test-begin`（開始）、`btn-test-back`（戻る）。選択中のボタンは差し色の枠。初期値は 全体・10問。

**出題の段（test-run）**: `txt-test-progress`（「3 / 10」）、`btn-test-quit`（中止→ホーム。結果は保存しない）、`txt-test-front`（es）、`btn-test-speak`、`btn-test-choice-0〜3`（伏せない4択）、`txt-test-answer`（正誤と正解の日本語）、`btn-test-next`。

**結果の段（test-result）**: `txt-test-score`（「8 / 10　80%」大きく）、`txt-test-compare`（前回同じ範囲のテストとの比較「前回 60% → 今回 80%（+20）」。前回なしは「初回」）、`list-test-wrong`（間違えた単語の es と meaningMain）、`btn-test-review`（間違えた単語を学習。0件なら非表示）、`chart-test-history`（直近20回の正答率の折れ線。SVG、縦0〜100%）、`btn-test-home`（ホームへ）。

### 4.5 進捗（screen-progress）

`stage-bar`（4段階の横積み棒）、`txt-stage-unseen` / `txt-stage-learning` / `txt-stage-settled` / `txt-stage-mastered`（それぞれ「{件数}語（{割合}%）」）、`txt-total-words`（全単語数）、`txt-reverse-count`（日→スペが解放された単語数）、`txt-progress-streak`（連続日数）。

### 4.6 単語帳（screen-words）

`input-word-search`（スペイン語・日本語の部分一致。1文字ごとに絞り込み、300ms待ってから実行）、`sel-word-category`（すべて／各カテゴリ）、`txt-word-count`（「{n}語」）、`list-words`（1行: es・meaningMain・段階の小さな印。タップで編集）、`btn-word-more`（さらに表示。1回 WORD_LIST_PAGE＝100件ずつ）、`btn-word-add`（＋追加）、`btn-word-import`（CSV取り込み）。

### 4.7 単語の編集（screen-word-edit）・取り込み（screen-import）

**編集**: `input-we-es`、`input-we-ja`（複数行。表示では `<br>` を改行に、保存では改行を `<br>` に戻す）、`input-we-category`（`list-categories` の datalist で既存カテゴリを候補に）、`input-we-pos`（datalist `list-pos`）、`sel-we-gender`（なし／男性 el／女性 la）、`input-we-ex-es`、`input-we-ex-ja`、`input-we-note`、`input-we-source`、`btn-we-speak`、`btn-we-save`、`btn-we-cancel`。es・ja・category が空なら保存しない（MSG.WORD_REQUIRED）。

**取り込み**: `input-import-file`（隠し。accept=".csv,text/csv,text/plain"）、`btn-import-choose`（ファイルを選ぶ）、`txt-import-summary`（「形式: KElupalabras／新規 {n}語／重複 {m}語／読めない行 {k}行」）、`sel-import-dup`（重複したとき: スキップ（初期値）／上書き（学習記録は残す））、`btn-import-run`（取り込む）、`btn-import-cancel`。

### 4.8 設定（screen-settings）

`input-goal`（1日の目標。1〜500の整数）、`sel-voice`（「自動（メキシコ優先）」＋端末のスペイン語の声の一覧）、`btn-voice-test`（「Hola, ¿cómo estás?」を読む）、`input-sync-url`、`input-sync-token`、`btn-sync-test`（接続テスト）、`btn-sync-now`（今すぐ同期）、`btn-sync-restore`（スプレッドシートから復元。この3つのボタンは押した時にURL・合言葉の入力欄を先に保存する）、`txt-sync-status`（「最終同期: 10/09 14:30 ／ 未送信 {n}件」）、`txt-version`（「v1.0.1」）。入力はフォーカスが外れたとき（change）に保存。

### 4.9 見た目（css/style.css）

| 変数 | ライト | ダーク | 用途 |
|---|---|---|---|
| --bg | #F6F7F9 | #0E1116 | 背景 |
| --surface | #FFFFFF | #171B22 | カード |
| --line | #DDE1E7 | #2A313C | 枠線 |
| --text | #16191F | #E8ECF2 | 文字 |
| --muted | #6B7380 | #8D97A6 | 補足文字 |
| --accent / --accent-ink | #E8590C / #FFFFFF | #FF8A3D / #1A0E05 | 差し色 |
| --ok / --ng | #2F9E44 / #E03131 | #51CF66 / #FF6B6B | 正解・不正解 |
| --male / --female | #1C7ED6 / #D6336C | #4DABF7 / #F783AC | el／la |
| --mask | #CED4DA | #343A40 | 伏せた4択 |

フォントは端末標準（-apple-system, "Hiragino Sans", system-ui）。外部フォントは読まない。カードの角丸16px、ボタンの角丸12px。

---

## 5. 動作仕様

### 5.1 データの単位

- **単語（word）**: 1語1件。
- **カード（card）**: 1単語につき2枚（ES_JA＝スペ→日、JA_ES＝日→スペ）。単語を作るときに両方作る。JA_ES は最初 `unlocked=false`（出題しない）。
- **回答記録（log）**: 1回答1件（学習もテストも）。
- 時刻はミリ秒（Date.now()）。日付は `"YYYY-MM-DD"` の文字列で、端末の現地時刻から DAY_START_HOUR（4）時間を引いた日付とする（KP.Utils.dayStr）。例: 10月10日 3:30 の学習は「2026-10-09」の日に数える。「今日」「明日」「連続日数」「今日の回数」「予定日」は全てこの日付で扱う。

### 5.2 間隔反復（KP.SRS）【確定】

カードの項目: `seen`（一度でも回答したか）、`streak`（最後に間違えてからの連続正解）、`intervalDays`（現在の間隔。0＝今日やり直し）、`ease`（易しさ係数。初期 EASE_START＝2.5）、`dueDay`（次回の日。未回答は ""）、`correctTotal`、`wrongTotal`、`lapses`（覚えていたのに忘れた回数）、`lastAnsweredAt`。

**判定の入力**: result＝OK／NG、method＝SELF（自己判定）／MC（4択）。4択の正解＝OK、不正解＝NG。

**NG（わからない・4択不正解）**
1. `intervalDays >= 1` だったなら（覚えていた単語を忘れた）: `lapses += 1`、`ease = max(EASE_MIN, ease − EASE_DOWN)`。
2. `streak = 0`、`intervalDays = 0`、`dueDay = 今日`、`wrongTotal += 1`、`seen = true`。
3. その場で RELEARN_GAP（5）枚後に再出題（5.4）。

**OK（わかる・4択正解）**
1. **先取り**（`seen` かつ `intervalDays >= 1` かつ `dueDay > 今日`）のときは、`correctTotal += 1` と `lastAnsweredAt` だけ更新し、予定は変えない【確定】（予定より早く覚えていても、記憶の強さの証拠としては弱いため）。
2. それ以外: `streak += 1`。新しい間隔 n を決める:
   - `streak == 1` → FIRST_INTERVAL（1日）
   - `streak == 2` → SECOND_INTERVAL（3日）
   - `streak >= 3` → `max(intervalDays + 1, round(intervalDays × ease))`
3. `n = min(n, MAX_INTERVAL)`（365日）。
4. method が MC なら `n = max(1, round(n × MC_FACTOR))`（MC_FACTOR＝0.5）【確定】。method が SELF で、回答前の `intervalDays >= 1` なら `ease = min(EASE_MAX, ease + EASE_UP)`【確定】（易しさが下がり続けないように少しずつ戻す）。
5. `intervalDays = n`、`dueDay = 今日 + n日`、`correctTotal += 1`、`seen = true`。
6. **日→スペの解放**: カードが ES_JA で `intervalDays >= UNLOCK_REVERSE_DAYS`（7）になったら、同じ単語の JA_ES カードを `unlocked = true` にする（1度解放したら戻さない）【確定】。

例（自己判定でわかるを続けた場合）: 1日 → 3日 → 8日（3×2.55） → 21日 → 54日 …

```js
// js/srs.js の中心（見本。この形で実装する）
KP.SRS.applyAnswer = function (card, result, method, today) {
  var C = KP.Config, c = Object.assign({}, card), wasInterval = c.intervalDays;
  c.lastAnsweredAt = Date.now();
  if (result === C.RESULT.NG) {
    if (wasInterval >= 1) { c.lapses += 1; c.ease = Math.max(C.EASE_MIN, c.ease - C.EASE_DOWN); }
    c.streak = 0; c.intervalDays = 0; c.dueDay = today; c.wrongTotal += 1; c.seen = true;
    return { card: c, requeue: true, unlockReverse: false };
  }
  if (c.seen && wasInterval >= 1 && c.dueDay > today) {           // 先取り
    c.correctTotal += 1;
    return { card: c, requeue: false, unlockReverse: false };
  }
  c.streak += 1;
  var n = c.streak === 1 ? C.FIRST_INTERVAL
        : c.streak === 2 ? C.SECOND_INTERVAL
        : Math.max(wasInterval + 1, Math.round(wasInterval * c.ease));
  n = Math.min(n, C.MAX_INTERVAL);
  if (method === C.METHOD.MC) n = Math.max(1, Math.round(n * C.MC_FACTOR));
  else if (wasInterval >= 1) c.ease = Math.min(C.EASE_MAX, c.ease + C.EASE_UP);
  c.intervalDays = n; c.dueDay = KP.Utils.addDays(today, n);
  c.correctTotal += 1; c.seen = true;
  var unlock = c.dir === C.DIR.ES_JA && n >= C.UNLOCK_REVERSE_DAYS;
  return { card: c, requeue: false, unlockReverse: unlock };
};
```

※ 文字列 `"YYYY-MM-DD"` は、そのまま大小比較してよい（桁数が揃っているため）。

### 5.3 1枚の回答の流れ（学習画面）

1. カードを表示: 問題（txt-front）、伏せた4択、「4択を見る」、「わからない」「わかる」。4択の中身はこの時点で作っておく（5.5）。
2. 答え方は3通り:
   - 「わかる」→ OK・SELF
   - 「わからない」→ NG・SELF
   - 「4択を見る」→ 4択を表示（わかる／わからないは隠す）→ 選ぶ → 正解なら OK・MC、不正解なら NG・MC
3. 回答したら直ちに: SRS.applyAnswer → 記録の保存（KP.Data.recordAnswer。カード更新・回答記録追加・今日の回数＋1を1回の書き込みで）→ 答え（area-answer）を表示。保存の完了は待たずに表示してよい（失敗したらトースト MSG.SAVE_ERROR）。
4. 「次へ」で次のカードへ。次のカードはあらかじめ用意しておき、0.3秒以内に表示する。
5. 回答数が SYNC_EVERY_ANSWERS（20）の倍数になるたび、裏で同期（KP.Sync.syncNow。待たない）。

### 5.4 出題の順番（KP.Queue）

学習の始め方は4つ（KP.Config.SESSION）:

| 種類 | 始め方 | 出す順 |
|---|---|---|
| NORMAL | 学習開始 | ①期限が来た復習 ②解放されたばかりの日→スペ ③新しい単語（無制限） |
| AHEAD | 先取り復習 | 期限前のカードを dueDay の早い順（無制限。全部終わったら MSG.AHEAD_DONE でホームへ） |
| CUSTOM | テスト結果の「間違えた単語を学習」 | 指定されたカード（ES_JA）を順に。終わったらホームへ |

- **①期限が来た復習**: `unlocked` かつ `seen` かつ `dueDay <= 今日` かつ 単語が `suspended=false` のカード。dueDay の古い順、同じ日の中はランダム。開始時に一覧を作る。
- **②解放された日→スペ**: JA_ES で `unlocked` かつ `!seen`。解放された順（unlockedAt の古い順）。
- **③新しい単語**: ES_JA で `!seen`。単語の `order` の小さい順。①②が尽きてから1枚ずつ取り出す（上限なし）。①が尽きた最初の1回だけトースト MSG.REVIEW_DONE（「復習が終わりました。ここから新しい単語です」）。新しい単語も尽きたら MSG.ALL_DONE でホームへ。
- **やり直し**: NG のカードは、待ち行列の RELEARN_GAP（5）番目に入れ直す（行列が短ければ末尾）。txt-study-phase は「もう一度」。同じカードを2回続けて出さない（他に出せるカードがあれば）。
- 学習中に日付をまたいでも、行列は作り直さない（次の学習開始で反映）。

### 5.5 4択の作り方（KP.Choices.make）

1. 正解の文字: ES_JA なら単語の meaningMain、JA_ES なら es。
2. 候補: 正解と同じ category で、`suspended=false`、正解と別の単語で、表示文字が正解とも互いとも違うもの。候補からランダムに3つ【確定】。
3. 3つに足りなければ、全単語（suspended を除く）から同じ条件で補う。それでも足りなければ、ある分だけ（全体で4語未満の場合は選択肢が減る。ボタンは非表示）。
4. 正解を含めた選択肢をシャッフルして並べる。

### 5.6 確認テスト（KP.Test）

- 範囲【確定】: 全体＝一度でも学習した単語（ES_JA カードが seen、出題停止を除く）、習得済み＝スペ→日が「習得」（間隔30日以上）の単語、カテゴリ＝選んだカテゴリの単語。
- 問題数 10／20／50。範囲の単語数より多ければ、ある分だけ。0語なら MSG.TEST_EMPTY。
- 出題はスペ→日の4択（伏せない）。選ぶと正誤と正解を表示し「次へ」。
- テストの回答は間隔反復に反映しない【確定（要件F-20の標準）】。回答記録は mode=TEST で残す（連続日数・今日の目標には数えない）。
- 終了時、テスト結果（tests）を保存: `{id, at, range, rangeValue, count, correct, wrongWordIds}`。
- 前回比較: 同じ range・rangeValue の直前の結果と正答率を比べる。
- 履歴グラフ: 範囲を問わず直近 TEST_HISTORY_MAX（20）回の正答率。点と線、各点の下に月/日。
- 「間違えた単語を学習」: 間違えた単語の ES_JA カードで CUSTOM の学習を始める（こちらは間隔反復に反映する。期限前なら先取りの扱い）。

### 5.7 習得状況・連続日数・目標（KP.Stats）

- **段階（単語ごと。ES_JA カードで判定）**【確定】: 未学習＝`!seen`／学習中＝間隔7日未満／定着＝7〜29日／習得＝30日以上。出題停止の単語は数えない。
- **今日の回数**: 今日の学習の回答数（mode=STUDY。やり直しも1回と数える）。日ごとの回数は daily ストアに持つ（回答のたびに＋1）。
- **連続日数**: daily で回答数1以上の日が、今日（今日0なら昨日）から何日続いているか。
- **目標達成**: 今日の回数が目標に初めて達した瞬間、overlay-goal（画面中央に大きく「🎉 今日の目標達成！」、1.5秒で消える。拡大して消えるCSSアニメーション）。1日1回（meta の celebratedDay に今日を記録）。その後も学習は続けられる。
- **予定数**: 明日＝`dueDay == 明日` の数。7日以内＝`明日 <= dueDay <= 7日後` の数（unlocked・seen・suspended=false のカード）。

### 5.8 読み上げ（KP.Speech）

- iPhone内蔵の音声（speechSynthesis）を使う。声の選び方: 設定で選んだ声があればそれ。「自動」なら言語コードが es-MX → es-US → es-419 → es-ES → es で始まる声の順で最初に見つかったもの。速さは0.9。
- 声の一覧は読み込みが遅れることがあるため、`voiceschanged` を待って再取得する。
- 読み上げはボタンを押したときだけ（自動で読まない）。前の読み上げは止めてから読む（cancel）。
- 声が1つも無ければ MSG.NO_VOICE。

### 5.9 CSV取り込み（KP.Importer）

1. ファイルを選ぶ → 文字として読む（UTF-8）→ 3.3で形式判定 → 各行を単語に変換。
2. 重複判定: es を「前後の空白除去・連続空白を1つ・NFC正規化」した文字が、既存の単語と同じなら重複。同じCSV内の重複は、最初の1行だけ採用。
3. txt-import-summary に件数を表示 → 「取り込む」で実行。
4. 新規: word を作り、カード2枚（ES_JA・JA_ES）を作る。order は「既存の最大 order＋行番号」。
5. 重複・スキップ: 何もしない。重複・上書き: CSVの空でない項目だけ既存の単語に上書き（学習記録・カードは変えない）。
6. 終わったらトースト「{n}語を追加、{m}語を更新しました」。裏で同期。

### 5.10 1語ずつの追加・編集

- 追加: 単語帳の「＋追加」→ 空の編集画面 → 保存で word とカード2枚を作る（order は最大＋1）。重複（5.9の判定）なら MSG.WORD_DUPLICATE で保存しない。
- 編集: 保存で word の項目と updatedAt を更新（カードは変えない）。
- 削除の機能は作らない（F-27 出題停止で代える予定）。

### 5.11 スプレッドシートへの同期（KP.Sync／gas/Code.gs）

**目的**: 端末の記録が消えても（機種変更・削除）、スプレッドシートから戻せる。PCで使った分もiPhoneに取り込める。

**仕組み**:
- 端末の各記録（words・cards・logs・tests）は `updatedAt`（端末の時刻）を持つ。
- **送信（push）**: meta の `lastPushAt` より新しい記録を updatedAt の古い順に集め、PUSH_BATCH（500）件ずつ送る。区切りの最後と同じ updatedAt の記録は、同じ回にまとめて送る（取りこぼし防止）。成功したら `lastPushAt = 送った中の最大 updatedAt`。
- **サーバー（GAS）**: 同じ id があれば、送られてきた updatedAt の方が新しい場合だけ上書き（同じか古ければ何もしない）。無ければ追加。書いた行には通し番号 `seq`（Script Properties の SEQ で管理、1つずつ増える）を付ける。
- **受信（pull）**: meta の `lastPullSeq` より大きい seq の記録を、seq 順に PULL_LIMIT（3000）件まで受け取る。`more=true` なら続けて受け取る。端末側は、同じ id の記録が無いか、受け取った updatedAt の方が新しければ上書き。受け取り後 `lastPullSeq` を更新し、daily を回答記録から作り直す（KP.Stats.rebuildDaily）。
- **順番**: syncNow ＝ push → pull。同時に2つ走らせない（実行中なら何もしない）。
- **タイミング**: 起動時（画面表示の後）、回答20回ごと、学習終了時、アプリが裏に回ったとき（visibilitychange で hidden）、設定の「今すぐ同期」。
- **失敗**: 画面を止めない。トーストも出さない（設定の「今すぐ同期」「接続テスト」のときだけ結果を出す）。次の機会に再送する。
- **復元**: 設定の「スプレッドシートから復元」＝ `lastPullSeq = 0` にして pull。端末の新しい記録は残る（上書きされない）。
- **通信方法**: `fetch(url, {method:"POST", body: JSON.stringify(payload), headers:{"Content-Type":"text/plain;charset=utf-8"}, redirect:"follow"})`。Content-Type を text/plain にし、他のヘッダーは付けない（ブラウザの事前確認＝プリフライトを避けるため）。SYNC_TIMEOUT_MS（20秒）で打ち切る（AbortController）。
- **合言葉（token）**: GASの Script Properties の SYNC_TOKEN。端末の設定にも同じ値を入れる。コードに直接書かない。

**送受信の形**:

```json
// 端末 → GAS
{ "action": "ping" | "push" | "pull", "token": "…",
  "data": { "words": [ … ], "cards": [ … ], "logs": [ … ], "tests": [ … ] },   // push のみ
  "sinceSeq": 0, "limit": 3000 }                                              // pull のみ
// GAS → 端末
{ "ok": true, "serverNow": 1760000000000,
  "data": { "words": [ … ], "cards": [ … ], "logs": [ … ], "tests": [ … ] }, // pull のみ
  "lastSeq": 1234, "more": false }                                           // pull のみ
{ "ok": false, "error": "AUTH" | "BAD_REQUEST" | "SERVER" }
```

**スプレッドシートの形**: シート名 words・cards・logs・tests。1行目が見出し（7.2の項目名＋最後に seq）。全セルを書式「書式なしテキスト」（`@`）にし、値は文字列で書く（日付の自動変換を防ぐ）。`=` `+` `-` `@` で始まる文字には先頭に `'` を付けて書く（数式扱いを防ぐ）。端末側は受け取った文字列を 7.2 の型に変換する（KP.Sync.fromSheet_）。

### 5.12 更新のお知らせ（KEecoloopと同じ仕組み）

- sw.js は install で skipWaiting、activate で古いキャッシュを消して clients.claim。
- 起動時に `navigator.serviceWorker.controller` があった場合だけ、`controllerchange` で banner-update を表示（「新しい版があります。ここをタップして更新」）。タップで location.reload()。
- 前面に戻ったとき（visibilitychange）、前回確認から UPDATE_CHECK_MIN_MS（10分）以上なら registration.update()。

### 5.13 起動の流れ（KP.Main.start）

1. KP.DB.open → KP.Data.loadAll（words・cards・daily・meta を全部メモリへ。logs・tests は必要な時に読む）
2. KP.Speech.init → KP.UI.init → KP.UI.show("home")
3. サービスワーカー登録、navigator.storage.persist() のお願い（結果は無視）
4. KP.Sync.syncNow()（待たない）

目標: 起動から学習開始ボタンが押せるまで3秒以内（5,000語でも）。

---

## 6. ファイル構成

リポジトリ名: **kepalabranki**（Public）。公開URL: `https://（ユーザー名）.github.io/kepalabranki/`

```
kepalabranki/                ← このフォルダの「中身」をGitHubに上げる
├─ index.html                 画面の部品（4章のid）と script の読み込み
├─ manifest.webmanifest       PWAの設定
├─ sw.js                      オフライン用キャッシュ・更新検出
├─ css/style.css              見た目
├─ js/config.js               定数（KP.Config）
├─ js/utils.js                日付・文字・CSV（KP.Utils）
├─ js/db.js                   IndexedDB の読み書き（KP.DB）
├─ js/data.js                 メモリ上のデータと保存の窓口（KP.Data）
├─ js/srs.js                  間隔反復の計算（KP.SRS）
├─ js/queue.js                出題の順番（KP.Queue）
├─ js/choices.js              4択の作成（KP.Choices）
├─ js/stats.js                段階・連続日数・予定数（KP.Stats）
├─ js/speech.js               読み上げ（KP.Speech）
├─ js/importer.js             CSV取り込み（KP.Importer）
├─ js/sync.js                 スプレッドシート同期（KP.Sync）
├─ js/ui.js                   共通の画面処理・タブ・トースト（KP.UI）
├─ js/screenHome.js           ホーム（KP.ScreenHome）
├─ js/screenStudy.js          学習（KP.ScreenStudy）
├─ js/screenTest.js           テスト（KP.ScreenTest）
├─ js/screenProgress.js       進捗（KP.ScreenProgress）
├─ js/screenWords.js          単語帳・編集・取り込み（KP.ScreenWords）
├─ js/screenSettings.js       設定（KP.ScreenSettings）
├─ js/main.js                 起動（KP.Main）
└─ icons/icon-192.png, icon-512.png, apple-touch-icon.png(180×180)

gas/Code.gs                   ← GitHubには上げない。Apps Scriptに貼る
```

**script の読み込み順**（この順を守る）: config → utils → db → data → srs → queue → choices → stats → speech → importer → sync → ui → screenHome → screenStudy → screenTest → screenProgress → screenWords → screenSettings → main。

### 6.1 命名・実装ルール

- グローバル変数は `window.KP` だけ。各ファイルは即時関数で囲み、`"use strict"`。ESモジュール（import/export）は使わない。素のJavaScript（ES2017まで）。
- 他ファイルから呼ぶ関数は `KP.部品.名前`（末尾 _ なし）。ファイル内だけの関数は末尾に `_`。
- 定数は大文字＋アンダースコア、変数・関数は lowerCamelCase。数値・文言は直接書かず KP.Config を参照。
- 本書のファイル名・関数名・id・定数名を一字一句そのまま使う。仕様にないものを足さない。曖昧な点は推測で作らず、確認事項として報告する。
- 各ファイルの先頭に「ファイル名・役割・版」のコメント。納品前に `node --check` で構文確認。
- 画面（DOM）に触るのは ui.js と screen*.js だけ。srs.js・queue.js・choices.js・stats.js・importer.js は DOM に触らない（計算だけ）。

---

## 7. 定数・データ

### 7.1 定数（js/config.js ／ KP.Config）

| 定数 | 値 | 説明 |
|---|---|---|
| APP_NAME | "KEpalabranki" | 表示名 |
| APP_VERSION | "1.0.1" | 仕様書の版と同じ |
| DB_NAME / DB_VERSION | "kepalabranki-db" / 1 | IndexedDB |
| DIR | {ES_JA:"ES_JA", JA_ES:"JA_ES"} | 出題方向 |
| RESULT | {OK:"OK", NG:"NG"} | 結果 |
| METHOD | {SELF:"SELF", MC:"MC"} | 答え方 |
| MODE | {STUDY:"STUDY", TEST:"TEST"} | 回答記録の種類 |
| SESSION | {NORMAL:"NORMAL", AHEAD:"AHEAD", CUSTOM:"CUSTOM"} | 学習の種類 |
| PHASE_LABEL | {DUE:"復習", RELEARN:"もう一度", NEW:"新規", REVERSE:"新規（日→スペ）", AHEAD:"先取り", CUSTOM:"選んだ単語"} | txt-study-phase |
| EASE_START / EASE_MIN / EASE_MAX | 2.5 / 1.3 / 3.0 | 易しさ係数【確定】 |
| EASE_UP / EASE_DOWN | 0.05 / 0.20 | 【確定】 |
| FIRST_INTERVAL / SECOND_INTERVAL | 1 / 3 | 日【確定】 |
| MAX_INTERVAL | 365 | 日 |
| MC_FACTOR | 0.5 | 4択正解の間隔の倍率【確定】 |
| RELEARN_GAP | 5 | 何枚後に再出題【確定】 |
| UNLOCK_REVERSE_DAYS | 7 | 日→スペを解放する間隔【確定】 |
| STAGE_SETTLED_DAYS / STAGE_MASTERED_DAYS | 7 / 30 | 段階の境目【確定】 |
| DAY_START_HOUR | 4 | 1日の区切り（時）。0:00〜3:59 は前の日【確定】 |
| STAGE | {UNSEEN:"未学習", LEARNING:"学習中", SETTLED:"定着", MASTERED:"習得"} | |
| GOAL_DEFAULT / GOAL_MIN / GOAL_MAX | 30 / 1 / 500 | 1日の目標 |
| CHOICE_COUNT | 4 | |
| TEST_COUNTS | [10, 20, 50] | |
| TEST_HISTORY_MAX | 20 | |
| WORD_LIST_PAGE | 100 | |
| SEARCH_DELAY_MS | 300 | |
| TOAST_MS | 2500 | |
| GOAL_OVERLAY_MS | 1500 | |
| SPEECH_LANGS | ["es-MX","es-US","es-419","es-ES","es"] | 自動選択の順 |
| SPEECH_RATE | 0.9 | |
| VOICE_TEST_TEXT | "Hola, ¿cómo estás?" | |
| SYNC_EVERY_ANSWERS | 20 | |
| SYNC_TIMEOUT_MS | 20000 | |
| PUSH_BATCH / PULL_LIMIT | 500 / 3000 | |
| SYNC_WARN_DAYS | 3 | |
| UPDATE_CHECK_MIN_MS | 600000 | 10分 |
| POS_PAREN_RE | /（(名詞・女性\|名詞・男性\|形容詞\|副詞\|固有名詞\|代名詞\|接続詞\|前置詞\|その他)）\s*$/ | meaningMain 用 |
| LATIN_RE | /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/ | jaFront 用 |
| GENDER_LABEL | {m:"el", f:"la"} | |
| SYNC_SHEETS | ["words","cards","logs","tests"] | |
| SYNC_FIELDS | 7.2 の項目名をシートの列順に（seq を除く） | 同期で送る項目 |
| FIELD_TYPES | 7.2 の型（b・n。書いていない項目は文字） | 受け取った文字を戻す型 |

**メッセージ（KP.Config.MSG）**

| 名前 | 文言 |
|---|---|
| SAVE_ERROR | 保存に失敗しました。もう一度試してください |
| REVIEW_DONE | 復習が終わりました。ここから新しい単語です |
| ALL_DONE | 出題できる単語がありません。単語を追加してください |
| AHEAD_DONE | 先取りできる単語はもうありません |
| TEST_EMPTY | この範囲には単語がありません |
| NO_VOICE | スペイン語の音声が見つかりません |
| IMPORT_BAD_FORMAT | CSVの形式が読み取れません（3章の形式を確認してください） |
| IMPORT_DONE | {n}語を追加、{m}語を更新しました |
| WORD_REQUIRED | スペイン語・日本語・カテゴリは必須です |
| WORD_DUPLICATE | 同じスペイン語の単語がすでにあります |
| WORD_SAVED | 保存しました |
| SYNC_OK | 同期しました |
| SYNC_FAIL | 同期できませんでした（{reason}） |
| SYNC_NOT_SET | 同期のURLと合言葉を設定してください |
| SYNC_AUTH | 合言葉が違います |
| RESTORE_DONE | 復元しました（{n}件） |
| GOAL_DONE | 🎉 今日の目標達成！ |
| UPDATE_AVAILABLE | 新しい版があります。ここをタップして更新 |
| SYNC_WARN | バックアップが{n}日できていません。設定を確認してください |
| SYNC_WARN_NEVER | バックアップがまだできていません。設定を確認してください |
| SYNC_WARN_UNSET | バックアップが未設定です。設定から設定してください |
| NO_STORAGE | この環境では記録を保存できません（Safariの通常モードで開いてください） |

### 7.2 データの項目（IndexedDB のストアと、スプレッドシートの列）

型: s＝文字、n＝数値、b＝真偽（シートでは "TRUE"/"FALSE"）。シートの列の順は表の順。最後の列 `seq` はシートだけ。

**words**（keyPath: id）

| 項目 | 型 | 説明 |
|---|---|---|
| id | s | "w" + Date.now()の36進 + 4文字のランダム（KP.Utils.newId("w")） |
| es | s | スペイン語 |
| ja | s | 日本語（`<br>` `<i>` を含むことがある） |
| category | s | カテゴリ |
| pos | s | 品詞 |
| gender | s | "m"／"f"／"" |
| exEs / exJa | s | 例文と訳 |
| note | s | メモ |
| source | s | 出典 |
| suspended | b | 出題停止（初版では常に false） |
| order | n | 新規の出題順 |
| createdAt / updatedAt | n | ミリ秒 |

**cards**（keyPath: id ＝ wordId + ":" + dir。インデックス: wordId）

| 項目 | 型 | 初期値 |
|---|---|---|
| id | s | |
| wordId | s | |
| dir | s | "ES_JA"／"JA_ES" |
| unlocked | b | ES_JA は true、JA_ES は false |
| unlockedAt | n | 0 |
| seen | b | false |
| streak | n | 0 |
| intervalDays | n | 0 |
| ease | n | EASE_START |
| dueDay | s | "" |
| correctTotal / wrongTotal / lapses | n | 0 |
| lastAnsweredAt | n | 0 |
| updatedAt | n | |

**logs**（keyPath: id。インデックス: updatedAt）: id(s, newId("l"))、at(n)、cardId(s)、wordId(s)、dir(s)、result(s)、method(s)、mode(s)、updatedAt(n＝at)

**tests**（keyPath: id。インデックス: updatedAt）: id(s, newId("t"))、at(n)、range(s: "ALL"/"MASTERED"/"CATEGORY")、rangeValue(s: カテゴリ名または "")、count(n)、correct(n)、wrongWordIds(s: JSON文字列の配列)、updatedAt(n)

**daily**（keyPath: day。端末だけ。同期しない）: day(s)、answers(n)

**meta**（keyPath: key。端末だけ）: `settings` ＝ {goal, voiceURI, syncUrl, syncToken}、`sync` ＝ {lastPushAt, lastPullSeq, lastSuccessAt}、`celebratedDay`（s）

words・cards にもインデックス updatedAt を付ける（送信対象を探すため）。

---

## 8. 部品ごとの関数一覧

### 8.1 KP.Utils（js/utils.js）

| 関数 | 引数 → 戻り値 | 説明 |
|---|---|---|
| dayStr | (date?:Date) → string | 現地時刻から DAY_START_HOUR 時間を引いた日の "YYYY-MM-DD"。省略時は今の時刻 |
| addDays | (day:string, n:number) → string | 日付文字列に n 日足す（月末・年末を正しく） |
| newId | (prefix:string) → string | prefix + Date.now().toString(36) + ランダム4文字 |
| normEs | (s) → string | 重複判定用（5.9） |
| splitJa | (ja) → string[] | `<br>` で分割 |
| meaningMain | (ja) → string | 3.4 |
| jaFront | (ja) → string | 3.4（`<br>` で2行まで） |
| esSpeak | (es) → string | 3.4 |
| genderFromJa | (ja) → "m"/"f"/"" | 3.1 |
| safeHtml | (s) → string | 全部エスケープしてから、許可タグだけ戻す |
| escapeHtml | (s) → string | |
| parseCsv | (text) → string[][] | RFC4180。BOM除去。空行を除く |
| shuffle | (arr) → arr | Fisher–Yates（新しい配列を返す） |
| fmtDateTime | (ms) → string | "MM/DD HH:mm" |
| debounce | (fn, ms) → fn | |
| stripTags | (s) → string | HTMLのタグを除く（検索・meaningMain 用） |
| fill | (template, values) → string | 文言の {n} などを値に置き換える |

### 8.2 KP.DB（js/db.js）— IndexedDB の薄い窓口（全て Promise）

| 関数 | 説明 |
|---|---|
| open() | DB_NAME を開く。onupgradeneeded で 7.2 のストアとインデックスを作る |
| getAll(store) | 全件 |
| get(store, key) / put(store, obj) | 1件 |
| putMany(store, arr) | 1トランザクションで複数 |
| tx(stores, mode, fn) | 複数ストアを1トランザクションで（recordAnswer 用） |
| getSince(store, updatedAt) | updatedAt インデックスで「より大きい」もの（古い順） |
| clear(store) | 全件削除（daily の作り直し用） |

### 8.3 KP.Data（js/data.js）— メモリ上のデータ（Map）と保存

保持: `words`（Map id→word）、`cards`（Map id→card）、`daily`（Map day→obj）、`settings`、`syncMeta`。

| 関数 | 説明 |
|---|---|
| loadAll() | DBから words・cards・daily・meta を読み、Mapに入れる。settings が無ければ初期値 |
| wordOf(card) / cardsOf(wordId) | 参照 |
| createWord(fields) | word ＋カード2枚を作ってメモリとDBへ。戻り値 word |
| createWords(list) | 複数をまとめて作る（取り込み用。1トランザクション） |
| updateWords([{id, fields}]) | 複数をまとめて更新（取り込みの上書き用） |
| esIndex() → Map | 正規化したスペイン語 → 単語（重複判定用） |
| now() → number | Date.now() と同じだが、呼ぶたびに必ず1以上増える（同じ時刻の記録を作らないため） |
| updateWord(id, fields) | 項目と updatedAt を更新 |
| recordAnswer(cardNew, logObj, unlockReverse, countToday) | cardNew が null なら回答記録だけ保存（テスト用）。それ以外はカード・回答記録・（解放するなら）JA_ESカード（unlocked=true, unlockedAt=now, updatedAt）・daily(+1) を1トランザクションで保存。メモリも更新 |
| saveTest(testObj) | tests に保存 |
| saveSettings(obj) / saveSyncMeta(obj) / setMeta(key, val) | meta |
| todayCount() | daily の今日の answers |
| mergeFromServer(store, arr) | 5.11 の受信規則で、メモリとDBに反映 |
| categories() | 使われているカテゴリの一覧（五十音順） |

### 8.4 KP.SRS（js/srs.js）

| 関数 | 説明 |
|---|---|
| applyAnswer(card, result, method, today) → {card, requeue, unlockReverse} | 5.2 の見本どおり |
| isDue(card, today) → boolean | unlocked・seen・dueDay <= today |
| isAhead(card, today) → boolean | unlocked・seen・intervalDays>=1・dueDay > today |
| stageOf(card) → STAGE の値 | 5.7 |

### 8.5 KP.Queue（js/queue.js）

| 関数 | 説明 |
|---|---|
| start(session, cardIds?) | 行列を作る（5.4）。CUSTOM のときは cardIds を使う |
| next() → {card, phase} \| null | 次のカード。null なら終わり（呼び出し側が MSG を出す） |
| requeue(card) | RELEARN_GAP の位置に入れ直す |
| remainingDue() → number | ①の残り数（表示用） |

### 8.6 KP.Choices / KP.Stats / KP.Speech / KP.Importer / KP.Sync

| 部品.関数 | 説明 |
|---|---|
| Choices.make(card) → [{text, wordId, correct}] | 5.5 |
| Stats.stageCounts() → {UNSEEN, LEARNING, SETTLED, MASTERED, total} | 5.7 |
| Stats.streak() → number | 5.7 |
| Stats.dueCount() / tomorrowCount() / weekCount() / aheadCount() | 5.7・5.4 |
| Stats.reverseCount() → number | 解放済み JA_ES の数 |
| Stats.rebuildDaily() → Promise | logs（mode=STUDY）から daily を作り直す |
| Speech.init() / voices() → SpeechSynthesisVoice[] / speak(text) | 5.8 |
| Importer.analyze(text) → {format, rows, newCount, dupCount, badCount} | 5.9 の1〜3 |
| Importer.run(analysis, dupMode:"SKIP"\|"OVERWRITE") → Promise\<{added, updated}\> | 5.9 の4〜5 |
| Importer.fromKelupalabrasRow_ / fromStandardRow_ | 内部 |
| Sync.syncNow(opts?) → Promise\<{ok, reason}\> | push → pull。opts.silent=false のときだけトースト |
| Sync.ping() → Promise\<{ok, reason}\> | 接続テスト |
| Sync.restore() → Promise\<{ok, count}\> | lastPullSeq=0 で pull |
| Sync.pendingCount() → Promise\<number\> | 未送信の件数 |
| Sync.post_ / push_ / pull_ / toSheet_ / fromSheet_ | 内部 |

### 8.7 画面の部品

| 部品.関数 | 説明 |
|---|---|
| UI.init() | タブのイベント、画面の初期化（各Screen.init を呼ぶ） |
| UI.show(name, params?) | name の section を表示、他を隠す。タブの表示・非表示。各 Screen.onShow(params) を呼ぶ |
| UI.toast(text) | トースト |
| UI.$(id) / UI.current() | 要素の取得 / 今の画面名 |
| UI.refresh() | 今の画面がホーム・進捗・設定なら描き直す（同期の後、アプリが前面に戻った時） |
| UI.showUpdateBanner() | 5.12 |
| ScreenHome.init / onShow | 4.2 の表示を Stats から作る |
| ScreenStudy.init / onShow({session, cardIds}) | 学習の開始 |
| ScreenStudy.showCard_ / reveal_ / answer_(result, method) / next_ / end_ / celebrate_ | 5.3 |
| ScreenTest.init / onShow / begin_ / showQuestion_ / choose_ / finish_ / drawHistory_ | 5.6 |
| ScreenProgress.init / onShow | 4.5 |
| ScreenWords.init / onShow / renderList_ / openEdit_(id?) / save_ / openImport_ / runImport_ | 4.6・4.7 |
| ScreenSettings.init / onShow / renderSyncStatus_ | 4.8 |
| Main.start() | 5.13。DOMContentLoaded で1回 |
| Main.registerServiceWorker_ / checkUpdate_ | 5.12 |

---

## 9. GAS（gas/Code.gs）

スプレッドシートに付属させる Apps Script。Script Properties: `SYNC_TOKEN`（合言葉）、`SEQ`（通し番号）。

| 関数 | 説明 |
|---|---|
| setupSheets() | 初回に手で1回実行。4つのシートを作り（あれば何もしない）、見出しを書き、全体を `@` 書式にする。SYNC_TOKEN が無ければランダム32文字を作って保存し、ログに表示する |
| doPost(e) | JSON を読み、token を確認（違えば AUTH）、action で ping／push_／pull_ に分ける。例外は SERVER。返事は ContentService の JSON |
| push_(data) | LockService で排他。シートごとに全行を読み、id→行の対応を作り、5.11 の規則で上書き・追加し、まとめて書き戻す（setValues を1シート1回＋追加分1回）。logs・tests は追加のみ（同じ id は無視） |
| pull_(sinceSeq, limit) | 4シートから seq > sinceSeq の行を集め、seq 順に limit 件。行をオブジェクト（見出し名→文字列）にして返す |
| nextSeq_() / esc_(v) / json_(obj) | 内部 |
| FIELDS | シートごとの列名（7.2 の順。最後に "seq"）。js/config.js の SYNC_FIELDS と同じにする |

```js
// gas/Code.gs の入口（見本）
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
    if (!token || req.token !== token) return json_({ ok: false, error: 'AUTH' });
    if (req.action === 'ping') return json_({ ok: true, serverNow: Date.now() });
    if (req.action === 'push') { push_(req.data || {}); return json_({ ok: true, serverNow: Date.now() }); }
    if (req.action === 'pull') return json_(pull_(Number(req.sinceSeq) || 0, Number(req.limit) || 3000));
    return json_({ ok: false, error: 'BAD_REQUEST' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'SERVER' });
  }
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

※ js/config.js にも `SYNC_FIELDS = {words:[…], cards:[…], logs:[…], tests:[…]}`（7.2の順、seq を除く）を置く。

---

## 10. エラー処理

- 保存（IndexedDB）の失敗: MSG.SAVE_ERROR。画面は止めない。
- 同期の失敗: 黙って次回に再送（5.11）。ホームの警告帯で気づけるようにする。
- 想定外の例外: try/catch で受け、console.error に出し、トースト MSG.SAVE_ERROR。学習画面なら「次へ」を押せる状態に戻す。
- IndexedDB が使えない環境（プライベートブラウズ等）: 起動時に「この環境では記録を保存できません（Safariの通常モードで開いてください）」と画面に出し、学習は始めない。

---

## 11. iPhone特有の注意（実装するAI向け）

- 読み上げ（speechSynthesis）は、ボタンを押した操作の中で呼ぶ。iOSは自動の読み上げを止めることがある。
- 声の一覧は最初は空のことがある（voiceschanged を待つ）。
- ホーム画面から起動したアプリは、Safariとは別の保存領域。**記録はホーム画面のアプリ側に入る**。Safariで開いた分は別扱い（15章で注意する）。
- iPhoneは長く使わないサイトの保存データを消すことがある（7日ルール。ホーム画面に追加したアプリは対象外とされるが、念のため同期で守る）。
- ファイル選択（CSV）は `<input type="file">`。「ファイル」アプリから選ぶ。
- 入力欄は16px以上。

---

## 12. 受け入れテスト

| ID | 操作 | 期待結果 |
|---|---|---|
| T-01 | 初めて起動 | ホーム。連続0日、「今日はまだ学習していません」、復習待ち0、同期未設定の帯 |
| T-02 | 単語帳→CSV取り込みで kelupalabras-anki CSV を選ぶ | 「形式: KElupalabras／新規 547語／重複 0語／読めない行 0行」（同じCSVで重複がある場合は件数が変わる） |
| T-03 | 取り込む | 547語を追加。単語帳に547語。mentira の性は「女性」、カテゴリは「名詞」、jaに〔T-1〕が残っていない |
| T-04 | 同じCSVをもう一度・スキップ | 新規0語、重複547語。追加されない |
| T-05 | 学習開始 | 「新規」で CSV 1行目（creamos（creer））から出る |
| T-06 | わかる → 次へ | 答えに 信じる 等が出る。そのカードの dueDay は明日 |
| T-07 | わからない | 「× もう一度出ます」。5枚後に同じカードが「もう一度」で出る。そこで わかる → 明日 |
| T-08 | 4択を見る → 正解を選ぶ | 選んだボタンが緑。間隔は通常の半分（初回は1日のまま） |
| T-09 | 4択で不正解 | 選んだボタンが赤、正解が緑。わからないと同じ扱い |
| T-10 | 4択のハズレ | 名詞の問題なら、ハズレも名詞の意味。正解と同じ文字のハズレが無い |
| T-11 | 名詞の答え | 「la mentira」の la が赤、「el enemigo」の el が青 |
| T-12 | 🔊 | メキシコの声（端末にあれば）で、creamos だけを読む（（creer）は読まない） |
| T-13 | 目標まで回答 | 30回目で「🎉 今日の目標達成！」が出て消える。その日はもう出ない |
| T-14 | 端末の日付を進めて起動（試験用） | 復習待ちが出て、学習開始で「復習」から出る。終わると「復習が終わりました…」→新規 |
| T-15 | 同じ単語を わかる で続ける（日付を進めながら） | 間隔 1→3→8→21日（目安）。7日以上になった日以降、その単語の「日→スペ」が出る |
| T-16 | 日→スペの問題 | 日本語（＋文法の行）が出て、スペイン語の用例（`<i>`）やラテン文字を含む行は出ない |
| T-17 | 先取り復習 | 復習待ち0のときだけボタンが出る。正解しても予定日は変わらない |
| T-18 | 連続日数 | 2日続けて学習すると「2日連続」。1日空けると0から |
| T-19 | 進捗 | 4段階の件数と割合の合計が全単語数（出題停止を除く）と一致 |
| T-20 | テスト（全体・10問） | 4択10問。結果に正答率、間違えた単語、「初回」。履歴に点が1つ |
| T-21 | もう一度テスト | 「前回 ○% → 今回 ○%」。履歴に点が2つ |
| T-22 | テスト後の間隔反復 | テストの正誤でカードの予定日は変わらない。今日の回数も増えない |
| T-23 | 間違えた単語を学習 | その単語だけ出題され、終わるとホーム |
| T-24 | 単語の追加・編集 | 追加した単語が新規の最後に出る。編集で ja に改行を入れると答えで改行表示 |
| T-25 | 例文入りの標準形式CSVを「上書き」で取り込む | 例文が答えに表示される。学習記録（間隔）は変わらない |
| T-26 | 設定でURL・合言葉を入れて接続テスト | 「同期しました」相当の成功表示。合言葉を変えると「合言葉が違います」 |
| T-27 | 今すぐ同期 | スプレッドシートの words・cards に行ができる。dueDay が日付に化けていない。ja の `-` 始まりの文字が数式になっていない |
| T-28 | 20回答える | 裏で同期され、未送信が0に近づく |
| T-29 | 機内モードで学習 | 普通に使える。同期は失敗するが画面は止まらない。機内モードを解除し同期すると送られる |
| T-30 | ホーム画面のアイコンを削除→入れ直し→設定→復元 | 単語・学習記録・連続日数が戻る |
| T-31 | PCのブラウザで同じURLを開き、同じ同期設定で単語を追加→同期。iPhoneで同期 | iPhoneにその単語が出る |
| T-32 | 速度 | 「次へ」から次のカード表示まで体感で待たない（0.3秒以内）。5,000語でも起動3秒以内 |
| T-33 | 新しい版を公開してアプリを開く | 更新の帯が出て、タップで v表示が新しくなる |
| T-34 | ダークモード | 文字が読める。el／la の色が見分けられる |
| T-35 | 幅375pxの画面 | はみ出さない。わかる／わからない・次へが親指の届く下部にある |
| T-36 | 夜中3:30に学習（端末の時刻を変えて試してよい） | 前の日の回数に数えられる。4:00以降の学習は新しい日。連続日数が途切れない |
| T-37 | 未学習の単語がある状態でテスト（全体） | 一度も学習していない単語は出題されない |

---

## 13. リスクと対応

| リスク | 対応 |
|---|---|
| 端末の記録が消える（iOSの容量整理・アプリ削除・機種変更） | 自動同期＋復元（5.11）。ホームの警告帯（3日）。 |
| 同期の取りこぼし・二重 | id で上書き（何度送っても同じ結果）。同じ updatedAt はまとめて送る。 |
| GitHubリポジトリは公開（Public） | コードだけを置く。単語データ・合言葉・GASのURLは置かない（端末の設定にだけ入れる）。 |
| GASのURLと合言葉が漏れる | 他人に単語データを書き換えられる程度の被害。合言葉を変えれば止まる（15.9）。 |
| GASの制限（実行6分・1日の回数） | 1回の送信を500件・受信を3000件に区切る。個人利用の回数では上限に届かない見込み（実機で確認する）【確定】。 |
| 回答記録が増えて重くなる | logs は起動時にメモリへ読まない。daily で集計を持つ。1年で約7万件の見込み。 |
| 内蔵音声の質 | 端末に「スペイン語（メキシコ）」の声が無ければ、iPhoneの設定で追加（15.7）。 |
| 日→スペの問題で答えが見える | jaFront の規則（3.4）。見えてしまう例があれば報告→規則を直す。 |

---

## 14. 将来の拡張（初版では作らない）

要件定義書の Should・Could（1.2の一覧）、動詞活用ドリル、例文からの単語登録の補助、DELE B1向け語彙セット。

---

## 15. 初稼働までの手順（非エンジニア向け）

全体の流れ: ①コードを受け取る → ②GitHubに公開 → ③スプレッドシートとGASの準備 → ④iPhoneでホーム画面に追加 → ⑤同期の設定 → ⑥単語の取り込み → ⑦動作確認。所要は初回1時間ほど。

### 15.0 準備するもの

Mac（ブラウザだけ使う）、iPhone、GitHubアカウント（作成済み）、Googleアカウント、kelupalabras-anki-*.csv、本仕様書。

### 15.1 コードの作成依頼

1. 未確定事項（16章）を全て決め、仕様書を v1.0 にする。
2. AIに「仕様書 v1.0 どおりに全ファイルを作成して」と依頼し、6章の構成どおり1つのZIPで受け取る（アイコン3点、gas/Code.gs を含む）。

### 15.2 GitHubに公開（Mac）

1. https://github.com にログイン → 右上「＋」→「New repository」。Repository name に `kepalabranki`、「Public」、「Add a README file」にチェック →「Create repository」。
2. ZIPを解凍し、kepalabranki フォルダを**ダブルクリックして中に入る**。index.html・sw.js・manifest.webmanifest・css・js・icons を選ぶ（**gas フォルダは選ばない**）。
3. GitHubのリポジトリ画面「Add file」→「Upload files」に、選んだものを**ドラッグ＆ドロップ**→「Commit changes」。
4. 「Settings」→ 左の「Pages」→ Source「Deploy from a branch」、Branch「main」「/ (root)」→「Save」。
5. 数分（最大10分）待ち、Pages画面の「Your site is live at …」のURL（`https://ユーザー名.github.io/kepalabranki/`）をメモ。
6. リポジトリのトップに index.html・css・js・icons が**直接並んでいる**ことを確認（KEecoloopで、外側のフォルダごと上げて真っ白になった失敗あり）。

### 15.3 スプレッドシートとGASの準備（Mac）

1. Googleドライブで新しいスプレッドシートを作り、名前を「KEpalabranki_data」にする。
2. メニュー「拡張機能」→「Apps Script」。開いた画面の `Code.gs` の中身を全部消し、ZIPの gas/Code.gs の中身を貼り付けて保存（💾）。
3. 上の関数選びで `setupSheets` を選び「実行」。初回は許可を求められる →「権限を確認」→ 自分のアカウント →「詳細」→「（安全ではないページ）に移動」→「許可」。
4. 下の「実行ログ」に出た **合言葉（32文字）** をコピーして、メモアプリ等に控える。スプレッドシートに words・cards・logs・tests の4枚ができていることを確認。
5. 右上「デプロイ」→「新しいデプロイ」→ 種類の歯車で「ウェブアプリ」→ 説明「v1.0」、次のユーザーとして実行「自分」、アクセスできるユーザー「全員」→「デプロイ」。
6. 表示された **ウェブアプリのURL**（https://script.google.com/macros/s/…/exec）をコピーして控える。
7. URLと合言葉を、iPhoneへ送る（AirDrop、または自分宛てのメモの共有など）。

※「全員」は「URLを知っている人なら誰でも呼べる」という意味。合言葉が無いと記録は読めない・書けない。

### 15.4 iPhoneでホーム画面に追加

1. iPhoneの **Safari** で 15.2 のURLを開く。
2. 共有ボタン（□に↑）→「ホーム画面に追加」→「追加」。
3. 以後は**必ずホーム画面のアイコンから**開く（Safariで開いた分は記録が別になる）。

### 15.5 同期の設定

1. アプリの「設定」タブ → 同期のURL欄にURL、合言葉欄に合言葉を貼る。
2. 「接続テスト」→「同期しました」が出ればOK。「合言葉が違います」なら貼り間違い。

### 15.6 単語の取り込み

1. CSVをiPhoneの「ファイル」アプリに保存（Googleドライブアプリ →「︙」→「アプリで開く」→「"ファイル"に保存」→「このiPhone内」）。
2. アプリの「単語帳」→「CSV取り込み」→「ファイルを選ぶ」→ CSVを選ぶ → 件数を確認 →「取り込む」。

### 15.7 読み上げの声（任意）

iPhoneの「設定」→「アクセシビリティ」→「読み上げコンテンツ」→「声」→「スペイン語」→「スペイン語（メキシコ）」の声をダウンロード。アプリの設定「読み上げ音声」で選ぶか「自動」のまま。

### 15.8 動作確認

12章の T-01〜T-35 を順に行い、結果をAIに報告する（不具合は「どの画面で・何を押して・どうなったか」と画面のスクリーンショット）。

### 15.9 更新・困ったとき

| 場面 | すること |
|---|---|
| アプリの更新 | 受け取ったファイルを 15.2 の3と同じ方法で上書きアップロード → 数分後アプリを開くと更新の帯 → タップ |
| GAS（Code.gs）の更新 | Apps Scriptに貼り替えて保存 →「デプロイ」→「デプロイを管理」→ 鉛筆 → バージョン「新バージョン」→「デプロイ」（**URLは変わらない**。「新しいデプロイ」を選ぶとURLが変わるので注意） |
| 404・真っ白 | リポジトリのトップに index.html があるか。Pagesの設定。10分待つ |
| 同期できない | 設定の接続テスト。URLの末尾が /exec か。GASのデプロイの「アクセスできるユーザー」が「全員」か |
| 合言葉を変えたい | Apps Script の歯車（プロジェクトの設定）→ スクリプト プロパティ → SYNC_TOKEN を書き換え → アプリの設定にも同じ値 |
| 機種変更 | 新しいiPhoneで 15.4・15.5 → 設定「スプレッドシートから復元」 |

---

## 16. 未確定事項

なし。v0.1 の Q1〜Q5（Q1=C、Q2=A、Q3=A、Q4=B、Q5=A）と、v0.2 で残っていた【注記】3点は、すべて依頼者の了承により確定した。以後の変更は v1.0.1 以降で行う。
