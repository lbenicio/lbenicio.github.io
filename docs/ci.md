# CI / GitHub Actions

This document explains the CI pipeline and how to troubleshoot failures.

Workflows

- `.github/workflows/hugo.yml` — builds the Hugo site, runs the obfuscator, uploads the `public/` artifact and deploys to GitHub Pages.
- `.github/workflows/publish.yml` — builds and pushes a docker image (if used).

Key steps in `hugo.yml`

1. Install Hugo on the runner.
2. Checkout repository (with submodules).
3. Setup Pages and install Node dependencies.
4. Build the site with Hugo and `--minify`.
5. Run `node scripts/obfuscate.js ./public`.
6. Upload artifact and deploy with `actions/deploy-pages@v4`.

Debugging failed builds

- Check the Actions log for the step that failed. Steps commonly fail due to:
  - Network/connectivity issues when downloading Hugo.
  - Missing Node dependencies (ensure `package-lock.json` or run `npm install`).
  - Obfuscator errors (inspect the `public/` folder locally).

Add artifacts for debugging

- To capture the obfuscation mapping for debugging without publishing it, add a workflow step that runs the obfuscator with an output file and uploads it via `actions/upload-artifact@v4` (do not place the mapping inside `public/`).

Secrets & permissions

- The workflow uses `GITHUB_TOKEN` and requires `pages: write` permission. Ensure the workflow's `permissions` block is configured appropriately.
