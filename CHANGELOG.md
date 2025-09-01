# Changelog

All notable changes to this project are documented in this file. This project follows the "Keep a Changelog" format and adheres to Semantic Versioning.

Full changelog: <https://github.com/lbenicio/lbenicio.github.io/commits/main>

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
