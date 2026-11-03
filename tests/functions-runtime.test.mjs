import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const env = {
  COMPOSE_PROJECT_NAME: 'sqlapps-0123456789ab', SQL_PORT: '14330', ACCEPT_EULA: 'Y',
  APP_SQL_PASSWORD: `Aa1!${'1'.repeat(48)}`, MSSQL_SA_PASSWORD: `Aa1!${'2'.repeat(48)}`,
  AUTH_ISSUER: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
  AUTH_AUTHORITY: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
  AUTH_CLIENT_ID: 'test-spa', AUTH_AUDIENCE: 'test-api', AUTH_SCOPE: 'openid api://test-api/access',
};
async function unusedPort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return String(port);
}
const runtimeModule = () => import('../skills/sql-apps/templates/alternatives/static-web-apps/scripts/functions-local.mjs');

test('Functions maps only restricted local SQL credentials and rejects cloud-secret mixing', async () => {
  const { functionsEnvironment } = await runtimeModule();
  const mapped = functionsEnvironment({ ...env, APP_PORT: '5180', APP_ORIGIN: 'http://127.0.0.1:5180' });
  assert.equal(mapped.SQL_SERVER, '127.0.0.1');
  assert.equal(mapped.SQL_DATABASE, 'appdb');
  assert.equal(mapped.SQL_USER, 'app_api');
  assert.equal(mapped.SQL_PASSWORD, env.APP_SQL_PASSWORD);
  for (const extra of [{ SQL_CLIENT_SECRET: 'do-not-print' }, { SQL_SERVER: 'remote.example' }]) {
    assert.throws(() => functionsEnvironment({ ...env, ...extra }), error =>
      /local|cloud/.test(error.message) && !error.message.includes('do-not-print'));
  }
});

test('Functions refuses occupied ports before launching either owned host', async () => {
  const { startFunctions } = await runtimeModule();
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await assert.rejects(startFunctions({
      ...env, APP_ORIGIN: 'http://127.0.0.1:5180', FUNCTIONS_PORT: String(server.address().port),
    }, { launch: () => { throw new Error('An occupied port must be detected before launch.'); } }), /port.*unavailable/i);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('owned POSIX process groups are escalated independently of an exited leader', async () => {
  const { stopProcessGroup } = await runtimeModule();
  const signals = [];
  let alive = true;
  await stopProcessGroup(1234, {
    wait: async () => {},
    kill: (pid, signal) => {
      assert.equal(pid, -1234);
      signals.push(signal);
      if (!alive) throw Object.assign(new Error('Gone'), { code: 'ESRCH' });
      if (signal === 'SIGKILL') alive = false;
    },
  });
  assert.ok(signals.includes('SIGTERM'));
  assert.ok(signals.includes('SIGKILL'), 'Surviving descendants must be killed even if the leader exited.');
  await assert.rejects(stopProcessGroup(1234, {
    wait: async () => {}, kill: () => {},
  }), /process group cleanup failed/);
});

for (const mode of ['stop', 'trailing-origin', 'partial-failure', 'unexpected-exit']) {
  test(`Functions and SWA owned processes are cleaned up after ${mode}`, { timeout: 15_000 }, async () => {
    const { startFunctions } = await runtimeModule();
    const FUNCTIONS_PORT = await unusedPort();
    const APP_PORT = await unusedPort();
    const values = { ...env, FUNCTIONS_PORT, APP_PORT,
      APP_ORIGIN: `http://127.0.0.1:${APP_PORT}${mode === 'trailing-origin' ? '/' : ''}` };
    const children = [];
    const launch = (tool, args, options) => {
      assert.ok(['func', 'swa'].includes(tool));
      const port = args[args.indexOf('--port') + 1];
      const child = spawn(process.execPath, [fileURLToPath(new URL('./fixtures/functions-process.mjs', import.meta.url)),
        port, mode === 'partial-failure' && tool === 'swa' ? 'exit' : 'serve'], {
        env: options.env, stdio: 'ignore', detached: process.platform !== 'win32',
      });
      children.push(child);
      return child;
    };
    let runtime;
    try {
      if (mode === 'partial-failure') {
        let probes = 0;
        await assert.rejects(startFunctions(values, {
          launch, signal: AbortSignal.timeout(6000),
          request: (...args) => { probes++; return fetch(...args); },
        }), /swa.*exited/i);
        const stoppedAt = probes;
        await delay(350);
        assert.equal(probes, stoppedAt, 'Failed startup must cancel its pending readiness probes.');
      } else {
        runtime = await startFunctions(values, { launch });
        assert.equal((await fetch(`${values.APP_ORIGIN}/config.json`)).status, 200);
        if (mode === 'unexpected-exit') {
          children[0].kill('SIGKILL');
          const exit = await runtime.exited;
          assert.equal(exit.tool, 'func');
        }
        await runtime.stop();
      }
      assert.equal(children.length, 2);
      assert.ok(children.every(child => child.exitCode !== null || child.signalCode !== null));
      await assert.rejects(fetch(`${values.APP_ORIGIN}/config.json`), TypeError);
      await assert.rejects(fetch(`http://127.0.0.1:${FUNCTIONS_PORT}/api/config`), TypeError);
    } finally {
      await runtime?.stop();
      for (const child of children) {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      }
    }
  });
}
