/**
 * ビルドスクリプト：src/ と data/ を組み合わせて、デプロイ可能な完全な静的サイト成果物 dist/ を生成する。
 *
 * 成果物の構成：
 *   dist/index.html
 *   dist/styles.css
 *   dist/app.js
 *   dist/core.js
 *   dist/vendor/echarts.min.js
 *   dist/data/models.json
 *   dist/data/benchmarks.json
 *   dist/data/schema.json
 *
 * バンドラーを導入しない：ソース自体がブラウザで直接実行可能な ES Module であるため、
 * コピーすればデプロイでき、長期的なメンテナンスコストが最も低い。
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
  // ビルド前に検証し、不正なデータが公開されないようにする
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'validate.js')], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  rmrf(DIST);

  // サイトのリソース
  copyFile(path.join(SRC, 'index.html'), path.join(DIST, 'index.html'));
  copyFile(path.join(SRC, 'styles.css'), path.join(DIST, 'styles.css'));
  copyFile(path.join(SRC, 'app.js'), path.join(DIST, 'app.js'));
  copyFile(path.join(SRC, 'core.js'), path.join(DIST, 'core.js'));
  copyFile(path.join(SRC, 'vendor', 'echarts.min.js'), path.join(DIST, 'vendor', 'echarts.min.js'));

  // データ：唯一のデータソース。そのままコピーする
  copyFile(path.join(DATA, 'models.json'), path.join(DIST, 'data', 'models.json'));
  copyFile(path.join(DATA, 'benchmarks.json'), path.join(DIST, 'data', 'benchmarks.json'));
  copyFile(path.join(DATA, 'schema.json'), path.join(DIST, 'data', 'schema.json'));

  // 成果物の一覧
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

  console.log(`✓ ビルドが完了しました：${DIST}`);
  console.log(`  ファイル数：${files.length}`);
  console.log(`  合計サイズ：${(totalBytes / 1024).toFixed(1)} KB`);
  console.log('  エントリーポイント：dist/index.html');
}

build();
