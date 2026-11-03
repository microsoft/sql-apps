import test from 'node:test';
import assert from 'node:assert/strict';
import { composeArguments, localEndpoints } from '../dist/scripts/config.js';
import { inspectDevelopment } from '../scripts/development.mjs';

const env = {
  COMPOSE_PROJECT_NAME: 'sqlapps-0123456789ab',
  APP_ORIGIN: 'http://127.0.0.1:5180', APP_PORT: '5180',
  DAB_URL: 'http://127.0.0.1:5081', DAB_PORT: '5081',
};
const running = [
  { Service: 'sql', State: 'running', Health: 'healthy' },
  { Service: 'dab', State: 'running', Health: '' },
];
const request = async () => ({ ok: true });
const startup = {
  ...env,
  AUTH_ISSUER: 'https://identity.example/tenant', AUTH_AUTHORITY: 'https://identity.example/tenant',
  AUTH_CLIENT_ID: 'spa', AUTH_SCOPE: 'openid api://app/read', AUTH_AUDIENCE: 'app', ACCEPT_EULA: 'Y',
  MSSQL_SA_PASSWORD: `Aa1!${'1'.repeat(48)}`, APP_SQL_PASSWORD: `Aa1!${'2'.repeat(48)}`,
  SQL_CONNECTION_STRING: 'Server=sql,1433;Database=appdb;User ID=app_api;Password=test-only;',
};

test('native SQL access is opt-in, loopback-only, and shares the lifecycle Compose selection', () => {
  assert.deepEqual(composeArguments(env), ['compose', '--project-name', env.COMPOSE_PROJECT_NAME, '-f', 'compose.yml']);
  assert.deepEqual(composeArguments({ ...env, SQL_PORT: '14330' }).slice(-2), ['-f', 'compose.database.yml']);
  for (const SQL_PORT of ['-1', '0', '65536', '1.5', '1433; command']) {
    assert.throws(() => composeArguments({ ...env, SQL_PORT }), /SQL_PORT/);
  }
  assert.throws(() => composeArguments({ ...env, COMPOSE_PROJECT_NAME: 'shared' }), /isolated/);
});

test('Compose selection preserves explicit fixture overlays before opt-in SQL publication', () => {
  const separator = process.platform === 'win32' ? ';' : ':';
  assert.deepEqual(composeArguments({
    ...env, COMPOSE_FILE: `compose.yml${separator}.local/test-compose.yml`, SQL_PORT: '14330',
  }), ['compose', '--project-name', env.COMPOSE_PROJECT_NAME,
    '-f', 'compose.yml', '-f', '.local/test-compose.yml', '-f', 'compose.database.yml']);
  assert.deepEqual(composeArguments({
    ...env, COMPOSE_FILE: 'compose.yml|.local/test-compose.yml', COMPOSE_PATH_SEPARATOR: '|',
  }), ['compose', '--project-name', env.COMPOSE_PROJECT_NAME, '-f', 'compose.yml', '-f', '.local/test-compose.yml']);
});

test('local inspection never probes remote origins or mismatched ports', () => {
  for (const values of [
    { APP_ORIGIN: 'https://remote.example' }, { DAB_URL: 'http://127.0.0.1:9999' },
    { APP_ORIGIN: 'http://user:password@127.0.0.1:5180' },
    { APP_ORIGIN: 'http://127.0.0.1:5180/path' }, { APP_PORT: 'NaN' },
  ]) assert.throws(() => localEndpoints({ ...env, ...values }));
});

test('Status and Ready verify actual engine/catalog even when all health endpoints respond', async () => {
  for (const command of ['ready', 'status']) {
    const calls = [];
    const result = await inspectDevelopment(command, env, {
      run: args => { calls.push(args); return args.includes('exec') ? '5:appdb' : JSON.stringify(running); },
      request,
    });
    await assert.rejects(inspectDevelopment(command, env, {
      run: args => args.includes('exec') ? '3:master' : JSON.stringify(running), request,
    }), /Unexpected SQL engine/);
    assert.match(result, /EngineEdition 5 and appdb confirmed/);
    assert.match(result, /Authenticated API\/browser acceptance remains unverified/);
    assert.ok(calls.every(args => !args.some(arg => ['up', 'stop', 'down', 'pull'].includes(arg))));
    assert.ok(calls[1].includes('appdb'));
  }
});

test('status accepts Compose JSON-lines and reports missing, unhealthy and unreachable components as failures', async () => {
  const result = await inspectDevelopment('status', env, {
    run: args => args.includes('exec') ? '5:appdb' : running.map(row => JSON.stringify(row)).join('\n'), request,
  });
  assert.match(result, /SQL: healthy/);
  for (const services of [[], [{ Service: 'sql', State: 'running', Health: 'unhealthy' }]]) {
    await assert.rejects(inspectDevelopment('status', env, {
      run: () => JSON.stringify(services), request,
    }), /readiness is incomplete/);
  }
  await assert.rejects(inspectDevelopment('status', env, {
    run: () => JSON.stringify(running),
    request: async () => { throw new TypeError('fetch failed'); },
  }), /web: not ready/);
});

test('preview checks the web response and returns only a verified local URL', async () => {
  assert.match(await inspectDevelopment('preview', env, { request }), /Open http:\/\/127.0.0.1:5180/);
  await assert.rejects(inspectDevelopment('preview', env, {
    request: async () => ({ ok: false }),
  }), /web app is not ready/);
});

test('connection guidance requires an active exact loopback mapping and never includes credentials', async () => {
  await assert.rejects(inspectDevelopment('connect', env), /SQL is private/);
  const values = { ...env, SQL_PORT: '14330', APP_SQL_PASSWORD: 'do-not-display' };
  await assert.rejects(inspectDevelopment('connect', values, {
    run: () => '0.0.0.0:14330',
  }), /binding is not active/);
  const result = await inspectDevelopment('connect', values, { run: () => '127.0.0.1:14330' });
  assert.match(result, /127.0.0.1,14330; database appdb; SQL login app_api/);
  assert.match(result, /native credential dialog/);
  assert.ok(!result.includes(values.APP_SQL_PASSWORD));
});

test('preflight performs only tool/image inspection and reports configuration blockers', async () => {
  const calls = [];
  await assert.rejects(inspectDevelopment('preflight', env, {
    run: args => { calls.push(args); return ''; },
  }), /Configure AUTH_ISSUER/);
  assert.ok(calls.some(args => args[0] === 'image' && args[1] === 'inspect'));
  assert.ok(calls.every(args => !args.includes('pull') && !args.includes('up')));
  assert.match(await inspectDevelopment('preflight', startup, {
    run: () => '',
  }), /No services started/);
});

test('preflight rejects a DAB hostname that local startup cannot use', async () => {
  await assert.rejects(inspectDevelopment('preflight', { ...startup, DAB_URL: 'http://localhost:5081' }, {
    run: () => '',
  }), /DAB_URL/);
});

test('preflight rejects missing or invalid local credentials without exposing their values', async () => {
  for (const [name, value] of [
    ['MSSQL_SA_PASSWORD', ''], ['APP_SQL_PASSWORD', ''], ['APP_SQL_PASSWORD', 'invalid-private-password'],
    ['SQL_CONNECTION_STRING', ''],
  ]) {
    await assert.rejects(inspectDevelopment('preflight', { ...startup, [name]: value }, {
      run: () => '',
    }), error => error.message.includes(name) && (!value || !error.message.includes(value)));
  }
});

test('preflight validates resolved Compose configuration without starting services', async () => {
  const calls = [];
  await assert.rejects(inspectDevelopment('preflight', startup, {
    run: args => {
      calls.push(args);
      if (args.includes('config')) throw new Error('Compose configuration is invalid.');
      return '';
    },
  }), /Compose configuration is invalid/);
  assert.ok(calls.every(args => !args.some(arg => ['up', 'stop', 'down', 'pull'].includes(arg))));
});
