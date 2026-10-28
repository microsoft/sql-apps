import { HttpError } from './auth.mjs';
import { publicConfiguration } from './config.mjs';

const response = (status, jsonBody) => ({
  status, jsonBody, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
  },
});

function labelFilter(request) {
  const query = new URL(request.url).searchParams;
  for (const key of query.keys()) {
    if (!['$orderby', '$filter'].includes(key) || query.getAll(key).length !== 1) {
      throw new HttpError(400, 'Unsupported query.');
    }
  }
  if (query.has('$orderby') && query.get('$orderby') !== 'CreatedAt desc') throw new HttpError(400, 'Unsupported ordering.');
  if (!query.has('$filter')) return undefined;
  const match = /^Label eq '((?:[^']|'')*)'$/.exec(query.get('$filter'));
  if (!match) throw new HttpError(400, 'Unsupported filter.');
  const label = match[1].replace(/''/g, "'");
  if (!label.length || label.length > 120) throw new HttpError(400, 'Invalid Label filter.');
  return label;
}

async function readLabel(request, timeoutMs) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw new HttpError(415, 'Content-Type must be application/json.');
  }
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 16384)) throw new HttpError(413, 'Request body exceeds 16 KB.');
  let size = 0;
  const chunks = [];
  if (request.body) {
    const reader = request.body.getReader();
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new HttpError(408, 'Request body timed out.'));
        void reader.cancel().catch(() => {});
      }, timeoutMs);
    });
    try {
      for (;;) {
        const { done, value } = await Promise.race([reader.read(), deadline]);
        if (done) break;
        size += value.byteLength;
        if (size > 16384) { void reader.cancel().catch(() => {}); throw new HttpError(413, 'Request body exceeds 16 KB.'); }
        chunks.push(Buffer.from(value));
      }
    } finally { clearTimeout(timer); reader.releaseLock(); }
  }
  let body;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new HttpError(400, 'Invalid JSON body.'); }
  if (!body || Array.isArray(body) || typeof body !== 'object' ||
      Object.keys(body).length !== 1 || typeof body.Label !== 'string' ||
      !body.Label.trim() || body.Label.length > 120) throw new HttpError(400, 'Label must contain 1 to 120 characters.');
  return body.Label.trim();
}

export function createHandlers({ env, authenticate, database, bodyTimeoutMs = 10000 }) {
  const wrap = handler => async request => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof HttpError) return response(error.status, { error: error.message });
      if ([2601, 2627].includes(error.number)) return response(409, { error: 'An item with that label already exists.' });
      if ([229, 230, 51000].includes(error.number)) return response(403, { error: 'This identity is not permitted.' });
      if ([51001, 547, 8152, 2628].includes(error.number)) return response(400, { error: 'Invalid Label.' });
      return response(503, { error: 'The data service is unavailable. Retry later.' });
    }
  };
  return {
    config: wrap(async request => {
      if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
      if (new URL(request.url).search) throw new HttpError(400, 'Unsupported query.');
      return response(200, publicConfiguration(env));
    }),
    items: wrap(async request => {
      if (request.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
      const oid = await authenticate(request);
      return response(200, { value: await database().list(oid, labelFilter(request)) });
    }),
    createItem: wrap(async request => {
      if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
      const oid = await authenticate(request);
      if (new URL(request.url).search) throw new HttpError(400, 'Unsupported query.');
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(publicConfiguration(env).redirectUri).origin) throw new HttpError(403, 'Origin not allowed.');
      const label = await readLabel(request, bodyTimeoutMs);
      return response(200, { value: await database().create(oid, label) });
    }),
  };
}
