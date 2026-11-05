/**
 * 検証スクリプトのテスト：validate.js が不正なデータを確実に弾くことを確認する。
 * これらのケースは一時ディレクトリに書き込み、実際のデータファイルには触れない。
 */
'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const VALIDATE = path.join(SCRIPTS_DIR, 'validate.js');

/**
 * 一時ディレクトリで検証スクリプトを実行する。
 * 検証スクリプトは import.meta.url で自身の場所を特定するため、そのまま使うと
 * 実際のリポジトリの data/ を読み戻してしまう。ここではスクリプトをサンドボックスに
 * コピーし、ROOT がサンドボックスを指すようにすることで、改ざんされたデータを
 * 真正に検証する。
 * 一時ディレクトリのクリーンアップは呼び出し側が担当する。子プロセス終了前に
 * 削除されないようにするため。
 * @returns {Promise<{code: number, stdout: string, stderr: string, cleanup: () => void}>}
 */
function runValidateInSandbox(mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-validate-'));
  fs.cpSync(path.join(ROOT, 'data'), path.join(tmp, 'data'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.copyFileSync(VALIDATE, path.join(tmp, 'scripts', 'validate.js'));
  // node_modules をリンクし、再インストールを避ける
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');
  mutate(path.join(tmp, 'data'));
  const cleanup = () => fs.rmSync(tmp, { recursive: true, force: true });
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(tmp, 'scripts', 'validate.js')],
      { cwd: tmp },
      (err, stdout, stderr) => {
        resolve({
          code: err ? err.code ?? 1 : 0,
          stdout: String(stdout),
          stderr: String(stderr),
          cleanup,
        });
      }
    );
  });
}

test('validate.js：実際のデータは検証を通過する', () => {
  const out = execFileSync(process.execPath, [VALIDATE], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /検証を通過しました/);
});

test('validate.js：正常なデータはサンドボックス内で通過する', async () => {
  const res = await runValidateInSandbox(() => {});
  try {
    assert.equal(res.code, 0, res.stderr);
  } finally {
    res.cleanup();
  }
});

test('validate.js：id が重複した場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models.push({ ...doc.models[0] });
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /id が重複しています/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：日付が不正な場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].release_date = '2026-13-40';
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /release_date が不正です/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：URL の形式が不正な場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].sources[0].url = 'not-a-url';
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /url が不正です/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：スコアが範囲を超える場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].benchmarks.aa_intelligence = 999999;
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /妥当な範囲/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：価格が負の場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].pricing.input_per_million = -1;
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /input_per_million/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：未定義のベンチマークキーの場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].benchmarks.unknown_benchmark = 10;
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /未定義のキー/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：ライセンスの列挙が不正な場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].license = 'public-domain';
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /schema 検証に失敗しました/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：ファイルが存在しない場合は非ゼロで終了する', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    fs.rmSync(path.join(dataDir, 'models.json'));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /ファイルがありません/);
  } finally {
    res.cleanup();
  }
});
