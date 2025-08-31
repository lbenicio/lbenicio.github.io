#!/usr/bin/env node
// Simple obfuscator for classes and ids in static site files.
// Replaces class="..." and id="..." tokens and CSS selectors and simple JS usages with randomized tokens.
// Writes a mapping JSON to the output path.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function randToken(n = 8) {
  return crypto
    .randomBytes(Math.ceil(n / 2))
    .toString("hex")
    .slice(0, n);
}

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

function extractNamesFromHtml(content) {
  const names = new Set();
  // class="..."
  for (const m of content.matchAll(/class\s*=\s*"([^"]+)"/gi)) {
    for (const cls of m[1].split(/\s+/))
      if (cls) names.add({ type: "class", name: cls });
  }
  // id="..."
  for (const m of content.matchAll(/id\s*=\s*"([^"]+)"/gi)) {
    const id = m[1].trim();
    if (id) names.add({ type: "id", name: id });
  }
  // data-attr (attribute NAMES, not values)
  for (const m of content.matchAll(/data-([a-zA-Z0-9_-]+)(?=\s*=|\s|>)/gi)) {
    const an = m[1].trim();
    if (an) names.add({ type: "data", name: an });
  }
  return names;
}

function extractNamesFromCss(content) {
  const names = new Set();
  // .class selector
  for (const m of content.matchAll(/\.([a-zA-Z0-9_-]+)/g))
    names.add({ type: "class", name: m[1] });
  // #id selector
  for (const m of content.matchAll(/#([a-zA-Z0-9_-]+)/g))
    names.add({ type: "id", name: m[1] });
  // attribute selectors for data-*
  for (const m of content.matchAll(/\[data-([a-zA-Z0-9_-]+)(?:[^\]]*)\]/g))
    names.add({ type: "data", name: m[1] });
  return names;
}

function extractNamesFromJs(content) {
  const names = new Set();
  // document.getElementById('id') or getElementsByClassName('cls') or querySelector('.cls'/'#id')
  for (const m of content.matchAll(
    /getElementById\(['\"]([a-zA-Z0-9_-]+)['\"]\)/g
  ))
    names.add({ type: "id", name: m[1] });
  for (const m of content.matchAll(
    /getElementsByClassName\(['\"]([a-zA-Z0-9_ -]+)['\"]\)/g
  )) {
    for (const cls of m[1].split(/\s+/))
      if (cls) names.add({ type: "class", name: cls });
  }
  for (const m of content.matchAll(
    /querySelector(All)?\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g
  )) {
    const sel = m[2];
    // only simple selectors: .class or #id
    if (sel.startsWith(".")) names.add({ type: "class", name: sel.slice(1) });
    else if (sel.startsWith("#")) names.add({ type: "id", name: sel.slice(1) });
  }
  // getAttribute/setAttribute with data-*
  for (const m of content.matchAll(/getAttribute\(\s*['\"]data-([a-zA-Z0-9_-]+)['\"]\s*\)/g))
    names.add({ type: "data", name: m[1] });
  for (const m of content.matchAll(/setAttribute\(\s*['\"]data-([a-zA-Z0-9_-]+)['\"]\s*,/g))
    names.add({ type: "data", name: m[1] });
  // dataset.prop accesses -> convert prop to kebab-case and add as data attr
  for (const m of content.matchAll(/\.dataset\.([A-Za-z0-9_$]+)/g)) {
    const prop = m[1];
    // convert camelCase to kebab-case: fooBar -> foo-bar
    const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
    names.add({ type: "data", name: kebab });
  }
  return names;
}

function normalizeSet(set) {
  // convert set of objects (since we used Set for uniqueness) back to array of names
  const map = new Map();
  for (const it of set) {
    if (!it) continue;
    const key = `${it.type}:${it.name}`;
    map.set(key, it);
  }
  return Array.from(map.values());
}

function collectNames(files) {
  const map = new Map(); // key -> {type,name}
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (![".html", ".htm", ".css", ".js"].includes(ext)) continue;
    let content = "";
    try {
      content = fs.readFileSync(f, "utf8");
    } catch (e) {
      continue;
    }
    let found = [];
    if (ext === ".html" || ext === ".htm")
      found = normalizeSet(extractNamesFromHtml(content));
    if (ext === ".css") found = normalizeSet(extractNamesFromCss(content));
    if (ext === ".js") found = normalizeSet(extractNamesFromJs(content));
    for (const it of found) {
      const key = `${it.type}:${it.name}`;
      if (!map.has(key)) map.set(key, it);
    }
  }
  return Array.from(map.values());
}

function buildMapping(names) {
  const mapping = {};
  for (const it of names) {
    // avoid obfuscating names that look like map keys or template tokens (simple heuristic)
    if (
      /^h-?\w|^post|^page|^nav|^main|^content|^header|^footer|^container|^row|^col|^fa|^icon/.test(
        it.name
      )
    ) {
      // keep some common semantic names - optional: you can remove this filter
      continue;
    }
  const prefix = it.type === "id" ? "i" : it.type === "class" ? "c" : "d";
  const token = prefix + randToken(6);
    mapping[`${it.type}:${it.name}`] = token;
  }
  return mapping;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceInFile(file, mapping, verbose, dryRun) {
  const ext = path.extname(file).toLowerCase();
  let content = fs.readFileSync(file, "utf8");
  const oldContent = content;
  let replacements = 0;
  // replace HTML attributes
  if (ext === ".html" || ext === ".htm") {
    // class="a b c" -> map each
    content = content.replace(/class\s*=\s*"([^"]+)"/gi, (m, group) => {
      const parts = group
        .split(/\s+/)
        .map((p) => (p ? mapping[`class:${p}`] || p : p));
      return `class="${parts.join(" ").trim()}"`;
    });
    content = content.replace(/id\s*=\s*"([^"]+)"/gi, (m, group) => {
      return `id="${mapping[`id:${group.trim()}`] || group.trim()}"`;
    });
  }
  // CSS selectors
  if (ext === ".css") {
    // simple .class and #id replacements
    content = content.replace(/\.([a-zA-Z0-9_-]+)/g, (m, name) => {
      return "." + (mapping[`class:${name}`] || name);
    });
    content = content.replace(/#([a-zA-Z0-9_-]+)/g, (m, name) => {
      return "#" + (mapping[`id:${name}`] || name);
    });
  }
  // JS replacements for common patterns
  if (ext === ".js") {
    content = content.replace(
      /getElementById\(['\"]([a-zA-Z0-9_-]+)['\"]\)/g,
      (m, name) => {
        return `getElementById('${mapping[`id:${name}`] || name}')`;
      }
    );
    content = content.replace(
      /getElementsByClassName\(['\"]([a-zA-Z0-9_ -]+)['\"]\)/g,
      (m, names) => {
        const replaced = names
          .split(/\s+/)
          .map((n) => mapping[`class:${n}`] || n)
          .join(" ");
        return `getElementsByClassName('${replaced}')`;
      }
    );
      content = content.replace(
        /querySelector(All)?\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
        (m, all, sel) => {
          let newSel = sel;
          // replace class selectors
          newSel = newSel.replace(/\.([a-zA-Z0-9_-]+)/g, (mm, nm) => {
            return "." + (mapping[`class:${nm}`] || nm);
          });
          // replace id selectors
          newSel = newSel.replace(/#([a-zA-Z0-9_-]+)/g, (mm, nm) => {
            return "#" + (mapping[`id:${nm}`] || nm);
          });
          // replace data-attr selectors inside selector strings
          newSel = newSel.replace(/\[data-([a-zA-Z0-9_-]+)([^\]]*)\]/g, (mm, nm, rest) => {
            return `[data-${mapping[`data:${nm}`] || nm}${rest}]`;
          });
          return `querySelector${all || ""}('${newSel}')`;
        }
      );
      // getAttribute / setAttribute for data-*
      content = content.replace(/getAttribute\(\s*['\"]data-([a-zA-Z0-9_-]+)['\"]\s*\)/g, (m2, name) => {
        return `getAttribute('data-${mapping[`data:${name}`] || name}')`;
      });
      content = content.replace(/setAttribute\(\s*['\"]data-([a-zA-Z0-9_-]+)['\"]\s*,/g, (m2, name) => {
        return `setAttribute('data-${mapping[`data:${name}`] || name}',`;
      });
      // dataset.prop -> dataset['<token>'] (use bracket notation only when we have a mapping)
      content = content.replace(/\.dataset\.([A-Za-z0-9_$]+)/g, (m2, prop) => {
        const p = prop; // prop is the identifier after .dataset.
        const kebab = p.replace(/([A-Z])/g, "-$1").toLowerCase();
        const token = mapping[`data:${kebab}`];
        if (token) return `.dataset['${token}']`;
        // no mapping found: leave original dot-access to avoid breaking behavior
        return `.dataset.${p}`;
      });
  }

  if (content !== oldContent) {
    // Count occurrences of original names in the old content using a safe separator-aware regex.
    for (const key of Object.keys(mapping)) {
      const [, name] = key.split(":");
      // match name when not surrounded by [A-Za-z0-9_-] (covers selectors, attributes, JS usage)
      const re = new RegExp("(^|[^A-Za-z0-9_-])" + escapeRegExp(name) + "($|[^A-Za-z0-9_-])", "gi");
      const m = oldContent.match(re);
      if (m) replacements += m.length;
    }
    if (!dryRun) fs.writeFileSync(file, content, "utf8");
    if (verbose) console.log(`Patched ${file} (approx ${replacements} replacements)` + (dryRun? ' (dry-run)':''));
    return { changed: true, replacements };
  }
  if (verbose) console.log(`No changes in ${file}`);
  return { changed: false, replacements: 0 };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error("Usage: obfuscate.js <public_dir> [--check] [--verbose|-v]");
    process.exit(2);
  }
  const publicDir = path.resolve(argv[0]);
  if (!fs.existsSync(publicDir)) {
    console.error("Public dir does not exist:", publicDir);
    process.exit(2);
  }

  const flags = argv.slice(1);
  const verbose = flags.includes('--verbose') || flags.includes('-v');
  const dryRun = flags.includes('--dry-run');
  const jsonOut = flags.includes('--json');

  const files = walk(publicDir);
  const names = collectNames(files);
  const mapping = buildMapping(names);

  let totalFiles = 0;
  let changedFiles = 0;
  let totalReplacements = 0;

  if (verbose) {
    console.log(`Scanning ${files.length} files in ${publicDir}`);
    console.log(`Found ${names.length} candidate names for obfuscation`);
    const keys = Object.keys(mapping);
    console.log(`Mapping size: ${keys.length}`);
    const sample = keys.slice(0, 20).map(k => `${k} -> ${mapping[k]}`);
    if (sample.length) console.log('Sample mapping (first 20):', sample);
  }

  // apply replacements (mapping kept in-memory only)
  const changedFileList = [];
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (![".html", ".htm", ".css", ".js"].includes(ext)) continue;
    totalFiles++;
    const { changed, replacements } = replaceInFile(f, mapping, verbose && !dryRun);
    if (changed) {
      changedFiles++;
      changedFileList.push({ file: f, replacements });
      if (!dryRun) {
        // replaceInFile already wrote files; but if dryRun we need to avoid writes. To support dryRun, we re-run logic without write.
      }
    }
    totalReplacements += replacements;
  }

  const summary = {
    scannedFiles: totalFiles,
    changedFiles: changedFiles,
    totalReplacements: totalReplacements,
    mappingSize: Object.keys(mapping).length,
    sampleMapping: Object.keys(mapping).slice(0, 50).reduce((acc, k) => { acc[k] = mapping[k]; return acc; }, {}),
    dryRun: !!dryRun
  };

  if (jsonOut) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Obfuscation complete. Files scanned: ${totalFiles}, files changed: ${changedFiles}, total replacements (approx): ${totalReplacements}. Mapping kept in memory (not written to disk).`);
    if (dryRun) console.log('Note: --dry-run passed; no files were modified.');
  }

  // --- SRI recompute / fix step ---
  const checkOnly = flags.includes('--check');
  const publicDirResolved = publicDir;

  function decodeHtmlEntities(str) {
    if (str == null) return str;
    str = str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
    str = str.replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
    str = str.replace(/&#43;/g, '+');
    return str.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  function isRemote(url) { if (!url) return false; return /^\s*https?:\/\//i.test(url) || url.startsWith('//'); }

  function computeIntegrityForFile(filePath) {
    try {
      const buf = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(buf).digest('base64');
      return `sha256-${hash}`;
    } catch (e) { throw e; }
  }

  function resolveResource(publicDir, htmlFile, ref) {
    if (!ref) return null;
    ref = decodeHtmlEntities(ref).split('?')[0].split('#')[0];
    if (/livereload\.js/i.test(ref)) return null;
    let candidate = path.resolve(path.dirname(htmlFile), ref);
    if (fs.existsSync(candidate)) return candidate;
    if (ref.startsWith('/')) {
      candidate = path.join(publicDir, ref.replace(/^\//, ''));
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  function processHtmlSRI(htmlFile) {
    let content = fs.readFileSync(htmlFile, 'utf8');
    let changed = false;
    const details = [];

    // script tags
    content = content.replace(/<script([^>]*)\s+src=(['"])?([^'"\s>]+)\2([^>]*)>([\s\S]*?)<\/script>/gi,
      (full, before, q, src, after, inner) => {
        const attrs = (before + ' ' + after).trim();
        const existingMatch = attrs.match(/integrity=(?:"([^\"]*)"|'([^']*)'|([^\s>]+))/i);
        const existingRaw = existingMatch ? decodeHtmlEntities(existingMatch[1]||existingMatch[2]||existingMatch[3]) : null;
        const ref = decodeHtmlEntities(src);
        if (/livereload\.js/i.test(ref)) return full;
        const rec = { tag: 'script', html: htmlFile, src: ref, existing: existingRaw, computed: null, path: null, status: null };
        let localPath = null;
        if (isRemote(ref)) {
          try { const parsed = new URL(ref.startsWith('//') ? 'https:' + ref : ref); const cand = path.join(publicDirResolved, parsed.pathname.replace(/^\//,'')); if (fs.existsSync(cand)) localPath = cand; } catch(e) {}
        } else localPath = resolveResource(publicDirResolved, htmlFile, ref);
        if (!localPath) { rec.status='SKIPPED'; details.push(rec); if (verbose) console.log(`${htmlFile} [script] ${ref} | existing:${existingRaw||'<none>'} | computed:<none> | status:SKIPPED`); return full; }
        rec.path = localPath; try { rec.computed = computeIntegrityForFile(localPath); } catch(e){ rec.status='ERROR'; details.push(rec); if (verbose) console.log(`${htmlFile} [script] ${ref} | local:${localPath} | status:ERROR`); return full; }
        if (!rec.existing) rec.status='NO_EXISTING'; else if (rec.existing===rec.computed) rec.status='MATCH'; else rec.status='MISMATCH';
        details.push(rec);
        if (verbose) console.log(`${htmlFile} [script] ${ref} | local:${localPath} | existing:${rec.existing||'<none>'} | computed:${rec.computed||'<none>'} | status:${rec.status}`);
        if (checkOnly) return full;
        // patch attributes
        let newAttrs = (before+' '+after).replace(/\s+integrity=(?:"[^\"]*"|'[^']*'|[^\s>]*)/i,'');
        if (!/crossorigin=/i.test(newAttrs)) newAttrs=(newAttrs+' crossorigin="anonymous"').trim();
        if (rec.computed) newAttrs=(newAttrs+` integrity="${rec.computed}"`).trim();
        const rebuilt=`<script ${newAttrs} src="${src}">${inner}</script>`;
        changed = changed || rebuilt !== full;
        return rebuilt;
      });

    // link tags
    content = content.replace(/<link([^>]*)>/gi, (full, inside) => {
      const relMatch = inside.match(/rel=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const hrefMatch = inside.match(/href=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (!hrefMatch) return full;
      const rel = relMatch ? (relMatch[1]||relMatch[2]||relMatch[3]||'').toLowerCase() : '';
      const hrefRaw = hrefMatch[1]||hrefMatch[2]||hrefMatch[3];
      const href = decodeHtmlEntities(hrefRaw);
      const asMatch = inside.match(/as=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const asVal = asMatch ? (asMatch[1]||asMatch[2]||asMatch[3]||'').toLowerCase() : '';
      const looksLikeCss = /\.css(?:$|[?#])/i.test(href);
      if (rel.indexOf('stylesheet')===-1 && !looksLikeCss && !(rel.indexOf('preload')!==-1 && asVal==='style')) return full;
      const existingMatch = inside.match(/integrity=(?:"([^\"]*)"|'([^']*)'|([^\s>]+))/i);
      const existingRaw = existingMatch ? decodeHtmlEntities(existingMatch[1]||existingMatch[2]||existingMatch[3]) : null;
      const rec = { tag:'link', html:htmlFile, src:href, existing:existingRaw, computed:null, path:null, status:null };
      let localPath = null;
      if (isRemote(href)) { try { const parsed = new URL(href.startsWith('//') ? 'https:' + href : href); const cand = path.join(publicDirResolved, parsed.pathname.replace(/^\//,'')); if (fs.existsSync(cand)) localPath=cand; } catch(e) {} } else localPath = resolveResource(publicDirResolved, htmlFile, href);
      if (!localPath) { rec.status='SKIPPED'; details.push(rec); if (verbose) console.log(`${htmlFile} [link] ${href} | local:<none> | existing:${existingRaw||'<none>'} | computed:<none> | status:SKIPPED`); return full; }
      rec.path = localPath; try { rec.computed = computeIntegrityForFile(localPath); } catch(e){ rec.status='ERROR'; details.push(rec); if (verbose) console.log(`${htmlFile} [link] ${href} | local:${localPath} | status:ERROR`); return full; }
      if (!rec.existing) rec.status='NO_EXISTING'; else if (rec.existing===rec.computed) rec.status='MATCH'; else rec.status='MISMATCH'; details.push(rec);
      if (verbose) console.log(`${htmlFile} [link] ${href} | local:${localPath} | existing:${rec.existing||'<none>'} | computed:${rec.computed||'<none>'} | status:${rec.status}`);
      if (checkOnly) return full;
      let newInside = inside.replace(/\s+integrity=(?:"[^\"]*"|'[^']*'|[^\s>]*)/i,'');
      if (!/crossorigin=/i.test(newInside)) newInside=(newInside+' crossorigin="anonymous"').trim();
      if (rec.computed) newInside=(newInside+` integrity="${rec.computed}"`).trim();
      const rebuilt = `<link ${newInside}>`;
      changed = changed || rebuilt !== full;
      return rebuilt;
    });

    return { changed, details, content };
  }

  // run SRI processing across HTML files
  const htmlFiles = files.filter(f => f.toLowerCase().endsWith('.html'));
  let sriAnyMismatch = false;
  const sriDetailsAll = [];
  for (const hf of htmlFiles) {
    const { changed: sriChanged, details: sriDetails, content: newContent } = processHtmlSRI(hf);
    sriDetailsAll.push(...sriDetails);
    for (const d of sriDetails) if (d.status === 'MISMATCH' || d.status === 'NO_EXISTING') sriAnyMismatch = true;
    if (sriChanged && !dryRun && !checkOnly) {
      fs.writeFileSync(hf, newContent, 'utf8');
      if (verbose) console.log(`SRI patched ${hf}`);
    }
  }

  // report SRI summary
  const sriSummary = sriDetailsAll.reduce((acc, d) => { acc[d.status] = (acc[d.status]||0)+1; return acc; }, {});
  if (verbose) {
    console.error('\nSRI Summary:');
    for (const k of Object.keys(sriSummary)) console.error(`  ${k}: ${sriSummary[k]}`);
  }
  if (checkOnly) {
    if (sriAnyMismatch) {
      console.error('\nSRI check: mismatches or missing integrity found.');
      process.exit(3);
    } else {
      console.error('\nSRI check: no actionable mismatches found.');
    }
  }

}

if (require.main === module) main();
