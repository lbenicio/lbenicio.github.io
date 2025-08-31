#!/usr/bin/env node
// Simple static preview server for the generated `public/` directory.
// Usage: node scripts/preview-server.js [--port 8080] [--open]

const http = require('http');
const path = require('path');
const fs = require('fs');

const argv = process.argv.slice(2);
let port = process.env.PORT ? Number(process.env.PORT) : 8080;
let doOpen = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--port' && argv[i+1]) { port = Number(argv[i+1]); i++; }
  if (argv[i] === '--open') doOpen = true;
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  console.error('Public directory not found:', publicDir);
  process.exit(2);
}

function contentTypeFor(name) {
  const ext = path.extname(name).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.woff2': return 'font/woff2';
    case '.woff': return 'font/woff';
    case '.ttf': return 'font/ttf';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0] || '/');
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    const abs = path.join(publicDir, reqPath.replace(/^\//, ''));
    if (!abs.startsWith(publicDir)) {
      res.statusCode = 403;
      return res.end('Forbidden');
    }
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      res.setHeader('Content-Type', contentTypeFor(abs));
      fs.createReadStream(abs).pipe(res);
      return;
    }
    // fallback to index.html for SPA-like routes
    const index = path.join(publicDir, 'index.html');
    if (fs.existsSync(index)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      fs.createReadStream(index).pipe(res);
      return;
    }
    res.statusCode = 404;
    res.end('Not found');
  } catch (e) {
    res.statusCode = 500;
    res.end('Server error');
  }
});

server.listen(port, () => {
  const url = `http://localhost:${port}/`;
  console.log(`Serving ${publicDir} at ${url}`);
  if (doOpen) {
    // cross-platform open
    const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    require('child_process').spawn(openCmd, [url], { stdio: 'ignore', detached: true }).unref();
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down preview server');
  server.close(() => process.exit(0));
});
