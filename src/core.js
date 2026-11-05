/**
 * 純粋関数ユーティリティ：ソート、フィルター、検索、空値の表示。
 * ブラウザと Node テストで同じ実装を共有し、両者のロジックがずれないようにする。
 */
'use strict';

export const EMPTY = 'データなし';

/** 文字列中の HTML 特殊文字をエスケープする。ECharts tooltip は HTML として描画するため、
 *  データ由来の文字列をそのまま埋め込むと注入面になる。表示前に必ず通す。 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 任意の値を表示用テキストに変換する。null / undefined / 空文字列 / NaN はすべて「データなし」を返す。 */
export function displayValue(value, formatter = (v) => String(v)) {
  if (value === null || value === undefined) return EMPTY;
  if (typeof value === 'number' && Number.isNaN(value)) return EMPTY;
  if (typeof value === 'string' && value.trim() === '') return EMPTY;
  const formatted = formatter(value);
  return formatted === '' ? EMPTY : formatted;
}

/** コンテキスト長の表示を整形する：1000000 -> 1M、256000 -> 256K。 */
export function formatContextWindow(tokens) {
  if (tokens === null || tokens === undefined) return EMPTY;
  const trim = (n) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1))));
  if (tokens >= 1_000_000) return `${trim(tokens / 1_000_000)}M`;
  if (tokens >= 1000) return `${trim(tokens / 1000)}K`;
  return String(tokens);
}

/** 価格の表示：通常は小数第 2 位、0.1 未満は小数第 3 位（安価なキャッシュ／入力価格が同一表示に潰れないようにする）。null は「データなし」。 */
export function formatPrice(value) {
  if (value === null || value === undefined) return EMPTY;
  const n = Number(value);
  return `$${n < 0.1 ? n.toFixed(3) : n.toFixed(2)}`;
}

/**
 * ソート比較。数値と欠損値を個別に扱う：
 * - 数値同士は大小で比較する。
 * - 数値と null / undefined / NaN の間は「指定された順序」に並べる。欠損値を常に末尾に置くとは限らない。
 * - 双方が欠損値のときは元の順序を保つ（安定ソート）。
 */
function compareValues(a, b, direction, missingLast = true) {
  const aMissing = a === null || a === undefined || (typeof a === 'number' && Number.isNaN(a));
  const bMissing = b === null || b === undefined || (typeof b === 'number' && Number.isNaN(b));
  if (aMissing && bMissing) return 0;
  if (aMissing || bMissing) {
    // missingLast=true なら欠損値を末尾に、false なら先頭に置く。
    if (aMissing) return missingLast ? 1 : -1;
    return missingLast ? -1 : 1;
  }
  // 数値と文字列が混在する場合、文字列に統一して比較し、JS の暗黙変換の差異を避ける。
  let cmp;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else if (typeof a === 'string' && typeof b === 'string') {
    cmp = a.localeCompare(b, 'ja');
  } else {
    cmp = String(a).localeCompare(String(b), 'ja');
  }
  if (cmp === 0) return 0;
  return (cmp > 0 ? 1 : -1) * (direction === 'asc' ? 1 : -1);
}

/**
 * モデル一覧をソートする。
 * @param {Array<Object>} models
 * @param {string} key ソート項目。'composite'、'benchmark:<key>'、'price:input'、'price:output'、'context_window'、'release_date'、'name' をサポート
 * @param {'asc'|'desc'} direction
 * @param {{missingLast?: boolean}} options 昇順では欠損値を先頭に、降順では末尾に配置する（デフォルト）。
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
 * 総合スコア：モデルの全ての非 null ベンチマークの算術平均（正規化は行わない）。
 * ベンチマークごとに尺度が異なる（index / elo / percent）ため、複数の異種軸を
 * 平均すると意味が崩れる（例：百分率の MMLU-Pro と Elo の平均）。そのためこの値は
 * 「同一モデル内で軸が単一、または尺度が近い場合」にのみ参照値として用い、
 * モデル間の順位付けにはインテリジェンス指数（benchmark:aa_intelligence）を優先すること。
 * 利用可能なベンチマークがない場合は null を返す。
 */
export function compositeScore(model) {
  const values = Object.values(model.benchmarks ?? {}).filter(
    (v) => typeof v === 'number' && !Number.isNaN(v)
  );
  if (values.length === 0) return null;
  const raw = values.reduce((sum, v) => sum + v, 0);
  return raw / values.length;
}

/** フィルター：ベンダー、オープン／クローズド、キーワード検索。複数条件は同時に指定した場合に積集合を取る。 */
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

/** license を「オープン／クローズド／その他」の 3 分類に振り分ける。円グラフに用いる。 */
export function licenseBucket(license) {
  if (license === 'proprietary') return 'closed';
  if (license === 'apache-2.0' || license === 'mit') return 'open';
  if (String(license).startsWith('open-weights')) return 'open';
  return 'other';
}

export function licenseBucketLabel(bucket) {
  if (bucket === 'open') return 'オープンウェイト';
  if (bucket === 'closed') return 'プロプライエタリ';
  return 'その他';
}

/** 利用可能なベンチマークキーをすべて抽出する（和集合）。 */
export function availableBenchmarks(models) {
  const keys = new Set();
  for (const m of models) {
    for (const [k, v] of Object.entries(m.benchmarks ?? {})) {
      if (typeof v === 'number' && !Number.isNaN(v)) keys.add(k);
    }
  }
  return [...keys];
}

/** データの最終更新日：全レコードの last_updated の最大値を取る。 */
export function dataLastUpdated(models) {
  const dates = models.map((m) => m.last_updated).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}
