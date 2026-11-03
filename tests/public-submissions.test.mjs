import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { installAlternative } from '../skills/sql-apps/templates/alternatives/install.mjs';
import { configuration, deploymentProfile } from '../skills/sql-apps/templates/starter/scripts/config.ts';
import { prepareDeployment } from '../skills/sql-apps/templates/starter/scripts/deployment.mjs';
import { copyStarter } from './fixtures/starter-copy.mjs';

const templates = resolve('skills/sql-apps/templates');
const read = file => readFile(resolve(templates, file), 'utf8');

test('public local configuration starts without identity but rejects partial and tenant-unbound identity settings', () => {
  const env = { APP_ORIGIN: 'http://127.0.0.1:5180', DAB_URL: 'http://127.0.0.1:7071' };
  assert.equal(configuration(env, 'public-submissions').publicConfig.ownerAuth, null);
  assert.throws(() => configuration(env));
  assert.throws(() => configuration({ ...env, AUTH_CLIENT_ID: 'partial' }, 'public-submissions'));
});

test('public inbox is an explicit Functions-only access profile', () => {
  const profile = deploymentProfile({ hosting: 'static-web-apps', api: 'functions', access: 'public-submissions' });
  assert.equal(profile.access, 'public-submissions');
  for (const value of [
    { hosting: 'container-apps', api: 'dab', access: 'public-submissions' },
    { hosting: 'static-web-apps', api: 'functions', access: 'anonymous' },
    { hosting: 'app-service-f1', api: 'dab', access: 'public-submissions' },
  ]) assert.throws(() => deploymentProfile(value), /deployment.json/);
  assert.equal(deploymentProfile({ hosting: 'static-web-apps', api: 'functions' }).access, undefined);
});

test('public installer materializes immutable code selection and forward migration without changing protected starter', async t => {
  const directory = await mkdtemp(resolve('.public-profile-test-'));
  t.after(() => rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  await copyStarter(directory);
  await installAlternative('static-web-apps-public', directory);
  const installed = file => readFile(resolve(directory, file), 'utf8');
  const readme = await installed('README.md');
  assert.match(readme, /accepts anonymous/);
  assert.doesNotMatch(readme, /Identity decision comes first|ACCEPTANCE_TOKEN_A/);
  const deployment = await installed('deployment.md');
  for (const document of [readme, deployment]) {
    for (const match of document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(https:\/\/|mailto:|#)/.test(match[1])) continue;
      await installed(match[1].split('#')[0]);
    }
  }
  assert.match(deployment, /002-public-submissions\.sql/);
  assert.match(await installed('deployment.md'), /Functions operator steps/);
  assert.doesNotMatch(await installed('deployment.md'), /Container Apps Consumption/);
  const migrationGuide = await installed('deployment-migrations.md');
  assert.match(migrationGuide, /002-public-submissions\.sql/);
  assert.match(migrationGuide, /MigrationHash=\$hash/);
  assert.match(migrationGuide, /consecutive/i);
  assert.match(migrationGuide, /unknown or duplicate version/i);
  assert.match(migrationGuide, /history is not consecutive/i);
  assert.deepEqual(JSON.parse(await installed('deployment.json')),
    { hosting: 'static-web-apps', api: 'functions', access: 'public-submissions' });
  assert.match(await installed('packages/functions/src/profile.ts'), /public-submissions/);
  assert.match(await installed('packages/frontend/src/profile.ts'), /public-submissions/);
  const infrastructure = await installed('infra/static-web-apps.bicep');
  assert.match(infrastructure, /param ownerAuth OwnerAuthentication\?\r?$/m);
  assert.match(infrastructure, /ownerAuth == null \? \{\} :/);
  assert.match(infrastructure, /properties: union\(/);
  for (const setting of ['authority', 'issuer', 'audience', 'clientId', 'scope']) {
    assert.match(infrastructure, new RegExp(`@minLength\\(1\\)\\s+${setting}: string`));
  }
  assert.match(infrastructure, /@secure\(\)\s+@minLength\(1\)\s+param sqlClientSecret string/);
  assert.match(await installed('infra/static-web-apps.bicepparam'), /param ownerAuth = null/);
  const protectedInfrastructure = await read('alternatives/static-web-apps/infra/static-web-apps.bicep');
  for (const setting of ['Authority', 'Issuer', 'Audience', 'ClientId', 'Scope']) {
    assert.match(protectedInfrastructure, new RegExp(`@minLength\\(1\\)\\s+param auth${setting} string`));
  }
  const manifest = JSON.parse(await installed('package.json'));
  assert.equal(manifest.scripts['images:build'], undefined);
  assert.ok(manifest.scripts['local:adopt-sql']);
  assert.equal(await installed('packages/data/migrations/001-initial.sql'), await read('starter/packages/data/migrations/001-initial.sql'));
  assert.match(await installed('packages/data/migrations/002-public-submissions.sql'), /Version, Checksum/);
  for (const permissions of ['permissions.sql', 'functions-permissions.sql']) {
    const sql = await installed(`packages/data/${permissions}`);
    assert.match(sql, /GRANT EXECUTE ON OBJECT::api.Submit/);
    assert.match(sql, /GRANT EXECUTE ON OBJECT::api.Submissions/);
    assert.match(sql, /DENY EXECUTE ON OBJECT::api.CreateItem/);
    assert.match(sql, /DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo/);
    assert.doesNotMatch(sql, /GRANT\s+(?:INSERT|UPDATE|DELETE).*SubmissionOwners/i);
  }
  assert.match(await read('alternatives/static-web-apps/packages/functions/src/profile.ts'), /protected/);
  assert.match(await read('starter/packages/frontend/src/profile.ts'), /protected/);
  const selected = await installed('deployment.json');
  await writeFile(resolve(directory, 'deployment.json'), '{"hosting":"static-web-apps","api":"functions"}');
  assert.throws(() => execFileSync(process.execPath, ['scripts/check-config.mjs'], { cwd: directory, stdio: 'pipe' }),
    'Build must reject a deployment profile that disagrees with compiled application-owned access selection.');
  await writeFile(resolve(directory, 'deployment.json'), selected);
  for (const folder of ['packages/frontend/dist', 'packages/functions/dist']) {
    await mkdir(resolve(directory, folder), { recursive: true });
  }
  await writeFile(resolve(directory, 'packages/frontend/dist/index.html'), '<h1>Public inbox</h1>');
  await writeFile(resolve(directory, 'packages/functions/dist/index.js'), 'import "./profile.js";');
  const compiledProfile = (await installed('packages/functions/src/profile.ts')).replace(': string', '');
  await writeFile(resolve(directory, 'packages/functions/dist/profile.js'), compiledProfile);
  const { output, profile } = await prepareDeployment(directory);
  assert.equal(profile.access, 'public-submissions');
  assert.equal(JSON.parse(await readFile(resolve(output, 'profile.json'), 'utf8')).access, 'public-submissions');
  assert.equal(await readFile(resolve(output, 'api/dist/profile.js'), 'utf8'), compiledProfile);
});

test('SQL public budget serializes hosts, rolls back failures, and owner membership is checked inside the read', async () => {
  const sql = await read('alternatives/public-submissions/packages/data/migrations/002-public-submissions.sql');
  assert.match(sql, /WITH\s*\(UPDLOCK,\s*HOLDLOCK\)/i);
  assert.match(sql, /MinuteLimit[^]*60/);
  assert.match(sql, /RowLimit[^]*1000/);
  assert.match(sql, /BEGIN TRANSACTION[^]*COMMIT TRANSACTION/i);
  assert.match(sql, /BEGIN CATCH[^]*ROLLBACK TRANSACTION[^]*THROW/i);
  assert.match(sql, /THROW 51029/);
  assert.match(sql, /CREATE PROCEDURE api.Submissions[^]*@TenantId uniqueidentifier[^]*@OwnerId uniqueidentifier/);
  assert.match(sql, /dbo.SubmissionOwners[^]*TenantId = @TenantId AND OwnerId = @OwnerId/);
  assert.match(sql, /SELECT TOP \(100\) Id, Label, CreatedAt FROM dbo.Submissions/);
  assert.doesNotMatch(sql, /CREATE PROCEDURE[^]*INSERT dbo.SubmissionOwners/i);
  const owner = await read('alternatives/public-submissions/packages/data/operator-owner.sql');
  assert.match(owner, /DECLARE @Approved bit = 0/);
  assert.match(owner, /DATALENGTH\(@TenantText\) <> 72/);
  assert.match(owner, /DELETE dbo.SubmissionOwners WHERE TenantId = @TenantId AND OwnerId = @OwnerId/);
  assert.match(owner, /00000000-0000-0000-0000-000000000000/);
});
