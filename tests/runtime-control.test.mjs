import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

for (const failed of [false, true]) {
test(`Stop rejects malformed callers and reports ${failed ? 'failed' : 'completed'} cleanup`, { timeout: 10_000 }, async () => {
  const app = await mkdtemp(join(tmpdir(), 'sqlapps-control-'));
  let child;
  try {
    await cp(new URL('../skills/sql-apps/templates/starter/scripts/', import.meta.url), join(app, 'scripts'), { recursive: true });
    const env = {
      ...process.env, COMPOSE_PROJECT_NAME: `sqlapps-${randomBytes(6).toString('hex')}`,
      APP_SQL_PASSWORD: `Aa1!${randomBytes(24).toString('hex')}`,
    };
    child = fork(fileURLToPath(new URL('./fixtures/control-process.mjs', import.meta.url)), [app, failed ? 'fail' : 'normal'], { env, silent: true });
    child.stderr.resume();
    assert.equal((await once(child, 'message'))[0], 'ready');
    const address = process.platform === 'win32' ? `\\\\.\\pipe\\${env.COMPOSE_PROJECT_NAME}-stop` :
      join(app, '.local', `${env.COMPOSE_PROJECT_NAME}.sock`);
    const socket = createConnection(address);
    socket.on('error', () => {});
    await once(socket, 'connect');
    socket.end('\u00e9'.repeat(64));
    socket.resume();
    await delay(100);
    assert.equal(child.exitCode, null, 'Malformed UTF-8 input must not crash the supervisor.');
    const { requestLocalStop } = await import(pathToFileURL(join(app, 'scripts/runtime-control.mjs')));
    await assert.rejects(requestLocalStop({ ...env, APP_SQL_PASSWORD: 'wrong' }), /rejected/);
    const idle = createConnection(address);
    idle.on('error', () => {});
    await once(idle, 'connect');
    const exited = once(child, 'exit');
    const stoppingAt = Date.now();
    if (failed) await assert.rejects(requestLocalStop(env), /shutdown failure/);
    else assert.equal(await requestLocalStop(env), true);
    assert.equal((await exited)[0], 0);
    assert.ok(Date.now() - stoppingAt < 3000, 'Idle unrelated callers must not delay supervisor shutdown.');
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
    await rm(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
}
