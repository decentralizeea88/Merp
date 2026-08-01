/* Static server for the built game. Node built-ins only — the zero
   runtime dependency rule holds in production too.

   The cache policy is the reason this exists rather than a generic static
   host default: hashed bundles are immutable, but index.html and sw.js
   must revalidate or players stay pinned to an old service worker and
   never receive an update. */

import { createServer } from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import { createGzip } from 'node:zlib';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

const COMPRESSIBLE = new Set([
  'text/html; charset=utf-8',
  'text/javascript; charset=utf-8',
  'text/css; charset=utf-8',
  'application/json; charset=utf-8',
  'application/manifest+json; charset=utf-8',
  'image/svg+xml',
]);

const cacheControl = (pathname) => {
  /* Vite fingerprints everything under /assets, so those can never go stale */
  if (pathname.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  /* the worker and the shell gate every update — always revalidate */
  if (pathname === '/sw.js' || pathname === '/' || pathname.endsWith('.html')) {
    return 'no-cache';
  }
  /* fonts and icons keep stable names, so cache them but allow a swap */
  return 'public, max-age=604800';
};

/* Confines the resolved path to ROOT so ../ cannot escape the build. */
const resolveFile = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  const target = normalize(join(ROOT, decoded));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  return target;
};

const send = (req, res, file, pathname, status = 200) => {
  const type = TYPES.get(extname(file)) ?? 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Cache-Control': cacheControl(pathname),
    'X-Content-Type-Options': 'nosniff',
  };
  /* sw.js must be allowed to control the whole origin */
  if (pathname === '/sw.js') headers['Service-Worker-Allowed'] = '/';

  const accepts = String(req.headers['accept-encoding'] ?? '').includes('gzip');
  const stream = createReadStream(file);
  if (accepts && COMPRESSIBLE.has(type)) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(status, headers);
    stream.pipe(createGzip()).pipe(res);
  } else {
    res.writeHead(status, headers);
    stream.pipe(res);
  }
};

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  const target = resolveFile(pathname === '/' ? '/index.html' : pathname);
  if (!target) {
    res.writeHead(403).end();
    return;
  }

  void fs
    .stat(target)
    .then((stat) => {
      if (stat.isDirectory()) throw new Error('directory');
      send(req, res, target, pathname);
    })
    .catch(() => {
      /* The game routes on the hash, so any unknown path is still the
         shell — serving it keeps deep links and offline reloads working. */
      send(req, res, join(ROOT, 'index.html'), '/', 200);
    });
});

server.listen(PORT, HOST);
