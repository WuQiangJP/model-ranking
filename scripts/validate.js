/**
 * データ検証スクリプト。
 *
 * 検証内容：
 *   1. data/models.json が data/schema.json（JSON Schema 2020-12）に適合する。
 *      （data/benchmarks.json はベンチマーク定義の参考資料であり、schema の検証対象ではない。
 *       モデルの benchmarks キーとの整合性は下記 3 で検証する。）
 *   2. id がグローバルに一意で、小文字ハイフン形式の規則に適合する。
 *   3. ベンチマークキーが benchmarks.json のホワイトリストに存在し、models.json 内嵌の定義と一致する。
 *   4. URL が正当な http/https の絶対アドレスである。
 *   5. 日付が YYYY-MM-DD で、実際に存在する日付である。
 *   6. スコアが妥当な範囲（0〜10000）内、価格が非負、コンテキスト長が正の整数である。
 *
 * 検証が一つでも失敗した場合は、非ゼロの終了コードで終了する。
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
    fail(`ファイルがありません：${rel}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    fail(`JSON の解析に失敗しました ${rel}：${e.message}`);
    return null;
  }
}

/* ---------- 1. JSON Schema 検証 ---------- */
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
      fail(`schema 検証に失敗しました ${where}：${e.message}${e.params?.allowedValues ? `（許可値：${e.params.allowedValues.join(', ')}）` : ''}`);
    }
  } else {
    console.log('✓ data/models.json は JSON Schema 検証を通過しました');
  }

  // benchmarks.json はベンチマーク定義の参考資料。独自の構造ルールを検証する。
  const benchList = benchmarksDoc.benchmarks;
  let benchKeys = [];
  if (!Array.isArray(benchList) || benchList.length === 0) {
    fail('data/benchmarks.json の benchmarks は空でない配列でなければなりません');
  } else {
    benchKeys = benchList.map((b) => b.key);
    const dupBench = benchKeys.filter((k, i) => benchKeys.indexOf(k) !== i);
    if (dupBench.length) {
      fail(`benchmarks のキーが重複しています：${[...new Set(dupBench)].join(', ')}`);
    }
    for (const b of benchList) {
      if (!/^[a-z0-9_]+$/.test(b.key ?? '')) fail(`benchmarks のキー形式が不正です：${b.key}`);
      if (!b.name || !b.unit || !b.direction) fail(`benchmarks の ${b.key} に name/unit/direction が不足しています`);
      if (!['higher', 'lower'].includes(b.direction)) fail(`benchmarks の ${b.key} の direction は higher か lower でなければなりません：${b.direction}`);
      if (typeof b.higher_is_better !== 'boolean') fail(`benchmarks の ${b.key} の higher_is_better は boolean でなければなりません`);
      if (b.source_url && !/^https?:\/\//.test(b.source_url)) fail(`benchmarks の ${b.key} の source_url が不正です：${b.source_url}`);
    }
    console.log(`✓ data/benchmarks.json の構造を検証しました：${benchList.length} ベンチマーク`);
  }

  // 各モデルの benchmarks のキーは、benchmarks.json のホワイトリストに存在しなければならない
  const declaredKeys = new Set(benchKeys);
  for (const m of modelsDoc.models ?? []) {
    for (const k of Object.keys(m.benchmarks ?? {})) {
      if (!declaredKeys.has(k)) {
        fail(`${m.id} の benchmarks に未定義のキーが含まれています：${k}`);
      }
    }
  }

  // benchmarks.json と models.json のベンチマーク定義は一致しているべき
  const modelBench = modelsDoc.benchmarks ?? [];
  if (JSON.stringify(modelBench) !== JSON.stringify(benchmarksDoc.benchmarks ?? [])) {
    warn('data/models.json と data/benchmarks.json の benchmarks 定義が一致していません。統一することを推奨します');
  }
}

/* ---------- 2. id の一意性と形式 ---------- */
const models = modelsDoc?.models ?? [];
const seen = new Map();
for (const m of models) {
  if (seen.has(m.id)) {
    fail(`id が重複しています：${m.id}（${seen.get(m.id)} 件目と現在のレコード）`);
  } else {
    seen.set(m.id, true);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.id)) {
    fail(`id の形式が不正です（小文字ハイフンが必要）：${m.id}`);
  }
  if (m.id !== m.id.toLowerCase()) {
    fail(`id はすべて小文字でなければなりません：${m.id}`);
  }
}

/* ---------- 3. URL / 日付 / 数値 ---------- */
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === s;
}

for (const m of models) {
  const label = m.id ?? '(id なし)';

  if (!isRealDate(m.release_date)) fail(`${label} の release_date が不正です：${m.release_date}`);
  if (!isRealDate(m.last_updated)) fail(`${label} の last_updated が不正です：${m.last_updated}`);

  if (m.context_window !== null && (!Number.isInteger(m.context_window) || m.context_window <= 0)) {
    fail(`${label} の context_window は正の整数または null でなければなりません：${m.context_window}`);
  }

  const p = m.pricing ?? {};
  for (const [field, val] of Object.entries({
    input_per_million: p.input_per_million,
    output_per_million: p.output_per_million,
    cached_input_per_million: p.cached_input_per_million,
  })) {
    if (val !== null && (typeof val !== 'number' || Number.isNaN(val) || val < 0)) {
      fail(`${label} の pricing.${field} は非負の数または null でなければなりません：${val}`);
    }
  }
  if (p.currency !== null && !/^[A-Z]{3}$/.test(p.currency)) {
    fail(`${label} の pricing.currency は ISO 4217 の 3 文字大文字または null でなければなりません：${p.currency}`);
  }

  for (const [k, v] of Object.entries(m.benchmarks ?? {})) {
    if (v === null) continue;
    if (typeof v !== 'number' || Number.isNaN(v)) {
      fail(`${label} の benchmarks.${k} は数値または null でなければなりません：${v}`);
    } else if (v < 0 || v > 10000) {
      fail(`${label} の benchmarks.${k} が妥当な範囲 [0, 10000] を超えています：${v}`);
    }
  }

  if (m.arena_score !== null) {
    if (!isRealDate(m.arena_score.collected_at)) {
      fail(`${label} の arena_score.collected_at が不正です：${m.arena_score.collected_at}`);
    }
    if (m.arena_score.score !== null && (typeof m.arena_score.score !== 'number' || m.arena_score.score < 0 || m.arena_score.score > 10000)) {
      fail(`${label} の arena_score.score が妥当な範囲を超えています：${m.arena_score.score}`);
    }
  }

  for (const [i, s] of (m.sources ?? []).entries()) {
    if (!URL_RE.test(s.url)) fail(`${label} の sources[${i}].url が不正です：${s.url}`);
    if (!isRealDate(s.retrieved_at)) fail(`${label} の sources[${i}].retrieved_at が不正です：${s.retrieved_at}`);
    if (!s.name || !s.name.trim()) fail(`${label} の sources[${i}].name が空です`);
  }

  // ライセンスの列挙は schema が保証する。ここでは意味的な検査を補足する
  if (!m.license_label || !m.license_label.trim()) {
    fail(`${label} に license_label がありません`);
  }
}

/* ---------- 4. リポジトリ内に疑似シークレットや個人情報が存在しないことを確認 ---------- */
const SECRET_PATTERNS = [
  { re: /\b(sk-[A-Za-z0-9]{16,})\b/, label: 'OpenAI / 汎用の sk- キー' },
  { re: /\b(AKIA[0-9A-Z]{16})\b/, label: 'AWS Access Key ID' },
  { re: /\bghp_[A-Za-z0-9]{36}\b/, label: 'GitHub Personal Access Token' },
  { re: /\bgho_[A-Za-z0-9]{36}\b/, label: 'GitHub OAuth Token' },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: 'Slack Token' },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, label: 'Google API Key' },
  { re: /\b[pP][bB]kdf2[0-9A-Za-z+/=]{20,}\b/, label: 'PBKDF2 由来の文字列' },
];
// 個人情報・環境情報の漏洩パターン（公開リポジトリに push してはいけない）
const PRIVACY_PATTERNS = [
  { re: /\/home\/[^\s"'`]+\//, label: '本機の絶対パス（/home/...）' },
  { re: /\/Users\/[^\s"'`]+\//, label: '本機の絶対パス（/Users/...）' },
  // .hermes/ はスキャナ自身の説明文中にも現れるため、ファイル名が scripts/validate.js の場合は除外する
  { re: /\.hermes\//, label: 'AI ツールの本機ディレクトリ（.hermes/）', skip: (rel) => rel === 'scripts/validate.js' },
  { re: /\b[A-Za-z0-9._%+-]+@(?!github\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, label: 'メールアドレス' },
  { re: /\b\d{10,11}\b/, label: '電話番号（10〜11 桁の数字連続）' },
  // 内部ミラー／非公式レジストリ。registry.npmjs.org は公式なので除外する。
  { re: /\b(?:mirrors|registry)\.(?!npmjs\.org\b)[a-z0-9.-]+\.(?:com|cn|net|org|io)\b/, label: '内部ミラー / レジストリホスト名' },
];
// スキャン対象：data/src/scripts/test に加え、リポジトリルートの文書と .github/ を含む
const SCAN_DIRS = ['data', 'src', 'scripts', 'test', '.github'];
const SCAN_EXTS = new Set(['.js', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.sh']);
const ROOT_FILES = new Set(['package.json', 'package-lock.json', 'eslint.config.json', '.gitignore',
  'README.md', 'AGENTS.md', 'CHANGELOG.md', 'ROADMAP.md']);

function scanText(text, relPath, findings) {
  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(text)) findings.push(`${relPath}：${label} の可能性があります`);
  }
  for (const { re, label, skip } of PRIVACY_PATTERNS) {
    if (skip && skip(relPath)) continue;
    if (re.test(text)) findings.push(`${relPath}：${label}`);
  }
}

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
          scanText(text, path.relative(ROOT, full), findings);
        }
      }
    };
    walk(absDir);
  }
  // ルート直下の文書ファイルもスキャンする
  for (const name of ROOT_FILES) {
    const full = path.join(ROOT, name);
    if (fs.existsSync(full)) {
      scanText(fs.readFileSync(full, 'utf8'), name, findings);
    }
  }
  return findings;
}

const secrets = scanForSecrets();
if (secrets.length) {
  for (const s of secrets) fail(`シークレットのスキャンにヒットしました：${s}`);
} else {
  console.log('✓ シークレットのスキャンではヒットしませんでした');
}

/* ---------- 結果 ---------- */
for (const w of warnings) {
  console.warn(`⚠ ${w}`);
}

if (errors.length) {
  console.error(`\n✗ 検証に失敗しました。${errors.length} 件の問題があります：`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`\n✓ 検証を通過しました：${models.length} モデル、${modelsDoc.benchmarks.length} ベンチマーク`);
process.exit(0);
