import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

const appRoot = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Supply the isolated starter fixture directory.');
const config = parseEnv(readFileSync(resolve(appRoot, '.env'), 'utf8'));
if (config.AUTH_CLIENT_ID !== 'starter-test-spa' ||
    new URL(config.AUTH_ISSUER).hostname !== 'host.docker.internal') {
  throw new Error('Deployment image checks require the isolated synthetic starter fixture.');
}
const tokens = [process.env.ACCEPTANCE_TOKEN_A, process.env.ACCEPTANCE_TOKEN_B];
assert.ok(tokens.every(Boolean), 'Supply short-lived synthetic fixture tokens through the environment.');
function docker(args, env = process.env) {
  const result = spawnSync('docker', args, { cwd: appRoot, env, encoding: 'utf8', timeout: 180_000 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `docker ${args[0]} failed: ${result.stderr}`);
  return result.stdout.trim();
}
async function waitFor(url, headers = {}) {
  const deadline = Date.now() + 180_000;
  let last;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      if (response.ok) return response;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.message;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`${url} did not become ready: ${last}`);
}
const auth = index => ({ Authorization: `Bearer ${tokens[index]}` });
async function unusedPort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
const failed = spawnSync('docker', ['run', '--rm', '--pull', 'never', 'sqlapps-recipe-web:validation'], {
  encoding: 'utf8', timeout: 30_000,
});
if (failed.error) throw failed.error;
assert.notEqual(failed.status, 0, 'Web image must refuse missing runtime configuration.');
assert.match(failed.stderr, /Configure APP_ORIGIN/);
const sqlId = docker(['compose', 'ps', '-q', 'sql']);
assert.match(sqlId, /^[a-f0-9]+$/, 'The isolated SQL fixture must be running.');
const network = docker(['inspect', sqlId, '--format', '{{range $name, $network := .NetworkSettings.Networks}}{{$name}}{{end}}']);
assert.ok(network.startsWith(config.COMPOSE_PROJECT_NAME), 'Use only the fixture network.');
function sql(database, input, expectedSuccess = true) {
  const result = spawnSync('docker', ['exec', '--interactive', sqlId, '/opt/mssql-tools18/bin/sqlcmd',
    '-S', 'localhost', '-U', 'sa', '-C', '-b', '-d', database, '-h', '-1', '-W'], {
    input, encoding: 'utf8', timeout: 60_000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status === 0, expectedSuccess, `Unexpected SQL bootstrap result: ${result.stdout}${result.stderr}`);
  return `${result.stdout}${result.stderr}`.trim();
}
const bootstrap = readFileSync(resolve(appRoot, 'infra', 'bootstrap.sql'), 'utf8')
  .replace(':r packages/data/permissions.sql', readFileSync(resolve(appRoot, 'packages', 'data', 'permissions.sql'), 'utf8'));
assert.equal(sql('appdb', "SET NOCOUNT ON; SELECT type FROM sys.database_principals WHERE name='app_runtime';\nGO\n"), 'S');
assert.match(sql('appdb', `:setvar DabClientId ${randomUUID()}\n${bootstrap}`, false),
  /Existing app_runtime identity differs/);
assert.match(sql('appdb', `:setvar DabClientId 00000000-0000-0000-0000-000000000000\n${bootstrap}`, false),
  /Use the deployed DAB managed identity client ID/);
console.log('SQL bootstrap refusal controls passed: mismatched existing identity and zero object ID.');
console.warn('External SID/TYPE user creation and live Entra authentication remain unverified: the pinned local preview rejected TYPE syntax. No SQL-auth fallback is substituted in the cloud recipe.');
let dabId, webId;
try {
  const dabEnv = { ...process.env, SQL_CONNECTION_STRING: config.SQL_CONNECTION_STRING,
    AUTH_ISSUER: config.AUTH_ISSUER, AUTH_AUDIENCE: config.AUTH_AUDIENCE,
    SSL_CERT_FILE: '/certs/test-issuer-cert.pem' };
  const dabPort = await unusedPort();
  const webPort = await unusedPort();
  dabId = docker(['run', '--detach', '--pull', 'never', '--network', network,
    '--cpus', '0.25', '--memory', '512m', '--add-host', 'host.docker.internal:host-gateway',
    '--mount', `type=bind,source=${resolve(appRoot, '.local', 'test-issuer-cert.pem')},target=/certs/test-issuer-cert.pem,readonly`,
    '--env', 'SQL_CONNECTION_STRING', '--env', 'AUTH_ISSUER', '--env', 'AUTH_AUDIENCE',
    '--env', 'SSL_CERT_FILE', '--publish', `127.0.0.1:${dabPort}:5000`, '--publish', `127.0.0.1:${webPort}:5180`,
    'sqlapps-recipe-dab:validation'], dabEnv);
  const direct = `http://127.0.0.1:${dabPort}`;
  const origin = `http://127.0.0.1:${webPort}`;
  await waitFor(`${direct}/api/Items`, auth(0));
  const webEnv = { ...process.env, ...config, DAB_URL: 'http://127.0.0.1:5000', APP_ORIGIN: origin };
  webId = docker(['run', '--detach', '--pull', 'never', '--network', `container:${dabId}`,
    '--cpus', '0.25', '--memory', '512m',
    ...['DAB_URL', 'APP_ORIGIN', 'AUTH_AUTHORITY', 'AUTH_ISSUER', 'AUTH_AUDIENCE', 'AUTH_CLIENT_ID', 'AUTH_SCOPE']
      .flatMap(name => ['--env', name]),
    'sqlapps-recipe-web:validation'], webEnv);
  await waitFor(`${origin}/health`);
  assert.match(await (await fetch(origin)).text(), /<div id="root">/);
  const publicConfig = await (await fetch(`${origin}/config.json`)).json();
  assert.equal(publicConfig.redirectUri, `${origin}/`);
  assert.ok(!JSON.stringify(publicConfig).includes(config.APP_SQL_PASSWORD));
  for (const base of [origin, direct]) {
    assert.ok([401, 403].includes((await fetch(`${base}/api/Items`)).status));
    assert.ok([401, 403].includes((await fetch(`${base}/api/Items`, {
      headers: { 'X-MS-CLIENT-PRINCIPAL': 'forged', 'X-MS-API-ROLE': 'authenticated' },
    })).status), 'Unsigned identity/role headers must be denied.');
    assert.ok([401, 403].includes((await fetch(`${base}/api/Items`, {
      headers: { Authorization: 'Bearer forged' },
    })).status), 'An invalid bearer token must be denied.');
    const bypass = await fetch(`${base}/api/Items`, { method: 'POST', headers: auth(0) });
    assert.ok([400, 403, 405].includes(bypass.status), 'The read entity must not permit direct writes.');
    const invalid = await fetch(`${base}/api/CreateItem`, {
      method: 'POST', headers: { ...auth(0), 'Content-Type': 'application/json' },
      body: JSON.stringify({ Label: '' }),
    });
    const invalidResult = await invalid.json();
    assert.ok([400, 500].includes(invalid.status) && invalidResult.error?.code === 'DatabaseOperationFailed',
      `SQL validation must be a database rejection, not an outage: ${invalid.status} ${JSON.stringify(invalidResult)}`);
  }
  const label = `image-${randomUUID()}`;
  const create = value => fetch(`${origin}/api/CreateItem`, {
    method: 'POST', headers: { ...auth(0), 'Content-Type': 'application/json' },
    body: JSON.stringify({ Label: value }),
  });
  const race = await Promise.all([create(label), create(label)]);
  assert.equal(race.filter(response => response.ok).length, 1, 'SQL must reject one duplicate atomically.');
  assert.equal(race.filter(response => response.status === 409).length, 1,
    'The duplicate must be a conflict rejection, not an auth or service failure.');
  const filter = `/api/Items?$filter=${encodeURIComponent(`Label eq '${label}'`)}`;
  const rows = async (base, index) => {
    const response = await fetch(`${base}${filter}`, { headers: auth(index) });
    assert.equal(response.status, 200);
    return (await response.json()).value;
  };
  const saved = await rows(origin, 0);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].Label, label);
  assert.equal((await rows(direct, 1)).length, 0);
  docker(['restart', dabId, webId]);
  await waitFor(`${direct}/api/Items`, auth(0));
  await waitFor(`${origin}/health`);
  assert.deepEqual(await rows(origin, 0), saved);
  assert.ok((await create(`restart-${randomUUID()}`)).ok, 'A post-restart write must succeed.');
  for (const id of [dabId, webId]) {
    assert.equal(docker(['inspect', id, '--format', '{{.State.OOMKilled}}']), 'false');
  }
  console.log('Deployment images passed: missing-config denial, packaged UI/config, direct/proxy auth, SQL duplicate race, owner isolation, restart persistence and post-restart write at 0.25 CPU/512 MiB.');
  console.log('Local shared-network HTTP only; Azure internal HTTPS, managed identity, real-provider sign-in and cloud acceptance remain unverified.');
} finally {
  if (webId) docker(['rm', '--force', webId]);
  if (dabId) docker(['rm', '--force', dabId]);
}
