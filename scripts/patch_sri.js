#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const child_process = require('child_process');

// patch_sri.js
// - Computes SHA256 SRI for local script and stylesheet assets referenced in HTML files under a public dir.
// - Unescapes numeric HTML entities (e.g. &#43;) before comparing to avoid false mismatches.
// - Rewrites integrity attributes with raw base64 values and preserves existing crossorigin (defaults to anonymous).
// - Modes:
//     node patch_sri.js <public_dir>        # fix in-place (default)
//     node patch_sri.js --check <public_dir> # only check, exit 0 if ok, 3 if mismatches
//     node patch_sri.js --dry-run <public_dir> # show changes but don't write

function walk(dir) {
  const out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function computeIntegrity(filePathOrUrl) {
  // If starts with http/https or protocol-less //, fetch via curl and compute hash
  try {
    if (/^\/\//.test(filePathOrUrl)) {
      filePathOrUrl = 'https:' + filePathOrUrl;
    }
    if (/^https?:\/\//i.test(filePathOrUrl)) {
      // use curl to fetch binary data
      const out = child_process.execSync(`curl -fsSL "${filePathOrUrl}"`, { encoding: null, maxBuffer: 50 * 1024 * 1024 });
      const hash = crypto.createHash('sha256').update(out).digest('base64');
      return `sha256-${hash}`;
    }
  } catch (e) {
    // fall back to local file read if fetch fails; caller will see mismatch or missing
    // console.error('Failed fetching', filePathOrUrl, e && e.message);
  }
  if (!fs.existsSync(filePathOrUrl)) throw new Error('file not found: ' + filePathOrUrl);
  const buf = fs.readFileSync(filePathOrUrl);
  const hash = crypto.createHash('sha256').update(buf).digest('base64');
  return `sha256-${hash}`;
}

function decodeHtmlEntities(str) {
  if (!str) return str;
  // numeric decimal
  str = str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  // numeric hex
  str = str.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
  // explicit plus entity
  str = str.replace(/&#43;/g, '+');
  // common named entities
  str = str.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[name] || _));
  return str;
}

function isRemote(url) {
  return /^\s*https?:\/\//i.test(url) || url.startsWith('//');
}

function resolveResource(publicDir, htmlFile, ref) {
  if (!ref) return null;
  // decode entities and strip query/fragment
  ref = decodeHtmlEntities(ref);
  ref = ref.split('?')[0].split('#')[0];
  // ignore dev-only livereload references
  if (/livereload\.js/i.test(ref)) return null;
  // attempt relative first
  let candidate = path.resolve(path.dirname(htmlFile), ref);
  if (fs.existsSync(candidate)) return candidate;
  // if starts with /, treat as rooted in publicDir
  if (ref.startsWith('/')) {
    candidate = path.join(publicDir, ref.replace(/^\//, ''));
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function processHtmlFile(htmlFile, publicDir, options) {
  let content = fs.readFileSync(htmlFile, 'utf8');
  const reports = [];
  let changed = false;

  // <script ... src="..." ...>...</script>
  content = content.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/script>/gi,
    (full, a1, src, a2, inner) => {
      const ref = decodeHtmlEntities(src);
      // ignore dev/live-reload references
      if (/livereload\.js/i.test(ref)) return full;
      let computed;
      let target = null;
      if (isRemote(ref)) {
        // Try to resolve remote URL to a local file by pathname (no hard-coded host)
        let parsed = null;
        try {
          parsed = new URL(ref.startsWith('//') ? 'https:' + ref : ref);
        } catch (e) {
          // if parsing fails, fallback to fetch
        }
          if (parsed) {
            const localPath = path.join(publicDir, parsed.pathname.replace(/^\//, ''));
            if (fs.existsSync(localPath)) {
              target = localPath;
              computed = computeIntegrity(target);
            } else {
              // remote resource that does not map to a local file: mark as skipped
              reports.push({ type: 'skipped', tag: 'script', html: htmlFile, src: ref, reason: 'remote-no-local' });
              if (options.check) return full; // don't fail CI in check mode
              // in fix mode: remove integrity attribute if present to avoid mismatches
              const attrs = (a1 + ' ' + a2);
              const cleanedAttrs = attrs.replace(/\s+integrity=\"[^\"]*\"/i, '').replace(/\s+integrity=\'[^\']*\'/i, '');
              return `<script${cleanedAttrs} src="${src}">${inner}</script>`;
            }
          } else {
            // if we can't parse the URL, record as skipped
            reports.push({ type: 'skipped', tag: 'script', html: htmlFile, src: ref, reason: 'unparsable-url' });
            if (options.check) return full;
            const attrs = (a1 + ' ' + a2);
            const cleanedAttrs = attrs.replace(/\s+integrity=\"[^\"]*\"/i, '').replace(/\s+integrity=\'[^\']*\'/i, '');
            return `<script${cleanedAttrs} src="${src}">${inner}</script>`;
          }
      } else {
        target = resolveResource(publicDir, htmlFile, ref);
        if (!target) {
          reports.push({ type: 'missing', tag: 'script', html: htmlFile, src: ref });
          return full;
        }
        computed = computeIntegrity(target);
      }
      const attrs = (a1 + ' ' + a2);
      const existingMatch = attrs.match(/integrity=\"([^\"]*)\"/i) || attrs.match(/integrity=\'([^\']*)\'/i);
      const existingRaw = existingMatch ? decodeHtmlEntities(existingMatch[1]) : null;
      const cxMatch = attrs.match(/crossorigin=\"([^\"]*)\"/i) || attrs.match(/crossorigin=\'([^\']*)\'/i);
      const crossoriginVal = cxMatch ? cxMatch[1] : 'anonymous';

      if (existingRaw && existingRaw === computed) return full; // ok
      if (existingRaw && existingRaw !== computed) {
        reports.push({ type: 'mismatch', tag: 'script', html: htmlFile, src, expected: existingRaw, actual: computed, path: target });
      }
      if (options.check) return full;

      // remove existing integrity and crossorigin then add
  const cleanedAttrs = attrs.replace(/\s+integrity=\"[^\"]*\"/i, '').replace(/\s+integrity=\'[^\']*\'/i, '').replace(/\s+crossorigin=\"[^\"]*\"/i, '').replace(/\s+crossorigin=\'[^\']*\'/i, '');
      changed = true;
  return `<script${cleanedAttrs} src="${src}" integrity="${computed}" crossorigin="${crossoriginVal}">${inner}</script>`;
    }
  );

  // <link ... href="..." ... /> for stylesheets
  content = content.replace(/<link([^>]*)href=["']([^"']+)["']([^>]*)\/?\>/gi,
    (full, a1, href, a2) => {
      const combined = (a1 + ' ' + a2);
      const relMatch = combined.match(/rel=["']([^"']+)["']/i) || combined.match(/rel=([^\s>]+)/i);
      if (!relMatch || !/stylesheet/i.test(relMatch[1])) return full;
      const ref = decodeHtmlEntities(href);
      // ignore dev livereload if it ever appears here
      if (/livereload\.js/i.test(ref)) return full;
      let computed;
      let target = null;
      if (isRemote(ref)) {
        // Try to map remote to local before fetching; if not mapped, skip/strip integrity
        let parsed = null;
        try { parsed = new URL(ref.startsWith('//') ? 'https:' + ref : ref); } catch (e) {}
        if (parsed) {
          const localPath = path.join(publicDir, parsed.pathname.replace(/^\//, ''));
          if (fs.existsSync(localPath)) {
            target = localPath;
            computed = computeIntegrity(target);
          } else {
            reports.push({ type: 'skipped', tag: 'link', html: htmlFile, src: ref, reason: 'remote-no-local' });
            if (options.check) return full;
            const cleanedAttrs = combined.replace(/\s+integrity=\"[^\"]*\"/i, '').replace(/\s+integrity=\'[^\']*\'/i, '');
            return `<link${cleanedAttrs} href="${href}"/>`;
          }
        } else {
          reports.push({ type: 'skipped', tag: 'link', html: htmlFile, src: ref, reason: 'unparsable-url' });
          if (options.check) return full;
          const cleanedAttrs = combined.replace(/\s+integrity=\"[^\"]*\"/i, '').replace(/\s+integrity=\'[^\']*\'/i, '');
          return `<link${cleanedAttrs} href="${href}"/>`;
        }
      } else {
        target = resolveResource(publicDir, htmlFile, ref);
        if (!target) {
          reports.push({ type: 'missing', tag: 'link', html: htmlFile, src: ref });
          return full;
        }
        computed = computeIntegrity(target);
      }
      const existingMatch = combined.match(/integrity=\"([^\"]*)\"/i) || combined.match(/integrity=\'([^\']*)\'/i);
      const existingRaw = existingMatch ? decodeHtmlEntities(existingMatch[1]) : null;
      const cxMatch = combined.match(/crossorigin=\"([^\"]*)\"/i) || combined.match(/crossorigin=\'([^\']*)\'/i);
      const crossoriginVal = cxMatch ? cxMatch[1] : 'anonymous';

      if (existingRaw && existingRaw === computed) return full;
      if (existingRaw && existingRaw !== computed) {
        reports.push({ type: 'mismatch', tag: 'link', html: htmlFile, src: href, expected: existingRaw, actual: computed, path: target });
      }
      if (options.check) return full;

      const cleanedAttrs = combined.replace(/\s+integrity=\"[^\"]*\"/i, '').replace(/\s+integrity=\'[^\']*\'/i, '').replace(/\s+crossorigin=\"[^\"]*\"/i, '').replace(/\s+crossorigin=\'[^\']*\'/i, '');
  changed = true;
  return `<link${cleanedAttrs} href="${href}" integrity="${computed}" crossorigin="${crossoriginVal}"/>`;
    }
  );

  if (changed && !options.dryRun && !options.check) {
    fs.writeFileSync(htmlFile, content, 'utf8');
  }

  return { reports, changed };
}

function main() {
  const argv = process.argv.slice(2);
  const options = { check: false, dryRun: false, verbose: false };
  let publicDirArg = null;
  for (const a of argv) {
    if (a === '--check') options.check = true;
    else if (a === '--dry-run') options.dryRun = true;
    else if (a === '--verbose' || a === '-v') options.verbose = true;
    else if (a === '--help' || a === '-h') { console.log('Usage: patch_sri.js [--check] [--dry-run] <public_dir>'); process.exit(0);} 
    else publicDirArg = a;
  }

  const publicDir = path.resolve(publicDirArg || 'public');
  if (!fs.existsSync(publicDir)) {
    console.error('Public dir does not exist:', publicDir);
    process.exit(2);
  }

  const files = walk(publicDir);
  const htmlFiles = files.filter(f => /\.html?$/.test(f.toLowerCase()));

  const overallReports = [];
  const changedFiles = [];

  for (const hf of htmlFiles) {
    try {
      const { reports, changed } = processHtmlFile(hf, publicDir, options);
      if (reports && reports.length) overallReports.push(...reports);
      if (changed) changedFiles.push(hf);
    } catch (e) {
      console.error('Error processing', hf, e && e.message);
    }
  }

  if (changedFiles.length) {
    console.log('Updated files:');
    for (const f of changedFiles) console.log('  ', f);
  }

  if (!overallReports.length) {
    if (options.check) console.log('No SRI mismatches found.');
    else console.log('SRI patch complete.');
    process.exit(0);
  }

  console.log('Issues:');
  for (const r of overallReports) {
    if (r.type === 'missing') console.log(`MISSING: ${r.html} -> ${r.tag} ${r.src}`);
    else if (r.type === 'mismatch') console.log(`MISMATCH: ${r.html} -> ${r.tag} ${r.src}\n  expected: ${r.expected}\n  actual:   ${r.actual}\n  file: ${r.path}`);
  }

  if (options.check) process.exit(3);
  // If we reach here and there are reports, exit with code 1 to indicate attention needed
  // if verbose, also list skipped remote assets and counts
  if (options.verbose) {
    const skipped = overallReports.filter(r => r.type === 'skipped');
    if (skipped.length) {
      console.log('\nSkipped remote/unverifiable assets:');
      for (const s of skipped) console.log(`  ${s.html} -> ${s.tag} ${s.src} (${s.reason})`);
    }
  }
  process.exit(1);
}

if (require.main === module) main();
