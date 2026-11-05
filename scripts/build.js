/**
 * 构建脚本：把 src/ 与 data/ 组装为可部署的纯静态站点产物 dist/。
 *
 * 产物结构：
 *   dist/index.html
 *   dist/styles.css
 *   dist/app.js
 *   dist/core.js
 *   dist/vendor/echarts.min.js
 *   dist/data/models.json
 *   dist/data/benchmarks.json
 *   dist/data/schema.json
 *
 * 不引入打包器：源码本身已是浏览器可直接运行的 ES Module，
 * 复制即可部署，长期维护成本最低。
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DATA = path.join(ROOT, 'data');
const DIST = path.join(ROOT, 'dist');

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function build() {
  // 构建前先校验，避免把非法数据发布出去
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'validate.js')], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  rmrf(DIST);

  // 站点资源
  copyFile(path.join(SRC, 'index.html'), path.join(DIST, 'index.html'));
  copyFile(path.join(SRC, 'styles.css'), path.join(DIST, 'styles.css'));
  copyFile(path.join(SRC, 'app.js'), path.join(DIST, 'app.js'));
  copyFile(path.join(SRC, 'core.js'), path.join(DIST, 'core.js'));
  copyFile(path.join(SRC, 'vendor', 'echarts.min.js'), path.join(DIST, 'vendor', 'echarts.min.js'));

  // 数据：唯一数据源，原样复制
  copyFile(path.join(DATA, 'models.json'), path.join(DIST, 'data', 'models.json'));
  copyFile(path.join(DATA, 'benchmarks.json'), path.join(DIST, 'data', 'benchmarks.json'));
  copyFile(path.join(DATA, 'schema.json'), path.join(DIST, 'data', 'schema.json'));

  // 产物清单
  const files = [];
  const walk = (d, base = d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full, base);
      else files.push(path.relative(base, full));
    }
  };
  walk(DIST);

  const totalBytes = files.reduce((sum, rel) => {
    const p = path.join(DIST, rel);
    return sum + fs.statSync(p).size;
  }, 0);

  console.log(`✓ 构建完成：${DIST}`);
  console.log(`  文件数：${files.length}`);
  console.log(`  总大小：${(totalBytes / 1024).toFixed(1)} KB`);
  console.log('  入口：dist/index.html');
}

build();
