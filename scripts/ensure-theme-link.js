#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const src = path.resolve(process.cwd(), 'src', 'themes');
const dest = path.resolve(process.cwd(), 'themes');

function log(...a){ console.log('[ensure-theme-link]', ...a); }

try {
  if (fs.existsSync(dest)) {
    try {
      const st = fs.lstatSync(dest);
      if (st.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(dest);
        if (path.resolve(process.cwd(), linkTarget) === src) {
          log('themes -> src/themes already present');
          process.exit(0);
        }
        log('themes symlink exists but points elsewhere; leaving it alone');
        process.exit(0);
      }
      if (st.isDirectory()) { log('themes directory already exists; nothing to do'); process.exit(0); }
      log('themes exists and is not a directory/symlink; leaving it'); process.exit(0);
    } catch (e) { /* fall through */ }
  }

  if (!fs.existsSync(src)) { log('src/themes not found; nothing to link'); process.exit(0); }
  fs.symlinkSync(src, dest, 'dir');
  log('created symlink themes -> src/themes');
  process.exit(0);
} catch (e) {
  console.error('[ensure-theme-link] error:', e && e.message ? e.message : e);
  process.exit(1);
}
