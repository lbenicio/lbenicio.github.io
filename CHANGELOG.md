# Changelog

All notable changes to this project are documented in this file. This project follows the "Keep a Changelog" format and adheres to Semantic Versioning.

Full changelog: <https://github.com/lbenicio/lbenicio.github.io/commits/main>

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
