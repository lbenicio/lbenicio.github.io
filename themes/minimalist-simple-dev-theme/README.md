# dev simple minimal hugo theme

A minimal website/blog theme for developers. It is a simple and clean theme for developers who want to showcase their work and write about their experiences.

## Features

- minimalistic design
- home / personal page
- blog

## Installation

The installation process separated in two steps. First install hugo depedencies and Go. Then install npm packages.

```bash
go install
```

```bash
npm install
```

## Development

For running the development server, you need to have hugo installed. Then run the below command:

```bash
hugo server
```

## Build

```bash
hugo build
```

## Configuration

hugo.toml

[social]
  [twitter]
    username = 'twitter'
    icon = 'fa fa-twitter'
  [github]
    username = 'github'
    icon = 'fa fa-github'
  [linkedin]
    username = 'linkedin'
    icon = 'fa fa-linkedin'
  [mastodon]
    username = 'mastodon'
    instance = 'mastodon.social'
    visible = false
    icon = 'fa fa-mastodon'

[analytics]
  google = "UA-123456789-1"

baseURL = '<https://example.org/>'
homeURL = '<https://example.org/>'
blogURL = '<https://blog.example.org/>'
languageCode = 'en-us'
title = 'My New Hugo Site'
description = 'A minimal website/blog theme for developers. It is a simple and clean theme for developers who want to showcase their work and write about their experiences.'
