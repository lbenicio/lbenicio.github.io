# Changelog

All notable changes to this project are documented in this file. This project follows the "Keep a Changelog" format and adheres to Semantic Versioning.

Full changelog: <https://github.com/lbenicio/lbenicio.github.io/commits/main>

## [2.0.1] - 2026-06-20

### Changed

- **Timeline page**: converted from section (`_index.md`) to leaf bundle single page (`index.md`).
- **Static directory**: restructured to `static/static/` for `/static/` URL prefix (images, files, pgp).
- **Front matter paths**: avatar and PGP key paths updated to `/static/` prefix.
- **Theme updated** to v0.1.0 — SCSS framework, obfuscator fixes, page refactoring.

### Fixed

- PGP key now renders correctly on contact page (obfuscator `querySelector` bug fixed in theme).
- Navbar spacing restored (gap utilities correctly applied).
- Font files (OpenSans Regular, Italic, Bold, BoldItalic) restored.

## [2.0.0] - 2026-06-16

### Added

- feat(docs): improve readme theme description
- feat(meta): add dependencies and hugo theme
- feat(bootstrap): release v2 layout
- Add(static/favicon): add 32x32 favicon.svg
- feat: add site and theme mounts configuration in hugo.yml
- feat: add site mounts configuration for content, static, layouts, assets, and archetypes in hugo.yml

### Changed

- refactor: simplify GitHub Actions workflow for Hugo deployment
- refactor: remove site and theme mounts configuration from hugo.yml
- refactor: clean up project structure by removing ensure-theme-link script, updating .gitignore, and enhancing content files
- refactor: remove unused content files for better organization

### Fixed

- fix(theme): update subproject commit for minimalist-simple-dev-theme
- fix(theme): update subproject commit for minimalist-simple-dev-theme
- fix(theme): update subproject commit for minimalist-simple-dev-theme
- fix: update public directory path in preview server script
- fix: reorder site and theme mounts in hugo.yml for clarity
- fix(theme): update subproject commit for minimalist-simple-dev-theme
- fix(theme): support src/themes layout; add ensure-theme-link
- fix: add src/content/ to .gitignore to prevent tracking of content files
- fix: reorder scripts in package.json for clarity and update submodule reference

### Chore

- chore(root): Remove source, docs, CI, and assets
- chore(ci): update Pages workflow to use aboutme-v2 reusable exporter
- chore(ci): update Pages workflow to use aboutme-v2 reusable exporter
- chore: update version to 1.5.3 in package.json and hugo.yml; enhance changelog

### Misc

- Delete .DS_Store
- Merge pull request #101 from lbenicio/dependabot/npm_and_yarn/jsdom-28.1.0
- build(deps-dev): bump jsdom from 28.0.0 to 28.1.0
- Merge pull request #100 from lbenicio/dependabot/npm_and_yarn/jsdom-28.0.0
- build(deps-dev): bump jsdom from 27.4.0 to 28.0.0
- Merge pull request #99 from lbenicio/dependabot/npm_and_yarn/jsdom-27.4.0
- build(deps-dev): bump jsdom from 27.3.0 to 27.4.0
- Merge pull request #98 from lbenicio/dependabot/npm_and_yarn/jsdom-27.3.0
- build(deps-dev): bump jsdom from 27.2.0 to 27.3.0
- Merge pull request #97 from lbenicio/dependabot/npm_and_yarn/postcss-selector-parser-7.1.1
- build(deps): bump postcss-selector-parser from 7.1.0 to 7.1.1
- Merge pull request #96 from lbenicio/dependabot/github_actions/actions/checkout-6
- build(deps): bump actions/checkout from 5 to 6
- Merge pull request #95 from lbenicio/dependabot/npm_and_yarn/npm_and_yarn-289f08b78c
- Merge branch 'main' into dependabot/npm_and_yarn/npm_and_yarn-289f08b78c
- Merge pull request #94 from lbenicio/dependabot/npm_and_yarn/jsdom-27.2.0
- build(deps): bump glob in the npm_and_yarn group across 1 directory
- build(deps-dev): bump jsdom from 27.1.0 to 27.2.0
- Merge pull request #92 from lbenicio/dependabot/npm_and_yarn/cssnano-7.1.2
- Merge branch 'main' into dependabot/npm_and_yarn/cssnano-7.1.2
- Merge pull request #93 from lbenicio/dependabot/npm_and_yarn/jsdom-27.1.0
- build(deps-dev): bump jsdom from 27.0.1 to 27.1.0
- build(deps): bump cssnano from 7.1.1 to 7.1.2
- Merge pull request #91 from lbenicio/dependabot/npm_and_yarn/jsdom-27.0.1
- build(deps-dev): bump jsdom from 27.0.0 to 27.0.1
- Create CNAME
- Refactor GitHub Actions for Hugo site deployment
- Refactor deploy-pages workflow for better structure
- Update Hugo version in deploy workflow
- refactor project dir structure
- Merge pull request #90 from lbenicio/dependabot/npm_and_yarn/jsdom-27.0.0
- build(deps-dev): bump jsdom from 26.1.0 to 27.0.0
- Merge pull request #88 from lbenicio/dependabot/npm_and_yarn/jsdom-26.1.0
- Merge branch 'main' into dependabot/npm_and_yarn/jsdom-26.1.0
- Merge pull request #89 from lbenicio/dependabot/github_actions/actions/setup-node-5
- build(deps): bump actions/setup-node from 4 to 5
- Merge branch 'main' into dependabot/npm_and_yarn/jsdom-26.1.0
- build(deps-dev): bump jsdom from 22.1.0 to 26.1.0

## [1.5.3] - 2025-09-01

### Fixed

- start:dev script now works with the theme's internal `src/` layout via Hugo Module mounts in `src/hugo.yml`.
- More robust PostCSS config resolution in `partials/head/css.html` to handle different run contexts.

### Changed

- Exposed site version in Hugo as `params.version` for easier surfacing in templates.

## [1.5.2] - 2025-08-31

### Added

- `scripts/publish-wiki.js`: new robust GitHub Wiki publisher. Features:
- prefers SSH locally, uses token-backed HTTPS in CI when available
- supports `--create` to create/enable wiki (API or `gh` fallback)
- `--dry-run` mode for safe previews
- auto-detects `docs/` (or `src/docs`, `content`, `src/content`) when `--docs` not provided
- ensures `Home.md` exists by copying from `README.md` when missing

### Fixed

- Resolved intermittent file corruption and duplicate declaration errors in the publish script during iterative edits.

## [1.5.1] - 2025-08-31

### Changed

- Test scripts: updated static and obfuscation tests to point to `.build/public` (CI/build output path). Improved fingerprinted asset resolution in static tests to reduce false negatives when compiled assets use hashed filenames; SRI mismatches are still fatal for exact matches.

## [1.5.0] - 2025-08-31

### Added

- Asset filename obfuscation support (`--assets`) now includes files under `public/assets` and static image paths (`public/static/images` and `public/static/static/images`). When enabled the script renames files in-place (or reports planned renames in `--dry-run`/`--check`).
- Health check output for `--check`: prints a concise health summary and exits with 0 (pass) or 3 (fail); `--check` now implies a dry-run.

### Changed

- `package.json` minor version bumped to `1.5.0`.

## [1.4.3] - 2025-08-31

### Added

- `scripts/preview-server.js`: small static preview server to serve `public/` (supports `--port` and `--open`).
- `npm` scripts: `preview`, `preview:open`, and `build:prod:preview` for quick local previews of production builds.

### Changed

- Obfuscator (`scripts/obfuscate.js`) now obfuscates all classes/ids/data-* by default (Tailwind utilities and short tokens like `sr-only`, `ml-4`, `fas`, `fab` are included), while still protecting names defined inside skipped vendor/minified/static CSS.
- HTML attribute parsing and replacement improved to handle single-quoted and unquoted attribute values (e.g. `id=menu`).

### Fixed

- SRI recomputation and patching after obfuscation validated; `--dry-run --check` reports no actionable mismatches on the current build.

## [1.4.2] - 2025-08-31

### Fixed

- Recomputed SRI integrity attributes for local JS/CSS after obfuscation to ensure browser SRI checks pass.
- `dataset` property access now uses bracket notation when obfuscated tokens are used to avoid invalid JS identifiers.

## [1.4.1] - 2025-08-31

### Fixed

- Workflow and CI: corrected permissions and workflow structure across GitHub Actions (release, pages deploy, and notification workflows).

## [1.4.0] - 2025-08-31

### Changed

- Bumped minor version to 1.4.0.
- Refactored build workflow to integrate obfuscation step.

## [1.3.4] - (previous)

### Changed

- update dependencies

## [1.3.3] - (previous)

### Changed

- initial closed release
- update naming
- update theme version support
- fix auto merge action

## [1.0.0] - (previous)

### Changed

- initial closed release

## [0.0.5] - (previous)

### Changed

- change config files to yaml
- update theme version to support social footer
- add more social networks

## [0.0.4] - (previous)

### Changed

- Initial test Release
