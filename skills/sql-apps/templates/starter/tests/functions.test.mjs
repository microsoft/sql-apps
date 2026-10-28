import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createAuthenticator } from '../packages/functions/src/auth.mjs';
import { createDatabase, execute, sqlConfiguration } from '../packages/functions/src/database.mjs';
import { createHandlers } from '../packages/functions/src/handlers.mjs';
import { publicConfiguration } from '../packages/functions/src/config.mjs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';

const { TYPES } = createRequire(new URL('../packages/functions/package.json', import.meta.url))('tedious');

const tenant = '11111111-1111-1111-1111-111111111111';
const ownerA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ownerB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const env = {
  APP_ORIGIN: 'https://app.example', AUTH_AUTHORITY: `https://login.microsoftonline.com/${tenant}/v2.0`,
  AUTH_ISSUER: `https://login.microsoftonline.com/${tenant}/v2.0`, AUTH_AUDIENCE: 'api-client',
  AUTH_CLIENT_ID: 'spa-client', AUTH_SCOPE: 'openid profile api://api-client/access_as_user',
  SQL_SERVER: 'sql.example.database.windows.net', SQL_DATABASE: 'appdb', SQL_TENANT_ID: tenant,
  SQL_CLIENT_ID: ownerA, SQL_CLIENT_SECRET: 'not-a-real-secret',
};
const keys = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(keys.publicKey), kid: 'test', alg: 'RS256', use: 'sig' };
const authenticate = createAuthenticator(env, createLocalJWKSet({ keys: [jwk] }));
async function token(overrides = {}, signingKey = keys.privateKey) {
  return new SignJWT({ tid: tenant, oid: ownerA, scp: 'access_as_user', ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(env.AUTH_ISSUER)
    .setAudience(env.AUTH_AUDIENCE).setIssuedAt().setExpirationTime('5m').sign(signingKey);
}
const request = (url = '/api/Items', bearer, options = {}) => new Request(`https://app.example${url}`, {
  ...options, headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...options.headers },
});
const handlers = database => createHandlers({ env, authenticate, database: () => database });

test('JWT signature, issuer, audience, tenant, expiration and delegated identity are validated', async () => {
  assert.equal(await authenticate(request(undefined, await token())), ownerA);
  for (const claims of [{ tid: ownerB }, { iss: `https://login.microsoftonline.com/${ownerB}/v2.0` },
    { aud: 'wrong' }, { exp: 1 }]) {
    // Override registered claims after defaults for their negative tests.
    const jwt = await new SignJWT({ tid: tenant, oid: ownerA, scp: 'access_as_user',
      iss: env.AUTH_ISSUER, aud: env.AUTH_AUDIENCE, iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60, ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(keys.privateKey);
    await assert.rejects(authenticate(request(undefined, jwt)), { status: 401 });
  }
  const otherKeys = await generateKeyPair('RS256');
  await assert.rejects(authenticate(request(undefined, await token({}, otherKeys.privateKey))), { status: 401 });
  for (const claims of [{ oid: undefined }, { oid: 'not-guid' }, { scp: undefined }, { scp: 'other' }]) {
    await assert.rejects(authenticate(request(undefined, await token(claims))), { status: 403 });
  }
  for (const bearer of [undefined, 'not-a-jwt']) {
    assert.equal((await handlers({}).items(request(undefined, bearer, {
      headers: { cookie: 'StaticWebAppsAuthCookie=forged', 'x-ms-client-principal': 'forged' },
    }))).status, 401);
  }
  assert.throws(() => createAuthenticator({ ...env, AUTH_ISSUER: 'https://login.microsoftonline.com/common/v2.0' }));
});

test('routes preserve the contract, exact escaped Label filters, ordering and public config', async () => {
  const calls = [];
  const data = [{ Id: ownerA, Label: "O'Brien", CreatedAt: '2026-01-01T00:00:00Z' }];
  const h = handlers({ list: async (...args) => { calls.push(args); return data; } });
  const bearer = await token();
  const query = new URLSearchParams({ $filter: "Label eq 'O''Brien'", $orderby: 'CreatedAt desc' });
  const result = await h.items(request(`/api/Items?${query}`, bearer));
  assert.equal(result.status, 200);
  assert.deepEqual(result.jsonBody, { value: data });
  assert.deepEqual(calls, [[ownerA, "O'Brien"]]);
  for (const query of ['$top=1', '$orderby=Label', '$filter=OwnerId%20eq%20x', '$filter=x&$filter=y']) {
    assert.equal((await h.items(request(`/api/Items?${query}`, bearer))).status, 400);
  }
  const config = await h.config(request('/api/config'));
  assert.deepEqual(config.jsonBody, publicConfiguration(env));
  assert.equal(config.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(config).includes(env.SQL_CLIENT_SECRET), false);
  assert.equal((await h.items(request(undefined, bearer, { method: 'DELETE' }))).status, 405);
});

test('create validates JSON, size, origin and errors without retrying mutations', async () => {
  let count = 0;
  const bearer = await token();
  let failure;
  const h = handlers({ create: async (oid, label) => {
    count++;
    assert.equal(oid, ownerA);
    assert.equal(label, 'valid');
    if (failure) throw failure;
    return [{ Id: ownerA, Label: label, CreatedAt: '2026-01-01' }];
  } });
  const post = (body, headers = {}) => request('/api/CreateItem', bearer, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body,
  });
  assert.equal((await h.createItem(post('{"Label":" valid "}'))).status, 200);
  assert.equal((await h.createItem(post('{"Label":"valid"}' + ' '.repeat(16384 - 17)))).status, 200);
  for (const body of ['no json', '{}', '[]', '{"Label":null}', '{"Label":" "}', '{"Label":"valid","OwnerId":"x"}',
    JSON.stringify({ Label: 'a'.repeat(121) })]) {
    assert.equal((await h.createItem(post(body))).status, 400);
  }
  assert.equal((await h.createItem(post(' '.repeat(16385)))).status, 413);
  assert.equal((await h.createItem(post('{"Label":"valid"}', { 'content-length': '16385' }))).status, 413);
  assert.equal((await h.createItem(post('{"Label":"valid"}', { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await h.createItem(post('{"Label":"valid"}', { 'content-type': 'text/plain' }))).status, 415);
  assert.equal(count, 2);
  for (const [number, status] of [[2627, 409], [2601, 409], [229, 403], [51001, 400], [40613, 503]]) {
    failure = Object.assign(new Error('secret database details'), { number });
    const result = await h.createItem(post('{"Label":"valid"}'));
    assert.equal(result.status, status);
    assert.equal(JSON.stringify(result).includes('secret database details'), false);
  }
  assert.equal(count, 7);
});

test('cloud SQL uses explicit service principal and verified encryption; passwords only on loopback', () => {
  const config = sqlConfiguration(env);
  assert.equal(config.authentication.type, 'azure-active-directory-service-principal-secret');
  assert.equal(config.authentication.options.clientId, env.SQL_CLIENT_ID);
  assert.equal(config.options.encrypt, true);
  assert.equal(config.options.trustServerCertificate, false);
  assert.equal(config.options.maxRetriesOnTransientErrors, 0);
  assert.throws(() => sqlConfiguration({ ...env, SQL_USER: 'app_api', SQL_PASSWORD: 'local-secret' }));
  const local = { SQL_SERVER: 'localhost', SQL_DATABASE: 'appdb', SQL_USER: 'app_api', SQL_PASSWORD: 'local-secret' };
  assert.equal(sqlConfiguration(local).authentication.type, 'default');
  assert.throws(() => sqlConfiguration({ ...local, WEBSITE_HOSTNAME: 'cloud' }));
  assert.throws(() => sqlConfiguration({ ...local, SQL_USER: 'sa' }));
});

test('slow or oversized streamed bodies cancel promptly without acquiring a database connection', async () => {
  let acquisitions = 0;
  const h = createHandlers({ env, authenticate, database: () => { acquisitions++; return {}; }, bodyTimeoutMs: 20 });
  const bearer = await token();
  for (const [body, expected] of [
    [new ReadableStream({ pull() {}, cancel() { return new Promise(() => {}); } }), 408],
    [new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(16385)); },
      cancel() { return new Promise(() => {}); },
    }), 413],
  ]) {
    const r = request('/api/CreateItem', bearer, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half',
    });
    const result = await h.createItem(r);
    assert.equal(result.status, expected);
  }
  assert.equal(acquisitions, 0);
});

test('transaction leases isolate owners, use parameters and clear before release', async () => {
  let next = 0;
  const connections = [];
  const events = [];
  const db = createDatabase(env, {
    connect: async () => {
      const connection = { id: ++next, closed: false, owner: null, close() { this.closed = true; } };
      connections.push(connection);
      return connection;
    },
    run: async (connection, text, parameters) => {
      events.push({ id: connection.id, text, parameters });
      if (text.startsWith('BEGIN')) {
        assert.equal(connection.owner, null);
        connection.owner = parameters[0][2];
      } else if (text.includes('COMMIT')) connection.owner = null;
      else {
        await new Promise(resolve => setTimeout(resolve, 2));
        return [{ Id: connection.owner, Label: parameters?.[0]?.[2], CreatedAt: '2026-01-01' }];
      }
      return [];
    },
  });
  try {
    const labels = ["'; DELETE dbo.Items;--", 'other'];
    const results = await Promise.all([db.list(ownerA, labels[0]), db.create(ownerB, labels[1])]);
    assert.equal(results[0][0].Id, ownerA);
    assert.equal(results[1][0].Id, ownerB);
    assert.ok(connections.length <= 4);
    assert.ok(connections.every(c => c.owner === null));
    const queries = events.filter(e => !e.text.startsWith('BEGIN') && !e.text.includes('COMMIT'));
    assert.ok(queries[0].text.includes('TOP (100)'));
    assert.ok(queries[0].text.includes('ORDER BY CreatedAt DESC, Id DESC'));
    for (const event of queries) assert.equal(event.text.includes(event.parameters[0][2]), false);
    assert.equal(queries[0].parameters[0][0], 'Label');
    const reused = await db.list(ownerB);
    assert.equal(reused[0].Id, ownerB);
    assert.ok(connections.every(c => c.owner === null));
  } finally { await db.close(); }
  assert.ok(connections.every(c => c.closed));
});

test('failed initialization recovers; failed operation or context reset destroys the physical connection', async () => {
  let attempts = 0;
  let failure = 'query';
  const connections = [];
  const db = createDatabase(env, {
    connect: async () => {
      if (++attempts === 1) throw new Error('unavailable');
      const c = { closed: false, close() { this.closed = true; } };
      connections.push(c);
      return c;
    },
    run: async (_c, text) => {
      if ((failure === 'query' && text.startsWith('EXEC api.')) || (failure === 'reset' && text.includes('COMMIT'))) {
        throw new Error('failure');
      }
      return [];
    },
  });
  try {
    await assert.rejects(db.create(ownerA, 'a'), /unavailable/);
    await assert.rejects(db.create(ownerA, 'a'), /failure/);
    assert.equal(connections[0].closed, true);
    failure = 'reset';
    await assert.rejects(db.create(ownerB, 'b'), /failure/);
    assert.equal(connections[1].closed, true);
    failure = undefined;
    assert.deepEqual(await db.create(ownerB, 'b'), []);
    assert.equal(connections.length, 3);
  } finally { await db.close(); }
});

test('driver binds parameters rather than interpolating SQL', async () => {
  let statement;
  const rows = await execute({
    execSql(request) {
      statement = request;
      request.callback(null, 1, [[{ metadata: { colName: 'Label' }, value: "O'Brien" }]]);
    },
  }, 'SELECT @Label AS Label;', [['Label', TYPES.NVarChar, "O'Brien"]]);
  assert.equal(statement.sqlTextOrProcedure, 'SELECT @Label AS Label;');
  assert.equal(statement.parameters[0].value, "O'Brien");
  assert.deepEqual(rows, [{ Label: "O'Brien" }]);
});

test('rollback, connection error and reset failure discard leases without hanging pool release', { timeout: 5000 }, async () => {
  for (const failure of ['rollback', 'connection', 'reset']) {
    const connections = [];
    const db = createDatabase(env, {
      connect: async () => {
        const c = Object.assign(new EventEmitter(), {
          closed: false, owner: null, rolledBack: false, closeCount: 0,
          close() {
            this.closeCount++;
            this.closed = true;
            this.rolledBack = true;
          },
        });
        connections.push(c);
        return c;
      },
      run: async (c, text, parameters) => {
        if (text.startsWith('BEGIN')) {
          assert.equal(c.owner, null);
          c.owner = parameters[0][2];
        } else if (text.includes('COMMIT')) {
          if (connections.length === 1 && failure === 'reset') throw new Error('reset failed');
          c.owner = null;
        } else {
          if (connections.length === 1) {
            if (failure === 'rollback') { c.rolledBack = true; throw new Error('procedure aborted transaction'); }
            if (failure === 'connection') {
              const error = new Error('socket error');
              c.emit('error', error);
              throw error;
            }
          }
          return [{ Id: c.owner }];
        }
        return [];
      },
    });
    try {
      await assert.rejects(db.create(ownerA, 'a'));
      assert.equal(connections[0].closed, true);
      assert.equal(connections[0].owner, ownerA, 'rollback does not clear session context; socket must be discarded');
      assert.equal(connections[0].rolledBack, true);
      const result = await db.list(ownerB);
      assert.equal(result[0].Id, ownerB);
      assert.equal(connections.length, 2, 'invalid connection is destroyed, never reused');
      assert.equal(connections[1].owner, null, 'successful connection clears context before release');
    } finally { await db.close(); }
    assert.ok(connections.every(c => c.closed));
  }
});

test('Node v4 registers only the intended anonymous HTTP routes under /api', async () => {
  const { registerRoutes } = await import('../packages/functions/src/index.mjs');
  const registered = [];
  const routes = { items() {}, createItem() {}, config() {} };
  registerRoutes({ http: (name, options) => registered.push({ name, ...options }) }, routes);
  assert.deepEqual(registered.map(r => [r.route, r.methods, r.authLevel]), [
    ['Items', ['GET'], 'anonymous'], ['CreateItem', ['POST'], 'anonymous'], ['config', ['GET'], 'anonymous'],
  ]);
  assert.equal(registered[0].handler, routes.items);
  const host = JSON.parse(await readFile(new URL('../packages/functions/host.json', import.meta.url)));
  assert.equal(host.extensions.http.routePrefix, 'api');
  const pkg = JSON.parse(await readFile(new URL('../packages/functions/package.json', import.meta.url)));
  assert.equal(pkg.main, 'src/index.mjs');
});
