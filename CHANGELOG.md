# CHANGELOG

本ファイルはデータの数値変更を記録する。時系列の降順で並べる。

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
