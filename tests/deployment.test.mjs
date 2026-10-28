import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const starter = join(root, 'skills', 'sql-apps', 'templates', 'starter');
const read = path => readFileSync(join(root, path), 'utf8');

test('current guidance uses the bundled recipe without Azure skill workflows', () => {
  for (const path of [
    'skills/sql-apps/SKILL.md',
    'skills/sql-apps/references/constitution.md',
    'skills/sql-apps/references/prerequisites.md',
    'skills/sql-apps/references/deployment.md',
    'skills/sql-apps/templates/starter/deployment.md',
    'docs/installation.md', 'SUPPORT.md', 'plan.md',
  ]) {
    assert.doesNotMatch(read(path), /Azure Skills|azure-skills|azure-app-onboard|azure-prepare|azure-validate|azure-deploy/);
  }
  assert.match(read('skills/sql-apps/SKILL.md'), /Container Apps/);
  assert.match(read('skills/sql-apps/references/prerequisites.md'), /Azure CLI/);
});

test('container artifacts preserve real DAB and exclude local secrets', () => {
  const web = readFileSync(join(starter, 'Dockerfile.web'), 'utf8');
  const dab = readFileSync(join(starter, 'Dockerfile.dab'), 'utf8');
  const ignore = readFileSync(join(starter, '.dockerignore'), 'utf8');
  const baseline = JSON.parse(readFileSync(join(starter, 'baseline.json'), 'utf8'));
  assert.match(web, /npm ci/);
  assert.match(web, /npm run build/);
  assert.match(web, /USER node/);
  assert.match(web, /APP_HOST=0\.0\.0\.0/);
  assert.match(web, /CMD \["node", "dist\/packages\/server\/server\.js"\]/);
  assert.match(web, /COPY .*tsconfig\.backend\.json/);
  assert.match(web, /COPY --from=build --chown=node:node \/app\/dist \.\/dist/);
  assert.ok(dab.includes(baseline.images.dab));
  assert.match(dab, /COPY packages\/data\/dab-config\.json/);
  for (const entry of ['.env', '.env.*', '.local', '**/node_modules', '.git']) {
    assert.ok(ignore.split(/\r?\n/).includes(entry), `Missing context exclusion: ${entry}`);
  }
});

test('compiled infrastructure enforces the PoC resource contract', () => {
  const installed = join(homedir(), '.azure', 'bin', process.platform === 'win32' ? 'bicep.exe' : 'bicep');
  const bicep = process.env.BICEP_CLI_PATH || (existsSync(installed) ? installed : 'bicep');
  const template = JSON.parse(execFileSync(bicep, ['build', join(starter, 'infra', 'main.bicep'), '--stdout'], {
    encoding: 'utf8', maxBuffer: 2 * 1024 * 1024,
  }));
  const resources = Object.values(template.resources);
  const byType = type => resources.filter(resource => resource.type === type);
  const environment = byType('Microsoft.App/managedEnvironments');
  assert.equal(environment.length, 1);
  assert.deepEqual(environment[0].properties.appLogsConfiguration, {});
  assert.deepEqual(environment[0].properties.workloadProfiles, [
    { name: 'Consumption', workloadProfileType: 'Consumption' },
  ]);
  const apps = byType('Microsoft.App/containerApps');
  assert.equal(apps.length, 2);
  assert.deepEqual(apps.map(app => app.properties.configuration.ingress.external).sort(), [false, true]);
  for (const app of apps) {
    assert.equal(app.condition, "[parameters('deployApplications')]");
    assert.equal(app.properties.workloadProfileName, 'Consumption');
    assert.equal(app.properties.configuration.ingress.allowInsecure, false);
    assert.equal(app.properties.configuration.activeRevisionsMode, 'Single');
    assert.equal(app.properties.template.scale.minReplicas, 0);
    assert.equal(app.properties.template.scale.maxReplicas, 1);
    assert.equal(app.properties.template.containers[0].resources.cpu, "[json('0.25')]");
    assert.equal(app.properties.template.containers[0].resources.memory, '0.5Gi');
    assert.equal(app.properties.template.scale.rules[0].http.metadata.concurrentRequests, '10');
    assert.equal(app.identity.type, 'UserAssigned');
    const registries = app.properties.configuration.registries;
    assert.match(JSON.stringify(registries), /privateRegistryServer/);
    assert.match(JSON.stringify(registries), /identity/);
    assert.match(JSON.stringify(registries), /empty\(parameters\('privateRegistryUsername'\)\)/);
  }
  assert.equal(template.parameters.privateRegistryServer.defaultValue, '');
  assert.equal(template.parameters.privateRegistryPassword.type, 'securestring');
  for (const app of apps) {
    assert.match(JSON.stringify(app.properties.configuration.secrets), /privateRegistryPassword/);
    assert.match(JSON.stringify(app.properties.configuration.registries), /passwordSecretRef/);
  }
  const server = byType('Microsoft.Sql/servers')[0];
  assert.equal(server.properties.administrators.azureADOnlyAuthentication, true);
  assert.equal(server.properties.minimalTlsVersion, '1.2');
  assert.ok(!Object.hasOwn(server.properties, 'administratorLoginPassword'));
  const sql = byType('Microsoft.Sql/servers/databases')[0];
  assert.equal(sql.properties.useFreeLimit, true);
  assert.equal(sql.properties.freeLimitExhaustionBehavior, 'AutoPause');
  assert.equal(sql.sku.tier, 'GeneralPurpose');
  assert.equal(template.parameters.allowAzureServices.defaultValue, false);
  assert.equal(template.parameters.deployApplications.defaultValue, false);
  assert.match(template.outputs.dabClientId.value, /clientId/);
  assert.ok(byType('Microsoft.Sql/servers/firewallRules').every(rule => rule.condition));
  assert.equal(byType('Microsoft.ManagedIdentity/userAssignedIdentities').length, 1);
  for (const type of ['Microsoft.ContainerRegistry/registries', 'Microsoft.OperationalInsights/workspaces',
    'Microsoft.Network/natGateways', 'Microsoft.Network/privateEndpoints']) {
    assert.equal(byType(type).length, 0, `Unexpected supporting meter: ${type}`);
  }
  assert.equal(template.variables.tags['sqlapps-version'], "[parameters('sqlappsVersion')]");
  for (const app of apps) assert.equal(app.tags, "[variables('tags')]");
  const serialized = JSON.stringify(template);
  assert.match(serialized, /Authentication=Active Directory Managed Identity/);
  assert.match(serialized, /Encrypt=True;TrustServerCertificate=False/);
  assert.doesNotMatch(serialized, /administratorLoginPassword|BillOverUsage|TrustServerCertificate=True/);
});

test('deployment documents bootstrap, networking, costs, and unverified cloud acceptance', () => {
  const doc = readFileSync(join(starter, 'deployment.md'), 'utf8');
  for (const text of ['what-if', 'AutoPause', 'allowAzureServices', 'managed identity',
    'subscription', 'overage', 'unverified', 'restart', 'bootstrap', 'oid']) {
    assert.ok(doc.includes(text), `Missing deployment contract: ${text}`);
  }
  assert.ok(existsSync(join(starter, 'infra', 'main.bicepparam')));
  const bootstrap = readFileSync(join(starter, 'infra', 'bootstrap.sql'), 'utf8');
  assert.match(bootstrap, /CREATE USER.*WITH SID/);
  assert.match(bootstrap, /TYPE = E/);
  assert.match(bootstrap, /:r .*permissions\.sql/);
  assert.doesNotMatch(bootstrap, /db_owner|db_datawriter|db_datareader/);
});
