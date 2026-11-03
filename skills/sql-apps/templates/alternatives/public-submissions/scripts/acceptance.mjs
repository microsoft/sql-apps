import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fork, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { composeArguments, localAccess, localConfiguration, localEndpoints, readEnvironment, root } from './config.ts';

const env = readEnvironment();
assert.equal(localAccess(), 'public-submissions', 'This acceptance script requires the explicit public profile.');
const config = localConfiguration(env, 'functions');
const endpoints = localEndpoints(env, 'functions');
const ownerPhase = env.ACCEPTANCE_PHASE === 'owner';
if (env.ACCEPTANCE_PHASE && !['public', 'owner'].includes(env.ACCEPTANCE_PHASE)) throw new Error('ACCEPTANCE_PHASE must be public or owner.');
if (ownerPhase && (!env.ACCEPTANCE_OWNER_TOKEN || !env.ACCEPTANCE_UNENROLLED_TOKEN)) {
  throw new Error('Owner acceptance requires real ACCEPTANCE_OWNER_TOKEN and ACCEPTANCE_UNENROLLED_TOKEN in the environment. Enrollment is operator-run SQL only.');
}
let stack;
async function start() {
  stack = fork(resolve(root, 'scripts/local.mjs'), ['start'], {
    env: { ...env, ACCEPTANCE_OWNER_TOKEN: '', ACCEPTANCE_UNENROLLED_TOKEN: '' },
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  });
  await Promise.race([once(stack, 'message'),
    once(stack, 'exit').then(() => { throw new Error('Stack exited before readiness.'); })]);
}
async function stop() {
  if (!stack || stack.exitCode !== null) return;
  const exited = once(stack, 'exit');
  stack.send('stop');
  assert.equal((await exited)[0], 0);
}
const request = (base, route, { token, body, headers = {} } = {}) => fetch(`${base}/api/${route}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
});
const label = `Acceptance ${randomUUID()}`;
try {
  await start();
  for (const base of [endpoints.app, endpoints.api]) {
    const submitted = await request(base, 'Submit', { body: { Label: label } });
    assert.equal(submitted.status, 202, 'A bounded SQL write must succeed. A full inbox/rate stop requires operator review, never a reset.');
    assert.deepEqual(await submitted.json(), { accepted: true });
    for (const token of [undefined, 'forged']) {
      const denied = await request(base, 'Submissions', { token, headers: { 'x-ms-client-principal': 'forged' } });
      assert.equal(denied.status, 'ownerAuth' in config.publicConfig && config.publicConfig.ownerAuth === null ? 503 : 401);
    }
    assert.equal((await request(base, 'Submit', { body: { Label: label, OwnerId: 'forged' } })).status, 400);
    assert.equal((await request(base, 'Submit?OwnerId=forged', { body: { Label: label } })).status, 400);
    for (const route of ['Items', 'CreateItem']) {
      const response = await request(base, route, route === 'CreateItem' ? { body: { Label: label } } : {});
      assert.equal(response.status, 404, 'Legacy protected routes must not expose the inbox.');
    }
  }
  const sql = spawnSync('docker', [...composeArguments(env, 'functions'), 'exec', '-T', '-e', 'SQLCMDPASSWORD',
    'sql', '/opt/mssql-tools18/bin/sqlcmd', '-S', 'localhost', '-U', 'app_api', '-C', '-b', '-d', 'appdb', '-h', '-1', '-W',
    '-Q', "SET NOCOUNT ON; SELECT HAS_PERMS_BY_NAME('dbo.Submissions','OBJECT','SELECT'), HAS_PERMS_BY_NAME('dbo.SubmissionOwners','OBJECT','INSERT'), HAS_PERMS_BY_NAME('dbo.SubmissionBudget','OBJECT','UPDATE'), HAS_PERMS_BY_NAME('api.CreateItem','OBJECT','EXECUTE'), HAS_PERMS_BY_NAME('api.Submit','OBJECT','EXECUTE'), HAS_PERMS_BY_NAME('api.Submissions','OBJECT','EXECUTE');"],
  { cwd: root, env: { ...env, SQLCMDPASSWORD: env.APP_SQL_PASSWORD }, encoding: 'utf8' });
  if (sql.error) throw sql.error;
  assert.equal(sql.status, 0, 'Least-privilege permission inspection must succeed.');
  assert.equal(sql.stdout.trim(), '0 0 0 0 1 1');
  if (ownerPhase) {
    const denied = await request(endpoints.app, 'Submissions', { token: env.ACCEPTANCE_UNENROLLED_TOKEN });
    assert.equal(denied.status, 403, 'A valid but unenrolled identity must not read the inbox.');
    const read = async () => {
      const response = await request(endpoints.app, 'Submissions', { token: env.ACCEPTANCE_OWNER_TOKEN });
      assert.equal(response.status, 200);
      const rows = (await response.json()).value;
      assert.ok(Array.isArray(rows) && rows.length <= 100 && rows.some(row => row.Label === label));
    };
    await read();
    await stop(); await start(); await read();
    console.log('Owner acceptance passed: real tokens, operator enrollment boundary, bounded inbox read and restart persistence.');
  } else console.log('Public local acceptance passed: anonymous SQL submission, generic acknowledgement, denied reads and restricted grants. Owner enrollment/sign-in/browser and cloud publication remain unverified.');
} finally { await stop(); }
