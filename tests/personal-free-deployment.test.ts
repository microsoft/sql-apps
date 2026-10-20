import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  approveProtectedDeploymentRevision,
  createPersonalFreeResourceGroup,
  createProtectedDeploymentState,
  initPersonalFreeConfig,
  planPersonalFreeDeployment,
  readPersonalFreeConfig,
  saveProtectedDeploymentState,
  verifyPersonalFreeReadiness,
  verifyPersonalFreeInfrastructure,
} from '../src/personal-free-deployment.js';
import type { Run } from '../src/process.js';

const subscriptionId = '11111111-1111-4111-8111-111111111111';
const tenantId = '22222222-2222-4222-8222-222222222222';
const operatorId = '33333333-3333-4333-8333-333333333333';

test('personal-free init is read-only and plan binds warnings to approval', async () => {
  const calls: string[][] = [];
  const run: Run = async (command, args) => {
    calls.push([command, ...args]);
    if (args[0] === 'account') return JSON.stringify({
      id: subscriptionId, tenantId, user: { name: 'owner@example.com', type: 'user' },
    });
    if (args[0] === 'ad') return operatorId;
    if (args[0] === 'group' && args[1] === 'exists') return 'false';
    throw new Error('unexpected write');
  };
  const config = await initPersonalFreeConfig({
    name: 'Personal Tracker',
    subscriptionId,
    webLocation: 'westus2',
    dataLocation: 'westus2',
    sharing: 'personal',
    resourceGroup: 'rg-personal',
    environment: 'dev',
  }, run);
  assert.equal(config.profile, 'personal-free');
  assert.equal(config.name, 'personal-tracker');
  assert.ok(calls.every(call => call[1] === 'account' || call[1] === 'ad' || (call[1] === 'group' && call[2] === 'exists')));
  const plan = planPersonalFreeDeployment(config, 'source-hash');
  assert.match(plan.summary, /potentially \$0/i);
  assert.match(plan.summary, /no SLA/i);
  assert.match(plan.summary, /public endpoint/i);
  assert.match(plan.summary, /all resources inside the Azure boundary/i);
  assert.match(plan.summary, /Creation card/);
  assert.match(plan.summary, /Resource group: rg-personal \| region: westus2 \| cost: no charge \| undo: az group delete/);
  assert.match(plan.summary, /Static Web App: personal-tracker-dev-<id> \| region: westus2 \| cost: Free SKU/);
  assert.match(plan.summary, /Azure SQL database: app \| region: westus2 \| cost: free tier/);
  assert.match(plan.summary, /web and data both in westus2/);
  assert.match(plan.summary, /Sharing: personal/);
  assert.match(plan.approval, /^[a-f0-9]{12}$/);
  assert.equal(planPersonalFreeDeployment(config, 'changed').approval === plan.approval, false);

  const split = planPersonalFreeDeployment({ ...config, dataLocation: 'swedencentral', sharing: 'team' }, 'source-hash');
  assert.match(split.summary, /web in westus2, data in swedencentral[\s\S]*cross regions/);
  assert.match(split.summary, /Azure SQL server: personal-tracker-dev-<id> \| region: swedencentral/);
  assert.match(split.summary, /Sharing: team[\s\S]*25 invited people/);
  assert.notEqual(split.approval, plan.approval);
});

test('personal-free init refuses a mismatched subscription and an unconfirmed existing resource group', async () => {
  const options = {
    name: 'Personal Tracker', subscriptionId, webLocation: 'westus2', dataLocation: 'westus2',
    sharing: 'personal' as const, resourceGroup: 'rg-personal', environment: 'dev' as const,
  };
  const run = (exists: boolean): Run => async (_command, args) => {
    if (args[0] === 'account') return JSON.stringify({ id: subscriptionId, tenantId, user: { name: 'o@example.com', type: 'user' } });
    if (args[0] === 'group') return String(exists);
    return operatorId;
  };
  await assert.rejects(initPersonalFreeConfig({ ...options, subscriptionId: tenantId }, run(false)), /az account set/);
  await assert.rejects(initPersonalFreeConfig(options, run(true)), /already exists/);
  await assert.rejects(initPersonalFreeConfig({ ...options, useExistingResourceGroup: true }, run(false)), /does not exist/);
  await assert.rejects(initPersonalFreeConfig({ ...options, webLocation: 'southcentralus' }, run(false)), /Static Web Apps region/);
  const existing = await initPersonalFreeConfig({ ...options, useExistingResourceGroup: true }, run(true));
  assert.equal(existing.existingResourceGroup, true);
  const calls: string[][] = [];
  await createPersonalFreeResourceGroup(existing, async (_command, args) => { calls.push(args as string[]); return ''; });
  assert.deepEqual(calls.map(args => args[1]), ['update']);
  assert.match(planPersonalFreeDeployment(existing, 'h').summary, /\(existing, reused\)[\s\S]*kept; delete the resources below individually/);
});

test('personal-free legacy single-location configs migrate only when Static Web Apps supports the region', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-legacy-config-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const legacy = {
    profile: 'personal-free', subscriptionId, tenantId, sqlAdministratorObjectId: operatorId,
    sqlAdministratorName: 'owner@example.com', resourceGroup: 'rg-personal', environment: 'prod', name: 'personal-tracker',
  };
  const supported = join(root, 'supported.json');
  await writeFile(supported, JSON.stringify({ ...legacy, location: 'westus2' }));
  const migrated = await readPersonalFreeConfig(supported);
  assert.equal(migrated.webLocation, 'westus2');
  assert.equal(migrated.dataLocation, 'westus2');

  const unsupported = join(root, 'unsupported.json');
  await writeFile(unsupported, JSON.stringify({ ...legacy, location: 'eastus' }));
  await assert.rejects(readPersonalFreeConfig(unsupported), error => {
    assert.match((error as Error).message, /retired single "location" \(eastus\)/);
    assert.match((error as Error).message, /--web-location <westus2\|centralus\|eastus2\|westeurope\|eastasia>/);
    assert.match((error as Error).message, /--data-location eastus/);
    assert.match((error as Error).message, /--resource-group-mode existing/);
    return true;
  });
});

test('personal-free resource group carries the project tracking tag', async () => {
  const calls: string[][] = [];
  const config = await initPersonalFreeConfig({
    name: 'Personal Tracker',
    subscriptionId,
    webLocation: 'westus2',
    dataLocation: 'westus2',
    sharing: 'personal',
    resourceGroup: 'rg-personal',
    environment: 'prod',
  }, async (_command, args) => args[0] === 'account'
    ? JSON.stringify({ id: subscriptionId, tenantId, user: { name: 'owner@example.com', type: 'user' } })
    : operatorId);
  const command: Run = async (executable, args) => {
    calls.push([executable, ...args]);
    return '';
  };
  await createPersonalFreeResourceGroup(config, command);
  assert.deepEqual(calls, [
    [
      'az', 'group', 'create',
      '--subscription', subscriptionId,
      '--name', 'rg-personal',
      '--location', 'westus2',
      '-o', 'none',
    ],
    [
      'az', 'group', 'update',
      '--subscription', subscriptionId,
      '--name', 'rg-personal',
      '--set', 'tags.project=sql-apps', 'tags.environment=prod', 'tags.deployment=personal-free',
      '-o', 'none',
    ],
  ]);
});

test('protected deployment state contains strong secrets and is written privately', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sql-apps-personal-state-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const state = createProtectedDeploymentState('abcdef123456');
  assert.match(state.sqlAdministratorPassword, /^[A-Za-z0-9_-]{43}$/);
  assert.match(state.runtimePassword, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(state.sqlAdministratorPassword, state.runtimePassword);
  const path = join(directory, 'state.json');
  await saveProtectedDeploymentState(path, state);
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), state);
  if (process.platform !== 'win32') assert.equal((await stat(path)).mode & 0o777, 0o600);
});

test('a newly approved build preserves protected credentials for the existing deployment', () => {
  const state = createProtectedDeploymentState('0123456789ab');
  const revised = approveProtectedDeploymentRevision(
    { ...state, stage: 'ready', staticWebAppName: 'app', sqlServer: 'app.database.windows.net' },
    'abcdef012345',
  );
  assert.equal(revised.approval, 'abcdef012345');
  assert.equal(revised.stage, 'new');
  assert.equal(revised.sqlAdministratorPassword, state.sqlAdministratorPassword);
  assert.equal(revised.runtimePassword, state.runtimePassword);
});

test('infrastructure stage is returned only after the live cost guard passes', async () => {
  const state = createProtectedDeploymentState('0123456789ab');
  const config = await initPersonalFreeConfig({
    name: 'Personal Tracker',
    subscriptionId,
    webLocation: 'westus2',
    dataLocation: 'westus2',
    sharing: 'personal',
    resourceGroup: 'rg-personal',
    environment: 'dev',
  }, async (_command, args) => args[0] === 'account'
    ? JSON.stringify({ id: subscriptionId, tenantId, user: { name: 'owner@example.com', type: 'user' } })
    : operatorId);
  const outputs = {
    staticWebAppName: 'personal-tracker-prod-abc',
    staticWebAppHostname: 'personal-tracker-prod-abc.azurestaticapps.net',
    sqlServer: 'personal-tracker-prod-abc.database.windows.net',
    databaseName: 'app' as const,
  };
  const paidRun: Run = async (_command, args) => {
    if (args[0] === 'staticwebapp') {
      return JSON.stringify({ name: outputs.staticWebAppName, sku: { name: 'Standard', tier: 'Standard' } });
    }
    return JSON.stringify({
      name: 'app',
      edition: 'GeneralPurpose',
      currentServiceObjectiveName: 'GP_S_Gen5_2',
      maxSizeBytes: 34359738368,
      currentBackupStorageRedundancy: 'Local',
      requestedBackupStorageRedundancy: 'Local',
      useFreeLimit: true,
      freeLimitExhaustionBehavior: 'AutoPause',
    });
  };
  const savedStages: string[] = [];
  await assert.rejects(
    verifyPersonalFreeInfrastructure(config, state, outputs, paidRun, async prepared => {
      savedStages.push(prepared.stage);
    }),
    /Static Web Apps SKU is Standard\/Standard/,
  );
  assert.deepEqual(savedStages, ['infrastructure']);
});

test('personal-free readiness uses a bounded request', async () => {
  let signal: AbortSignal | null | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    signal = init?.signal;
    return Response.json({ status: 'ready' });
  };
  await verifyPersonalFreeReadiness('personal-tracker.azurestaticapps.net', fetcher);
  assert.ok(signal instanceof AbortSignal);
});
