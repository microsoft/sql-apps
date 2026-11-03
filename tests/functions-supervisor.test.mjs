import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { installAlternative } from '../skills/sql-apps/templates/alternatives/install.mjs';

async function unusedPort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = String(probe.address().port);
  await new Promise(resolve => probe.close(resolve));
  return port;
}

for (const mode of ['foreground', 'external', 'startup-cleanup-failure']) {
  test(`Functions local supervisor owns SQL and both hosts; ${mode} Stop reports cleanup correctly`, { timeout: 15_000 }, async () => {
    const app = await mkdtemp(join(tmpdir(), 'sqlapps-functions-supervisor-'));
    const children = [];
    try {
      await cp(new URL('../skills/sql-apps/templates/starter/', import.meta.url), app, { recursive: true });
      await installAlternative('static-web-apps', app);
      await mkdir(join(app, 'dist/scripts'), { recursive: true });
      await writeFile(join(app, 'dist/scripts/config.js'), '');
      for (const [directory, file] of [['functions', 'index.js'], ['frontend', 'index.html']]) {
        await mkdir(join(app, 'packages', directory, 'dist'), { recursive: true });
        await writeFile(join(app, 'packages', directory, 'dist', file), '');
      }
      const APP_PORT = await unusedPort();
      const FUNCTIONS_PORT = await unusedPort();
      const env = {
        ...process.env, COMPOSE_FILE: '', COMPOSE_PROJECT_NAME: `sqlapps-${randomBytes(6).toString('hex')}`,
        ACCEPT_EULA: 'Y', SQL_PORT: '14330', APP_PORT, FUNCTIONS_PORT,
        APP_ORIGIN: `http://127.0.0.1:${APP_PORT}`, DAB_URL: '', SQL_CONNECTION_STRING: '',
        MSSQL_SA_PASSWORD: `Aa1!${'1'.repeat(48)}`, APP_SQL_PASSWORD: `Aa1!${'2'.repeat(48)}`,
        AUTH_ISSUER: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
        AUTH_AUTHORITY: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
        AUTH_CLIENT_ID: 'test-spa', AUTH_AUDIENCE: 'test-api', AUTH_SCOPE: 'openid api-access',
        SQLAPPS_TEST_STARTUP_CLEANUP_FAILURE: mode === 'startup-cleanup-failure' ? '1' : '',
      };
      const launch = command => {
        const child = fork(fileURLToPath(new URL('./fixtures/functions-supervisor.mjs', import.meta.url)), [app, command], { env, silent: true });
        children.push(child);
        child.stdout.resume();
        let errors = '';
        child.stderr.on('data', chunk => { errors += chunk; });
        const messages = [];
        child.on('message', message => messages.push(message));
        return { child, messages, errors: () => errors, exited: once(child, 'exit') };
      };
      const running = launch('start');
      await Promise.race([
        once(running.child, 'message', { signal: AbortSignal.timeout(6000) }),
        running.exited.then(() => { throw new Error(running.errors()); }),
      ]);
      const failed = mode === 'startup-cleanup-failure';
      assert.equal(running.messages[0], failed ? 'starting-swa' : 'ready');
      const duplicate = launch('start');
      assert.equal((await duplicate.exited)[0], 1, 'Duplicate Start must fail.');
      assert.ok(!duplicate.messages.includes('containers-stopped'), 'Duplicate Start must not stop the running stack.');
      if (!failed) assert.equal((await fetch(`${env.APP_ORIGIN}/config.json`)).status, 200);
      if (mode !== 'foreground') {
        const stop = launch('stop');
        assert.equal((await stop.exited)[0], failed ? 1 : 0, stop.errors());
        if (failed) assert.match(stop.errors(), /shutdown failure/);
      } else running.child.send('stop');
      assert.equal((await running.exited)[0], failed ? 1 : 0, running.errors());
      assert.ok(running.messages.includes('containers-stopped'));
      await assert.rejects(fetch(`${env.APP_ORIGIN}/config.json`), TypeError);
      await assert.rejects(fetch(`http://127.0.0.1:${FUNCTIONS_PORT}/api/config`), TypeError);
    } finally {
      for (const child of children) {
        if (child.exitCode === null && child.signalCode === null) {
          const exited = once(child, 'exit');
          if (child.connected) child.send('stop');
          await exited;
        }
      }
      await rm(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
}
