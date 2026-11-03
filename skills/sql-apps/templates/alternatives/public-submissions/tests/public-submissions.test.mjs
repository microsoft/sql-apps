import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createAuthenticator } from '../packages/functions/dist/auth.js';
import { publicConfiguration } from '../packages/functions/dist/config.js';
import { createDatabase } from '../packages/functions/dist/database.js';
import { createHandlers } from '../packages/functions/dist/handlers.js';
import { accessProfile } from '../packages/functions/dist/profile.js';
import { localConfiguration } from '../scripts/config.ts';
import { functionsEnvironment } from '../scripts/functions-local.mjs';

const tenant = '11111111-1111-1111-1111-111111111111';
const oid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const env = { APP_ORIGIN: 'https://app.example', AUTH_ISSUER: `https://login.microsoftonline.com/${tenant}/v2.0`,
  AUTH_AUTHORITY: `https://login.microsoftonline.com/${tenant}/v2.0`, AUTH_AUDIENCE: 'api',
  AUTH_CLIENT_ID: 'spa', AUTH_SCOPE: 'openid api://api/access',
  SQL_SERVER: '127.0.0.1', SQL_DATABASE: 'appdb', SQL_USER: 'app_api', SQL_PASSWORD: 'test-only' };
const keys = await generateKeyPair('RS256');
const authenticate = createAuthenticator(env, createLocalJWKSet({ keys: [{
  ...await exportJWK(keys.publicKey), alg: 'RS256', kid: 'owner',
}] }));
const bearer = await new SignJWT({ tid: tenant, oid, scp: 'access' }).setProtectedHeader({ alg: 'RS256', kid: 'owner' })
  .setIssuer(env.AUTH_ISSUER).setAudience(env.AUTH_AUDIENCE).setIssuedAt().setExpirationTime('5m').sign(keys.privateKey);
const request = (path, options = {}) => new Request(`https://app.example/api/${path}`, options);
const post = (body, headers = {}, path = 'Submit') => request(path, {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body,
});
const handlers = (database, values = env, verify = authenticate) =>
  createHandlers({ env: values, access: 'public-submissions', authenticate: verify, database: () => database, bodyTimeoutMs: 20 });

test('compiled profile is explicit and public config never infers profile from missing auth', () => {
  assert.equal(accessProfile, 'public-submissions');
  assert.deepEqual(publicConfiguration({ APP_ORIGIN: env.APP_ORIGIN }, 'public-submissions'), {
    access: 'public-submissions', redirectUri: `${env.APP_ORIGIN}/`, ownerAuth: null,
  });

  test('public local lifecycle maps restricted SQL and accepts absent identity without weakening partial-config checks', () => {
    const local = { APP_ORIGIN: 'http://127.0.0.1:5180', SQL_PORT: '14330', ACCEPT_EULA: 'Y',
      APP_SQL_PASSWORD: `Aa1!${'1'.repeat(48)}`, MSSQL_SA_PASSWORD: `Aa1!${'2'.repeat(48)}`,
      COMPOSE_PROJECT_NAME: 'sqlapps-0123456789ab' };
    assert.equal(localConfiguration(local, 'functions').publicConfig.ownerAuth, null);
    const mapped = functionsEnvironment(local);
    assert.equal(mapped.SQL_USER, 'app_api');
    assert.equal(mapped.SQL_SERVER, '127.0.0.1');
    assert.equal(mapped.AUTH_CLIENT_ID, undefined);
    assert.throws(() => functionsEnvironment({ ...local, AUTH_CLIENT_ID: 'partial' }));
  });
  assert.throws(() => publicConfiguration({ APP_ORIGIN: env.APP_ORIGIN }));
  for (const extra of [{ AUTH_CLIENT_ID: 'partial' }, { ...env, AUTH_ISSUER: 'https://login.microsoftonline.com/common/v2.0' },
    { ...env, AUTH_AUTHORITY: 'https://identity.example' }]) {
    assert.throws(() => publicConfiguration({ APP_ORIGIN: env.APP_ORIGIN, ...extra }, 'public-submissions'));
  }
  assert.equal(publicConfiguration(env, 'public-submissions').ownerAuth.clientId, 'spa');
});

test('anonymous submit has a generic acknowledgement, no identity dependency and no read or owner assignment', async () => {
  const calls = [];
  const h = handlers({ submit: async label => { calls.push(label); return [{ secret: 'must-not-return' }]; } },
    { APP_ORIGIN: env.APP_ORIGIN }, async () => { throw new Error('Public submission must not authenticate.'); });
  const result = await h.submit(post('{"Label":" valid "}'));
  assert.equal(result.status, 202);
  assert.deepEqual(result.jsonBody, { accepted: true });
  assert.deepEqual(calls, ['valid']);
  assert.equal((await h.items(request('Items'))).status, 404);
  assert.equal((await h.createItem(post('{"Label":"x"}', {}, 'CreateItem'))).status, 404);
  for (const [body, headers, path, status] of [
    ['{"Label":"x","OwnerId":"x"}', {}, 'Submit', 400],
    ['{"Label":"x","TenantId":"x"}', {}, 'Submit', 400],
    ['{"Label":""}', {}, 'Submit', 400], ['[]', {}, 'Submit', 400],
    [JSON.stringify({ Label: 'a'.repeat(121) }), {}, 'Submit', 400],
    ['{"Label":"x"}', {}, 'Submit?OwnerId=x', 400],
    ['{"Label":"x"}', { origin: 'https://evil.example' }, 'Submit', 403],
    ['{"Label":"x"}', { 'content-type': 'text/plain' }, 'Submit', 415],
    [' '.repeat(16385), {}, 'Submit', 413],
  ]) assert.equal((await h.submit(post(body, headers, path))).status, status);
  assert.deepEqual(calls, ['valid']);
});

test('private inbox rejects anonymous and forged tokens; valid but unenrolled identity is denied by SQL', async () => {
  let calls = 0;
  const h = handlers({ submissions: async (actualTenant, actualOid) => {
    calls++; assert.equal(actualTenant, tenant); assert.equal(actualOid, oid);
    throw Object.assign(new Error('not enrolled'), { number: 51000 });
  } });
  for (const headers of [{}, { authorization: 'Bearer forged', 'x-ms-client-principal': 'forged' }]) {
    assert.equal((await h.submissions(request('Submissions', { headers }))).status, 401);
  }
  assert.equal(calls, 0);
  assert.equal((await h.submissions(request('Submissions', { headers: { authorization: `Bearer ${bearer}` } }))).status, 403);
  assert.equal(calls, 1);
  const noAuth = handlers({}, { APP_ORIGIN: env.APP_ORIGIN });
  assert.equal((await noAuth.submissions(request('Submissions'))).status, 503);
});

test('SQL budget failures are 429 and lock/service failures are 503 without leaking SQL details', async t => {
  t.mock.method(console, 'error', () => {});
  for (const [number, status] of [[51029, 429], [1222, 503], [1205, 503], [51030, 503]]) {
    const h = handlers({ submit: async () => { throw Object.assign(new Error('private SQL details'), { number }); } });
    const result = await h.submit(post('{"Label":"valid"}'));
    assert.equal(result.status, status);
    assert.ok(!JSON.stringify(result).includes('private SQL details'));
  }
});

test('public submit rejects wrong methods, declared oversize bodies and stalled streams without SQL', async () => {
  const h = handlers({ submit: async () => { throw new Error('Rejected input must not reach SQL.'); } });
  assert.equal((await h.submit(request('Submit'))).status, 405);
  assert.equal((await h.submit(post('{"Label":"x"}', { 'content-length': '16385' }))).status, 413);
  assert.equal((await h.submit(post('{"Label":"x"}', { 'content-length': 'invalid' }))).status, 413);
  const stalled = new ReadableStream({ start() {} });
  const result = await h.submit({ method: 'POST', url: `${env.APP_ORIGIN}/api/Submit`,
    headers: new Headers({ 'content-type': 'application/json' }), body: stalled });
  assert.equal(result.status, 408);
});

test('public database invokes only parameter-bound submission procedures and does not manufacture session identity', async () => {
  const calls = [];
  const connection = { closed: false, on() {}, close() { this.closed = true; } };
  const database = createDatabase(env, {
    connect: async () => connection,
    run: async (_connection, sql, parameters = []) => { calls.push([sql, parameters]); return []; },
  });
  try {
    await database.submit('Label');
    await database.submissions(tenant, oid);
    assert.equal(calls.length, 2);
    assert.match(calls[0][0], /^EXEC api.Submit @Label=@Label/);
    assert.deepEqual(calls[0][1].map(([name, , value]) => [name, value]), [['Label', 'Label']]);
    assert.match(calls[1][0], /^EXEC api.Submissions @TenantId=@TenantId, @OwnerId=@OwnerId/);
    assert.deepEqual(calls[1][1].map(([name, , value]) => [name, value]), [['TenantId', tenant], ['OwnerId', oid]]);
    await assert.rejects(database.submissions('not-guid', oid), /identity/i);
    await assert.rejects(database.submissions(tenant, '00000000-0000-0000-0000-000000000000'), /identity/i);
  } finally { await database.close(); }
});
