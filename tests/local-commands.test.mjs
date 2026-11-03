import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { parseEnv } from 'node:util';
import { installAlternative } from '../skills/sql-apps/templates/alternatives/install.mjs';

for (const api of ['dab', 'functions']) {
test(`${api} operational commands still work when compilation fails and no build output exists`, async t => {
  const app = await mkdtemp(join(tmpdir(), 'sqlapps-operations-'));
  t.after(() => rm(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  await cp(new URL('../skills/sql-apps/templates/starter/', import.meta.url), app, { recursive: true });
  if (api === 'functions') await installAlternative('static-web-apps', app);
  const manifest = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  manifest.scripts['build:backend'] = 'node -e "process.exit(23)"';
  await writeFile(join(app, 'package.json'), JSON.stringify(manifest));
  await writeFile(join(app, '.env'), '# Isolated operational-command fixture.\n');
  const env = {
    ...process.env,
    NODE_OPTIONS: `--import=${pathToFileURL(join(app, 'tests/fixtures/operational-tools.mjs')).href}`,
    COMPOSE_PROJECT_NAME: 'sqlapps-0123456789ab', COMPOSE_FILE: '', SQL_PORT: '14330',
    APP_ORIGIN: 'http://127.0.0.1:5180', APP_PORT: '5180',
    DAB_URL: 'http://127.0.0.1:5081', DAB_PORT: '5081', ACCEPT_EULA: 'Y',
    MSSQL_SA_PASSWORD: `Aa1!${'1'.repeat(48)}`, APP_SQL_PASSWORD: `Aa1!${'2'.repeat(48)}`,
    SQL_CONNECTION_STRING: 'Server=sql;Database=appdb;User ID=app_api;Password=test-only;',
    AUTH_ISSUER: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
    AUTH_AUTHORITY: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
    AUTH_CLIENT_ID: 'test-client', AUTH_AUDIENCE: 'test-api', AUTH_SCOPE: 'openid api-access',
  };
  const run = command => spawnSync(
    process.platform === 'win32' ? process.env.ComSpec : 'npm',
    process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${command}`] : ['run', command],
    { cwd: app, env, encoding: 'utf8', timeout: 15_000 },
  );
  assert.equal(run('build:backend').status, 23, 'The fixture compiler must fail.');
  for (const command of ['start', 'local:start']) {
    const result = run(command);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stderr, /npm run build/);
    assert.ok(!result.stdout.includes('Owned containers stopped'));
  }
  for (const [command, expected] of [
    ['local:stop', /Owned containers stopped/],
    ['local:init', /Generated project-owned local credentials/],
    ['local:preflight', /PREFLIGHT PASSED/],
    ['local:status', /SQL: healthy/],
    ['local:preview', /Open http:\/\/127\.0\.0\.1:5180/],
    ['local:connect', /127\.0\.0\.1,14330/],
    ['local:ready', /EngineEdition 5 and appdb confirmed/],
  ]) {
    await t.test(command, async () => {
      const result = run(command);
      assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
      assert.match(result.stdout, expected);
      if (command === 'local:init') {
        const persisted = await readFile(join(app, '.env'), 'utf8');
        assert.equal(Boolean(parseEnv(persisted).SQL_CONNECTION_STRING), api === 'dab');
        const repeated = run('local:init');
        assert.equal(repeated.status, 0, repeated.stderr);
        assert.equal(await readFile(join(app, '.env'), 'utf8'), persisted, 'Repeated Init must preserve the selected API credentials.');
      }
    });
  }
});
}
