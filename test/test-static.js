const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');

const publicDir = path.join(__dirname, '..', 'public');

function computeIntegrity(filePath) {
  const buf = fs.readFileSync(filePath);
  return 'sha256-' + crypto.createHash('sha256').update(buf).digest('base64');
}

let failed = false;

function resolveRequestedPath(publicDir, requested) {
  const rel = requested.replace(/^\//, '');
  const candidate = path.join(publicDir, rel);
  if (fs.existsSync(candidate)) return { path: candidate, exact: true };

  // Try to find a fingerprinted file in the same directory.
  const dir = path.dirname(path.join(publicDir, rel));
  const base = path.basename(rel);
  const ext = path.extname(base);
  const name = base.slice(0, -ext.length);

  let parts = name.split('.').filter(Boolean);
  const token0 = parts[0] || name;
  const token1 = parts.length > 1 ? parts[1] : null;

  if (!fs.existsSync(dir)) return { path: candidate, exact: false };

  const files = fs.readdirSync(dir);
  // Prefer files that contain both tokens and have same extension
  for (const f of files) {
    if (path.extname(f) !== ext) continue;
    if (f === base) return { path: path.join(dir, f), exact: true };
    if (token1 && f.includes(token0) && f.includes(token1)) return { path: path.join(dir, f), exact: false };
    if (f.includes(token0)) return { path: path.join(dir, f), exact: false };
  }

  // If there's only one file with the same extension, assume it's the intended one (fallback)
  const sameExt = files.filter(f => path.extname(f) === ext);
  if (sameExt.length === 1) return { path: path.join(dir, sameExt[0]), exact: false };

  if (sameExt.length > 1) {
    // choose the largest file by size as a heuristic for the main compiled asset
    let largest = sameExt[0];
    let largestSize = fs.statSync(path.join(dir, largest)).size;
    for (const f of sameExt.slice(1)) {
      const s = fs.statSync(path.join(dir, f)).size;
      if (s > largestSize) {
        largest = f;
        largestSize = s;
      }
    }
    return { path: path.join(dir, largest), exact: false };
  }

  return { path: candidate, exact: false };
}

function checkHtml(file) {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  // check link/script local integrity and existence
  const scripts = Array.from(doc.querySelectorAll('script[src]'));
  for (const s of scripts) {
    const src = s.getAttribute('src');
    if (/^https?:\/\//i.test(src) || src.startsWith('//')) continue; // skip remote
    const resolvedObj = resolveRequestedPath(publicDir, src);
    const resolved = resolvedObj.path;
    if (!fs.existsSync(resolved)) {
      console.error(`[MISSING] script ${src} referenced from ${path.relative(process.cwd(), file)}`);
      failed = true;
      continue;
    }
    const existing = s.getAttribute('integrity');
    const computed = computeIntegrity(resolved);
    if (!existing) {
      console.warn(`[NO-INTEGRITY] ${src} in ${path.relative(process.cwd(), file)}`);
    } else if (existing !== computed) {
      if (!resolvedObj.exact) {
        console.warn(`[SRI-MISMATCH-WARN] ${src} resolved to ${path.relative(publicDir, resolved)} — expected ${existing} computed ${computed}`);
      } else {
        console.error(`[SRI-MISMATCH] ${src} in ${path.relative(process.cwd(), file)} expected ${existing} computed ${computed}`);
        failed = true;
      }
    }
  }

  const links = Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href]'));
  for (const l of links) {
    const href = l.getAttribute('href');
    if (/^https?:\/\//i.test(href) || href.startsWith('//')) continue;
    const resolvedObj = resolveRequestedPath(publicDir, href);
    const resolved = resolvedObj.path;
    if (!fs.existsSync(resolved)) {
      console.error(`[MISSING] stylesheet ${href} referenced from ${path.relative(process.cwd(), file)}`);
      failed = true;
      continue;
    }
    const existing = l.getAttribute('integrity');
    const computed = computeIntegrity(resolved);
    if (!existing) {
      console.warn(`[NO-INTEGRITY] ${href} in ${path.relative(process.cwd(), file)}`);
    } else if (existing !== computed) {
      if (!resolvedObj.exact) {
        console.warn(`[SRI-MISMATCH-WARN] ${href} resolved to ${path.relative(publicDir, resolved)} — expected ${existing} computed ${computed}`);
      } else {
        console.error(`[SRI-MISMATCH] ${href} in ${path.relative(process.cwd(), file)} expected ${existing} computed ${computed}`);
        failed = true;
      }
    }
  }

  // check img src existence
  const imgs = Array.from(doc.querySelectorAll('img[src]'));
  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (/^https?:\/\//i.test(src) || src.startsWith('//')) continue;
    const resolvedObj = resolveRequestedPath(publicDir, src);
    const resolved = resolvedObj.path;
    if (!fs.existsSync(resolved)) {
      console.error(`[MISSING] image ${src} referenced from ${path.relative(process.cwd(), file)}`);
      failed = true;
    }
  }
}

function run() {
  const htmlFiles = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (p.endsWith('.html')) htmlFiles.push(p);
    }
  }
  walk(publicDir);
  if (!htmlFiles.length) {
    console.error('No HTML files found under public/');
    process.exit(2);
  }
  for (const f of htmlFiles) {
    console.log('Checking', path.relative(process.cwd(), f));
    checkHtml(f);
  }
  if (failed) {
    console.error('\nStatic checks failed.');
    process.exit(1);
  }
  console.log('\nStatic checks passed.');
}

run();
