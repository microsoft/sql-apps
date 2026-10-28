import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { deploymentProfile, prepareDeployment } from '../skills/sql-apps/templates/starter/scripts/deployment.mjs';

const starter = fileURLToPath(new URL('../skills/sql-apps/templates/starter/', import.meta.url));
const read = file => readFile(join(starter, file), 'utf8');

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
  for (const [file, contents] of [
    ['deployment.json', '{"hosting":"static-web-apps","api":"functions"}'],
    ['packages/frontend/dist/index.html', '<h1>Built</h1>'],
    ['packages/functions/host.json', '{"version":"2.0"}'],
    ['packages/functions/package-lock.json', '{}'],
    ['packages/functions/local.settings.json', '{"secret":"never"}'],
    ['packages/functions/.env', 'secret=never'],
    ['packages/functions/.env.production', 'secret=never'],
    ['staticwebapp.config.json', await read('staticwebapp.config.json')],
  ]) await writeFile(join(directory, file), contents);
  const { output, profile } = await prepareDeployment(directory);
  assert.equal(profile.api, 'functions');
  assert.equal(await readFile(join(output, 'app/index.html'), 'utf8'), '<h1>Built</h1>');
  assert.ok(existsSync(join(output, 'api/host.json')));
  assert.ok(existsSync(join(output, 'api/package-lock.json')));
  for (const file of ['node_modules', 'local.settings.json', '.env', '.env.production']) {
    assert.ok(!existsSync(join(output, 'api', file)), `Staged private/local file: ${file}`);
  }
  assert.equal(JSON.parse(await readFile(join(output, 'app/staticwebapp.config.json'), 'utf8')).platform.apiRuntime, 'node:22');
  await assert.rejects(prepareDeployment(directory), { code: 'EEXIST' });
});

function compile(file) {
  const installed = join(homedir(), '.azure', 'bin', process.platform === 'win32' ? 'bicep.exe' : 'bicep');
  return JSON.parse(execFileSync(process.env.BICEP_CLI_PATH || (existsSync(installed) ? installed : 'bicep'),
    ['build', join(starter, 'infra', file), '--stdout'], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
}

test('F1 recipe preserves DAB and never silently selects paid infrastructure', () => {
  const template = compile('app-service-f1.bicep');
  const resources = Object.values(template.resources);
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

test('both Rayfin intent variants keep SQL but enable only the selected runtime', async () => {
  const dab = await readFile(new URL('../skills/sql-apps/templates/rayfin.yml', import.meta.url), 'utf8');
  const functions = await readFile(new URL('../skills/sql-apps/templates/rayfin.functions.yml', import.meta.url), 'utf8');
  assert.match(dab, /data:\s+enabled: true\s+dialect: mssql/);
  assert.match(dab, /functions:\s+enabled: false/);
  assert.match(functions, /data:\s+enabled: false\s+dialect: mssql/);
  assert.match(functions, /functions:\s+enabled: true\s+path: packages\/functions/);
  assert.match(functions, /buildCommand: node --check src\/index\.mjs/);
  assert.match(functions, /not executable/);
});

test('Functions bootstrap creates only the approved client-ID user and reuses restricted grants', async () => {
  const source = await read('infra/functions-bootstrap.sql');
  assert.match(source, /TRY_CONVERT\(uniqueidentifier, '\$\(FunctionsClientId\)'\)/);
  assert.match(source, /00000000-0000-0000-0000-000000000000/);
  assert.match(source, /Existing app_functions identity differs/);
  assert.match(source, /CREATE USER app_functions WITH SID/);
  assert.match(source, /TYPE = E/);
  assert.match(source, /:r packages\/data\/functions-permissions.sql/);
  assert.doesNotMatch(source, /db_owner|db_datawriter|CREATE LOGIN|app_runtime/);
});
