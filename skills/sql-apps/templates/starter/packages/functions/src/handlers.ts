import type { HttpRequest } from '@azure/functions';
import { HttpError } from './auth.js';
import { publicConfiguration } from './config.js';

type HttpResponse = {
  status: number;
  jsonBody: unknown;
  headers: Record<string, string>;
};

type Database = {
  list: (oid: string, label?: string) => Promise<unknown>;
  create: (oid: string, label: string) => Promise<unknown>;
};

type HandlerOptions = {
  env: NodeJS.ProcessEnv;
  authenticate: (request: HttpRequest) => Promise<string>;
  database: () => Database;
  bodyTimeoutMs?: number;
};

function response(status: number, jsonBody: unknown): HttpResponse {
  return {
    status, jsonBody, headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
    },
  };
}

function labelFilter(request: HttpRequest): string | undefined {
  const query = new URL(request.url).searchParams;
  for (const key of query.keys()) {
    if (!['$orderby', '$filter'].includes(key) || query.getAll(key).length !== 1) {
      throw new HttpError(400, 'Unsupported query.');
    }
  }
  if (query.has('$orderby') && query.get('$orderby') !== 'CreatedAt desc') throw new HttpError(400, 'Unsupported ordering.');
  if (!query.has('$filter')) return undefined;
  const match = /^Label eq '((?:[^']|'')*)'$/.exec(query.get('$filter') ?? '');
  if (!match) throw new HttpError(400, 'Unsupported filter.');
  const label = match[1].replace(/''/g, "'");
  if (!label.length || label.length > 120) throw new HttpError(400, 'Invalid Label filter.');
  return label;
}

async function readLabel(request: HttpRequest, timeoutMs: number): Promise<string> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    throw new HttpError(415, 'Content-Type must be application/json.');
  }
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 16384)) throw new HttpError(413, 'Request body exceeds 16 KB.');
  let size = 0;
  const chunks: Buffer[] = [];
  if (request.body) {
    const reader = request.body.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
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
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      reader.releaseLock();
    }
  }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new HttpError(400, 'Invalid JSON body.'); }
  if (!body || Array.isArray(body) || typeof body !== 'object' ||
      Object.keys(body).length !== 1 || !('Label' in body) || typeof body.Label !== 'string' ||
      !body.Label.trim() || body.Label.length > 120) throw new HttpError(400, 'Label must contain 1 to 120 characters.');
  return body.Label.trim();
}

function databaseErrorNumber(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('number' in error)) return undefined;
  return typeof error.number === 'number' ? error.number : undefined;
}

export function createHandlers({ env, authenticate, database, bodyTimeoutMs = 10000 }: HandlerOptions) {
  const wrap = (handler: (request: HttpRequest) => Promise<HttpResponse>) => async (request: HttpRequest): Promise<HttpResponse> => {
    try { return await handler(request); }
    catch (error: unknown) {
      if (error instanceof HttpError) return response(error.status, { error: error.message });
      const number = databaseErrorNumber(error);
      if ([2601, 2627].includes(number ?? 0)) return response(409, { error: 'An item with that label already exists.' });
      if ([229, 230, 51000].includes(number ?? 0)) return response(403, { error: 'This identity is not permitted.' });
      if ([51001, 547, 8152, 2628].includes(number ?? 0)) return response(400, { error: 'Invalid Label.' });
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
