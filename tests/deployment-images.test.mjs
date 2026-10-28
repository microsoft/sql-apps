import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const starter = fileURLToPath(new URL('../skills/sql-apps/templates/starter/', import.meta.url));

async function runImages(t, scenario) {
  const argv = process.argv;
  const env = { ...process.env };
  const read = fs.readFileSync;
  process.argv = [process.execPath, 'test-deployment-images.mjs', starter];
  process.env.ACCEPTANCE_TOKEN_A = 'synthetic-a';
  process.env.ACCEPTANCE_TOKEN_B = 'synthetic-b';
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  let label, origin;
  t.mock.method(fs, 'readFileSync', (path, ...args) => String(path).endsWith('.env')
    ? 'AUTH_CLIENT_ID=starter-test-spa\nAUTH_ISSUER=https://host.docker.internal\nCOMPOSE_PROJECT_NAME=fixture\nAPP_SQL_PASSWORD=fixture-password'
    : read(path, ...args));
  t.mock.method(childProcess, 'spawnSync', (_command, args, options) => {
    let stdout = '';
    if (args[0] === 'run' && args.includes('--rm')) {
      return { status: 1, stderr: 'Configure APP_ORIGIN', stdout };
    }
    if (args[0] === 'compose') stdout = 'abc123';
    if (args[0] === 'inspect') stdout = args.includes('{{.State.OOMKilled}}') ? 'false' : 'fixture_default';
    if (args[0] === 'exec') {
      if (options.input.includes('SELECT type')) stdout = 'S';
      else return { status: 1, stderr: options.input.includes(':setvar DabClientId 00000000')
        ? 'Use the deployed DAB managed identity client ID' : 'Existing app_runtime identity differs', stdout };
    }
    if (args[0] === 'run') stdout = args.at(-1).includes('dab') ? 'dab123' : 'web123';
    return { status: 0, stdout, stderr: '' };
  });
  syncBuiltinESMExports();
  let writes = 0;
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input);
    const json = (body, status = 200) => Response.json(body, { status });
    if (url.pathname === '/health') { origin = url.origin; return json({}); }
    if (url.pathname === '/') return new Response('<div id="root">');
    if (url.pathname === '/config.json') return json({ redirectUri: `${origin}/` });
    const auth = options.headers?.Authorization;
    if (scenario === 'unsigned-headers' && !auth && options.headers?.['X-MS-CLIENT-PRINCIPAL']) {
      return json({ value: [{ Id: 'leaked-row', Label: 'Other owner' }] });
    }
    if (scenario === 'invalid-bearer' && auth?.includes('forged')) return json({ value: [] });
    if (!auth || auth.includes('forged')) return json({}, 401);
    if (url.pathname === '/api/CreateItem') {
      const body = JSON.parse(options.body);
      if (!body.Label) return scenario === 'validation-outage' ? json({}, 503)
        : json({ error: { code: 'DatabaseOperationFailed' } }, 400);
      if (!label) label = body.Label;
      writes++;
      return json({ value: [] }, writes === 2 ? (scenario === 'race-outage' ? 503 : 409) : 201);
    }
    if (options.method === 'POST') return json({}, scenario === 'direct-write-outage' ? 503 : 405);
    const exact = url.searchParams.get('$filter') === `Label eq '${label}'`;
    const own = auth.includes('synthetic-a');
    const row = { Id: 'persisted-id', Label: label };
    // A reused fixture has more than one page. Only the exact query finds the new row.
    return json({ value: exact ? (own ? [row] : []) : scenario === 'full-page'
      ? Array.from({ length: 100 }, (_, index) => ({ Id: `old-${index}`, Label: `old-${index}` }))
      : label && own ? [row] : [] });
  });
  try {
    await import(`../scripts/test-deployment-images.mjs?scenario=${scenario}`);
  } finally {
    process.argv = argv;
    for (const name of ['ACCEPTANCE_TOKEN_A', 'ACCEPTANCE_TOKEN_B']) {
      if (env[name] === undefined) delete process.env[name];
      else process.env[name] = env[name];
    }
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
}

for (const [scenario, message] of [
  ['unsigned-headers', /Unsigned identity\/role headers must be denied/],
  ['invalid-bearer', /An invalid bearer token must be denied/],
  ['validation-outage', /SQL validation must be a database rejection/],
  ['direct-write-outage', /read entity must not permit direct writes/],
  ['race-outage', /duplicate must be a conflict rejection/],
]) {
  test(`image acceptance rejects ${scenario} instead of certifying SQL enforcement`, async t => {
    await assert.rejects(runImages(t, scenario), { name: 'AssertionError', message });
  });
}

test('image acceptance finds the saved row beyond a full first page and after restart', async t => {
  await runImages(t, 'full-page');
});
