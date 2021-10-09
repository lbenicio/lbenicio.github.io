[![Gem Version](https://img.shields.io/gem/v/jekyll.svg?style=flat-square)](https://rubygems.org)
[![CircleCI](https://img.shields.io/circleci/build/github/lbenicio/lbenicio.github.io?style=flat-square)](https://circleci.com/gh/lbenicio/lbenicio.github.io)
[![security](https://hakiri.io/github/lbenicio/lbenicio.github.io/master.svg)](https://hakiri.io/github/lbenicio/lbenicio.github.io/main)
![GitHub issues](https://img.shields.io/github/issues-raw/lbenicio/lbenicio.github.io?style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/lbenicio/lbenicio.github.io?style=flat-square)
![license](https://img.shields.io/github/license/lbenicio/lbenicio.github.io?style=flat-square)

# Leonardo Benicio profile page
This is my personal website made in jekyll. Feel free to clone and use it!

## Instalation
clone this git repository

```bash
gem install bundler
```
```bash
bundle install
```

## Running
```bash
bundle exec jekyll serve
```

## Unit tests
```bash
bundle exec htmlproofer \
    --report-invalid-tags \
    --report-missing-names \
    --report-script-embeds \
    --report-missing-doctype \
    --report-eof-tags \
    --report-mismatched-tags \
    --assume-extension \
    --check-external-hash \
    --allow-hash-href \
    --check-favicon \
    --check-html \
    --check-opengraph \
    --enforce-https --disable-external
```