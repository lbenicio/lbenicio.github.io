# Obfuscation Details

This file documents the obfuscator used in CI and how to customize or extend it.

Overview

- The obfuscator is `scripts/obfuscate.js`. It scans `public/` for `.html`, `.css`, and `.js` files and replaces class and id names with randomized tokens.
- Mapping is kept in memory during CI runs and is not written to disk by default.

What it replaces

- HTML: `class="..."` and `id="..."` attributes (splits classes by whitespace)
- CSS: simple `.class` and `#id` selectors
- JS: common patterns such as `getElementById('id')`, `getElementsByClassName('cls')`, `querySelector('.cls')` and `querySelector('#id')`

Limitations & caveats

- The obfuscator uses regex heuristics. It may miss dynamic class names created at runtime or framework-specific patterns.
- Complex CSS selectors (e.g., attribute selectors or combinators) may not be fully covered.
- A whitelist pattern exists in the script to avoid obfuscating common semantic names; adjust as needed.

Customizing

- To add a whitelist or blacklist, edit `scripts/obfuscate.js` and adjust `buildMapping()` or the name filters.
- To produce deterministic tokens (repeatable across builds), replace random tokens with a hash-based generator (e.g., `sha1(name + secret)` truncated to desired length).

Debugging

- Run locally:

```bash
node scripts/obfuscate.js ./public
```

- Inspect generated `public/` files and compare them to pre-obfuscation versions (keep a backup copy of `public/` before obfuscation if needed).
