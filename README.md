# AboutMe — Personal Website

**Current version:** `2.1.1`

![GitHub License](https://img.shields.io/github/license/lbenicio/lbenicio.github.io?style=flat&color=blue)
![GitHub Release](https://img.shields.io/github/v/release/lbenicio/lbenicio.github.io?color=blue)
[![Deploy](https://github.com/lbenicio/lbenicio.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/lbenicio/lbenicio.github.io/actions/workflows/deploy.yml)

Personal website built with [Hugo](https://gohugo.io/) and the [aboutme-theme](https://github.com/lbenicio/theme). No Node.js required; Hugo Pipes compiles SCSS using Dart Sass.

## 🚀 Quick Start

### Prerequisites

- **Hugo** v0.163.0 or higher (standard or extended edition)
- **Dart Sass** with the `sass` executable available on `PATH`
- **Go** 1.27.0 or higher (for module resolution)

### Run locally

```bash
git clone https://github.com/lbenicio/lbenicio.github.io.git
cd lbenicio.github.io
hugo server
```

No `npm install` or `node_modules` are required. Hugo uses Dart Sass on `PATH` for SCSS compilation, CSS minification, and asset fingerprinting.

## 📁 Project Structure

```text
.
├── content/                  # All page content (front matter driven)
│   ├── _index.md            # Homepage (heading, subtitle, avatar, socials)
│   ├── about/index.md       # About page (name, role, skills, certifications)
│   ├── contact/index.md     # Contact page (postUrl, email, pgpKey)
│   ├── timeline/index.md    # Timeline milestones
│   ├── publications/        # Academic publications
│   └── reading/             # Reading list
├── static/
│   └── static/              # Static assets → /static/ URL prefix
│       ├── images/          # Profile pictures, institution logos
│       ├── files/           # PDFs, sheets
│       └── pgp/             # PGP public key
├── hugo.toml                # Site configuration
├── go.mod                   # Hugo module dependencies
└── .github/workflows/       # CI/CD (build → obfuscate → deploy)
```

## ⚙️ Configuration

All page content is sourced from front matter, not site config. The `hugo.toml` only holds global defaults:

```toml
[params]
  appMode = "ABOUT_ONLY"       # Render mode
  siteUrl = "https://lbenicio.dev"
  githubHandler = "lbenicio"   # Social defaults (overridable per page)
  linkedinHandler = "leonardo-benicio"
  twitterHandler = "lbenicio_"
```

### Page front matter examples

**Homepage** (`content/_index.md`):
```yaml
heading: "About Leonardo Benicio"
subtitle: "Personal tagline"
avatar: "static/images/avatar/profile-picture.png"
github: "lbenicio"
```

**About** (`content/about/index.md`):
```yaml
name: "Leonardo Benicio"
role: "Computer Scientist"
skills: ["Algorithms", "Distributed Systems", ...]
certifications:
  - id: aws-cloud-practitioner
    name: AWS Certified Cloud Practitioner
    ...
```

**Contact** (`content/contact/index.md`):
```yaml
email: "hi@lbenicio.dev"
postUrl: "https://formbold.com/s/..."
pgpKey: "/static/pgp/public.asc"
```

## 🔒 Security

- **Class/ID obfuscation**: All HTML, CSS, and JS identifiers are deterministically obfuscated post-build.
- **PGP encryption**: Contact form supports OpenPGP encryption via `openpgp.js`.
- **No external scripts**: Only self-hosted assets (except Umami analytics).

## 🚢 Deployment

Pushes to `main` trigger the [deploy workflow](.github/workflows/deploy.yml):
1. Install Go + Hugo dependencies
2. Build with Hugo (`--minify --environment production`)
3. Obfuscate class/id/data-* names
4. Resolve the `aboutme` CloudFormation stack outputs
5. Sync the site to its S3 bucket
6. Invalidate the CloudFront cache

The workflow expects these repository secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

The IAM user needs permission to read the `aboutme` CloudFormation stack, upload/delete objects in the `lbenicio.dev` S3 bucket, and create CloudFront invalidations.

Manual build:
```bash
hugo --minify --environment production
```

## 📦 Dependencies

Zero Node.js dependencies. Hugo 0.163.0 or later and Dart Sass on `PATH` are required.

```
require github.com/lbenicio/theme v0.6.0
```

## 📧 Contact

- **Email**: hi@lbenicio.dev
- **GitHub**: [@lbenicio](https://github.com/lbenicio)
- **LinkedIn**: [leonardo-benicio](https://www.linkedin.com/in/leonardo-benicio)

---

**Built with Hugo + aboutme-theme • © 2026 Leonardo Benicio**
