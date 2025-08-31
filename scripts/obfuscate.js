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
    const token = (it.type === "id" ? "i" : "c") + randToken(6);
    mapping[`${it.type}:${it.name}`] = token;
  }
  return mapping;
}

function replaceInFile(file, mapping) {
  const ext = path.extname(file).toLowerCase();
  let content = fs.readFileSync(file, "utf8");
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
        if (sel.startsWith(".")) {
          const name = sel.slice(1);
          return `querySelector${all || ""}('${
            "." + (mapping[`class:${name}`] || name)
          }')`;
        } else if (sel.startsWith("#")) {
          const name = sel.slice(1);
          return `querySelector${all || ""}('${
            "#" + (mapping[`id:${name}`] || name)
          }')`;
        }
        return m;
      }
    );
  }

  fs.writeFileSync(file, content, "utf8");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error("Usage: obfuscate.js <public_dir>");
    process.exit(2);
  }
  const publicDir = path.resolve(argv[0]);
  if (!fs.existsSync(publicDir)) {
    console.error("Public dir does not exist:", publicDir);
    process.exit(2);
  }

  const files = walk(publicDir);
  const names = collectNames(files);
  const mapping = buildMapping(names);

  // apply replacements (mapping kept in-memory only)
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (![".html", ".htm", ".css", ".js"].includes(ext)) continue;
    replaceInFile(f, mapping);
  }

  console.log(
    "Obfuscation complete. Mapping kept in memory (not written to disk)."
  );
}

if (require.main === module) main();
