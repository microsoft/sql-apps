import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { composeArguments, localConfiguration, localEndpoints } from '../skills/sql-apps/templates/starter/scripts/config.ts';
import { installAlternative } from '../skills/sql-apps/templates/alternatives/install.mjs';
import { inspectDevelopment } from '../skills/sql-apps/templates/starter/scripts/development.mjs';
import { copyStarter } from './fixtures/starter-copy.mjs';

const env = {
  COMPOSE_PROJECT_NAME: 'sqlapps-0123456789ab', SQL_PORT: '14330',
  APP_ORIGIN: 'http://127.0.0.1:5180', APP_PORT: '5180',
  FUNCTIONS_PORT: '7071', ACCEPT_EULA: 'Y',
  AUTH_ISSUER: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
  AUTH_AUTHORITY: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
  AUTH_CLIENT_ID: 'test-spa', AUTH_AUDIENCE: 'test-api', AUTH_SCOPE: 'openid api://test-api/access',
  MSSQL_SA_PASSWORD: `Aa1!${'1'.repeat(48)}`, APP_SQL_PASSWORD: `Aa1!${'2'.repeat(48)}`,
};

test('Functions local configuration needs no DAB URL or connection string', () => {
  assert.doesNotThrow(() => localConfiguration(env, 'functions'));
  assert.equal(localEndpoints(env, 'functions').api, 'http://127.0.0.1:7071');
  assert.deepEqual(composeArguments(env, 'functions'), [
    'compose', '--project-name', 'sqlapps-0123456789ab',
    '-f', 'compose.functions.yml', '-f', 'compose.database.yml',
  ]);
});

test('Functions requires an explicit loopback SQL binding and valid distinct API port', () => {
  for (const values of [
    { SQL_PORT: '' }, { FUNCTIONS_PORT: '0' }, { FUNCTIONS_PORT: '5180' },
    { SQL_PORT: '7071' }, { SQL_PORT: '07071' },
    { SQL_PORT: '80', APP_PORT: '80', APP_ORIGIN: 'http://127.0.0.1' },
    { FUNCTIONS_URL: 'http://localhost:7071' },
    { FUNCTIONS_URL: 'http://remote.example:7071' }, { FUNCTIONS_URL: 'http://127.0.0.1:9999' },
  ]) {
    assert.throws(() => localConfiguration({ ...env, ...values }, 'functions'), /SQL_PORT|FUNCTIONS|distinct/);
  }
});

test('DAB still requires its explicit upstream configuration', () => {
  assert.throws(() => localConfiguration({
    ...env, DAB_URL: '', SQL_CONNECTION_STRING: 'local-test-connection',
  }, 'dab'), /DAB_URL/);
});

test('Functions Status and Ready inspect only SQL and the selected API, not DAB', async () => {
  for (const command of ['status', 'ready']) {
    const calls = [];
    const run = args => {
      calls.push(args);
      return args.includes('exec') ? '5:appdb' :
        JSON.stringify([{ Service: 'sql', State: 'running', Health: 'healthy' }]);
    };
    const request = async url => {
      assert.ok(url === 'http://127.0.0.1:7071/api/config' || url === 'http://127.0.0.1:5180/config.json');
      return { ok: true, json: async () => ({ clientId: env.AUTH_CLIENT_ID, redirectUri: `${env.APP_ORIGIN}/` }) };
    };
    const result = await inspectDevelopment(command, env, { api: 'functions', run, request });
    assert.match(result, /Functions: responding/);
    assert.match(result, /EngineEdition 5 and appdb confirmed/);
    assert.ok(calls.every(args => !args.includes('compose.yml') && !args.includes('dab')));
    await assert.rejects(inspectDevelopment(command, env, {
      api: 'functions', run, request: async () => ({ ok: true, json: async () => ({ wrong: true }) }),
    }), /configuration|not ready/);
  }
});

test('Functions Compose selects only SQL and reuses the pinned isolated database', async t => {
  const app = await mkdtemp(join(tmpdir(), 'sqlapps-functions-compose-'));
  t.after(() => rm(app, { recursive: true, force: true }));
  await copyStarter(app);
  await installAlternative('static-web-apps', app);
  const sample = parseEnv(await readFile(join(app, '.env.example'), 'utf8'));
  assert.equal(sample.FUNCTIONS_PORT, '7071');
  assert.equal(sample.SQL_PORT, '14330');
  assert.equal(sample.DAB_URL, undefined);
  const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  for (const command of ['prelocal:start', 'preacceptance']) {
    assert.equal(manifest.scripts[command], undefined);
  }
  const result = spawnSync('docker', [...composeArguments(env, 'functions'), 'config', '--format', 'json'], {
    cwd: app, env: { ...process.env, ...env, COMPOSE_FILE: '' }, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(config.services), ['sql']);
  const sql = config.services.sql;
  assert.match(sql.image, /azure-sql\/db-dev@sha256:/);
  assert.equal(sql.pull_policy, 'never');
  assert.deepEqual(sql.ports.map(port => [port.host_ip, port.published, port.target]),
    [['127.0.0.1', '14330', 1433]]);
  assert.ok(sql.volumes.some(volume => volume.type === 'volume' && volume.source === 'sql-data'));
  const check = spawnSync(process.execPath, [join(app, 'scripts/check-config.mjs')], { cwd: app, encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /Functions\/SQL/);
});
