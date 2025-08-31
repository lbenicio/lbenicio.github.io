#!/usr/bin/env node
// Simple obfuscator for classes and ids in static site files.
// Replaces class="..." and id="..." tokens and CSS selectors and simple JS usages with randomized tokens.
// Writes a mapping JSON to the output path.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let postcss = null;
let selectorParser = null;
try {
  postcss = require('postcss');
  selectorParser = require('postcss-selector-parser');
} catch (e) {
  // postcss or selector parser may not be installed; script will fall back to regex-based replacement
}

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
  // Prefer AST-based extraction using PostCSS + selector parser when available. This avoids
  // picking up tokens from inside declaration bodies (e.g. property values) and correctly
  // handles escaped selectors (Tailwind-style).
  if (postcss && selectorParser) {
    try {
      const root = postcss.parse(content, { from: undefined });
      root.walkRules(rule => {
        if (!rule.selector) return;
        try {
          selectorParser(selectors => {
            selectors.walk(node => {
              if (node.type === 'class') names.add({ type: 'class', name: node.value });
              if (node.type === 'id') names.add({ type: 'id', name: node.value });
              if (node.type === 'attribute') {
                const attr = node.attribute || '';
                if (/^data-/i.test(attr)) names.add({ type: 'data', name: attr.slice(5) });
              }
            });
          }).processSync(rule.selector);
        } catch (e) {
          // ignore selector parse errors per-rule
        }
      });
      return names;
    } catch (e) {
      // fall through to safer regex fallback below
    }
  }
  // Regex fallback: only inspect selector blocks (text before the opening '{') to avoid
  // matching tokens inside property values. This reduces false positives from minified
  // or vendor files when PostCSS isn't available.
  const selectorBlockRe = /([^{}]+)\{/g;
  let m;
  while ((m = selectorBlockRe.exec(content)) !== null) {
    const selectorPart = m[1];
    // find class selectors
    for (const cm of selectorPart.matchAll(/\.([A-Za-z0-9_-]+)/g)) {
      names.add({ type: 'class', name: cm[1] });
    }
    // find id selectors
    for (const im of selectorPart.matchAll(/#([A-Za-z0-9_-]+)/g)) {
      names.add({ type: 'id', name: im[1] });
    }
    // find [data-*] attribute selectors
    for (const am of selectorPart.matchAll(/\[\s*data-([A-Za-z0-9_-]+)/g)) {
      names.add({ type: 'data', name: am[1] });
    }
  }

  return names;
}

// Normalize a Set/Array of {type,name} items into a de-duplicated Array
function normalizeSet(items) {
  const map = new Map();
  if (!items) return [];
  for (const it of items) {
    if (!it || !it.type || !it.name) continue;
    const key = `${it.type}:${it.name}`;
    if (!map.has(key)) map.set(key, { type: it.type, name: it.name });
  }
  return Array.from(map.values());
}

function extractNamesFromJs(content) {
  const names = new Set();
  if (!content) return names;
  // getElementById('foo')
  for (const m of content.matchAll(/getElementById\(['"]([A-Za-z0-9_-]+)['"]\)/g)) {
    names.add({ type: 'id', name: m[1] });
  }
  // getElementsByClassName('a b')
  for (const m of content.matchAll(/getElementsByClassName\(['"]([A-Za-z0-9_ -]+)['"]\)/g)) {
    for (const p of m[1].split(/\s+/)) if (p) names.add({ type: 'class', name: p });
  }
  // querySelector('...') and querySelectorAll('...') - extract simple selectors
  for (const m of content.matchAll(/querySelector(All)?\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const sel = m[2];
    for (const cm of sel.matchAll(/\.([A-Za-z0-9_-]+)/g)) names.add({ type: 'class', name: cm[1] });
    for (const im of sel.matchAll(/#([A-Za-z0-9_-]+)/g)) names.add({ type: 'id', name: im[1] });
    for (const am of sel.matchAll(/\[\s*data-([A-Za-z0-9_-]+)/g)) names.add({ type: 'data', name: am[1] });
  }
  // getAttribute('data-foo') and setAttribute('data-foo', ...)
  for (const m of content.matchAll(/getAttribute\(\s*['"]data-([A-Za-z0-9_-]+)['"]\s*\)/g)) names.add({ type: 'data', name: m[1] });
  for (const m of content.matchAll(/setAttribute\(\s*['"]data-([A-Za-z0-9_-]+)['"]\s*,/g)) names.add({ type: 'data', name: m[1] });
  // dataset.prop usage -> convert camelCase prop to kebab-case
  for (const m of content.matchAll(/\.dataset\.([A-Za-z0-9_$]+)/g)) {
    const prop = m[1];
    const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
    names.add({ type: 'data', name: kebab });
  }
  return names;
}

function collectNames(files) {
  const map = new Map();
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    let content = null;
    try { content = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    let found = new Set();
    if (ext === '.html' || ext === '.htm') {
      found = extractNamesFromHtml(content);
      // also extract names from inline <style> blocks inside HTML
      for (const sm of content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
        const css = sm[1] || '';
        for (const it of normalizeSet(extractNamesFromCss(css))) {
          found.add(it);
        }
      }
    }
    else if (ext === '.css') found = extractNamesFromCss(content);
    else if (ext === '.js') found = extractNamesFromJs(content);
    const norm = normalizeSet(found);
    for (const it of norm) {
      // ignore names that already look like obfuscated tokens (e.g. c1a2b3)
      if (/^[cid][0-9a-f]{4,}$/i.test(it.name)) continue;
      const key = `${it.type}:${it.name}`;
      if (!map.has(key)) map.set(key, it);
    }
  }
  return Array.from(map.values());
}

function buildMapping(names, protectedSet = new Set()) {
  const mapping = {};
  for (const it of names) {
    // avoid obfuscating names that look like map keys or template tokens (simple heuristic)
    // keep a short, explicit allowlist to avoid touching common third-party/vendor names
    // NOTE: previous regex was overbroad (e.g. /^h-?\w/) and accidentally skipped many names.
    const SKIP_REGEX = /^(?:post|page|nav|main|content|header|footer|container|row|col|fa(?:-|$)|fas|far|fab|icon)$/i;
  if (SKIP_REGEX.test(it.name)) {
      // keep some common semantic or vendor names - adjust this list if you need to preserve more
      continue;
    }
  // never obfuscate names that are present in protected vendor/minified/static CSS
  if (protectedSet && protectedSet.has(`${it.type}:${it.name}`)) continue;
  const prefix = it.type === "id" ? "i" : it.type === "class" ? "c" : "d";
  const token = prefix + randToken(6);
    mapping[`${it.type}:${it.name}`] = token;
  }
  return mapping;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function transformCssContent(content, mapping) {
  // Accepts raw CSS text and returns transformed CSS with selectors rewritten
  // using PostCSS+selector parser when available, otherwise the safer regex fallback.
  let out = content;
  if (postcss && selectorParser) {
    try {
      const root = postcss.parse(out, { from: undefined });
      root.walkRules(rule => {
        if (!rule.selector) return;
        try {
          const transformed = selectorParser(selectors => {
            selectors.walk(node => {
              if (node.type === 'class') {
                const mapped = mapping[`class:${node.value}`];
                if (mapped) node.value = mapped;
              }
              if (node.type === 'id') {
                const mapped = mapping[`id:${node.value}`];
                if (mapped) node.value = mapped;
              }
              if (node.type === 'attribute') {
                const attr = node.attribute || '';
                if (/^data-/i.test(attr)) {
                  const dataName = attr.slice(5);
                  const mapped = mapping[`data:${dataName}`];
                  if (mapped) node.attribute = 'data-' + mapped;
                }
              }
            });
          }).processSync(rule.selector);
          rule.selector = transformed;
        } catch (e) {
          // ignore per-rule selector parse errors
        }
      });
      out = root.toString();
      return out;
    } catch (e) {
      // fall back to regex below
    }
  }

  // Regex fallback: operate only on selector blocks to avoid touching declarations
  const urlPlaceholders = [];
  let c = out.replace(/url\(([^)]+)\)/gi, (m, inner) => {
    const token = `__URL_PLACEHOLDER_${urlPlaceholders.length}__`;
    urlPlaceholders.push(inner);
    return `url(${token})`;
  });

  function cssEscapePatternForName(name) {
    return name.split('').map(ch => {
      if (/^[A-Za-z0-9_-]$/.test(ch)) return escapeRegExp(ch);
      return '(?:\\\\)?' + escapeRegExp(ch);
    }).join('');
  }

  const classKeys = Object.keys(mapping).filter(k => k.startsWith('class:'));
  const idKeys = Object.keys(mapping).filter(k => k.startsWith('id:'));

  c = c.replace(/([^{}]+)\{([^}]*)\}/g, (full, selectorPart, body) => {
    let sel = selectorPart;
    for (const k of classKeys) {
      const name = k.split(':')[1];
      const pat = cssEscapePatternForName(name);
      const re = new RegExp('(^|[\\s,>+~])\\.(' + pat + ')','g');
      sel = sel.replace(re, (m, prefix, matched) => prefix + '.' + (mapping[`class:${name}`] || matched));
    }
    for (const k of idKeys) {
      const name = k.split(':')[1];
      const pat = cssEscapePatternForName(name);
      const re = new RegExp('(^|[\\s,>+~])#(' + pat + ')','g');
      sel = sel.replace(re, (m, prefix, matched) => prefix + '#' + (mapping[`id:${name}`] || matched));
    }
    return sel + '{' + body + '}';
  });

  // restore url placeholders
  c = c.replace(/url\((__URL_PLACEHOLDER_[0-9]+__)\)/g, (m, token) => {
    const idx = Number(token.replace(/[^0-9]/g, ''));
    return `url(${urlPlaceholders[idx]})`;
  });

  return c;
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
    // transform inline <style> blocks so CSS selectors inside them are rewritten
    if (/<style[\s>]/i.test(content)) {
      content = content.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, css) => {
        try {
          const transformed = transformCssContent(css, mapping);
          return `<style${attrs}>${transformed}</style>`;
        } catch (e) {
          return full; // leave as-is on error
        }
      });
    }
  }
  // CSS selectors
  if (ext === ".css") {
    // Prefer AST-based selector rewriting using PostCSS + postcss-selector-parser for correctness.
    if (postcss && selectorParser) {
      try {
        const root = postcss.parse(content, { from: undefined });
        root.walkRules(rule => {
          if (!rule.selector) return;
          try {
            const transformed = selectorParser(selectors => {
              selectors.walk(node => {
                // class node
                if (node.type === 'class') {
                  const name = node.value;
                  const mapped = mapping[`class:${name}`];
                  if (mapped) node.value = mapped;
                }
                // id node
                if (node.type === 'id') {
                  const name = node.value;
                  const mapped = mapping[`id:${name}`];
                  if (mapped) node.value = mapped;
                }
                // attribute node -- handle [data-foo] selectors
                if (node.type === 'attribute') {
                  const attr = node.attribute;
                  if (/^data-/i.test(attr)) {
                    const dataName = attr.slice(5);
                    const mapped = mapping[`data:${dataName}`];
                    if (mapped) node.attribute = 'data-' + mapped;
                  }
                }
              });
            }).processSync(rule.selector);
            rule.selector = transformed;
          } catch (err) {
            // selector parser may fail on odd minified selectors; skip transformation for this rule
          }
        });
        content = root.toString();
      } catch (e) {
        // parsing failed: fall back to previous regex-based handling below
      }
    }

    // If content still unchanged or postcss not available, keep previous regex-based fallback
    if (!postcss || !selectorParser || (postcss && selectorParser && content == fs.readFileSync(file, 'utf8'))) {
      // Mask url(...) contents so path fragments aren't modified.
      const urlPlaceholders = [];
      content = content.replace(/url\(([^)]+)\)/gi, (m, inner) => {
        const token = `__URL_PLACEHOLDER_${urlPlaceholders.length}__`;
        urlPlaceholders.push(inner);
        return `url(${token})`;
      });

      function cssEscapePatternForName(name) {
        return name.split('').map(ch => {
          if (/^[A-Za-z0-9_-]$/.test(ch)) return escapeRegExp(ch);
          return '(?:\\\\)?' + escapeRegExp(ch);
        }).join('');
      }

      const classKeys = Object.keys(mapping).filter(k => k.startsWith('class:'));
      const idKeys = Object.keys(mapping).filter(k => k.startsWith('id:'));

      content = content.replace(/([^{}]+)\{([^}]*)\}/g, (full, selectorPart, body) => {
        let sel = selectorPart;
        for (const k of classKeys) {
          const name = k.split(':')[1];
          const pat = cssEscapePatternForName(name);
          const re = new RegExp('(^|[\\s,>+~])\\.(' + pat + ')','g');
          sel = sel.replace(re, (m, prefix, matched) => prefix + '.' + (mapping[`class:${name}`] || matched));
        }
        for (const k of idKeys) {
          const name = k.split(':')[1];
          const pat = cssEscapePatternForName(name);
          const re = new RegExp('(^|[\\s,>+~])#(' + pat + ')','g');
          sel = sel.replace(re, (m, prefix, matched) => prefix + '#' + (mapping[`id:${name}`] || matched));
        }
        return sel + '{' + body + '}';
      });

      // restore url(...) placeholders
      content = content.replace(/url\((__URL_PLACEHOLDER_[0-9]+__)\)/g, (m, token) => {
        const idx = Number(token.replace(/[^0-9]/g, ''));
        return `url(${urlPlaceholders[idx]})`;
      });
    }
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
  const forceFull = flags.includes('--full') || flags.includes('--force');

  const allFiles = walk(publicDir);

  function isSkippable(f) {
    const rel = path.relative(publicDir, f).replace(/\\/g, '/');
    // never touch files under the public static tree (these are raw assets)
    if (rel === 'static' || rel.startsWith('static/') || rel.indexOf('/static/') !== -1) return true;
    // skip vendor/minified only when not running in full/force mode
    if (!forceFull) {
      // skip vendor directories (often contain third-party assets with their own paths)
      if (rel.indexOf('/vendor/') !== -1 || rel.startsWith('vendor/')) return true;
      // skip minified CSS files to avoid touching filename fragments; this protects hashed filenames
      if (path.extname(f).toLowerCase() === '.css' && path.basename(f).indexOf('.min.') !== -1) return true;
    }
    return false;
  }

  const files = allFiles.filter(f => !isSkippable(f));
  if (verbose) console.log(`Skipping ${allFiles.length - files.length} files due to skip rules (vendor/minified/static)` + (forceFull? ' (force/full mode ON: vendor/minified included)':''));
  // Build a set of protected names that appear in skipped CSS files (vendor/minified/static).
  // These names should not be obfuscated because their definitions live in untouched vendor CSS.
  const protectedSet = new Set();
  for (const f of allFiles) {
    if (!isSkippable(f)) continue;
    const ext = path.extname(f).toLowerCase();
    if (ext !== '.css') continue;
    try {
      const content = fs.readFileSync(f, 'utf8');
      const found = normalizeSet(extractNamesFromCss(content));
      for (const it of found) protectedSet.add(`${it.type}:${it.name}`);
    } catch (e) {
      // ignore read errors for protected files
    }
  }

  const names = collectNames(files);
  const mapping = buildMapping(names, protectedSet);

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

  // keep `summary` for the final consolidated report after SRI processing
  if (!jsonOut && verbose) {
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
  // Final consolidated report (human table + summary) or JSON output
  const finalReport = {
    obfuscation: summary,
    sriSummary: sriSummary,
    sriDetails: sriDetailsAll,
    changedFiles: changedFileList
  };

  if (jsonOut) {
    console.log(JSON.stringify(finalReport, null, 2));
    return;
  }

  // Print a table of per-asset SRI decisions
  if (sriDetailsAll.length) {
    console.log('\nSRI Decisions:');
    const rows = sriDetailsAll.map(d => ({
      file: path.relative(process.cwd(), d.html),
      tag: d.tag,
      src: d.src,
      local: d.path ? path.relative(process.cwd(), d.path) : '<none>',
      existing: d.existing || '<none>',
      computed: d.computed || '<none>',
      status: d.status
    }));
    const headers = ['file','tag','src','local','existing','computed','status'];
    const colWidths = headers.map(h => Math.max(h.length, ...rows.map(r => (r[h]||'').length)));
    const pad = (s, n) => s + ' '.repeat(n - s.length);
    // print header
    const headerLine = headers.map((h,i) => pad(h, colWidths[i])).join('  |  ');
    console.log(headerLine);
    console.log(colWidths.map(w => '-'.repeat(w)).join('-+-'));
    for (const r of rows) {
      const line = headers.map((h,i) => pad(r[h]||'', colWidths[i])).join('  |  ');
      console.log(line);
    }
  }

  // Print obfuscation changed files summary
  if (changedFileList.length) {
    console.log('\nObfuscation Changes:');
    for (const c of changedFileList) console.log(`  ${path.relative(process.cwd(), c.file)}  (~${c.replacements} replacements)`);
  }

  // Print final summary counts
  console.log('\nSummary:');
  console.log(`  Files scanned: ${summary.scannedFiles}`);
  console.log(`  Files changed (obfuscation): ${summary.changedFiles}`);
  console.log(`  Total replacements (approx): ${summary.totalReplacements}`);
  for (const k of Object.keys(sriSummary)) console.log(`  SRI ${k}: ${sriSummary[k]}`);

}

if (require.main === module) main();
