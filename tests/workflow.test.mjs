import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, root), 'utf8');

test('starter lockfile pins only delivered workspaces and portable dependency integrity', async () => {
  const prefix = 'skills/sql-apps/templates/starter/';
  const lock = JSON.parse(await read(prefix + 'package-lock.json'));
  assert.equal(lock.lockfileVersion, 3);
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (!location.startsWith('node_modules/') || entry.link) continue;
    assert.equal(entry.resolved, undefined, 'Do not bind to a maintainer registry');
    let owner = location;
    while (lock.packages[owner].inBundle) {
      const boundary = owner.lastIndexOf('/node_modules/');
      assert.ok(boundary > 0);
      owner = owner.slice(0, boundary);
    }
    assert.match(lock.packages[owner].integrity, /^sha(1|256|384|512)-/);
  }
  for (const location of ['', 'packages/frontend', 'packages/data', 'packages/server', 'packages/shared']) {
    const manifest = JSON.parse(await read(prefix + (location ? location + '/' : '') + 'package.json'));
    for (const section of ['dependencies', 'devDependencies']) {
      assert.deepEqual(manifest[section], lock.packages[location][section]);
      for (const [name, version] of Object.entries(manifest[section] || {})) {
        if (name.startsWith('@app/')) continue;
        assert.match(version, /^\d+\.\d+\.\d+$/);
        assert.equal(lock.packages[`node_modules/${name}`].version, version);
      }
    }
  }
});

test('default runtime pins container images, denies anonymous data and enforces SQL invariants', async () => {
  const prefix = 'skills/sql-apps/templates/starter/';
  const baseline = JSON.parse(await read(prefix + 'baseline.json'));
  const compose = await read(prefix + 'compose.yml') + await read(prefix + 'compose.sql.yml');
  const config = JSON.parse(await read(prefix + 'packages/data/dab-config.json'));
  for (const image of Object.values(baseline.images)) {
    assert.match(image, /@sha256:[a-f0-9]{64}$/);
    assert.ok(compose.includes(image));
  }
  assert.match(compose, /pull_policy: never/);
  assert.equal(config['data-source'].options['set-session-context'], true);
  assert.equal(config.runtime.host.authentication.provider, 'Custom');
  for (const entity of Object.values(config.entities)) {
    assert.ok(entity.permissions.every(permission => permission.role === 'authenticated'));
  }
  assert.equal(config.entities.Items.source.type, 'view');
  assert.equal(config.entities.CreateItem.source.type, 'stored-procedure');
  const migration = await read(prefix + 'packages/data/migrations/001-initial.sql');
  for (const statement of ["SESSION_CONTEXT(N'oid')", 'UNIQUE (OwnerId, Label)',
    'BEGIN TRANSACTION', 'COMMIT TRANSACTION']) assert.ok(migration.includes(statement));
  assert.match(await read(prefix + 'packages/data/permissions.sql'), /DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo/);
});
