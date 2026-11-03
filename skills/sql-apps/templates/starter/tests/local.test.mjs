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

for (const action of ['stop', 'kill-web', 'external-stop']) {
  test(`local supervisor stops containers after ${action}`, { timeout: 15_000 }, async () => {
    const app = await mkdtemp(join(tmpdir(), 'sqlapps-lifecycle-'));
    let child;
    try {
      for (const entry of ['scripts', 'dist', 'packages/data', 'package.json', 'baseline.json', 'compose.yml', 'compose.sql.yml']) {
        await cp(new URL(`../${entry}`, import.meta.url), join(app, entry), { recursive: true });
      }
      await writeFile(join(app, 'deployment.json'), '{"hosting":"container-apps","api":"dab"}');
      await mkdir(join(app, 'packages/frontend/dist'), { recursive: true });
      await writeFile(join(app, 'packages/frontend/dist/index.html'), '<h1>Lifecycle test</h1>');
      const probe = createServer();
      probe.listen(0, '127.0.0.1');
      await once(probe, 'listening');
      const port = probe.address().port;
      await new Promise(resolve => probe.close(resolve));
      child = fork(fileURLToPath(new URL('./fixtures/local-process.mjs', import.meta.url)), [app], {
        silent: true,
        env: {
          ...process.env, COMPOSE_FILE: '', SQL_PORT: '',
          COMPOSE_PROJECT_NAME: `sqlapps-${randomBytes(6).toString('hex')}`, ACCEPT_EULA: 'Y',
          MSSQL_SA_PASSWORD: `Aa1!${'1'.repeat(48)}`, APP_SQL_PASSWORD: `Aa1!${'2'.repeat(48)}`,
          SQL_CONNECTION_STRING: 'Server=sql;Database=appdb;User ID=app_api;Password=test-only;',
          APP_ORIGIN: `http://127.0.0.1:${port}`, APP_PORT: String(port), APP_HOST: '127.0.0.1',
          DAB_URL: 'http://127.0.0.1:5081', DAB_PORT: '5081',
          AUTH_ISSUER: 'https://identity.example/tenant', AUTH_AUTHORITY: 'https://identity.example/tenant',
          AUTH_CLIENT_ID: 'test-client', AUTH_AUDIENCE: 'test-api', AUTH_SCOPE: 'openid api-access',
        },
      });
      let errors = '';
      child.stderr.on('data', chunk => { errors += chunk; });
      child.stdout.resume();
      const messages = [];
      child.on('message', message => messages.push(message));
      const exited = once(child, 'exit');
      const ready = await Promise.race([
        once(child, 'message', { signal: AbortSignal.timeout(5000) }),
        exited.then(() => { throw new Error(`Supervisor exited before readiness: ${errors}`); }),
      ]);
      assert.equal(ready[0], 'ready', errors);
      child.send(action);
      let timer;
      const result = await Promise.race([
        exited,
        new Promise(resolve => { timer = setTimeout(() => resolve(null), 3000); }),
      ]);
      clearTimeout(timer);
      assert.notEqual(result, null, 'Supervisor hung instead of completing container cleanup.');
      assert.equal(result[0], action === 'kill-web' ? 1 : 0, errors);
      assert.ok(messages.includes('containers-stopped'), 'Owned containers must be stopped.');
      if (action === 'kill-web') assert.match(errors, /Web process exited unexpectedly/);
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        if (child.connected) child.send('stop');
        await new Promise(resolve => setTimeout(resolve, 200));
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await exited;
      }
      await rm(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
}
