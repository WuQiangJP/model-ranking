# CHANGELOG

本ファイルはデータの数値変更を記録する。時系列の降順で並べる。

## 2026-11-06

### Kimi 3 モデルを追加（22 → 25 モデル）

`data/models.json` の `models` 配列に 3 レコードを追記した。既存 22 レコードの値・出典・並び順は変更していない。`data/benchmarks.json` と `data/schema.json`、ページのコードは変更していない。

| id | name | ベンダー | リリース日 | ライセンス | コンテキスト長 |
| --- | --- | --- | --- | --- | --- |
| `kimi-k2-6` | Kimi K2.6 | Moonshot AI | 2026-04-20 | open-weights-commercial-restricted（Modified MIT License） | 262,144 |
| `kimi-k3` | Kimi K3 | Moonshot AI | 2026-07-16 | open-weights-commercial-restricted（Kimi K3 License） | 1,048,576 |
| `kimi-k3-1-pro` | Kimi K3.1 Pro | Moonshot AI | 2026-10-24 | open-weights-commercial-restricted（Kimi K3.1-Pro License） | 1,048,576 |

追加した数値と出典：

| モデル | 項目 | 値 | 出典 |
| --- | --- | --- | --- |
| Kimi K2.6 | 入力 / 出力 / キャッシュ命中（USD / MTok） | 0.95 / 4.00 / 0.16 | https://platform.kimi.ai/docs/pricing/chat |
| Kimi K3 | 入力 / 出力 / キャッシュ命中（USD / MTok） | 3.00 / 15.00 / 0.30 | https://platform.kimi.ai/docs/pricing/chat |
| Kimi K3 | LMArena Agent Arena（エージェント部門） | 0.84（Max 設定、パーセント表示） | https://arena.ai/leaderboard/agent |
| Kimi K3.1 Pro | 入力 / 出力 / キャッシュ命中（USD / MTok） | 2.00 / 10.00 / 0.20 | https://platform.kimi.ai/docs/pricing/chat |
| Kimi K3.1 Pro | AA Intelligence Index v5.0.1 | 46 | https://artificialanalysis.ai/models/kimi-k3-1-pro |
| Kimi K3.1 Pro | LMArena Agent Arena（エージェント部門） | 5.29（Max 設定、パーセント表示） | https://arena.ai/leaderboard/agent |

参考値（`benchmarks` には入れず `notes` に記載）：

| モデル | 項目 | 値 | 出典 |
| --- | --- | --- | --- |
| Kimi K2.6 | AA-Briefcase v1.1 Elo | 820 | https://artificialanalysis.ai/evaluations/aa-briefcase |
| Kimi K3 | AA-Briefcase v1.1 Elo | 1497 | https://artificialanalysis.ai/evaluations/aa-briefcase |
| Kimi K3.1 Pro | AA-Briefcase v1.1 Elo | 1675 | https://artificialanalysis.ai/evaluations/aa-briefcase |

`aa_briefcase_elo` を `null` にした理由：`src/core.js` の `compositeScore` は非 null ベンチマークの単純平均（正規化なし）で、同ファイルのコメント自身が「尺度の異なる軸を平均すると意味が崩れる」と明記している。既存 22 レコードはこの軸がすべて `null`（指数・百分率尺度のみ）であるため、Elo 尺度（約 820〜1675）の値を追加 3 件だけに入れると「総合スコア」列が他レコードと比較できない値（例：1497）になり、総合スコア順の並べ替えで実質最上位に来てしまう。`core.js` は変更禁止のため、確認した Elo は `notes` に残し、フィールドは `null` とした。

`null` とした項目と理由：

| モデル | 項目 | 理由 |
| --- | --- | --- |
| Kimi K2.6 | `aa_intelligence` | Artificial Analysis のモデルページが N/A（数値非公開） |
| Kimi K2.6 | `livecodebench` | 公式モデルカードは LiveCodeBench (v6) 89.6 を掲載するが、本サイトの軸は 2024-10-01〜2025-02-01 の問題セットであり、異なるバージョンの値を入力していない |
| Kimi K2.6 | `arena_score` | LMArena Agent Arena に本モデルの項目がない |
| Kimi K2.6 / K3 / K3.1 Pro | `aa_briefcase_elo` | 値は公開されているが、単純平均の総合スコアが尺度混在になるため `notes` に退避（上記参照） |
| Kimi K3 | `aa_intelligence` | 同ページが N/A（数値非公開） |
| Kimi K3 / K3.1 Pro | `mmlu_pro`、`livecodebench` | ベンダー公式ページ・モデルカードに該当する公表値がない |

補足：

- 3 モデルのリリース日は Moonshot AI 公式ブログの一覧に記載された日付を採用。Artificial Analysis の表示はそれぞれ 2026 年 4 月・7 月・10 月で、月単位まで一致する。
- AA-Briefcase Elo は今回、Artificial Analysis の評価ページで「See all 252 models」を展開して可読な数値を確認できた。既存 22 レコードの `aa_briefcase_elo` は変更禁止のため `null` のまま維持し、追加 3 件も尺度混在を避けるため `null` として値を `notes` に記載した。
- 既存レコードの数値変更はないため、旧値→新値の更新記録はない。

## 2026-11-05

### データセットの日本語化

- ページの表示文、データ説明、コードのコメントを日本語に翻訳（日本ユーザー向け）
- 専門用語は業界標準の訳語を採用：インテリジェンス指数、オープンウェイト、プロプライエタリ、ベンチマーク、散布図、横棒グラフ、円グラフ、トークン、コンテキスト長など
- フォントスタックを日本語フォント優先に変更（Hiragino、Yu Gothic、Meiryo、Noto Sans JP）
- `data/schema.json`、`data/benchmarks.json`、`data/models.json` の説明文を日本語化
- `scripts/build-data.js` も同期翻訳し、再生成時に翻訳が上書きされないようにした
- 検証・テストスクリプトの出力文を日本語化し、テストケースを更新
- `lang` 属性を `ja` に変更。グラフの代替テキスト、詳細モーダルのラベルをすべて日本語化
- データの数値・出典・検証ルールに変更はない

### 初期データセット

初期データセットを作成。全 22 モデル、9 ベンダーをカバー。すべての数値は収集時に開いた公式ページまたは公開ランキングの原ページに基づく。

追加したモデルレコード：

| モデル | ベンダー | 主な出典 |
| --- | --- | --- |
| GPT-6 Astra | OpenAI | OpenAI API ドキュメント、Artificial Analysis |
| GPT-6.1 Sol | OpenAI | OpenAI API ドキュメント、Artificial Analysis |
| GPT-6 Luna | OpenAI | OpenAI API ドキュメント、Artificial Analysis |
| Claude Opus 5.5 | Anthropic | Anthropic ドキュメント、Artificial Analysis |
| Claude Sonnet 5.5 | Anthropic | Anthropic ドキュメント、Artificial Analysis |
| Claude Fable 5.1 | Anthropic | Anthropic ドキュメント、Artificial Analysis |
| Claude Haiku 5.5 | Anthropic | Anthropic ドキュメント、Artificial Analysis |
| Gemini 4 Carbon | Google | Google AI 価格ページ、Artificial Analysis |
| Gemini 4 Argon | Google | Google AI 価格ページ、Artificial Analysis |
| Gemini 3.8 Flash | Google | Google AI 価格ページ、Artificial Analysis |
| Llama 4 Scout | Meta | Meta Llama 4 ページ、Hugging Face モデルカード |
| Llama 4 Maverick | Meta | Meta Llama 4 ページ、Hugging Face モデルカード |
| Muse Wonder | Meta | Artificial Analysis |
| Mistral Large 4 | Mistral AI | Mistral 価格ページ、Artificial Analysis |
| Mistral Large 3 | Mistral AI | Mistral 価格ページ、Hugging Face モデルカード |
| Mistral Small 4 | Mistral AI | Mistral 価格ページ、Artificial Analysis |
| DeepSeek V4.1 Flash 1017 | DeepSeek | DeepSeek 公式価格ページ、Artificial Analysis |
| DeepSeek V4 Pro 0813 | DeepSeek | DeepSeek 公式価格ページ、Artificial Analysis |
| GLM-5.3 | Z AI | Mistral プラットフォーム販売ページ、Hugging Face モデルカード |
| Grok 4.7 | xAI | xAI ドキュメント、Artificial Analysis |
| Qwen3-235B-A22B | Alibaba Cloud | Qwen 公式ブログ、GitHub リポジトリ |
| Qwen3-30B-A3B | Alibaba Cloud | Qwen 公式ブログ、GitHub リポジトリ |

### 価格の算出基準

- DeepSeek シリーズ：公式価格ページではピーク時間帯とオフピーク時間帯を区別している。本データセットは**ピーク時間帯**の価格に統一し、オフピーク価格は各レコードの `pricing.notes` に記載。
- Gemini 4 Carbon：公式価格ページでは 2026-12-01 から入力 $2・出力 $10 へ引き下げと記載。本レコードは取得日の時点で有効な $4 / $20 で記載。
- Gemini 3.8 Flash：公式価格ページでは 2026-12-31 から価格倍増と記載。本レコードは取得日の時点で有効な価格で記載。
- Grok 4.7：200K を超えるコンテキスト部分はより高いレートが適用され、本レコードの単価には含めていない。
- Llama 4 Scout / Maverick、Muse Wonder、GLM-5.3：ベンダーが公式の API 単価を公表していないため、価格は Artificial Analysis が集計するホスティング平均価格を採用。`pricing.notes` に算出基準を記載。

### 未確認項目

以下の項目は信頼できる公開出典が見つからなかったため `null` とし、推定は行っていない：

| モデル | 未確認項目 |
| --- | --- |
| Qwen3-235B-A22B | 価格、すべてのベンチマークスコア |
| Qwen3-30B-A3B | 価格、すべてのベンチマークスコア |
| Claude Haiku 5.5 | インテリジェンス指数 |
| Mistral Large 3 | インテリジェンス指数 |
| Llama 4 Scout / Maverick | インテリジェンス指数 |
| Muse Wonder | キャッシュ入力価格、公式ライセンス本文 |
| 全モデル | AA-Briefcase Elo（公開ページに可読な数値がない） |

## 2026-11-05（検証記録）

### モデル追加フローの検証

「データレコードを 1 件追加するだけで表示される」ことを検証するため、テストレコード `test-model-001`（ベンダー TestVendor、MIT、コンテキスト 200K）を一時的に追加。

- 検証を通過（23 モデル）
- ビルド後、ページに 23 モデルが表示され、ベンダーフィルターに TestVendor が出現。詳細モーダルも正常
- **検証完了後に撤回**。データセットは 22 モデルに復帰し、`test-model-001` は存在しない
