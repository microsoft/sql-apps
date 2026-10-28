import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fork } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { configuration, readEnvironment, root } from '../dist/scripts/config.js';

const env = readEnvironment();
const config = configuration(env);
const tokens = [env.ACCEPTANCE_TOKEN_A, env.ACCEPTANCE_TOKEN_B];
if (tokens.some(token => !token)) throw new Error('Supply ACCEPTANCE_TOKEN_A and ACCEPTANCE_TOKEN_B for two distinct synthetic test users, via environment only.');
const claims = tokens.map(token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url')));
assert.ok(claims.every(claim => claim.oid && claim.exp > Date.now() / 1000 + 180), 'Use tokens with oid and at least three minutes remaining.');
assert.notEqual(claims[0].oid, claims[1].oid, 'Acceptance requires two distinct identities.');
const origin = new URL(config.publicConfig.redirectUri).origin;
let stack;
async function start() {
  stack = fork(resolve(root, 'scripts/local.mjs'), ['start'], {
    env: { ...env, ACCEPTANCE_TOKEN_A: '', ACCEPTANCE_TOKEN_B: '' },
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  });
  await Promise.race([
    once(stack, 'message'),
    once(stack, 'exit').then(() => { throw new Error('Stack exited before acceptance readiness.'); }),
  ]);
}
async function stop() {
  if (!stack || stack.exitCode !== null) return;
  const exited = once(stack, 'exit');
  stack.send('stop');
  const [code] = await exited;
  assert.equal(code, 0, 'Stack must shut down cleanly.');
}
async function request(base, path, token, body, extraHeaders = {}) {
  return fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
}
async function rows(base, token) {
  const response = await request(base, '/api/Items?$first=100', token);
  assert.equal(response.status, 200, 'Authenticated read must succeed.');
  const result = await response.json();
  assert.ok(Array.isArray(result.value), 'DAB must return a value array.');
  return result.value;
}
try {
  await start();
  const label = `Acceptance ${randomUUID()}`;
  for (const base of [origin, config.dab]) {
    const denied = await request(base, '/api/Items', undefined);
    assert.ok([401, 403].includes(denied.status), 'Anonymous read must be denied.');
    const forged = await request(base, '/api/Items', undefined, undefined, { 'X-MS-API-ROLE': 'authenticated', 'X-MS-CLIENT-PRINCIPAL': 'forged' });
    assert.ok([401, 403].includes(forged.status), 'Unsigned role/identity headers must be denied.');
    const invalid = await request(base, '/api/Items', `${tokens[0].slice(0, -8)}invalid!`);
    assert.ok([401, 403].includes(invalid.status), 'Invalid signatures must be denied.');
  }
  const writes = await Promise.all([
    request(origin, '/api/CreateItem', tokens[0], { Label: label }),
    request(config.dab, '/api/CreateItem', tokens[0], { Label: label }),
  ]);
  assert.equal(writes.filter(response => response.ok).length, 1, 'Exactly one concurrent duplicate must succeed.');
  assert.equal(writes.filter(response => response.status === 409).length, 1, 'The duplicate must be a conflict rejection, not an auth or service failure.');
  const filter = `/api/Items?$filter=${encodeURIComponent(`Label eq '${label}'`)}`;
  async function exact(token) {
    const response = await request(origin, filter, token);
    assert.equal(response.status, 200);
    return (await response.json()).value;
  }
  const before = await exact(tokens[0]);
  assert.equal(before.length, 1, 'Exactly one row must persist.');
  assert.equal((await exact(tokens[1])).length, 0, 'Other owners must not see the saved row.');
  const control = await request(config.dab, '/api/CreateItem', tokens[1], { Label: label });
  assert.ok(control.ok, 'The same label must be allowed for a distinct owner.');
  const bypass = await request(config.dab, '/api/Items', tokens[0], { Label: 'Bypass' });
  assert.ok([400, 403, 405].includes(bypass.status), 'The read entity must not permit direct writes.');
  const invalid = await request(config.dab, '/api/CreateItem', tokens[0], { Label: ' ' });
  const invalidResult = await invalid.json();
  assert.ok([400, 500].includes(invalid.status) && invalidResult.error?.code === 'DatabaseOperationFailed',
    `SQL validation must be a database rejection, not an outage: ${invalid.status} ${JSON.stringify(invalidResult)}`);
  const sql = query => {
    const result = spawnSync('docker', ['compose', '--project-name', env.COMPOSE_PROJECT_NAME,
      'exec', '-T', '-e', 'SQLCMDPASSWORD', 'sql', '/opt/mssql-tools18/bin/sqlcmd',
      '-S', 'localhost', '-U', 'app_api', '-C', '-b', '-d', 'appdb', '-h', '-1', '-W', '-Q', query],
    { cwd: root, env: { ...env, SQLCMDPASSWORD: env.APP_SQL_PASSWORD }, encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, 'Independent least-privilege SQL observation must succeed.');
    return result.stdout.trim();
  };
  assert.equal(sql("SET NOCOUNT ON; SELECT HAS_PERMS_BY_NAME('dbo.Items','OBJECT','SELECT'), HAS_PERMS_BY_NAME('dbo.Items','OBJECT','INSERT'), HAS_PERMS_BY_NAME('api.CreateItem','OBJECT','EXECUTE');"), '0 0 1',
    'API SQL identity must not read or write base tables.');
  const deniedSql = spawnSync('docker', ['compose', '--project-name', env.COMPOSE_PROJECT_NAME,
    'exec', '-T', '-e', 'SQLCMDPASSWORD', 'sql', '/opt/mssql-tools18/bin/sqlcmd',
    '-S', 'localhost', '-U', 'app_api', '-C', '-b', '-d', 'appdb', '-Q', 'SELECT * FROM dbo.Items;'],
  { cwd: root, env: { ...env, SQLCMDPASSWORD: env.APP_SQL_PASSWORD }, encoding: 'utf8' });
  if (deniedSql.error) throw deniedSql.error;
  assert.notEqual(deniedSql.status, 0, 'Direct base-table access must fail.');
  await rows(config.dab, tokens[0]);
  await stop();
  await start();
  assert.deepEqual(await exact(tokens[0]), before, 'Row identity and contents must survive a full stack restart.');
  assert.ok((await request(origin, '/api/CreateItem', tokens[0], { Label: `${label} restarted` })).ok, 'A new write must succeed after restart.');
  console.log('LOCAL API ACCEPTANCE PASSED: auth controls, ownership, SQL duplicate race, full-stack persistence/restart, and post-restart write.');
  console.log('Browser sign-in/UI acceptance and deployed acceptance are separate checks. Synthetic evidence rows retained; no data was reset.');
} finally {
  await stop();
}
