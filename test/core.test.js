/**
 * コアロジックのテスト：検証、ソート、フィルター、空値の表示。
 * 実行：node --test test/
 */
'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayValue,
  escapeHtml,
  formatContextWindow,
  formatPrice,
  sortModels,
  filterModels,
  compositeScore,
  licenseBucket,
  licenseBucketLabel,
  availableBenchmarks,
  dataLastUpdated,
  EMPTY,
} from '../src/core.js';

const sample = [
  {
    id: 'alpha',
    name: 'Alpha',
    vendor: 'OpenAI',
    release_date: '2026-09-01',
    license: 'proprietary',
    context_window: 1000000,
    pricing: { input_per_million: 2.0, output_per_million: 10.0, currency: 'USD', cached_input_per_million: 0.2, notes: '' },
    benchmarks: { aa_intelligence: 55, mmlu_pro: null },
    last_updated: '2026-11-01',
  },
  {
    id: 'beta',
    name: 'Beta',
    vendor: 'Meta',
    release_date: '2025-04-05',
    license: 'apache-2.0',
    context_window: 10000000,
    pricing: { input_per_million: 0.18, output_per_million: 0.66, currency: 'USD', cached_input_per_million: null, notes: '' },
    benchmarks: { aa_intelligence: 33, mmlu_pro: 74.3 },
    last_updated: '2026-11-05',
  },
  {
    id: 'gamma',
    name: 'Gamma',
    vendor: 'Mistral AI',
    release_date: '2026-10-29',
    license: 'open-weights-commercial-restricted',
    context_window: null,
    pricing: { input_per_million: null, output_per_million: null, currency: null, cached_input_per_million: null, notes: '' },
    benchmarks: { aa_intelligence: null, mmlu_pro: null },
    last_updated: '2026-11-03',
  },
  {
    id: 'delta',
    name: 'Delta',
    vendor: 'OpenAI',
    release_date: '2026-09-22',
    license: 'proprietary',
    context_window: 256000,
    pricing: { input_per_million: 0.1, output_per_million: 0.5, currency: 'USD', cached_input_per_million: 0.01, notes: '' },
    benchmarks: { aa_intelligence: 28 },
    last_updated: '2026-11-02',
  },
];

/* ---------------- 空値の表示 ---------------- */
test('displayValue：null / undefined / NaN / 空文字列はすべて「データなし」', () => {
  assert.equal(displayValue(null), EMPTY);
  assert.equal(displayValue(undefined), EMPTY);
  assert.equal(displayValue(NaN), EMPTY);
  assert.equal(displayValue(''), EMPTY);
  assert.equal(displayValue('   '), EMPTY);
});

/* ---------------- HTML エスケープ ---------------- */
test('escapeHtml：特殊文字を実体参照に変換する', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('"'), '&quot;');
  assert.equal(escapeHtml("'"), '&#39;');
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('>'), '&gt;');
});

test('escapeHtml：XSS ペイロードを無害化する', () => {
  const payload = '<img src=x onerror="alert(1)">';
  const out = escapeHtml(payload);
  assert.equal(out, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  // ブラウザがタグとして解釈しないこと：山括弧が実体参照になっている
  assert.ok(!out.includes('<img'));
  assert.ok(!out.includes('alert(1)">'));
});

test('escapeHtml：数値・null・undefined を文字列化してエスケープする', () => {
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(null), 'null');
  assert.equal(escapeHtml(undefined), 'undefined');
  assert.equal(escapeHtml(0), '0');
});

test('escapeHtml：日本語・アルファベット・数字はそのまま保持する', () => {
  assert.equal(escapeHtml('Llama 4 Maverick'), 'Llama 4 Maverick');
  assert.equal(escapeHtml('大規模言語モデル'), '大規模言語モデル');
  assert.equal(escapeHtml('GPT-6'), 'GPT-6');
});

test('displayValue：通常の値はそのまま返し、フォーマッタが適用される', () => {
  assert.equal(displayValue(42), '42');
  assert.equal(displayValue(0), '0');
  assert.equal(displayValue(false), 'false');
  assert.equal(displayValue(42, (v) => `$${v}`), '$42');
});

test('displayValue：フォーマッタが空文字列を返した場合は「データなし」に切り替わる', () => {
  assert.equal(displayValue(5, () => ''), EMPTY);
});

test('formatContextWindow：桁数に応じて省略表記', () => {
  assert.equal(formatContextWindow(1048576), '1M');
  assert.equal(formatContextWindow(256000), '256K');
  assert.equal(formatContextWindow(10000000), '10M');
  assert.equal(formatContextWindow(1500), '1.5K');
  assert.equal(formatContextWindow(999), '999');
  assert.equal(formatContextWindow(null), EMPTY);
  assert.equal(formatContextWindow(undefined), EMPTY);
});

test('formatContextWindow：整数の結果には小数点を付けない', () => {
  assert.equal(formatContextWindow(2000000), '2M');
  assert.equal(formatContextWindow(1000), '1K');
  assert.equal(formatContextWindow(2500000), '2.5M');
});

test('formatPrice：小数第 2 位まで表示し、null は「データなし」', () => {
  assert.equal(formatPrice(2), '$2.00');
  assert.equal(formatPrice(0.1), '$0.10');
  assert.equal(formatPrice(0.003), '$0.00');
  assert.equal(formatPrice(null), EMPTY);
  assert.equal(formatPrice(undefined), EMPTY);
});

/* ---------------- ソート ---------------- */
test('sortModels：総合スコアの降順。欠損値は末尾', () => {
  const sorted = sortModels(sample, 'composite', 'desc');
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('sortModels：個別ベンチマークでソートし、null を末尾に（降順）', () => {
  const sorted = sortModels(sample, 'benchmark:aa_intelligence', 'desc');
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('sortModels：昇順では欠損値を先頭に', () => {
  const sorted = sortModels(sample, 'benchmark:aa_intelligence', 'asc');
  assert.deepEqual(sorted.map((m) => m.id), ['gamma', 'delta', 'beta', 'alpha']);
});

test('sortModels：価格の昇順では欠損値を先頭に', () => {
  const sorted = sortModels(sample, 'price:input', 'asc');
  assert.deepEqual(sorted.map((m) => m.id), ['gamma', 'delta', 'beta', 'alpha']);
});

test('sortModels：missingLast で欠損値の既定位置を上書きできる', () => {
  const sorted = sortModels(sample, 'price:input', 'asc', { missingLast: true });
  assert.deepEqual(sorted.map((m) => m.id), ['delta', 'beta', 'alpha', 'gamma']);
});

test('sortModels：コンテキスト長の降順', () => {
  const sorted = sortModels(sample, 'context_window', 'desc');
  assert.deepEqual(sorted.map((m) => m.id), ['beta', 'alpha', 'delta', 'gamma']);
});

test('sortModels：名前は日本語ロケールでソートし、元の配列は変更しない', () => {
  const original = [...sample];
  const sorted = sortModels(sample, 'name', 'asc');
  assert.deepEqual(sample.map((m) => m.id), original.map((m) => m.id));
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('sortModels：不正な direction は desc に切り替わる', () => {
  const sorted = sortModels(sample, 'benchmark:aa_intelligence', 'bogus');
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('compositeScore：すべて空の場合は null を返す（0 や NaN ではない）', () => {
  assert.equal(compositeScore({ benchmarks: {} }), null);
  assert.equal(compositeScore({ benchmarks: { a: null, b: undefined } }), null);
  assert.equal(compositeScore({}), null);
});

test('compositeScore：null を除外して平均を取る', () => {
  assert.equal(compositeScore({ benchmarks: { a: 40, b: 60, c: null } }), 50);
});

/* ---------------- フィルター ---------------- */
test('filterModels：ベンダーで絞り込む', () => {
  const out = filterModels(sample, { vendor: 'OpenAI' });
  assert.deepEqual(out.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：vendor=all は絞り込みなしとみなす', () => {
  const out = filterModels(sample, { vendor: 'all' });
  assert.equal(out.length, sample.length);
});

test('filterModels：オープン／クローズドで絞り込む', () => {
  const open = filterModels(sample, { license: 'open' });
  assert.deepEqual(open.map((m) => m.id), ['beta', 'gamma']);
  const closed = filterModels(sample, { license: 'closed' });
  assert.deepEqual(closed.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：キーワード検索は名前とベンダーに一致する', () => {
  const out = filterModels(sample, { query: 'openai' });
  assert.deepEqual(out.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：キーワードは前後の空白を無視し、大文字小文字を区別しない', () => {
  const out = filterModels(sample, { query: '  OPENAI  ' });
  assert.deepEqual(out.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：検索が一致しない場合は空配列を返す', () => {
  assert.deepEqual(filterModels(sample, { query: '存在しないモデル' }), []);
});

test('filterModels：複数条件は積集合を取る', () => {
  const out = filterModels(sample, { vendor: 'OpenAI', license: 'closed', query: 'delta' });
  assert.deepEqual(out.map((m) => m.id), ['delta']);
});

test('filterModels：引数なしはすべて返す', () => {
  assert.equal(filterModels(sample).length, sample.length);
});

/* ---------------- ライセンスの分類 ---------------- */
test('licenseBucket：正しく分類される', () => {
  assert.equal(licenseBucket('proprietary'), 'closed');
  assert.equal(licenseBucket('apache-2.0'), 'open');
  assert.equal(licenseBucket('mit'), 'open');
  assert.equal(licenseBucket('open-weights-commercial-restricted'), 'open');
  assert.equal(licenseBucket('open-weights-non-commercial'), 'open');
  assert.equal(licenseBucket('something-else'), 'other');
});

test('licenseBucketLabel：日本語ラベルを返す', () => {
  assert.equal(licenseBucketLabel('open'), 'オープンウェイト');
  assert.equal(licenseBucketLabel('closed'), 'プロプライエタリ');
  assert.equal(licenseBucketLabel('other'), 'その他');
});

/* ---------------- 集計ユーティリティ ---------------- */
test('availableBenchmarks：和集合を返し、すべて空のキーを除外する', () => {
  assert.deepEqual(availableBenchmarks(sample).sort(), ['aa_intelligence', 'mmlu_pro']);
});

test('dataLastUpdated：最大の日付を取る', () => {
  assert.equal(dataLastUpdated(sample), '2026-11-05');
});

test('dataLastUpdated：空のリストは null を返す', () => {
  assert.equal(dataLastUpdated([]), null);
});
