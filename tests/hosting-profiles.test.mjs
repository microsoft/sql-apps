import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { deploymentProfile, prepareDeployment } from '../skills/sql-apps/templates/starter/scripts/deployment.mjs';

const starter = fileURLToPath(new URL('../skills/sql-apps/templates/starter/', import.meta.url));
const read = file => readFile(join(starter, file), 'utf8');
const alternatives = fileURLToPath(new URL('../skills/sql-apps/templates/alternatives/', import.meta.url));
const readAlternative = (profile, file) => readFile(join(alternatives, profile, file), 'utf8');

async function builtFunctions(directory) {
  for (const folder of ['infra', 'packages/frontend/dist', 'packages/functions/dist']) {
    await mkdir(join(directory, folder), { recursive: true });
  }
  for (const [file, contents] of [
    ['deployment.json', '{"hosting":"static-web-apps","api":"functions"}'],
    ['infra/static-web-apps.bicep', "targetScope = 'resourceGroup'"],
    ['packages/frontend/dist/index.html', '<h1>Built</h1>'],
    ['packages/functions/dist/index.js', 'export {};'],
    ['packages/functions/host.json', '{"version":"2.0"}'],
    ['packages/functions/package.json', '{"type":"module"}'],
    ['packages/functions/package-lock.json', '{}'],
    ['staticwebapp.config.json', '{}'],
  ]) await writeFile(join(directory, file), contents);
}

test('hosting selection only accepts implemented API/host combinations', () => {
  for (const [hosting, api] of [['container-apps', 'dab'], ['app-service-f1', 'dab'], ['static-web-apps', 'functions']]) {
    assert.equal(deploymentProfile({ hosting, api }).api, api);
  }
  for (const value of [null, [], {}, { hosting: '__proto__', api: 'dab' },
    { hosting: 'static-web-apps', api: 'dab' }, { hosting: 'app-service-f1', api: 'functions' },
    { hosting: 'container-apps', api: 'dab', sqlPassword: 'secret' }]) {
    assert.throws(() => deploymentProfile(value), /deployment.json/);
  }
});

test('SWA staging includes built assets and a self-contained API, not local secrets', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-profile-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'packages/frontend/dist'), { recursive: true });
  await mkdir(join(directory, 'packages/functions/node_modules'), { recursive: true });
  await mkdir(join(directory, 'packages/functions/dist'), { recursive: true });
  await mkdir(join(directory, 'packages/functions/src'), { recursive: true });
  await mkdir(join(directory, 'infra'), { recursive: true });
  for (const [file, contents] of [
    ['deployment.json', '{"hosting":"static-web-apps","api":"functions"}'],
    ['infra/static-web-apps.bicep', "targetScope = 'resourceGroup'"],
    ['packages/frontend/dist/index.html', '<h1>Built</h1>'],
    ['packages/functions/host.json', '{"version":"2.0"}'],
    ['packages/functions/package.json', '{"type":"module","main":"dist/index.js"}'],
    ['packages/functions/dist/index.js', 'export {};'],
    ['packages/functions/src/index.ts', 'export {};'],
    ['packages/functions/tsconfig.json', '{}'],
    ['packages/functions/package-lock.json', '{}'],
    ['packages/functions/local.settings.json', '{"secret":"never"}'],
    ['packages/functions/.env', 'secret=never'],
    ['packages/functions/.env.production', 'secret=never'],
    ['staticwebapp.config.json', await readAlternative('static-web-apps', 'staticwebapp.config.json')],
  ]) await writeFile(join(directory, file), contents);
  const { output, profile } = await prepareDeployment(directory);
  assert.equal(profile.api, 'functions');
  assert.equal(await readFile(join(output, 'app/index.html'), 'utf8'), '<h1>Built</h1>');
  assert.ok(existsSync(join(output, 'api/host.json')));
  assert.ok(existsSync(join(output, 'api/package-lock.json')));
  assert.equal(await readFile(join(output, 'api/dist/index.js'), 'utf8'), 'export {};');
  for (const file of ['src', 'tsconfig.json', 'node_modules', 'local.settings.json', '.env', '.env.production']) {
    assert.ok(!existsSync(join(output, 'api', file)), `Staged private/local file: ${file}`);
  }
  assert.equal(JSON.parse(await readFile(join(output, 'app/staticwebapp.config.json'), 'utf8')).platform.apiRuntime, 'node:22');
  await mkdir(join(output, 'api/node_modules'), { recursive: true });
  await writeFile(join(output, 'api/node_modules/installed.js'), 'installed dependency');
  await writeFile(join(directory, 'packages/frontend/dist/index.html'), '<h1>Rebuilt</h1>');
  await rm(join(directory, 'packages/functions/dist/index.js'));
  await writeFile(join(directory, 'packages/functions/dist/index.js'), 'export const updated = true;');
  const repeated = await prepareDeployment(directory);
  assert.equal(repeated.output, output);
  assert.equal(await readFile(join(output, 'app/index.html'), 'utf8'), '<h1>Rebuilt</h1>');
  assert.equal(existsSync(join(output, 'api/node_modules')), false, 'Stale dependencies must be reinstalled.');
  await writeFile(join(output, 'operator-notes.txt'), 'preserve me');
  await assert.rejects(prepareDeployment(directory), /unknown|unrecognized|unexpected/i);
  assert.equal(await readFile(join(output, 'operator-notes.txt'), 'utf8'), 'preserve me');
  assert.equal(await readFile(join(output, 'app/index.html'), 'utf8'), '<h1>Rebuilt</h1>');
  await rm(join(output, 'operator-notes.txt'));
  await writeFile(join(output, 'app/operator-notes.txt'), 'nested notes');
  await assert.rejects(prepareDeployment(directory), /unrecognized/i);
  assert.equal(await readFile(join(output, 'app/operator-notes.txt'), 'utf8'), 'nested notes');
  await rm(join(output, 'app/operator-notes.txt'));
  await mkdir(join(output, 'operator-directory'));
  await assert.rejects(prepareDeployment(directory), /unrecognized/i);
  assert.ok(existsSync(join(output, 'operator-directory')), 'Unknown empty directories must also be preserved.');
});

test('DAB preparation validates the recipe without a receipt-only output directory', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-dab-profile-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'infra'));
  await writeFile(join(directory, 'deployment.json'), '{"hosting":"container-apps","api":"dab"}');
  await writeFile(join(directory, 'infra/main.bicep'), "targetScope = 'resourceGroup'");
  for (const file of ['Dockerfile.web', 'Dockerfile.dab']) await writeFile(join(directory, file), 'FROM pinned');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await prepareDeployment(directory);
    assert.equal(result.profile.api, 'dab');
    assert.equal(result.output, undefined);
    assert.equal(existsSync(join(directory, '.deployment')), false);
  }
});

test('SWA staging rejects an unowned existing directory without changing it', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-unowned-profile-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, '.deployment/static-web-apps');
  await mkdir(output, { recursive: true });
  await builtFunctions(directory);
  await writeFile(join(output, 'notes.txt'), 'not generated');
  await assert.rejects(prepareDeployment(directory), /generated marker/);
  assert.equal(await readFile(join(output, 'notes.txt'), 'utf8'), 'not generated');
});

test('failed re-staging preserves the last artifact and cleans temporary output', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-stage-failure-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await builtFunctions(directory);
  const { output } = await prepareDeployment(directory);
  await writeFile(join(directory, 'packages/frontend/dist/index.html'), '<h1>Changed</h1>');
  await rm(join(directory, 'staticwebapp.config.json'));
  await assert.rejects(prepareDeployment(directory), { code: 'ENOENT' });
  assert.equal(await readFile(join(output, 'app/index.html'), 'utf8'), '<h1>Built</h1>');
  assert.deepEqual(await readdir(join(directory, '.deployment')), ['static-web-apps']);
});

test('deployment staging never follows a redirected output directory', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-stage-symlink-'));
  const outside = await mkdtemp(join(tmpdir(), 'sqlapps-stage-outside-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  await builtFunctions(directory);
  await writeFile(join(outside, 'notes.txt'), 'outside app');
  await symlink(outside, join(directory, '.deployment'), 'junction');
  await assert.rejects(prepareDeployment(directory), /symlink/);
  assert.deepEqual(await readdir(outside), ['notes.txt']);
  assert.equal(await readFile(join(outside, 'notes.txt'), 'utf8'), 'outside app');
});
test('SWA preparation rejects an unbuilt Functions API before creating output', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sqlapps-unbuilt-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'deployment.json'), '{"hosting":"static-web-apps","api":"functions"}');
  await assert.rejects(prepareDeployment(directory), { code: 'ENOENT' });
  assert.equal(existsSync(join(directory, '.deployment')), false);
});

function compile(file) {
  const installed = join(homedir(), '.azure', 'bin', process.platform === 'win32' ? 'bicep.exe' : 'bicep');
  return JSON.parse(execFileSync(process.env.BICEP_CLI_PATH || (existsSync(installed) ? installed : 'bicep'),
    ['build', join(alternatives, file.startsWith('app-service') ? 'app-service-f1' : 'static-web-apps', 'infra', file), '--stdout'], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
}

test('F1 recipe preserves DAB and never silently selects paid infrastructure', () => {
  const template = compile('app-service-f1.bicep');
  const resources = Object.values(template.resources);
  assert.doesNotMatch(JSON.stringify([template.variables, resources.map(resource => resource.name)]), /-sqlapps/);
  const plan = resources.find(resource => resource.type === 'Microsoft.Web/serverfarms');
  assert.deepEqual(plan.sku, { name: 'F1', tier: 'Free' });
  assert.equal(plan.properties.reserved, true);
  const apps = resources.filter(resource => resource.type === 'Microsoft.Web/sites');
  assert.equal(apps.length, 2);
  for (const app of apps) {
    assert.equal(app.properties.siteConfig.alwaysOn, false);
    assert.equal(app.properties.httpsOnly, true);
    assert.equal(app.properties.siteConfig.ftpsState, 'Disabled');
    assert.match(app.properties.siteConfig.linuxFxVersion, /DOCKER/);
  }
  assert.equal(apps.filter(app => app.identity).length, 1, 'Only DAB needs the SQL identity.');
  assert.ok(resources.every(resource => !/Microsoft.Sql|Microsoft.ContainerRegistry|OperationalInsights/.test(resource.type)));
  assert.match(JSON.stringify(template), /Authentication=Active Directory Managed Identity/);
  assert.match(JSON.stringify(template), /TrustServerCertificate=False/);
  assert.match(JSON.stringify(template.outputs.dabClientId), /clientId/);
});

test('SWA recipe is Free with managed Functions and server-only Entra SQL credentials', () => {
  const template = compile('static-web-apps.bicep');
  const resources = Object.values(template.resources);
  assert.doesNotMatch(JSON.stringify([template.variables, resources.map(resource => resource.name)]), /-sqlapps/);
  assert.deepEqual(resources.map(resource => resource.type).sort(),
    ['Microsoft.Web/staticSites', 'Microsoft.Web/staticSites/config']);
  const site = resources.find(resource => resource.type === 'Microsoft.Web/staticSites');
  assert.deepEqual(site.sku, { name: 'Free', tier: 'Free' });
  assert.equal(site.properties.stagingEnvironmentPolicy, 'Disabled');
  assert.equal(template.parameters.sqlClientSecret.type, 'securestring');
  const settings = resources.find(resource => resource.type === 'Microsoft.Web/staticSites/config').properties;
  assert.equal(settings.SQL_CLIENT_SECRET, "[parameters('sqlClientSecret')]");
  assert.equal(settings.SQL_CLIENT_ID, "[parameters('sqlClientId')]");
  assert.equal(settings.SQL_TENANT_ID, '[tenant().tenantId]');
  assert.match(settings.APP_ORIGIN, /defaultHostname/);
  assert.doesNotMatch(JSON.stringify(template.outputs), /sqlClientSecret|SQL_CLIENT_SECRET/);
  assert.doesNotMatch(JSON.stringify(template), /administratorLoginPassword|linkedBackends|BillOverUsage/);
});

test('Functions bootstrap creates only the approved client-ID user and reuses restricted grants', async () => {
  const source = await readAlternative('static-web-apps', 'infra/functions-bootstrap.sql');
  assert.match(source, /TRY_CONVERT\(uniqueidentifier, '\$\(FunctionsClientId\)'\)/);
  assert.match(source, /00000000-0000-0000-0000-000000000000/);
  assert.match(source, /Existing app_functions identity differs/);
  assert.match(source, /CREATE USER app_functions WITH SID/);
  assert.match(source, /TYPE = E/);
  assert.match(source, /:r packages\/data\/functions-permissions.sql/);
  assert.doesNotMatch(source, /db_owner|db_datawriter|CREATE LOGIN|app_runtime/);
});
