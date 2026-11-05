#!/usr/bin/env node
/**
 * モデル追加の補助スクリプト。
 *
 * schema に適合するテンプレートレコードを生成し、data/models.json に追加する。
 * 未確認の数値は自動的に埋めない：人手で確認する必要がある項目はすべて null または
 * 空文字列にし、notes に「要確認」と記載する。呼び出し元はその後、ソースページを
 * 開いて実際の値を記入しなければならない。
 *
 * 使い方：
 *   node scripts/add-model.js --id my-model --name "My Model" --vendor "MyVendor" \
 *       --release-date 2026-01-01 --license proprietary --context 1000000
 *
 * オプション：
 *   --id              必須。グローバルに一意な小文字ハイフン形式
 *   --name            必須。表示名
 *   --vendor          必須。ベンダー
 *   --release-date    必須。YYYY-MM-DD
 *   --license         必須。列挙は data/schema.json を参照
 *   --context         任意。コンテキスト長（トークン）
 *   --dry-run         書き込むレコードを表示するだけで、ファイルは変更しない
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'models.json');

const LICENSE_LABELS = {
  proprietary: 'プロプライエタリ（クローズドソース）',
  'open-weights': 'オープンウェイト',
  'open-weights-commercial-restricted': 'オープンウェイト（商用利用に制限あり）',
  'open-weights-non-commercial': 'オープンウェイト（非商用）',
  'apache-2.0': 'Apache 2.0',
  mit: 'MIT',
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    }
  }
  return out;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const dryRun = args['dry-run'] === true;

for (const required of ['id', 'name', 'vendor', 'release-date', 'license']) {
  if (!args[required]) fail(`必須パラメータがありません：--${required}`);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.id)) {
  fail('id は小文字アルファベット、数字、ハイフンのみで構成し、先頭と末尾にハイフンを付けないでください');
}
if (!LICENSE_LABELS[args.license]) {
  fail(`license は次のいずれかでなければなりません：${Object.keys(LICENSE_LABELS).join(', ')}`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(args['release-date'])) {
  fail('release-date は YYYY-MM-DD の形式でなければなりません');
}

const doc = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
if (doc.models.some((m) => m.id === args.id)) {
  fail(`id は既に存在します：${args.id}`);
}

// ベンチマークキーは既存のホワイトリストから取得し、すべて null のままにして人手での確認を待つ
const benchmarkKeys = (doc.benchmarks ?? []).map((b) => b.key);
const benchmarks = Object.fromEntries(benchmarkKeys.map((k) => [k, null]));

const context = args.context ? Number(args.context) : null;
if (context !== null && (!Number.isInteger(context) || context <= 0)) {
  fail('--context は正の整数でなければなりません');
}

const record = {
  id: args.id,
  name: args.name,
  vendor: args.vendor,
  release_date: args['release-date'],
  license: args.license,
  license_label: LICENSE_LABELS[args.license],
  context_window: context,
  pricing: {
    input_per_million: null,
    output_per_million: null,
    currency: 'USD',
    cached_input_per_million: null,
    notes: '要確認：価格はベンダーの公式価格ページに基づく必要があり、確認まで null のままとします。',
  },
  benchmarks,
  arena_score: null,
  sources: [],
  notes: '要確認：このレコードは add-model スクリプトで生成されました。すべての数値項目は公式ソースから未確認です。まず公式ページを開いて sources と実際の数値を記入し、その後 npm run validate を実行してください。',
  last_updated: today(),
};

if (dryRun) {
  console.log('書き込むレコード（--dry-run のためファイルは変更していません）：');
  console.log(JSON.stringify(record, null, 2));
  process.exit(0);
}

doc.models.push(record);
fs.writeFileSync(DATA_FILE, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
console.log(`✓ モデルレコードを追加しました：${record.id}`);
console.log('  ファイル：data/models.json');
console.log('  次の手順：');
console.log('    1. 公式ページを開いて価格、ベンチマークスコア、リリース日を確認する');
console.log('    2. sources に出典リンクと取得日を追加する');
console.log('    3. npm run validate を実行して検証する');
console.log('    4. npm run build を実行してビルドし、ページ表示を確認する');
