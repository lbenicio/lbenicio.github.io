# Build & Deploy

This document explains production builds, obfuscation, and deployment to GitHub Pages.

Production build steps (manual):

1. Build with Hugo:

```bash
hugo --minify
```

1. Obfuscate generated files (optional locally; CI runs this automatically):

```bash
node scripts/obfuscate.js ./public
```

1. Preview `public/` locally:

```bash
npx serve public
```

GitHub Actions workflow:

- The workflow is defined in `.github/workflows/hugo.yml`.
- It installs Hugo on the runner, checks out the repo, installs Node modules, runs Hugo with `HUGO_ENV=production`, runs the obfuscator, then uploads the `public/` directory using `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4`.

Notes about obfuscation in CI:

- Mapping is kept in-memory and is not written to `public/` by default to avoid leaking mappings to the published site.
- If you need the mapping for debugging, modify the workflow to save the mapping as an artifact (not inside `public/`).

Rollback & debugging:

- When debugging layout breakage after obfuscation, run the obfuscator locally and inspect HTML/CSS/JS in `public/`.
- You can temporarily disable the obfuscation step in `.github/workflows/hugo.yml` to confirm whether issues are caused by obfuscation.
