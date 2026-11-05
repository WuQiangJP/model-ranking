#!/usr/bin/env node
/**
 * 新增模型辅助脚本。
 *
 * 只生成符合 schema 的模板记录并追加到 data/models.json，不会自动填充任何
 * 未经核实的数值：所有需要人工核实的字段都留为 null 或空字符串，并在
 * notes 中标注「待核实」。调用者必须随后打开来源页面填写真实值。
 *
 * 用法：
 *   node scripts/add-model.js --id my-model --name "My Model" --vendor "MyVendor" \
 *       --release-date 2026-01-01 --license proprietary --context 1000000
 *
 * 选项：
 *   --id             必填，全局唯一，小写连字符
 *   --name           必填，展示名称
 *   --vendor         必填，厂商
 *   --release-date   必填，YYYY-MM-DD
 *   --license        必填，枚举见 data/schema.json
 *   --context        可选，上下文长度（token）
 *   --dry-run        只打印将要写入的记录，不修改文件
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'models.json');

const LICENSE_LABELS = {
  proprietary: '专有（闭源）',
  'open-weights': '开放权重',
  'open-weights-commercial-restricted': '开放权重（商用受限）',
  'open-weights-non-commercial': '开放权重（非商用）',
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
  if (!args[required]) fail(`缺少必填参数 --${required}`);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args.id)) {
  fail('id 必须为小写字母、数字与连字符，且不得以连字符开头或结尾');
}
if (!LICENSE_LABELS[args.license]) {
  fail(`license 必须是以下之一：${Object.keys(LICENSE_LABELS).join(', ')}`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(args['release-date'])) {
  fail('release-date 必须为 YYYY-MM-DD');
}

const doc = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
if (doc.models.some((m) => m.id === args.id)) {
  fail(`id 已存在：${args.id}`);
}

// 基准键取自现有白名单，全部留 null，等待人工核实
const benchmarkKeys = (doc.benchmarks ?? []).map((b) => b.key);
const benchmarks = Object.fromEntries(benchmarkKeys.map((k) => [k, null]));

const context = args.context ? Number(args.context) : null;
if (context !== null && (!Number.isInteger(context) || context <= 0)) {
  fail('--context 必须为正整数');
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
    currency: null,
    cached_input_per_million: null,
    notes: '待核实：价格必须来自厂商官方定价页，未核实前保持 null。',
  },
  benchmarks,
  arena_score: null,
  sources: [],
  notes: `待核实：本记录由 add-model 脚本生成，所有数值字段尚未从官方来源核实。请先打开官方页面填写 sources 与真实数值，再运行 npm run validate。`,
  last_updated: today(),
};

if (dryRun) {
  console.log('将写入以下记录（--dry-run，未修改文件）：');
  console.log(JSON.stringify(record, null, 2));
  process.exit(0);
}

doc.models.push(record);
fs.writeFileSync(DATA_FILE, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
console.log(`✓ 已追加模型记录：${record.id}`);
console.log(`  文件：data/models.json`);
console.log('  下一步：');
console.log('    1. 打开官方页面核实价格、基准分数与发布日期');
console.log('    2. 在 sources 中补充来源链接与采集日期');
console.log('    3. 运行 npm run validate 校验');
console.log('    4. 运行 npm run build 构建并检查页面显示');
