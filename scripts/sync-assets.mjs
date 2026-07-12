#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const ROOT = new URL('..', import.meta.url).pathname;
const STATIC = join(ROOT, 'static');
const BUILD_CLIENT = join(ROOT, 'build', 'client');

if (!existsSync(BUILD_CLIENT)) {
  console.error('build/client/ does not exist — run "npm run build" first');
  process.exit(1);
}

let synced = 0, compressed = 0;

function syncDir(subdir) {
  const src = join(STATIC, subdir);
  const dst = join(BUILD_CLIENT, subdir);
  if (!existsSync(src)) return;
  mkdirSync(dst, { recursive: true });

  for (const name of readdirSync(src)) {
    const srcFile = join(src, name);
    if (statSync(srcFile).isDirectory()) continue;
    if (name.endsWith('.br') || name.endsWith('.gz')) continue;

    const dstFile = join(dst, name);
    const data = readFileSync(srcFile);

    const needsCopy = !existsSync(dstFile) ||
      readFileSync(dstFile).compare(data) !== 0;

    if (needsCopy) {
      writeFileSync(dstFile, data);
      synced++;
    }

    const brFile = dstFile + '.br';
    if (!existsSync(brFile) || needsCopy) {
      writeFileSync(brFile, brotliCompressSync(data, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 }
      }));
      compressed++;
    }

    const gzFile = dstFile + '.gz';
    if (!existsSync(gzFile) || needsCopy) {
      writeFileSync(gzFile, gzipSync(data, { level: 9 }));
      compressed++;
    }
  }
}

syncDir('icons');

const rel = relative(ROOT, BUILD_CLIENT);
console.log(`${synced} file(s) synced, ${compressed} compressed file(s) created in ${rel}/`);
if (synced > 0) {
  console.log('Restart required: systemctl --user restart nexus-portal');
}
