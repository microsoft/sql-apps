import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalApp, developmentUsers, localAppOrigin } from '../src/local-app.js';

const headers = { host: new URL(localAppOrigin).host, origin: localAppOrigin };

test('local app serves frontend and explicit SQL-only development capabilities', async t => {
  const app = await createLocalApp();
  t.after(() => app.close());
  assert.equal((await app.inject({ url: '/', headers })).statusCode, 200);
  const config = (await app.inject({ url: '/auth/config', headers })).json();
  assert.equal(config.mode, 'local');
  assert.deepEqual(config.capabilities, { files: false, functions: false });
  assert.deepEqual(config.users, developmentUsers);
  assert.equal('clientId' in config, false);
  assert.equal((await app.inject({ url: '/auth/me', headers })).statusCode, 401);
});

test('local sessions reject remote hosts, cross-origin requests, unknown users and fabricated bearer tokens', async t => {
  const app = await createLocalApp();
  t.after(() => app.close());
  for (const untrusted of [
    { host: 'evil.example', origin: localAppOrigin },
    { host: headers.host, origin: 'https://evil.example' },
    { host: headers.host },
  ]) {
    assert.equal((await app.inject({ url: '/local/session', method: 'POST', headers: untrusted,
      payload: { user: developmentUsers[0]!.id } })).statusCode, 403);
  }
  assert.equal((await app.inject({ url: '/local/session', method: 'POST', headers,
    payload: { user: 'invented-user' } })).statusCode, 400);
  assert.equal((await app.inject({ url: '/auth/me', headers: { ...headers, authorization: 'Bearer alice' } })).statusCode, 401);
  assert.equal((await app.inject({ url: '/api/Todo', method: 'POST', headers: { host: headers.host, origin: 'https://evil.example' },
    payload: { title: 'forbidden' } })).statusCode, 403);
});

test('local gateway derives SQL identity from issued sessions and strips untrusted identity headers', async t => {
  let upstreamHeaders = new Headers();
  const app = await createLocalApp(async (_url, options) => {
    upstreamHeaders = new Headers(options?.headers);
    return new Response('{"value":[]}');
  });
  t.after(() => app.close());
  const first = await app.inject({ url: '/local/session', method: 'POST', headers, payload: { user: developmentUsers[0]!.id } });
  assert.equal(first.statusCode, 200);
  const token: string = first.json().token;
  assert.equal(token.length, 43);
  assert.equal(first.headers['cache-control'], 'no-store');
  const authenticated = { ...headers, authorization: `Bearer ${token}`, 'x-ms-client-principal': 'forged', 'x-ms-api-role': 'admin' };
  assert.equal((await app.inject({ url: '/api/Todo', method: 'POST',
    headers: { ...authenticated, origin: 'https://evil.example' }, payload: { title: 'forbidden' } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/auth/me', headers: { ...authenticated, host: 'evil.example' } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/auth/me', headers: authenticated })).json().oid, developmentUsers[0]!.id);
  assert.equal((await app.inject({ url: '/api/Todo', headers: authenticated })).statusCode, 200);
  const principal = JSON.parse(Buffer.from(upstreamHeaders.get('x-ms-client-principal')!, 'base64').toString());
  assert.equal(principal.claims.find((claim: { typ: string }) => claim.typ === 'oid').val, developmentUsers[0]!.id);
  assert.equal(upstreamHeaders.get('authorization'), null);
  assert.equal(upstreamHeaders.get('x-ms-api-role'), null);
  const second = await app.inject({ url: '/local/session', method: 'POST', headers: authenticated, payload: { user: developmentUsers[1]!.id } });
  assert.equal(second.statusCode, 200);
  assert.equal((await app.inject({ url: '/auth/me', headers: authenticated })).statusCode, 401);
  const bob = { ...headers, authorization: `Bearer ${second.json().token}` };
  assert.equal((await app.inject({ url: '/auth/me', headers: bob })).json().oid, developmentUsers[1]!.id);
  assert.equal((await app.inject({ url: '/local/session', method: 'DELETE', headers: bob })).statusCode, 204);
  assert.equal((await app.inject({ url: '/auth/me', headers: bob })).statusCode, 401);
});

test('local unavailable services return explicit failures rather than simulated success', async t => {
  const app = await createLocalApp();
  t.after(() => app.close());
  const session = await app.inject({ url: '/local/session', method: 'POST', headers, payload: { user: developmentUsers[0]!.id } });
  const authenticated = { ...headers, authorization: `Bearer ${session.json().token}` };
  assert.equal((await app.inject({ url: '/storage/file', headers: authenticated })).statusCode, 503);
  assert.equal((await app.inject({ url: '/functions/echo', method: 'POST', headers: authenticated, payload: {} })).statusCode, 503);
});

test('local app cannot start in a production environment', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { await assert.rejects(createLocalApp(), /disabled in production/); }
  finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
