#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walk(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function computeIntegrity(filePath) {
  const buf = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buf).digest('base64');
  return `sha256-${hash}`;
}

function updateHtml(filePath, publicDir) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // script tags with src
  content = content.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi, (m, a1, src, a2, inner) => {
    if (/^\s*https?:\/\//i.test(src) || src.startsWith('//')) return m;
    let resPath = path.join(path.dirname(filePath), src);
    if (!fs.existsSync(resPath)) {
      if (src.startsWith('/')) resPath = path.join(publicDir, src.replace(/^\//, ''));
      if (!fs.existsSync(resPath)) return m;
    }
    const sri = computeIntegrity(resPath);
  // preserve existing crossorigin if present, otherwise use anonymous
  const combined = (a1 + ' ' + a2);
  const cxMatch = combined.match(/crossorigin=["']([^"']*)["']/i);
  const crossoriginVal = cxMatch ? cxMatch[1] : 'anonymous';
  // remove existing integrity and crossorigin attrs in the attribute sections
  const attrs = combined.replace(/\s+integrity=["'][^"']*["']/i, '').replace(/\s+crossorigin=["'][^"']*["']/i, '');
  changed = true;
  return `<script${attrs} src="${src}" integrity="${sri}" crossorigin="${crossoriginVal}">${inner}</script>`;
  });

  // link rel=stylesheet
  content = content.replace(/<link([^>]*)href=["']([^"']+)["']([^>]*)\/?\>/gi, (m, a1, href, a2) => {
    const combined = (a1 + ' ' + a2);
    const relMatch = combined.match(/rel=["']([^"']+)["']/i);
    if (!relMatch || !/stylesheet/i.test(relMatch[1])) return m;
    if (/^\s*https?:\/\//i.test(href) || href.startsWith('//')) return m;
    let resPath = path.join(path.dirname(filePath), href);
    if (!fs.existsSync(resPath)) {
      if (href.startsWith('/')) resPath = path.join(publicDir, href.replace(/^\//, ''));
      if (!fs.existsSync(resPath)) return m;
    }
  const sri = computeIntegrity(resPath);
  const cxMatch = combined.match(/crossorigin=["']([^"']*)["']/i);
  const crossoriginVal = cxMatch ? cxMatch[1] : 'anonymous';
  const attrs = combined.replace(/\s+integrity=["'][^"']*["']/i, '').replace(/\s+crossorigin=["'][^"']*["']/i, '');
  changed = true;
  return `<link${attrs} href="${href}" integrity="${sri}" crossorigin="${crossoriginVal}"/>`;
  });

  if (changed) fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: update_sri.js <public_dir>');
    process.exit(2);
  }
  const publicDir = path.resolve(argv[0]);
  if (!fs.existsSync(publicDir)) {
    console.error('Public dir does not exist:', publicDir);
    process.exit(2);
  }

  const files = walk(publicDir);
  for (const f of files) {
    if (f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')) {
      try {
        updateHtml(f, publicDir);
      } catch (e) {
        console.error('Error updating', f, e.message);
      }
    }
  }
  console.log('SRI update complete.');
}

if (require.main === module) main();
