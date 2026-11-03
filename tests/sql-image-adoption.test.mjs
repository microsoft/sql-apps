import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const starter = new URL('../skills/sql-apps/templates/starter/', import.meta.url);
const original = 'sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev@sha256:1f6fd8be2c87e0da495f1ca4df01546c091ec7fdb14f16f3f8743b30a9e9266f';
const image = 'sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev@sha256:' + 'a'.repeat(64);
const env = { COMPOSE_PROJECT_NAME: 'sqlapps-0123456789ab' };

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-adopt-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const file of ['baseline.json', 'compose.sql.yml']) await cp(new URL(file, starter), join(directory, file));
  return directory;
}

function docker(state = '', metadata = {}) {
  return args => {
    if (args[0] === 'ps') {
      assert.deepEqual(args.slice(1), ['--all', '--filter', 'label=com.docker.compose.project=sqlapps-0123456789ab', '--format', '{{.State}}']);
      return state;
    }
    assert.deepEqual(args, ['image', 'inspect', image]);
    return JSON.stringify([{
      Id: 'sha256:' + 'b'.repeat(64), Os: 'linux', Architecture: 'amd64', RepoDigests: [image], ...metadata,
    }]);
  };
}

test('explicit cached SQL adoption updates both references and records original baseline with unverified gates', async t => {
  const { adoptSqlImage } = await import('../skills/sql-apps/templates/starter/scripts/adopt-sql.mjs');
  const directory = await fixture(t);
  const before = await readFile(join(directory, 'baseline.json'), 'utf8');
  const result = await adoptSqlImage({ directory, image, reason: 'Approved cached preview for isolated app', env, run: docker() });
  assert.equal(JSON.parse(await readFile(join(directory, 'baseline.json'), 'utf8')).images.sql, image);
  assert.ok((await readFile(join(directory, 'compose.sql.yml'), 'utf8')).includes(image));
  const record = JSON.parse(await readFile(result.record, 'utf8'));
  assert.equal(record.previousImage, original);
  assert.equal(record.image, image);
  assert.equal(record.previousBaseline, before);
  assert.equal(record.status, 'pending-integration');
  assert.deepEqual(record.requiredChecks, ['EngineEdition 5', 'appdb', 'migrations and permissions', 'selected API authenticated integration']);
});

for (const state of ['running', 'paused', 'restarting']) {
  test(`SQL adoption refuses ${state} project containers and preserves both references`, async t => {
    const { adoptSqlImage } = await import('../skills/sql-apps/templates/starter/scripts/adopt-sql.mjs');
    const directory = await fixture(t);
    await assert.rejects(adoptSqlImage({ directory, image, reason: 'Approved', env, run: docker(state) }), /Stop|stopped/);
    assert.equal(JSON.parse(await readFile(join(directory, 'baseline.json'), 'utf8')).images.sql, original);
    assert.deepEqual((await readdir(directory)).sort(), ['baseline.json', 'compose.sql.yml']);
  });
}

for (const metadata of [{ RepoDigests: [] }, { Os: 'windows' }, { Architecture: 'arm64' }]) {
  test('SQL adoption requires the exact cached repository digest and supported platform', async t => {
    const { adoptSqlImage } = await import('../skills/sql-apps/templates/starter/scripts/adopt-sql.mjs');
    const directory = await fixture(t);
    await assert.rejects(adoptSqlImage({ directory, image, reason: 'Approved', env, run: docker('', metadata) }), /cached|linux\/amd64/);
    assert.equal(JSON.parse(await readFile(join(directory, 'baseline.json'), 'utf8')).images.sql, original);
  });
}

test('SQL adoption rejects mutable tags, other repositories, missing reason, and inconsistent originals before Docker inspection', async t => {
  const { adoptSqlImage } = await import('../skills/sql-apps/templates/starter/scripts/adopt-sql.mjs');
  const directory = await fixture(t);
  const run = () => { throw new Error('Docker must not run for invalid adoption requests.'); };
  for (const options of [{ image: original.split('@')[0] + ':latest' },
    { image: 'unapproved.example/sql@sha256:' + 'a'.repeat(64) }, { reason: '' }]) {
    await assert.rejects(adoptSqlImage({ directory, image, reason: 'Approved', env, run, ...options }), /immutable|repository|reason/);
  }
  await writeFile(join(directory, 'compose.sql.yml'), `services:\n  sql:\n    image: ${original}unexpected`);
  await assert.rejects(adoptSqlImage({ directory, image, reason: 'Approved', env, run }), /baseline|reference/);
  await writeFile(join(directory, 'compose.sql.yml'), 'services:\n  sql:\n    image: unexpected');
  await assert.rejects(adoptSqlImage({ directory, image, reason: 'Approved', env, run }), /baseline|reference/);
  assert.equal(JSON.parse(await readFile(join(directory, 'baseline.json'), 'utf8')).images.sql, original);
});
