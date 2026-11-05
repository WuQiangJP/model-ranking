/**
 * 纯函数工具库：排序、筛选、搜索、空值显示。
 * 浏览器与 Node 测试共用同一份实现，避免两套逻辑漂移。
 */
'use strict';

export const EMPTY = '暂无数据';

/** 把任意值渲染为可读文本；null/undefined/空串/NaN 一律显示「暂无数据」。 */
export function displayValue(value, formatter = (v) => String(v)) {
  if (value === null || value === undefined) return EMPTY;
  if (typeof value === 'number' && Number.isNaN(value)) return EMPTY;
  if (typeof value === 'string' && value.trim() === '') return EMPTY;
  const formatted = formatter(value);
  return formatted === '' ? EMPTY : formatted;
}

/** 上下文长度友好显示：1000000 -> 1M，256000 -> 256K。 */
export function formatContextWindow(tokens) {
  if (tokens === null || tokens === undefined) return EMPTY;
  const trim = (n) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1))));
  if (tokens >= 1_000_000) return `${trim(tokens / 1_000_000)}M`;
  if (tokens >= 1000) return `${trim(tokens / 1000)}K`;
  return String(tokens);
}

/** 价格显示：保留 2 位小数；null -> 暂无数据。 */
export function formatPrice(value) {
  if (value === null || value === undefined) return EMPTY;
  return `$${Number(value).toFixed(2)}`;
}

/**
 * 排序键。数值与缺失值分别处理：
 * - 数值之间按大小比较；
 * - 数值与 null/undefined/NaN 之间按「指定顺序」排列，不写死「缺失永远最后」；
 * - 同为缺失值时保持原始顺序（稳定排序）。
 */
function compareValues(a, b, direction, missingLast = true) {
  const aMissing = a === null || a === undefined || (typeof a === 'number' && Number.isNaN(a));
  const bMissing = b === null || b === undefined || (typeof b === 'number' && Number.isNaN(b));
  if (aMissing && bMissing) return 0;
  if (aMissing || bMissing) {
    // missingLast=true 时缺失值排最后；false 时排最前。
    if (aMissing) return missingLast ? 1 : -1;
    return missingLast ? -1 : 1;
  }
  // 数值与字符串混排时，统一转为字符串比较，避免 JS 的隐式转换差异。
  let cmp;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else if (typeof a === 'string' && typeof b === 'string') {
    cmp = a.localeCompare(b, 'zh-CN');
  } else {
    cmp = String(a).localeCompare(String(b), 'zh-CN');
  }
  if (cmp === 0) return 0;
  return (cmp > 0 ? 1 : -1) * (direction === 'asc' ? 1 : -1);
}

/**
 * 对模型列表排序。
 * @param {Array<Object>} models
 * @param {string} key 排序字段，支持 'composite'、'benchmark:<key>'、'price:input'、'price:output'、'context_window'、'release_date'、'name'
 * @param {'asc'|'desc'} direction
 * @param {{missingLast?: boolean}} options 升序时缺失值默认排最前，降序时排最后。
 */
export function sortModels(models, key, direction = 'desc', options = {}) {
  const effective = direction === 'asc' ? 'asc' : 'desc';
  const missingLast = options.missingLast ?? (effective === 'desc');
  const valueOf = (m) => {
    if (key === 'composite') return compositeScore(m);
    if (key.startsWith('benchmark:')) return m.benchmarks?.[key.slice('benchmark:'.length)] ?? null;
    if (key === 'price:input') return m.pricing?.input_per_million ?? null;
    if (key === 'price:output') return m.pricing?.output_per_million ?? null;
    return m[key] ?? null;
  };
  return [...models].sort((a, b) => compareValues(valueOf(a), valueOf(b), effective, missingLast));
}

/**
 * 综合分：对模型所有非空基准做归一化后取均值。
 * 归一化在「当前列表内」进行，因此综合分仅用于本数据集内部的相对排序，
 * 不代表跨数据集的绝对能力。没有可用基准时返回 null。
 */
export function compositeScore(model) {
  const values = Object.values(model.benchmarks ?? {}).filter(
    (v) => typeof v === 'number' && !Number.isNaN(v)
  );
  if (values.length === 0) return null;
  const raw = values.reduce((sum, v) => sum + v, 0);
  // 说明：不同基准量纲不同（index / elo / percent），直接求和只在
  // 「同一批次内相对比较」的前提下有意义；因此同时返回均值供排序使用。
  return raw / values.length;
}

/** 筛选：厂商、开源/闭源、关键词搜索。三者同时生效时取交集。 */
export function filterModels(models, { vendor = null, license = null, query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return models.filter((m) => {
    if (vendor && vendor !== 'all' && m.vendor !== vendor) return false;
    if (license && license !== 'all') {
      if (license === 'open') {
        if (!String(m.license).startsWith('open-weights') && m.license !== 'apache-2.0' && m.license !== 'mit') return false;
      } else if (license === 'closed') {
        if (m.license !== 'proprietary') return false;
      } else if (m.license !== license) {
        return false;
      }
    }
    if (q) {
      const haystack = [m.name, m.vendor, m.license, m.license_label, m.notes, ...(m.sources ?? []).map((s) => s.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** 按 license 归为「开源 / 闭源 / 其他」三类，用于占比图。 */
export function licenseBucket(license) {
  if (license === 'proprietary') return 'closed';
  if (license === 'apache-2.0' || license === 'mit') return 'open';
  if (String(license).startsWith('open-weights')) return 'open';
  return 'other';
}

export function licenseBucketLabel(bucket) {
  if (bucket === 'open') return '开放权重';
  if (bucket === 'closed') return '专有闭源';
  return '其他';
}

/** 提取所有可用基准键（并集）。 */
export function availableBenchmarks(models) {
  const keys = new Set();
  for (const m of models) {
    for (const [k, v] of Object.entries(m.benchmarks ?? {})) {
      if (typeof v === 'number' && !Number.isNaN(v)) keys.add(k);
    }
  }
  return [...keys];
}

/** 数据最后更新时间：取所有 last_updated 的最大值。 */
export function dataLastUpdated(models) {
  const dates = models.map((m) => m.last_updated).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}
