# lbenicio.github.io

A minimal personal website and blog built with Hugo and Tailwind CSS.

This repository contains the Hugo site source and a theme. The project is optimized for fast static builds and is deployed to GitHub Pages via GitHub Actions. Production builds include an obfuscation step that replaces non-semantic classes/IDs with randomized tokens.

## Features

- Hugo static site generator
- Tailwind CSS for styling
- Automated GitHub Actions workflows for build and deploy
- Post-build obfuscation of classes/ids for production builds (in-memory mapping)

## Quickstart (local development)

Prerequisites:

- Node.js 18+ (for build scripts)
- Hugo (see <https://gohugo.io/getting-started/quick-start/>)
- npm or yarn

Install dependencies:

```bash
npm install
```

Run the development server (Hugo):

```bash
hugo server -D
```

Open <http://localhost:1313/> to preview the site.

## Build (production)

Build the site with Hugo (this produces the `public/` folder):

```bash
hugo --minify
```

Obfuscate production output (the repo's GitHub Action does this automatically; locally you can run):

```bash
node scripts/obfuscate.js ./public
```

The obfuscator keeps its mapping in memory and does not write a mapping file to disk by default. If you need the mapping for debugging, configure the workflow to save it as an Action artifact.

## Deploy

Deployment is handled by the GitHub Actions workflow defined in `.github/workflows/hugo.yml`. Pushing to `main` triggers a build and deploy to GitHub Pages.

To preview a built `public/` directory locally:

```bash
npx serve public
```

## Continuous Integration notes

- The workflow installs Hugo, builds the site, installs Node dependencies, runs the obfuscator, then uploads the `public/` directory to GitHub Pages.

- The obfuscation step uses an in-memory mapping to avoid publishing the mapping file. Adjust the workflow if you want the mapping archived as an artifact.

## Versioning & Changelog

This project follows Semantic Versioning. See `CHANGELOG.md` for history and release notes.

## Contributing

Contributions are welcome. Recommended workflow:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Make changes and add tests where appropriate.
4. Open a Pull Request describing your change.

Please keep changes small and clearly documented.

## Troubleshooting

- If CI builds fail, check the Actions logs for transient failures during Hugo installation.
- If obfuscation breaks layout or scripts, run the obfuscator locally and inspect files in `public/` to locate problematic replacements. You can whitelist selectors by editing `scripts/obfuscate.js`.

## License

This project is licensed under GPLv3. See `LICENSE` for details.

---

If you want badges, screenshots, or a contributor guide added to this README, tell me which sections to expand and I will update it.
