# Getting Started

This document helps you set up a local development environment and explains the repository layout.

Repository layout (top-level):

- `content/` — Hugo content files (markdown pages)
- `themes/` — Hugo themes used by the site
- `assets/`, `static/` — static and generated assets
- `public/` — generated site output (build artifact)
- `scripts/` — build-related helper scripts (obfuscator)
- `.github/workflows/` — CI workflows

Prerequisites:

- Node.js 18+ (<https://nodejs.org/>)
- Hugo (recommended: extended or latest stable) — <https://gohugo.io/getting-started/quick-start/>
- npm or yarn

Install dependencies:

```bash
npm install
```

Run development server (Hugo):

```bash
hugo server -D
```

Preview the site at <http://localhost:1313/>.

Editing content:

- Add or edit markdown under `content/`.
- Run `hugo server -D` to preview changes live.

Working with the theme:

- Theme files live in `themes/minimalist-simple-dev-theme/` — edit templates in `layouts/` or assets in `assets/`.
- To test theme changes locally, ensure your site config points to the theme and run `hugo server`.

Common commands:

- `npm install` — install dev tools
- `hugo server -D` — run dev server
- `hugo --minify` — production build
- `node scripts/obfuscate.js ./public` — obfuscate production files locally (CI runs this automatically)
