import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { copyStarter } from './fixtures/starter-copy.mjs';

const templates = new URL('../skills/sql-apps/templates/', import.meta.url);
const read = async relative => readFile(new URL(relative, templates), 'utf8');

test('default starter has no Functions workspace or speculative Rayfin configuration', async () => {
  const manifest = JSON.parse(await read('starter/package.json'));
  assert.ok(!manifest.scripts.test.includes('@app/functions'));
  assert.equal(existsSync(new URL('starter/packages/functions', templates)), false);
  assert.equal(existsSync(new URL('starter/rayfin', templates)), false);
  const lock = JSON.parse(await read('starter/package-lock.json'));
  assert.equal(Object.keys(lock.packages).some(key => /functions|tedious|@azure\/identity/.test(key)), false);
});

test('alternative installer stages only an explicitly selected overlay without overwriting an app', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-alternative-'));
  try {
    await copyStarter(directory);
    const installer = new URL('alternatives/install.mjs', templates);
    const run = profile => spawnSync(process.execPath, [fileURLToPath(installer),
      profile, directory], { encoding: 'utf8' });
    assert.notEqual(run('unknown').status, 0);
    assert.equal(existsSync(join(directory, 'packages', 'functions')), false);
    const result = run('static-web-apps');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(directory, 'packages', 'functions', 'src', 'handlers.ts')), true);
    assert.equal(existsSync(join(directory, 'infra', 'static-web-apps.bicep')), true);
    assert.equal(existsSync(join(directory, 'infra', 'app-service-f1.bicep')), false);
    assert.equal(existsSync(join(directory, 'rayfin')), false);
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    assert.equal(manifest.scripts.start, 'npm run local:start');
    assert.equal(manifest.scripts.test, 'node --test tests/*.test.mjs && npm run test --workspace @app/frontend');
    assert.equal(manifest.scripts['serve:web'], undefined);
    for (const file of ['packages/server', 'tests/server.test.mjs', 'tests/local.test.mjs',
      'tests/fixtures/local-process.mjs', 'packages/data/dab-config.json',
      'compose.yml', 'Dockerfile.web', 'Dockerfile.dab', 'infra/main.bicep', 'infra/main.bicepparam', 'infra/bootstrap.sql']) {
      assert.equal(existsSync(join(directory, file)), false, `Unused DAB payload: ${file}`);
    }
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'tsconfig.backend.json'), 'utf8')).include,
      ['scripts/config.ts']);
    for (const file of ['README.md', 'hosting.md', 'deployment.md', 'deployment-migrations.md']) {
      const document = await readFile(join(directory, file), 'utf8');
      for (const match of document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1];
        if (/^(https:\/\/|mailto:|#)/.test(target)) continue;
        assert.ok(existsSync(resolve(directory, target.split('#')[0])), `${file}: missing copied app link ${target}`);
      }
    }
    const profile = JSON.parse(await readFile(join(directory, 'deployment.json'), 'utf8'));
    assert.deepEqual(profile, { hosting: 'static-web-apps', api: 'functions' });
    assert.match(await readFile(join(directory, 'README.md'), 'utf8'), /Static Web Apps \/ Functions starter/);
    assert.doesNotMatch(await readFile(join(directory, 'README.md'), 'utf8'), /DAB_URL|DAB prerequisites/);
    assert.doesNotMatch(await readFile(join(directory, 'README.md'), 'utf8'), /Identity decision comes first|ACCEPTANCE_TOKEN_A/);
    assert.match(await readFile(join(directory, 'deployment.md'), 'utf8'), /Static Web Apps operator steps/);
    await writeFile(join(directory, 'packages', 'functions', 'src', 'handlers.ts'), 'user change');
    assert.notEqual(run('static-web-apps').status, 0);
    assert.equal(await readFile(join(directory, 'packages', 'functions', 'src', 'handlers.ts'), 'utf8'), 'user change');
    assert.notEqual(run('app-service-f1').status, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('both profiles expose one Start behavior without hidden partial builds', async () => {
  const manifest = JSON.parse(await read('starter/package.json'));
  assert.equal(manifest.scripts.start, 'npm run local:start');
  assert.equal(manifest.scripts['serve:web'], 'node dist/packages/server/server.js');
  assert.equal(manifest.scripts.test, 'node --test tests/*.test.mjs && npm run test --workspace @app/frontend');
  assert.ok(Object.keys(manifest.scripts).every(name => !name.startsWith('pre')));
});

for (const change of ['modified-server', 'extra-server-file', 'modified-environment', 'existing-functions-directory']) {
  test(`Functions selection preserves an app with ${change} instead of deleting user files`, async t => {
    const { installAlternative } = await import('../skills/sql-apps/templates/alternatives/install.mjs');
    const directory = await mkdtemp(join(tmpdir(), 'sqlapps-alternative-custom-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    await copyStarter(directory);
    const file = change === 'existing-functions-directory' ? 'packages/functions/src/custom.ts' :
      change === 'modified-environment' ? '.env.example' :
      change === 'extra-server-file' ? 'packages/server/custom.ts' : 'packages/server/server.ts';
    if (change === 'existing-functions-directory') await mkdir(join(directory, 'packages/functions/src'), { recursive: true });
    await writeFile(join(directory, file), 'user change');
    await assert.rejects(installAlternative('static-web-apps', directory), /modified|unmodified|fresh|unexpected/i);
    assert.equal(await readFile(join(directory, file), 'utf8'), 'user change');
    assert.equal(existsSync(join(directory, 'packages/functions/src/handlers.ts')), false);
    assert.equal(existsSync(join(directory, 'packages/server/server.ts')), true);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'deployment.json'), 'utf8')),
      { hosting: 'container-apps', api: 'dab' });
  });
}

test('F1 overlay keeps DAB and does not install a second API implementation', async () => {
  const { installAlternative } = await import('../skills/sql-apps/templates/alternatives/install.mjs');
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-f1-'));
  try {
    await copyStarter(directory);
    await installAlternative('app-service-f1', directory);
    assert.equal(existsSync(join(directory, 'packages', 'functions')), false);
    assert.equal(existsSync(join(directory, 'infra', 'app-service-f1.bicep')), true);
    const deployment = await readFile(join(directory, 'deployment.md'), 'utf8');
    assert.match(deployment, /App Service F1/);
    assert.doesNotMatch(deployment, /Static Web Apps operator steps/);
    for (const match of deployment.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(https:\/\/|mailto:|#)/.test(match[1])) continue;
      assert.ok(existsSync(resolve(directory, match[1].split('#')[0])), `deployment.md: missing copied app link ${match[1]}`);
    }
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'deployment.json'), 'utf8')),
      { hosting: 'app-service-f1', api: 'dab' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
