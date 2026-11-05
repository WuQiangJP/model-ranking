/**
 * 核心逻辑测试：校验、排序、筛选、空值显示。
 * 运行：node --test test/
 */
'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayValue,
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

/* ---------------- 空值显示 ---------------- */
test('displayValue：null/undefined/NaN/空串均显示「暂无数据」', () => {
  assert.equal(displayValue(null), EMPTY);
  assert.equal(displayValue(undefined), EMPTY);
  assert.equal(displayValue(NaN), EMPTY);
  assert.equal(displayValue(''), EMPTY);
  assert.equal(displayValue('   '), EMPTY);
});

test('displayValue：正常值原样返回，格式化器生效', () => {
  assert.equal(displayValue(42), '42');
  assert.equal(displayValue(0), '0');
  assert.equal(displayValue(false), 'false');
  assert.equal(displayValue(42, (v) => `$${v}`), '$42');
});

test('displayValue：格式化器返回空串时降级为「暂无数据」', () => {
  assert.equal(displayValue(5, () => ''), EMPTY);
});

test('formatContextWindow：按数量级缩写', () => {
  assert.equal(formatContextWindow(1048576), '1M');
  assert.equal(formatContextWindow(256000), '256K');
  assert.equal(formatContextWindow(10000000), '10M');
  assert.equal(formatContextWindow(1500), '1.5K');
  assert.equal(formatContextWindow(999), '999');
  assert.equal(formatContextWindow(null), EMPTY);
  assert.equal(formatContextWindow(undefined), EMPTY);
});

test('formatContextWindow：整数结果不带小数点', () => {
  assert.equal(formatContextWindow(2000000), '2M');
  assert.equal(formatContextWindow(1000), '1K');
  assert.equal(formatContextWindow(2500000), '2.5M');
});

test('formatPrice：保留两位小数，null 显示暂无数据', () => {
  assert.equal(formatPrice(2), '$2.00');
  assert.equal(formatPrice(0.1), '$0.10');
  assert.equal(formatPrice(0.003), '$0.00');
  assert.equal(formatPrice(null), EMPTY);
  assert.equal(formatPrice(undefined), EMPTY);
});

/* ---------------- 排序 ---------------- */
test('sortModels：按综合分降序，缺值排最后', () => {
  const sorted = sortModels(sample, 'composite', 'desc');
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('sortModels：按单项基准排序，null 排最后（降序）', () => {
  const sorted = sortModels(sample, 'benchmark:aa_intelligence', 'desc');
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('sortModels：升序排列，缺失值排最前', () => {
  const sorted = sortModels(sample, 'benchmark:aa_intelligence', 'asc');
  assert.deepEqual(sorted.map((m) => m.id), ['gamma', 'delta', 'beta', 'alpha']);
});

test('sortModels：按价格升序，缺失值排最前', () => {
  const sorted = sortModels(sample, 'price:input', 'asc');
  assert.deepEqual(sorted.map((m) => m.id), ['gamma', 'delta', 'beta', 'alpha']);
});

test('sortModels：可用 missingLast 覆盖默认缺失值位置', () => {
  const sorted = sortModels(sample, 'price:input', 'asc', { missingLast: true });
  assert.deepEqual(sorted.map((m) => m.id), ['delta', 'beta', 'alpha', 'gamma']);
});

test('sortModels：按上下文长度降序', () => {
  const sorted = sortModels(sample, 'context_window', 'desc');
  assert.deepEqual(sorted.map((m) => m.id), ['beta', 'alpha', 'delta', 'gamma']);
});

test('sortModels：按名称使用中文区域排序且不修改原数组', () => {
  const original = [...sample];
  const sorted = sortModels(sample, 'name', 'asc');
  assert.deepEqual(sample.map((m) => m.id), original.map((m) => m.id));
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('sortModels：非法 direction 降级为 desc', () => {
  const sorted = sortModels(sample, 'benchmark:aa_intelligence', 'bogus');
  assert.deepEqual(sorted.map((m) => m.id), ['alpha', 'beta', 'delta', 'gamma']);
});

test('compositeScore：全空时返回 null，不返回 0 或 NaN', () => {
  assert.equal(compositeScore({ benchmarks: {} }), null);
  assert.equal(compositeScore({ benchmarks: { a: null, b: undefined } }), null);
  assert.equal(compositeScore({}), null);
});

test('compositeScore：忽略 null 后取均值', () => {
  assert.equal(compositeScore({ benchmarks: { a: 40, b: 60, c: null } }), 50);
});

/* ---------------- 筛选 ---------------- */
test('filterModels：按厂商筛选', () => {
  const out = filterModels(sample, { vendor: 'OpenAI' });
  assert.deepEqual(out.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：vendor=all 视为不筛选', () => {
  const out = filterModels(sample, { vendor: 'all' });
  assert.equal(out.length, sample.length);
});

test('filterModels：按开源/闭源筛选', () => {
  const open = filterModels(sample, { license: 'open' });
  assert.deepEqual(open.map((m) => m.id), ['beta', 'gamma']);
  const closed = filterModels(sample, { license: 'closed' });
  assert.deepEqual(closed.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：关键词搜索命中名称与厂商', () => {
  const out = filterModels(sample, { query: 'openai' });
  assert.deepEqual(out.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：关键词忽略首尾空白且不区分大小写', () => {
  const out = filterModels(sample, { query: '  OPENAI  ' });
  assert.deepEqual(out.map((m) => m.id), ['alpha', 'delta']);
});

test('filterModels：搜索无命中返回空数组', () => {
  assert.deepEqual(filterModels(sample, { query: '不存在的模型' }), []);
});

test('filterModels：多条件取交集', () => {
  const out = filterModels(sample, { vendor: 'OpenAI', license: 'closed', query: 'delta' });
  assert.deepEqual(out.map((m) => m.id), ['delta']);
});

test('filterModels：无参数返回全部', () => {
  assert.equal(filterModels(sample).length, sample.length);
});

/* ---------------- 许可证分桶 ---------------- */
test('licenseBucket：正确分类', () => {
  assert.equal(licenseBucket('proprietary'), 'closed');
  assert.equal(licenseBucket('apache-2.0'), 'open');
  assert.equal(licenseBucket('mit'), 'open');
  assert.equal(licenseBucket('open-weights-commercial-restricted'), 'open');
  assert.equal(licenseBucket('open-weights-non-commercial'), 'open');
  assert.equal(licenseBucket('something-else'), 'other');
});

test('licenseBucketLabel：返回中文标签', () => {
  assert.equal(licenseBucketLabel('open'), '开放权重');
  assert.equal(licenseBucketLabel('closed'), '专有闭源');
  assert.equal(licenseBucketLabel('other'), '其他');
});

/* ---------------- 汇总工具 ---------------- */
test('availableBenchmarks：返回并集且排除全空键', () => {
  assert.deepEqual(availableBenchmarks(sample).sort(), ['aa_intelligence', 'mmlu_pro']);
});

test('dataLastUpdated：取最大日期', () => {
  assert.equal(dataLastUpdated(sample), '2026-11-05');
});

test('dataLastUpdated：空列表返回 null', () => {
  assert.equal(dataLastUpdated([]), null);
});
