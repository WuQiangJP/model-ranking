/**
 * ページのメインロジック。
 * data/models.json と data/benchmarks.json のみを読み込み、コード内にモデル情報を埋め込まない。
 */
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
} from './core.js';

const els = {
  lastUpdated: document.getElementById('last-updated'),
  modelCount: document.getElementById('model-count'),
  sortKey: document.getElementById('sort-key'),
  sortDirection: document.getElementById('sort-direction'),
  filterVendor: document.getElementById('filter-vendor'),
  filterLicense: document.getElementById('filter-license'),
  search: document.getElementById('search'),
  reset: document.getElementById('reset'),
  tableBody: document.getElementById('table-body'),
  tableHint: document.getElementById('table-hint'),
  emptyState: document.getElementById('empty-state'),
  barBenchmark: document.getElementById('bar-benchmark'),
  chartBar: document.getElementById('chart-bar'),
  chartScatter: document.getElementById('chart-scatter'),
  chartPie: document.getElementById('chart-pie'),
  barAltBody: document.querySelector('#bar-alt-table tbody'),
  scatterAltBody: document.querySelector('#scatter-alt-table tbody'),
  pieAltBody: document.querySelector('#pie-alt-table tbody'),
  overlay: document.getElementById('detail-overlay'),
  detailTitle: document.getElementById('detail-title'),
  detailBody: document.getElementById('detail-body'),
  detailClose: document.getElementById('detail-close'),
};

const state = {
  models: [],
  benchmarkDefs: [],
  chartBar: null,
  chartScatter: null,
  chartPie: null,
  lastFocus: null,
};

/* ---------------- データの読み込み ---------------- */
async function loadData() {
  const [modelsRes, benchRes] = await Promise.all([
    fetch('./data/models.json', { cache: 'no-store' }),
    fetch('./data/benchmarks.json', { cache: 'no-store' }),
  ]);
  if (!modelsRes.ok) throw new Error(`data/models.json の読み込みに失敗しました：${modelsRes.status}`);
  if (!benchRes.ok) throw new Error(`data/benchmarks.json の読み込みに失敗しました：${benchRes.status}`);

  const modelsDoc = await modelsRes.json();
  const benchDoc = await benchRes.json();

  // ベンチマーク定義は models.json 内のホワイトリストを正とする。benchmarks.json は単位と説明を提供する。
  const benchDefs = modelsDoc.benchmarks?.length
    ? modelsDoc.benchmarks
    : benchDoc.benchmarks ?? [];

  return { models: modelsDoc.models ?? [], benchmarkDefs: benchDefs };
}

/* ---------------- 描画ヘルパー ---------------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function emptyVal() {
  return el('span', 'empty-val', EMPTY);
}

function setText(node, value) {
  if (value === null || value === undefined || value === '') {
    node.replaceChildren(emptyVal());
  } else {
    node.textContent = String(value);
  }
}

function badgeClass(license) {
  const bucket = licenseBucket(license);
  return bucket === 'open' ? 'badge-open' : bucket === 'closed' ? 'badge-closed' : 'badge-other';
}

function benchmarkName(key) {
  const def = state.benchmarkDefs.find((b) => b.key === key);
  return def ? def.name : key;
}

/* ---------------- ヘッダー情報 ---------------- */
function renderHeader() {
  const last = dataLastUpdated(state.models);
  setText(els.lastUpdated, last ? `${last}（取得日）` : null);
  els.modelCount.textContent = `全 ${state.models.length} モデル`;
}

/* ---------------- 一覧テーブル ---------------- */
function renderTable() {
  const { sortKey, sortDirection, filterVendor, filterLicense, search } = els;
  const filtered = filterModels(state.models, {
    vendor: filterVendor.value,
    license: filterLicense.value,
    query: search.value,
  });
  const sorted = sortModels(filtered, sortKey.value, sortDirection.value);

  els.tableBody.replaceChildren();
  els.emptyState.hidden = sorted.length > 0;
  els.tableHint.textContent = sorted.length
    ? `${sorted.length} / ${state.models.length} モデルを表示`
    : '';

  sorted.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.tabIndex = 0;
    tr.dataset.modelId = m.id;

    const rank = el('td', 'num', String(idx + 1));

    const nameCell = el('td');
    nameCell.append(el('span', 'model-name', m.name));
    nameCell.append(el('span', 'model-id', m.id));

    const vendor = el('td', null, m.vendor);

    const licenseCell = el('td');
    const badge = el('span', `badge ${badgeClass(m.license)}`, m.license_label ?? m.license);
    licenseCell.append(badge);

    const composite = el('td', 'num');
    const cs = compositeScore(m);
    setText(composite, cs === null ? null : cs.toFixed(1));

    const intel = el('td', 'num');
    const intelVal = m.benchmarks?.aa_intelligence;
    setText(intel, intelVal === null || intelVal === undefined ? null : intelVal);

    const inPrice = el('td', 'num');
    setText(inPrice, m.pricing?.input_per_million === null || m.pricing?.input_per_million === undefined
      ? null
      : formatPrice(m.pricing.input_per_million));

    const outPrice = el('td', 'num');
    setText(outPrice, m.pricing?.output_per_million === null || m.pricing?.output_per_million === undefined
      ? null
      : formatPrice(m.pricing.output_per_million));

    const ctx = el('td', 'num');
    setText(ctx, m.context_window === null ? null : formatContextWindow(m.context_window));

    const detailCell = el('td');
    const btn = el('button', 'btn-detail', '詳細を見る');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.addEventListener('click', () => openDetail(m.id));
    detailCell.append(btn);

    tr.append(rank, nameCell, vendor, licenseCell, composite, intel, inPrice, outPrice, ctx, detailCell);
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail(m.id);
      }
    });
    els.tableBody.append(tr);
  });
}

/* ---------------- ベンダーのフィルター項目 ---------------- */
function renderVendorOptions() {
  const vendors = [...new Set(state.models.map((m) => m.vendor))].sort((a, b) => a.localeCompare(b, 'ja'));
  const select = els.filterVendor;
  const current = select.value;
  select.replaceChildren();
  const allOpt = el('option', null, 'すべてのベンダー');
  allOpt.value = 'all';
  select.append(allOpt);
  for (const v of vendors) {
    const opt = el('option', null, v);
    opt.value = v;
    select.append(opt);
  }
  select.value = vendors.includes(current) ? current : 'all';
}

/* ---------------- ベンチマーク選択（棒グラフ） ---------------- */
function renderBenchmarkOptions() {
  const keys = availableBenchmarks(state.models);
  const select = els.barBenchmark;
  select.replaceChildren();
  if (keys.length === 0) {
    const opt = el('option', null, '利用可能なベンチマークはありません');
    opt.value = '';
    select.append(opt);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  for (const key of keys) {
    const opt = el('option', null, benchmarkName(key));
    opt.value = key;
    select.append(opt);
  }
  // デフォルトは先頭のベンチマークを選択する
  select.value = keys[0];
}

/* ---------------- グラフ ---------------- */
const CHART_COLORS = {
  open: '#0b5cad',
  closed: '#6a3d9a',
  other: '#5c4319',
};

function renderBarChart() {
  const key = els.barBenchmark.value;
  if (!key || !state.chartBar) return;
  const def = state.benchmarkDefs.find((b) => b.key === key);
  const rows = state.models
    .filter((m) => typeof m.benchmarks?.[key] === 'number')
    .map((m) => ({ name: m.name, value: m.benchmarks[key] }))
    .sort((a, b) => a.value - b.value);

  const hasData = rows.length > 0;
  state.chartBar.setOption({
    animationDuration: 400,
    grid: { left: 8, right: 40, top: 10, bottom: 20, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${escapeHtml(p.name)}<br>${escapeHtml(def?.name ?? key)}：${escapeHtml(String(p.value))}`,
    },
    xAxis: {
      type: 'value',
      name: def?.unit ?? '',
      nameLocation: 'end',
      axisLabel: { color: '#4a4a4a' },
      splitLine: { lineStyle: { color: '#e3e6ea' } },
    },
    yAxis: {
      type: 'category',
      data: rows.map((r) => r.name),
      axisLabel: { color: '#1a1a1a', width: 130, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#6b6b6b' } },
    },
    series: [{
      type: 'bar',
      data: rows.map((r) => ({
        value: r.value,
        itemStyle: { color: '#0b5cad' },
      })),
      label: { show: true, position: 'right', color: '#1a1a1a' },
      barMaxWidth: 22,
    }],
    graphic: hasData ? [] : [{
      type: 'text', left: 'center', top: 'middle',
      style: { text: 'データなし', fill: '#4a4a4a', fontSize: 14 },
    }],
  }, true);

  // テキストによる代替表現
  els.barAltBody.replaceChildren();
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.append(el('td', null, r.name), el('td', 'num', String(r.value)));
    els.barAltBody.append(tr);
  }
  if (!hasData) {
    const tr = document.createElement('tr');
    tr.append(el('td', null, EMPTY), el('td', 'num', '—'));
    els.barAltBody.append(tr);
  }
}

function renderScatterChart() {
  if (!state.chartScatter) return;
  const points = state.models
    .filter((m) => typeof m.pricing?.input_per_million === 'number' && typeof m.benchmarks?.aa_intelligence === 'number')
    .map((m) => ({
      name: m.name,
      value: [m.pricing.input_per_million, m.benchmarks.aa_intelligence],
      vendor: m.vendor,
    }));

  const vendors = [...new Set(points.map((p) => p.vendor))].sort((a, b) => a.localeCompare(b, 'ja'));
  const palette = ['#0b5cad', '#6a3d9a', '#1a7f5a', '#b45309', '#a21caf', '#0e7490', '#9f1239', '#3f6212', '#7c2d12'];
  const series = vendors.map((v, i) => ({
    name: v,
    type: 'scatter',
    symbolSize: 14,
    itemStyle: { color: palette[i % palette.length], opacity: 0.85 },
    // モデル名は label に持たせ、キーボードフォーカス時にもツールチップで読めるようにする
    label: { show: false },
    emphasis: {
      label: { show: true, formatter: (p) => escapeHtml(p.data.name), position: 'top', color: '#1a1a1a' },
      itemStyle: { opacity: 1 },
    },
    data: points.filter((p) => p.vendor === v),
  }));

  state.chartScatter.setOption({
    animationDuration: 400,
    legend: { type: 'scroll', bottom: 0, textStyle: { color: '#1a1a1a' } },
    grid: { left: 8, right: 24, top: 20, bottom: 60, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${escapeHtml(p.data.name)}<br>入力価格：$${escapeHtml(String(p.data.value[0]))} / 1M<br>インテリジェンス指数：${escapeHtml(String(p.data.value[1]))}`,
    },
    xAxis: {
      type: 'log',
      name: '入力価格（USD / 1M トークン）',
      nameLocation: 'middle',
      nameGap: 28,
      min: 0.01,
      axisLabel: { color: '#4a4a4a' },
      splitLine: { lineStyle: { color: '#e3e6ea' } },
    },
    yAxis: {
      type: 'value',
      name: 'インテリジェンス指数',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: { color: '#4a4a4a' },
      splitLine: { lineStyle: { color: '#e3e6ea' } },
    },
    series,
    graphic: points.length ? [] : [{
      type: 'text', left: 'center', top: 'middle',
      style: { text: 'データなし', fill: '#4a4a4a', fontSize: 14 },
    }],
  }, true);

  els.scatterAltBody.replaceChildren();
  const rows = [...points].sort((a, b) => a.value[0] - b.value[0]);
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.append(
      el('td', null, r.name),
      el('td', 'num', `$${r.value[0]}`),
      el('td', 'num', String(r.value[1]))
    );
    els.scatterAltBody.append(tr);
  }
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.append(el('td', null, EMPTY), el('td', 'num', '—'), el('td', 'num', '—'));
    els.scatterAltBody.append(tr);
  }
}

function renderPieChart() {
  if (!state.chartPie) return;
  const counts = { open: 0, closed: 0, other: 0 };
  for (const m of state.models) counts[licenseBucket(m.license)] += 1;

  const data = [
    { name: licenseBucketLabel('open'), value: counts.open, itemStyle: { color: CHART_COLORS.open } },
    { name: licenseBucketLabel('closed'), value: counts.closed, itemStyle: { color: CHART_COLORS.closed } },
    { name: licenseBucketLabel('other'), value: counts.other, itemStyle: { color: CHART_COLORS.other } },
  ].filter((d) => d.value > 0);

  state.chartPie.setOption({
    animationDuration: 400,
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${escapeHtml(p.name)}：${escapeHtml(String(p.value))} 件（${escapeHtml(String(p.percent))}%）`,
    },
    legend: { bottom: 0, textStyle: { color: '#1a1a1a' } },
    series: [{
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['50%', '46%'],
      avoidLabelOverlap: true,
      label: { formatter: '{b}\n{c} 件', color: '#1a1a1a' },
      data,
    }],
    graphic: data.length ? [] : [{
      type: 'text', left: 'center', top: 'middle',
      style: { text: 'データなし', fill: '#4a4a4a', fontSize: 14 },
    }],
  }, true);

  els.pieAltBody.replaceChildren();
  for (const d of data) {
    const tr = document.createElement('tr');
    tr.append(el('td', null, d.name), el('td', 'num', String(d.value)));
    els.pieAltBody.append(tr);
  }
  if (!data.length) {
    const tr = document.createElement('tr');
    tr.append(el('td', null, EMPTY), el('td', 'num', '—'));
    els.pieAltBody.append(tr);
  }
}

function renderAllCharts() {
  renderBarChart();
  renderScatterChart();
  renderPieChart();
}

/* ---------------- 詳細モーダル ---------------- */
function renderDetail(m) {
  els.detailTitle.textContent = m.name;
  const body = els.detailBody;
  body.replaceChildren();

  const grid = el('dl', 'detail-grid');

  const addRow = (term, valueNode) => {
    grid.append(el('dt', null, term), valueNode);
  };

  const ddText = (text) => el('dd', null, text);
  const ddEmpty = () => el('dd', null, EMPTY);

  addRow('モデル ID', ddText(m.id));
  addRow('ベンダー', ddText(m.vendor));
  addRow('リリース日', m.release_date ? ddText(m.release_date) : ddEmpty());
  addRow('ライセンス', ddText(m.license_label ?? m.license));
  addRow('コンテキスト長', m.context_window ? ddText(`${m.context_window.toLocaleString('ja-JP')} トークン（${formatContextWindow(m.context_window)}）`) : ddEmpty());
  addRow('入力価格', m.pricing?.input_per_million != null ? ddText(`${formatPrice(m.pricing.input_per_million)} / 1M トークン`) : ddEmpty());
  addRow('出力価格', m.pricing?.output_per_million != null ? ddText(`${formatPrice(m.pricing.output_per_million)} / 1M トークン`) : ddEmpty());
  addRow('キャッシュ入力価格', m.pricing?.cached_input_per_million != null ? ddText(`${formatPrice(m.pricing.cached_input_per_million)} / 1M トークン`) : ddEmpty());
  addRow('データ最終更新', m.last_updated ? ddText(m.last_updated) : ddEmpty());

  body.append(grid);

  // ベンチマーク
  const benchSection = el('div', 'detail-section');
  benchSection.append(el('h3', null, 'ベンチマークスコア'));
  const benchTable = document.createElement('table');
  benchTable.className = 'alt-table';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.append(el('th', null, 'ベンチマーク'), el('th', null, 'スコア'), el('th', null, '単位'));
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  const keys = Object.keys(m.benchmarks ?? {}).sort();
  if (keys.length === 0) {
    const tr = document.createElement('tr');
    tr.append(el('td', null, EMPTY), el('td', 'num', '—'), el('td', null, '—'));
    tbody.append(tr);
  } else {
    for (const k of keys) {
      const def = state.benchmarkDefs.find((b) => b.key === k);
      const v = m.benchmarks[k];
      const tr = document.createElement('tr');
      tr.append(
        el('td', null, def?.name ?? k),
        el('td', 'num', v === null || v === undefined ? '—' : String(v)),
        el('td', null, def?.unit ?? '—')
      );
      tbody.append(tr);
    }
  }
  benchTable.append(thead, tbody);
  benchSection.append(benchTable);
  body.append(benchSection);

  // Arena
  if (m.arena_score) {
    const arenaSection = el('div', 'detail-section');
    arenaSection.append(el('h3', null, 'Arena スコア'));
    const arenaTable = document.createElement('table');
    arenaTable.className = 'alt-table';
    const atbody = document.createElement('tbody');
    const row = document.createElement('tr');
    row.append(
      el('td', null, m.arena_score.board_name),
      el('td', 'num', m.arena_score.score === null ? '—' : String(m.arena_score.score)),
      el('td', null, `取得日：${m.arena_score.collected_at}`)
    );
    atbody.append(row);
    arenaTable.append(atbody);
    arenaSection.append(arenaTable);
    if (m.arena_score.notes) arenaSection.append(el('p', 'notes-box', m.arena_score.notes));
    body.append(arenaSection);
  }

  // 出典
  const srcSection = el('div', 'detail-section');
  srcSection.append(el('h3', null, 'データ出典'));
  const list = el('ul', 'source-list');
  for (const s of m.sources ?? []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = s.name;
    li.append(a);
    li.append(el('span', 'retrieved', `取得日：${s.retrieved_at} · ${s.url}`));
    list.append(li);
  }
  srcSection.append(list);
  body.append(srcSection);

  // 備考
  if (m.notes) {
    const notesSection = el('div', 'detail-section');
    notesSection.append(el('h3', null, '備考'));
    notesSection.append(el('p', 'notes-box', m.notes));
    if (m.pricing?.notes) notesSection.append(el('p', 'notes-box', `価格に関する注記：${m.pricing.notes}`));
    body.append(notesSection);
  }
}

function openDetail(modelId) {
  const m = state.models.find((x) => x.id === modelId);
  if (!m) return;
  state.lastFocus = document.activeElement;
  renderDetail(m);
  els.overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  els.detailClose.focus();
}

function closeDetail() {
  els.overlay.hidden = true;
  document.body.style.overflow = '';
  if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
}

/* ---------------- イベント ---------------- */
function bindEvents() {
  const rerender = () => {
    renderTable();
    renderBarChart();
    renderScatterChart();
    renderPieChart();
  };
  els.sortKey.addEventListener('change', rerender);
  els.sortDirection.addEventListener('change', rerender);
  els.filterVendor.addEventListener('change', rerender);
  els.filterLicense.addEventListener('change', rerender);
  els.search.addEventListener('input', rerender);
  els.barBenchmark.addEventListener('change', () => renderBarChart());

  els.reset.addEventListener('click', () => {
    els.sortKey.value = 'benchmark:aa_intelligence';
    els.sortDirection.value = 'desc';
    els.filterVendor.value = 'all';
    els.filterLicense.value = 'all';
    els.search.value = '';
    els.barBenchmark.selectedIndex = 0;
    rerender();
    els.search.focus();
  });

  els.detailClose.addEventListener('click', closeDetail);
  els.overlay.addEventListener('click', (e) => {
    if (e.target === els.overlay) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.overlay.hidden) {
      e.preventDefault();
      closeDetail();
    }
  });

  // シンプルなフォーカストラップ：Tab をモーダル内で循環させる
  els.overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = els.overlay.querySelectorAll('button, a[href], summary');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('resize', () => {
    state.chartBar?.resize();
    state.chartScatter?.resize();
    state.chartPie?.resize();
  });
}

/* ---------------- 起動 ---------------- */
async function init() {
  try {
    const { models, benchmarkDefs } = await loadData();
    state.models = models;
    state.benchmarkDefs = benchmarkDefs;
  } catch (err) {
    els.tableBody.replaceChildren();
    const tr = document.createElement('tr');
    const td = el('td', 'loading-cell', `データの読み込みに失敗しました：${err.message}`);
    td.colSpan = 10;
    tr.append(td);
    els.tableBody.append(tr);
    return;
  }

  renderHeader();
  renderVendorOptions();
  renderBenchmarkOptions();
  renderTable();

  // ECharts は省略可能な依存：読み込みに失敗した場合もテーブルは利用できる
  if (window.echarts) {
    state.chartBar = window.echarts.init(els.chartBar);
    state.chartScatter = window.echarts.init(els.chartScatter);
    state.chartPie = window.echarts.init(els.chartPie);
    renderAllCharts();
  } else {
    for (const node of [els.chartBar, els.chartScatter, els.chartPie]) {
      node.replaceChildren(el('p', 'empty-val', 'グラフライブラリが読み込まれていないため、テキスト表で表示しています。'));
    }
    renderBarChart();
    renderScatterChart();
    renderPieChart();
  }

  bindEvents();
}

init();
