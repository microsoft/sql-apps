import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { configuration, readEnvironment, root } from '../../scripts/config.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const hopByHop = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
const blocked = name => hopByHop.has(name) || name.startsWith('x-ms-') || name.startsWith('x-forwarded-') || name === 'forwarded' || name === 'cookie';

export function createAppServer(config, assets = resolve(root, 'packages/frontend/dist')) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const authorityOrigin = new URL(config.publicConfig.authority).origin;
    res.setHeader('Content-Security-Policy', `default-src 'self'; connect-src 'self' ${authorityOrigin}; frame-src ${authorityOrigin}; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`);
    const send = (status, body, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': type });
      res.end(body);
    };
    try {
      const url = new URL(req.url, 'http://app.invalid');
      if (url.pathname === '/health' && req.method === 'GET') return send(200, '{"status":"web-ready"}');
      if (url.pathname === '/config.json' && req.method === 'GET') return send(200, JSON.stringify(config.publicConfig));
      if (url.pathname.startsWith('/api/')) {
        if (!['GET', 'POST'].includes(req.method)) return send(405, '{"error":"Method not allowed."}');
        if (req.method === 'POST' && req.headers.origin && req.headers.origin !== new URL(config.publicConfig.redirectUri).origin) {
          return send(403, '{"error":"Origin not allowed."}');
        }
        const headers = {};
        const connectionHeaders = new Set(String(req.headers.connection || '').toLowerCase().split(',').map(value => value.trim()));
        for (const [name, value] of Object.entries(req.headers)) {
          if (!blocked(name) && !connectionHeaders.has(name) && name !== 'host') headers[name] = value;
        }
        const target = new URL(url.pathname + url.search, config.dab);
        const upstream = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
          method: req.method, headers, timeout: 15_000,
        }, reply => {
          res.statusCode = reply.statusCode || 502;
          for (const name of ['content-type', 'content-encoding', 'vary', 'retry-after']) {
            if (reply.headers[name]) res.setHeader(name, reply.headers[name]);
          }
          reply.on('error', () => res.destroy());
          reply.pipe(res);
        });
        upstream.on('timeout', () => upstream.destroy(new Error('DAB request timed out.')));
        upstream.on('error', error => {
          console.error('DAB proxy failed:', error.code || error.message);
          if (!res.headersSent) send(503, '{"error":"DAB is unavailable or paused. Retry later."}');
          else res.destroy();
        });
        let size = 0;
        req.on('data', chunk => {
          size += chunk.length;
          if (size > 16_384) {
            if (!res.headersSent) send(413, '{"error":"Request body exceeds 16 KB."}');
            upstream.destroy();
          }
        });
        req.on('aborted', () => upstream.destroy());
        req.pipe(upstream);
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, '{"error":"Method not allowed."}');
      const pathname = decodeURIComponent(url.pathname);
      const file = resolve(assets, pathname === '/' ? 'index.html' : `.${pathname}`);
      if (!file.startsWith(`${resolve(assets)}${sep}`)) return send(403, '{"error":"Path not allowed."}');
      try {
        const bytes = await readFile(file);
        res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
        res.end(req.method === 'HEAD' ? undefined : bytes);
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
        send(404, '{"error":"Not found."}');
      }
    } catch (error) {
      console.error('Web request failed:', error.code || error.message);
      if (!res.headersSent) send(500, '{"error":"Request failed."}');
      else res.destroy();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const config = configuration(readEnvironment());
  await readFile(resolve(root, 'packages/frontend/dist/index.html'));
  const server = createAppServer(config);
  server.listen(config.port, config.host, () => {
    console.log(`Packaged web app ready on ${config.publicConfig.redirectUri}`);
    process.send?.('ready');
  });
  server.on('error', error => {
    console.error('Web startup failed:', error.message);
    process.exitCode = 1;
    if (process.connected) process.disconnect();
  });
  const stop = () => {
    server.close(() => { if (process.connected) process.disconnect(); });
    server.closeAllConnections();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  process.on('message', message => { if (message === 'stop') stop(); });
}
