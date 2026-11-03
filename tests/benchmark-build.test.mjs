import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const starter = new URL('../skills/sql-apps/templates/starter/', import.meta.url);

test('web Docker build context contains the selected profile required by workspace validation', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-web-build-input-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dockerfile = await readFile(new URL('Dockerfile.web', starter), 'utf8');
  const inputs = dockerfile.match(/^COPY (.+) \.\/$/m)[1].split(' ');
  for (const file of [...inputs, 'scripts', 'packages/data']) {
    await cp(new URL(file, starter), join(directory, file), { recursive: true });
  }
  const result = spawnSync(process.execPath, [join(directory, 'scripts/check-config.mjs')], {
    cwd: directory, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Static DAB/);
});

test('image builder carries the host HTTPS registry into the web build without config files or tokens', async () => {
  const { buildImages } = await import('../skills/sql-apps/templates/starter/scripts/build-images.mjs');
  const calls = [];
  const run = (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, stdout: command === 'docker' ? '' : 'https://packages.example.test/npm/approved/\n', stderr: '' };
  };
  await buildImages({ webImage: 'fixture-web:check', dabImage: 'fixture-dab:check', run });
  const builds = calls.filter(call => call.command === 'docker');
  assert.equal(builds.length, 2);
  assert.deepEqual(builds[0].args, [
    'build', '--build-arg', 'NPM_CONFIG_REGISTRY=https://packages.example.test/npm/approved/',
    '--file', 'Dockerfile.web', '--tag', 'fixture-web:check', '.',
  ]);
  assert.deepEqual(builds[1].args, ['build', '--file', 'Dockerfile.dab', '--tag', 'fixture-dab:check', '.']);
  assert.ok(calls.every(call => !call.args.some(value => /token|\.npmrc|strict.ssl/i.test(value))));
});

for (const registry of ['http://packages.test/', 'https://user:secret@packages.test/',
  'https://packages.test/?token=secret', 'https://packages.test/#secret', 'not-a-url']) {
  test('image builder rejects unsafe registry configuration before any Docker build: ' + registry.split('/')[0], async () => {
    const { buildImages } = await import('../skills/sql-apps/templates/starter/scripts/build-images.mjs');
    let built = false;
    assert.throws(() => buildImages({
      webImage: 'web:check', dabImage: 'dab:check',
      run: (command) => {
        if (command === 'docker') built = true;
        return { status: 0, stdout: registry, stderr: '' };
      },
    }), /HTTPS|registry configuration/);
    assert.equal(built, false);
  });
}

test('image builder stops on npm discovery or Docker failure without logging their possible secrets', async () => {
  const { buildImages } = await import('../skills/sql-apps/templates/starter/scripts/build-images.mjs');
  for (const failure of ['npm', 'docker']) {
    const builds = [];
    assert.throws(() => buildImages({
      webImage: 'web:check', dabImage: 'dab:check',
      run: command => {
        if (command === 'docker') builds.push(command);
        const failed = (command === 'docker') === (failure === 'docker');
        return { status: failed ? 1 : 0, stdout: 'https://packages.test/', stderr: 'secret=never-print' };
      },
    }), error => !error.message.includes('never-print') && /failed/.test(error.message));
    assert.equal(builds.length, failure === 'npm' ? 0 : 1);
  }
});
