import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from '../src/process.js';
import { roleBasedProfileSchema, validateRoleBasedDab } from '../src/role-based-profile.js';
import { deploymentSchema, loadRuntimeConfig } from '../src/config.js';
import { userFromClaims } from '../src/auth.js';
import { createLocalApp, developmentUsers, localAppOrigin } from '../src/local-app.js';
import { startLocalApplication } from '../src/local-startup.js';
import { createGateway } from '../src/gateway.js';
import { roleBasedProcedureGrants } from '../src/role-based-profile.js';

const profile = { profile: 'role-based-data', requiredRole: 'AppUser', readinessPath: '/api/AppReady' } as const;
test('role-based-data uses generic requiredRole configuration', () => {
  const generic = { profile: 'role-based-data', requiredRole: 'AppUser', readinessPath: '/api/AppReady' };
  assert.deepEqual(roleBasedProfileSchema.parse(generic), generic);
  const runtime = loadRuntimeConfig({
    SQL_APPS_PROFILE: 'role-based-data', SQL_APPS_REQUIRED_ROLE: 'AppUser',
    SQL_APPS_READINESS_PATH: '/api/AppReady',
    AZURE_TENANT_ID: developmentUsers[0]!.id, API_CLIENT_ID: developmentUsers[0]!.id,
    DAB_URL: 'https://data.internal',
  });
  assert.equal('requiredRole' in runtime && runtime.requiredRole, 'AppUser');
});
test('role-based local commands require their profile before starting any services', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sql-apps-role-based-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cli = pathToFileURL(resolve('dist', 'src', 'local-cli.js')).href;
  for (const command of ['role-based-app', 'role-based-serve']) {
    await assert.rejects(run(process.execPath, ['--input-type=module', '-e',
      `process.chdir(${JSON.stringify(directory)}); process.argv = [process.execPath, 'local-cli', ${JSON.stringify(command)}]; await import(${JSON.stringify(cli)});`,
    ], { env: { NODE_ENV: 'test' } }), /role-based-data\.json/);
  }
});
test('role-based-data validates dedicated roles and procedure-only DAB permissions', () => {
  assert.deepEqual(roleBasedProfileSchema.parse(profile), profile);
  assert.throws(() => roleBasedProfileSchema.parse({ ...profile, requiredRole: 'authenticated' }));
  const dab = { entities: { AppReady: {
    source: { type: 'stored-procedure', object: 'dbo.AppReady' }, rest: { enabled: true, methods: ['get'] },
    permissions: [{ role: 'AppUser', actions: ['execute'] }],
  } } };
  validateRoleBasedDab(dab, profile);
  assert.throws(() => validateRoleBasedDab({ entities: {} }, profile));
  assert.throws(() => validateRoleBasedDab({ entities: { AppReady: { ...dab.entities.AppReady,
    permissions: [{ role: 'anonymous', actions: ['execute'] }] } } }, profile));
  assert.throws(() => validateRoleBasedDab({ entities: { AppReady: { ...dab.entities.AppReady,
    rest: true } } }, profile), /readiness/);
  assert.throws(() => validateRoleBasedDab({ ...dab, autoentities: { enabled: true } }, profile));
  assert.match(roleBasedProcedureGrants(dab, profile, 'authorized_user'),
    /GRANT EXECUTE ON OBJECT::\[dbo\]\.\[AppReady\].*;\nGRANT VIEW DEFINITION/);
});
test('authorized claims are retained only from validated delegated tokens', () => {
  const oid = developmentUsers[0]!.id;
  const tid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  assert.deepEqual(userFromClaims({ oid, tid, scp: 'access_as_user', roles: ['AppUser'] }, tid).roles, ['AppUser']);
  assert.throws(() => userFromClaims({ oid, tid, scp: 'access_as_user', roles: 'AppUser' }, tid));
});
test('authorized startup omits storage and Functions stages', async () => {
  const steps: string[] = [];
  await startLocalApplication('owned-sql', {
    command: async step => { steps.push(step); },
    services: async () => { throw new Error('Excluded service started'); },
    serve: async () => { steps.push('serve'); },
  }, () => {}, true);
  assert.deepEqual(steps, ['start-sql', 'init', 'data', 'serve']);
});
test('local authorized profile denies users without the required role and forwards only trusted authorized role', async t => {
  let forwarded = new Headers();
  const app = await createLocalApp(async (_url, options) => {
    forwarded = new Headers(options?.headers);
    return Response.json({ value: [] });
  }, undefined, profile);
  t.after(() => app.close());
  const headers = { host: new URL(localAppOrigin).host, origin: localAppOrigin };
  const session = async (user: string) => (await app.inject({
    method: 'POST', url: '/local/session', headers, payload: { user },
  })).json().token as string;
  const authorized = await session(developmentUsers[0]!.id);
  const unauthorized = await session(developmentUsers[1]!.id);
  const response = await app.inject({ url: '/api/AppReady',
    headers: { ...headers, authorization: `Bearer ${authorized}`, 'x-ms-api-role': 'admin' } });
  assert.equal(response.statusCode, 200);
  assert.equal(forwarded.get('x-ms-api-role'), 'AppUser');
  assert.equal(forwarded.get('authorization'), null);
  assert.equal((await app.inject({ url: '/api/AppReady',
    headers: { ...headers, authorization: `Bearer ${unauthorized}`, 'x-ms-api-role': 'AppUser' } })).statusCode, 403);
  assert.equal((await app.inject({ url: '/storage', headers: { ...headers, authorization: `Bearer ${authorized}` } })).statusCode, 404);
  assert.equal((await app.inject({ url: '/health/ready', headers })).statusCode, 200);
});
test('authorized deployment needs no Functions image but requires authorized role and readiness', () => {
  const base = { subscriptionId: developmentUsers[0]!.id, tenantId: developmentUsers[0]!.id,
    apiClientId: developmentUsers[0]!.id, sqlAdminObjectId: developmentUsers[0]!.id, sqlAdminName: 'operator',
    resourceGroup: 'data-app', location: 'eastus', environment: 'dev', name: 'data-app',
    gatewayImage: 'app.azurecr.io/gateway:1', dabImage: 'app.azurecr.io/data:1', registryServer: 'app.azurecr.io' };
  assert.equal(deploymentSchema.parse({ ...base, ...profile }).functionsImage, '');
  assert.throws(() => deploymentSchema.parse({ ...base, profile: 'role-based-data' }));
  assert.throws(() => deploymentSchema.parse(base));
});

test('cloud authorized gateway derives the DAB role from verified claims and has no file/job routes', async t => {
  const tid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const config = loadRuntimeConfig({
    SQL_APPS_PROFILE: 'role-based-data', SQL_APPS_REQUIRED_ROLE: profile.requiredRole,
    SQL_APPS_READINESS_PATH: profile.readinessPath, AZURE_TENANT_ID: tid, API_CLIENT_ID: tid, DAB_URL: 'https://data.internal',
  });
  let forwarded = new Headers();
  let calls = 0;
  const unavailable = async (): Promise<never> => { throw new Error('Excluded adapter used'); };
  const app = await createGateway(config, {
    verifyUser: async token => ({ oid: developmentUsers[0]!.id, tenantId: tid,
      roles: token === 'authorized' ? ['AppUser'] : [] }),
    files: { put: unavailable, get: unavailable, delete: unavailable }, functionToken: unavailable,
    fetch: async (_url, options) => { calls++; forwarded = new Headers(options?.headers); return Response.json({ value: [] }); },
  });
  t.after(() => app.close());
  assert.equal((await app.inject({ url: '/api/AppReady',
    headers: { authorization: 'Bearer authorized', 'x-ms-api-role': 'admin', 'x-ms-client-principal': 'forged' } })).statusCode, 200);
  assert.equal(forwarded.get('x-ms-api-role'), 'AppUser');
  assert.equal(forwarded.get('x-ms-client-principal'), null);
  assert.equal(forwarded.get('authorization'), 'Bearer authorized');
  assert.equal((await app.inject({ url: '/api/AppReady',
    headers: { authorization: 'Bearer unauthorized', 'x-ms-api-role': 'AppUser' } })).statusCode, 403);
  assert.equal(calls, 1);
  for (const url of ['/storage', '/jobs', '/diagnostics/traces']) {
    assert.equal((await app.inject({ url, headers: { authorization: 'Bearer authorized' } })).statusCode, 404);
  }
  const browser = (await app.inject('/auth/config')).json();
  assert.equal(browser.mode, 'entra');
  assert.deepEqual(browser.capabilities, { files: false, functions: false });
});

test('authorized local readiness exposes actual procedure failures', async t => {
  const app = await createLocalApp(async () => new Response('{}', { status: 403 }), undefined, profile);
  t.after(() => app.close());
  assert.equal((await app.inject({ url: '/health/ready', headers: { host: new URL(localAppOrigin).host } })).statusCode, 503);
});
