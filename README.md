# 大規模言語モデルランキング

データ駆動の完全な静的 LLM 比較サイト。公開可能で、Agent による定期更新に対応。

## クイックスタート

```bash
npm install
npm run check     # 検証 + テスト + ビルド
npm run serve     # ローカルプレビュー http://localhost:4173/
```

`http://localhost:4173/` を開くとサイトが表示される。

## 機能

- **ランキング一覧表**：総合スコア、個別ベンチマーク、価格、コンテキスト長、リリース日、名前で並べ替え。ベンダーとオープン／クローズドで絞り込み。キーワード検索。
- **可視化**：ベンチマークスコアの横棒グラフ（ベンチマーク切替可能）、価格と性能の散布図（ホバーでモデル名表示）、オープン／クローズド比率の円グラフ。
- **詳細表示**：「詳細を見る」をクリックするか Enter でモーダルを開き、全項目と出典リンクを表示。
- **アクセシビリティ**：モバイル対応、WCAG AA のコントラスト比、グラフのテキスト代替表、すべての操作をキーボードで実行可能（Tab / Enter / Escape）。
- **空値の扱い**：未確認項目はすべて「データなし」と表示。0 や NaN は表示しない。

## プロジェクト構成

```
data/
  models.json        モデルレコード（唯一のデータソース）
  benchmarks.json    ベンチマーク定義（単位と方向）
  schema.json        JSON Schema
src/
  index.html         ページ構造
  styles.css         スタイル（高コントラスト配色）
  app.js             ページロジック
  core.js            ソート／フィルター／空値表示（ブラウザとテストで共用）
  vendor/echarts.min.js
scripts/
  validate.js        データ検証
  build.js           dist/ をビルド
  serve.js           ローカルプレビューサーバー
  add-model.js       新規モデルテンプレート生成
test/                コアロジックと検証スクリプトのテスト
dist/                ビルド成果物（コミットしない）
```

## 技術スタックとバージョン

| 依存 | バージョン | 説明 |
| --- | --- | --- |
| Node.js | ≥ 20 | 検証・テスト・ビルドスクリプトの実行環境 |
| Apache ECharts | 6.1.0 | グラフライブラリ。ローカルに vendored、正確なバージョン指定 |
| ajv | 8.20.0 | JSON Schema 検証 |
| ajv-formats | 3.0.1 | 日付・URI 形式の検証 |
| eslint | 10.14.0 | コードチェック |

すべての依存は正確なバージョンで固定し、開放区間は使わない。ビルド時はネットワーク不要：ECharts は `src/vendor/` に vendored 済み。

## データの更新

**新規モデルの追加は `data/models.json` の `models` 配列にレコードを 1 件追加するだけでよく、ページのコードは一切変更不要。**

テンプレートの自動生成：

```bash
node scripts/add-model.js --id my-model --name "My Model" \
  --vendor "MyVendor" --release-date 2026-01-01 --license proprietary --context 1000000
```

テンプレートは未確認の項目を `null` のまま残す。その後、公式ページを開いて実際の値と出典を記入する。

更新フローと出典の要件は `AGENTS.md` に詳述。要点：

1. データはベンダー公式ページまたは公開ランキングの原ページのみ。必ずページを開いて確認すること。
2. 信頼できる出典が見つからない項目は `null` とし、`notes` に理由を記載。推定は禁止。
3. `retrieved_at` と `last_updated` を更新する。
4. 数値の変更は `CHANGELOG.md` に記録する。
5. `npm run check` を通過したら、新規ブランチでコミットし、Pull Request を出す。

## デプロイ

### GitHub Pages

リポジトリには `.github/workflows/deploy.yml` が含まれており、設定後は push で自動デプロイされる。ワークフローは `main` ブランチへの push 時に `npm run validate`、`npm test`、`npm run build` を順に実行し、いずれかが失敗すれば公開を中止し、成功時は `dist/` を Pages の成果物として公開する。

#### 手順

1. **リポジトリを作成して push**

   ```bash
   git clone git@github.com:<your-username>/<repo-name>.git
   cd <repo-name>
   ```

2. **Pages のソースを GitHub Actions に設定**

   リポジトリページ → **Settings** → **Pages** → **Build and deployment** → **Source** で `GitHub Actions` を選択（Deploy from branch ではない）。

3. **初回デプロイを実行**

   Source を選択すると、Actions タブに `GitHub Pages へのデプロイ` の実行記録が現れる。Actions ページで **Run workflow** を手動で押してもよい。

4. **サイトを確認**

   デプロイ完了後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される。Actions の実行詳細ページ上部にも `page_url` が表示される。

#### カスタムドメイン（任意）

ワークフローの `actions/configure-pages@v5` ステップに 1 行追加する：

```yaml
      - uses: actions/configure-pages@v5
        with:
          domain: example.com
```

その後、リポジトリ Settings → Pages → Custom domain にドメインを入力し、DNS プロバイダーで Pages 向けの CNAME レコードを追加する。

#### デプロイの検証

```bash
curl -sI https://<ユーザー名>.github.io/<リポジトリ名>/data/models.json
```

`200` と `application/json` が返れば正常。ページのすべてのリソースは相対パス（`./data/...`、`./app.js`）を使っているため、`/<リポジトリ名>/` のサブパスにデプロイしてもコード変更なしで動作する。

### 手動デプロイ

```bash
npm run build
# dist/ ディレクトリを任意の静的ホスティングにアップロード（Netlify / Vercel / Nginx / オブジェクトストレージ）
```

`dist/` は完全な静的成果物で、サーバー側の実行時は一切不要。

### ローカル静的サーバー

```bash
npm run build && npm run serve
```

## データ出典

すべてのデータの出典リンクは各モデルレコードの `sources` フィールドに記録され、ページの詳細モーダルで確認できる。主な出典：

- 各ベンダーの公式モデルページと API 価格ページ（OpenAI、Anthropic、Google、Meta、Mistral AI、DeepSeek、Alibaba Cloud、xAI、Z AI）
- Artificial Analysis の Intelligence Index とモデルページ
- LMArena の公開ランキング
- オープンウェイトモデルの公式 Hugging Face モデルカード

ページ下部の「データ出典について」と各レコードの詳細モーダルに出典 URL と取得日を記載。データは遅延している場合があり、取得時点のページ表示を基準とする。

## 環境変数

本プロジェクトの更新フローに API Key は不要。`serve.js` は次の任意変数に対応：

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `PORT` | `4173` | ローカルプレビューのポート |
| `RETRIEVED_AT` | 実行時のシステム日付 | `build-data.js` が書き込む取得日を上書き |

将来的に認証が必要な収集スクリプトを導入する場合は、環境変数からのみ読み取り、リポジトリには書き込まない。

## スクリプト

| コマンド | 役割 |
| --- | --- |
| `npm run validate` | schema、id の一意性、URL、日付、数値範囲、シークレットを検証 |
| `npm test` | コアロジックと検証スクリプトのテストを実行 |
| `npm run build` | 検証後に `dist/` を生成 |
| `npm run serve` | ローカルプレビュー（ポート 4173） |
| `npm run add-model` | schema に適合する新規モデルテンプレートを生成 |
| `npm run check` | validate + test + build |

## ライセンスと制限

ページのデータは各出典の公開条件に従って利用する。本サイトは完全な静的サイトであり、訪問者の情報を収集せず、Cookie を設定しない。
