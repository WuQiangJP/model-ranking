/**
 * 校验脚本测试：确保 validate.js 能拦截非法数据。
 * 这些用例会写入临时目录，不触碰真实数据文件。
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
 * 在临时目录中运行校验脚本。
 * 校验脚本用 import.meta.url 定位自身目录，因此在沙箱中直接使用
 * 原始 scripts/validate.js 会读回真实仓库的 data/。这里把脚本复制进沙箱，
 * 使其 ROOT 指向沙箱，从而真正校验被篡改的数据。
 * 临时目录的清理由调用方负责，避免在子进程结束前被删除。
 * @returns {Promise<{code: number, stdout: string, stderr: string, cleanup: () => void}>}
 */
function runValidateInSandbox(mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-validate-'));
  fs.cpSync(path.join(ROOT, 'data'), path.join(tmp, 'data'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.copyFileSync(VALIDATE, path.join(tmp, 'scripts', 'validate.js'));
  // 链接 node_modules，避免重复安装
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

test('validate.js：真实数据通过校验', () => {
  const out = execFileSync(process.execPath, [VALIDATE], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /校验通过/);
});

test('validate.js：合法数据在沙箱中通过', async () => {
  const res = await runValidateInSandbox(() => {});
  try {
    assert.equal(res.code, 0, res.stderr);
  } finally {
    res.cleanup();
  }
});

test('validate.js：id 重复时以非零退出', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models.push({ ...doc.models[0] });
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /id 重复/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：非法日期时以非零退出', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].release_date = '2026-13-40';
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /release_date 非法/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：URL 格式非法时以非零退出', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].sources[0].url = 'not-a-url';
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /url 非法/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：分数超范围时以非零退出', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].benchmarks.aa_intelligence = 999999;
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /超出合理范围/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：负价格时以非零退出', async () => {
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

test('validate.js：未知基准键时以非零退出', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].benchmarks.unknown_benchmark = 10;
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /未定义键/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：非法许可证枚举时以非零退出', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    const p = path.join(dataDir, 'models.json');
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    doc.models[0].license = 'public-domain';
    fs.writeFileSync(p, JSON.stringify(doc, null, 2));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /schema 校验失败/);
  } finally {
    res.cleanup();
  }
});

test('validate.js：缺少文件时以非零退出', async () => {
  const res = await runValidateInSandbox((dataDir) => {
    fs.rmSync(path.join(dataDir, 'models.json'));
  });
  try {
    assert.notEqual(res.code, 0);
    assert.match(res.stderr, /缺少文件/);
  } finally {
    res.cleanup();
  }
});
