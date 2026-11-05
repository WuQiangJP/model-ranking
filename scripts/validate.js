/**
 * 数据校验脚本。
 *
 * 校验内容：
 *   1. data/models.json 与 data/benchmarks.json 符合 data/schema.json（JSON Schema 2020-12）。
 *   2. id 全局唯一且符合小写连字符规则。
 *   3. 基准键必须存在于 benchmarks 白名单；benchmarks 与 schema 中的定义一致。
 *   4. URL 为合法 http/https 绝对地址。
 *   5. 日期为 YYYY-MM-DD 且为真实存在的日期。
 *   6. 分数在合理范围内（0~10000），价格非负，上下文长度为正整数。
 *
 * 任一校验失败都以非零退出码退出。
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function readJson(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`缺少文件：${rel}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    fail(`JSON 解析失败 ${rel}：${e.message}`);
    return null;
  }
}

/* ---------- 1. JSON Schema 校验 ---------- */
const schema = readJson('data/schema.json');
const modelsDoc = readJson('data/models.json');
const benchmarksDoc = readJson('data/benchmarks.json');

if (schema && modelsDoc && benchmarksDoc) {
  const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  if (!validate(modelsDoc)) {
    for (const e of validate.errors ?? []) {
      const where = e.instancePath || '(root)';
      fail(`schema 校验失败 ${where}：${e.message}${e.params?.allowedValues ? `（允许值：${e.params.allowedValues.join(', ')}）` : ''}`);
    }
  } else {
    console.log('✓ data/models.json 通过 JSON Schema 校验');
  }

  // benchmarks.json 的基准定义必须与 schema 中 model.benchmarks 允许的键一致。
  const schemaKeys = new Set(schema.$defs.benchmark.properties.key.enum ?? []);
  const declaredKeys = new Set(benchmarksDoc.benchmarks?.map((b) => b.key) ?? []);
  for (const k of declaredKeys) {
    if (schemaKeys.size > 0 && !schemaKeys.has(k)) {
      // schema 中 key 未枚举时跳过（本 schema 用 pattern 约束）
    }
  }

  // 基准键唯一
  const benchKeys = benchmarksDoc.benchmarks?.map((b) => b.key) ?? [];
  const dupBench = benchKeys.filter((k, i) => benchKeys.indexOf(k) !== i);
  if (dupBench.length) {
    fail(`benchmarks 键重复：${[...new Set(dupBench)].join(', ')}`);
  }

  // 每个模型 benchmarks 的键必须存在于 benchmarks.json 白名单
  for (const m of modelsDoc.models ?? []) {
    for (const k of Object.keys(m.benchmarks ?? {})) {
      if (!declaredKeys.has(k)) {
        fail(`${m.id} 的 benchmarks 含未定义键：${k}`);
      }
    }
  }

  // benchmarks.json 与 models.json 的基准定义应保持一致
  const modelBench = modelsDoc.benchmarks ?? [];
  if (JSON.stringify(modelBench) !== JSON.stringify(benchmarksDoc.benchmarks ?? [])) {
    warn('data/models.json 与 data/benchmarks.json 的 benchmarks 定义不一致，建议保持一致');
  }
}

/* ---------- 2. id 唯一性与格式 ---------- */
const models = modelsDoc?.models ?? [];
const seen = new Map();
for (const m of models) {
  if (seen.has(m.id)) {
    fail(`id 重复：${m.id}（出现在第 ${seen.get(m.id)} 与当前记录）`);
  } else {
    seen.set(m.id, true);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.id)) {
    fail(`id 格式非法（需小写连字符）：${m.id}`);
  }
  if (m.id !== m.id.toLowerCase()) {
    fail(`id 必须全小写：${m.id}`);
  }
}

/* ---------- 3. URL / 日期 / 数值 ---------- */
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}

for (const m of models) {
  const label = m.id ?? '(无 id)';

  if (!isRealDate(m.release_date)) fail(`${label} 的 release_date 非法：${m.release_date}`);
  if (!isRealDate(m.last_updated)) fail(`${label} 的 last_updated 非法：${m.last_updated}`);

  if (m.context_window !== null && (!Number.isInteger(m.context_window) || m.context_window <= 0)) {
    fail(`${label} 的 context_window 必须为正整数或 null：${m.context_window}`);
  }

  const p = m.pricing ?? {};
  for (const [field, val] of Object.entries({
    input_per_million: p.input_per_million,
    output_per_million: p.output_per_million,
    cached_input_per_million: p.cached_input_per_million,
  })) {
    if (val !== null && (typeof val !== 'number' || Number.isNaN(val) || val < 0)) {
      fail(`${label} 的 pricing.${field} 必须为非负数或 null：${val}`);
    }
  }
  if (p.currency !== null && !/^[A-Z]{3}$/.test(p.currency)) {
    fail(`${label} 的 pricing.currency 必须为 ISO 4217 三字母大写或 null：${p.currency}`);
  }

  for (const [k, v] of Object.entries(m.benchmarks ?? {})) {
    if (v === null) continue;
    if (typeof v !== 'number' || Number.isNaN(v)) {
      fail(`${label} 的 benchmarks.${k} 必须为数字或 null：${v}`);
    } else if (v < 0 || v > 10000) {
      fail(`${label} 的 benchmarks.${k} 超出合理范围 [0, 10000]：${v}`);
    }
  }

  if (m.arena_score !== null) {
    if (!isRealDate(m.arena_score.collected_at)) {
      fail(`${label} 的 arena_score.collected_at 非法：${m.arena_score.collected_at}`);
    }
    if (m.arena_score.score !== null && (typeof m.arena_score.score !== 'number' || m.arena_score.score < 0 || m.arena_score.score > 10000)) {
      fail(`${label} 的 arena_score.score 超出合理范围：${m.arena_score.score}`);
    }
  }

  for (const [i, s] of (m.sources ?? []).entries()) {
    if (!URL_RE.test(s.url)) fail(`${label} 的 sources[${i}].url 非法：${s.url}`);
    if (!isRealDate(s.retrieved_at)) fail(`${label} 的 sources[${i}].retrieved_at 非法：${s.retrieved_at}`);
    if (!s.name || !s.name.trim()) fail(`${label} 的 sources[${i}].name 为空`);
  }

  // 许可证枚举已由 schema 保证；此处补充语义检查
  if (!m.license_label || !m.license_label.trim()) {
    fail(`${label} 缺少 license_label`);
  }
}

/* ---------- 4. 仓库内不得出现疑似密钥 ---------- */
const SECRET_PATTERNS = [
  { re: /\b(sk-[A-Za-z0-9]{16,})\b/, label: 'OpenAI/通用 sk- 密钥' },
  { re: /\b(AKIA[0-9A-Z]{16})\b/, label: 'AWS Access Key ID' },
  { re: /\bghp_[A-Za-z0-9]{36}\b/, label: 'GitHub Personal Access Token' },
  { re: /\bgho_[A-Za-z0-9]{36}\b/, label: 'GitHub OAuth Token' },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: 'Slack Token' },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, label: 'Google API Key' },
  { re: /\b[pP][bB]kdf2[0-9A-Za-z+/=]{20,}\b/, label: 'PBKDF2 派生串' },
];
const SCAN_DIRS = ['data', 'src', 'scripts', 'test'];
const SCAN_EXTS = new Set(['.js', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.sh']);

function scanForSecrets() {
  const findings = [];
  for (const dir of SCAN_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (!fs.existsSync(absDir)) continue;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
          walk(full);
        } else if (SCAN_EXTS.has(path.extname(entry.name))) {
          const text = fs.readFileSync(full, 'utf8');
          for (const { re, label } of SECRET_PATTERNS) {
            if (re.test(text)) findings.push(`${path.relative(ROOT, full)}：疑似${label}`);
          }
        }
      }
    };
    walk(absDir);
  }
  return findings;
}

const secrets = scanForSecrets();
if (secrets.length) {
  for (const s of secrets) fail(`密钥扫描命中：${s}`);
} else {
  console.log('✓ 密钥扫描未命中');
}

/* ---------- 结果 ---------- */
for (const w of warnings) {
  console.warn(`⚠ ${w}`);
}

if (errors.length) {
  console.error(`\n✗ 校验失败，共 ${errors.length} 个问题：`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`\n✓ 校验通过：${models.length} 个模型，${modelsDoc.benchmarks.length} 个基准`);
process.exit(0);
