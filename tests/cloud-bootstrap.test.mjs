import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const starter = join(root, 'skills', 'sql-apps', 'templates', 'starter');

test('cloud bootstrap binds the Azure client ID and refuses a principal-object-ID regression', {
  skip: process.env.SQLAPPS_CLOUD_BOOTSTRAP_TEST !== '1' ? 'Opt-in live Azure SQL test; see deployment runbook.' : false,
}, () => {
  for (const key of ['CLOUD_SQL_SERVER', 'CLOUD_SQL_DATABASE', 'CLOUD_IDENTITY_ID', 'CLOUD_SUBSCRIPTION']) {
    assert.ok(process.env[key], `Supply ${key} for the isolated review database.`);
  }
  const run = appRoot => spawnSync('python', [join(root, 'scripts', 'test-cloud-bootstrap.py'),
    '--app-root', appRoot, '--server', process.env.CLOUD_SQL_SERVER, '--database', process.env.CLOUD_SQL_DATABASE,
    '--identity', process.env.CLOUD_IDENTITY_ID, '--subscription', process.env.CLOUD_SUBSCRIPTION],
  { encoding: 'utf8', timeout: 180_000 });
  const positive = run(starter);
  assert.ifError(positive.error);
  assert.equal(positive.status, 0, positive.stderr);
  assert.match(positive.stdout, /CLOUD SQL BOOTSTRAP PASSED/);
  const fixture = mkdtempSync(join(tmpdir(), 'sqlapps-bootstrap-'));
  try {
    cpSync(join(starter, 'infra'), join(fixture, 'infra'), { recursive: true });
    cpSync(join(starter, 'packages', 'data', 'permissions.sql'), join(fixture, 'permissions.sql'));
    const path = join(fixture, 'infra', 'bootstrap.sql');
    const source = readFileSync(path, 'utf8');
    const mutated = source.replace('CONVERT(binary(16), @ClientId)',
      "CONVERT(binary(16), CONVERT(uniqueidentifier, '$(DabPrincipalId)'))")
      .replace(':r packages/data/permissions.sql', ':r permissions.sql');
    assert.notEqual(mutated, source, 'Mutation must replace the actual SID binding.');
    writeFileSync(path, mutated);
    const negative = run(fixture);
    assert.ifError(negative.error);
    assert.notEqual(negative.status, 0, 'Wrong principal object ID must fail against real SQL.');
    assert.match(negative.stderr, /Existing app_runtime identity differs/);
    const after = run(starter);
    assert.ifError(after.error);
    assert.equal(after.status, 0, 'The failed mutation must leave the correct principal intact: ' + after.stderr);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
