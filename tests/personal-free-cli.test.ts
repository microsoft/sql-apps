import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Run } from '../src/process.js';

test('publish status verifies live free settings and fails closed on drift', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-personal-free-cli-'));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  process.env.SQL_APPS_PROJECT_HOME = root;
  const { main } = await import('../src/personal-free-cli.js');
  const configPath = join(root, 'sql-apps.personal-free.json');
  const config = {
    profile: 'personal-free',
    subscriptionId: '11111111-1111-4111-8111-111111111111',
    tenantId: '22222222-2222-4222-8222-222222222222',
    sqlAdministratorObjectId: '33333333-3333-4333-8333-333333333333',
    sqlAdministratorName: 'owner@example.com',
    resourceGroup: 'rg-personal',
    location: 'westus2',
    environment: 'prod',
    name: 'personal-tracker',
  };
  await writeFile(configPath, JSON.stringify(config));
  const stateDirectory = join(root, '.sql-apps', 'deployments');
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(join(stateDirectory, 'personal-tracker-prod.json'), JSON.stringify({
    approval: 'abcdef123456',
    stage: 'ready',
    sqlAdministratorPassword: 'a'.repeat(43),
    runtimePassword: 'b'.repeat(43),
    staticWebAppName: 'personal-tracker-prod-abc',
    staticWebAppHostname: 'personal-tracker-prod-abc.azurestaticapps.net',
    sqlServer: 'personal-tracker-prod-abc.database.windows.net',
  }));

  let paid = false;
  const run: Run = async (_command, args) => {
    if (args[0] === 'staticwebapp') {
      return JSON.stringify({
        name: 'personal-tracker-prod-abc',
        sku: { name: paid ? 'Standard' : 'Free', tier: paid ? 'Standard' : 'Free' },
      });
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

  const messages: string[] = [];
  await main(['status', '--config', configPath], message => messages.push(message), run);
  assert.match(messages.join('\n'), /Cost guard: verified/);
  assert.match(messages.join('\n'), /Static Web Apps: Free/);
  assert.match(messages.join('\n'), /Azure SQL: free tier, AutoPause at monthly limit/);

  paid = true;
  await assert.rejects(
    main(['status', '--config', configPath], () => {}, run),
    /Static Web Apps SKU is Standard\/Standard/,
  );

  const missingAzure: Run = async () => {
    throw Object.assign(new Error('spawn az ENOENT'), { code: 'ENOENT' });
  };
  await assert.rejects(
    main(['status', '--config', configPath], () => {}, missingAzure),
    /spawn az ENOENT/,
  );

  const invitations: string[][] = [];
  const inviteRun: Run = async (_command, args) => { invitations.push([...args]); return 'https://invite.example/link\n'; };
  const output: string[] = [];
  await main(['invite', '--role', 'member', '--provider', 'github', '--user', 'teammate', '--config', configPath],
    message => output.push(message), inviteRun);
  await main(['invite-owner', '--provider', 'aad', '--user', 'owner@example.com', '--config', configPath],
    message => output.push(message), inviteRun);
  assert.deepEqual(invitations.map(args => args[args.indexOf('--roles') + 1]), ['member', 'owner']);
  assert.match(output[0]!, /Member invitation for teammate[\s\S]*25 people[\s\S]*invite\.example/);
  assert.match(output[1]!, /Owner invitation/);
  await assert.rejects(
    main(['invite', '--role', 'admin', '--provider', 'aad', '--user', 'x', '--config', configPath], () => {}, inviteRun),
    /--role must be owner or member/,
  );
  await assert.rejects(
    main(['invite', '--provider', 'aad', '--user', 'x', '--config', configPath], () => {}, inviteRun),
    /--role is required/,
  );
  assert.equal(invitations.length, 2);
});

test('publish init requires explicit region, subscription, resource group, environment, sharing and client IP choices', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-personal-free-init-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  process.env.SQL_APPS_PROJECT_HOME = root;
  const { main } = await import('../src/personal-free-cli.js');
  const subscriptionId = '11111111-1111-4111-8111-111111111111';
  let groupExists = false;
  const run: Run = async (_command, args) => {
    if (args[0] === 'account') return JSON.stringify({
      id: subscriptionId, name: 'Personal', tenantId: '22222222-2222-4222-8222-222222222222',
      user: { name: 'owner@example.com', type: 'user' },
    });
    if (args[0] === 'group' && args[1] === 'exists') return groupExists ? 'true' : 'false';
    if (args[0] === 'ad') return '33333333-3333-4333-8333-333333333333';
    throw new Error(`unexpected ${args.join(' ')}`);
  };
  const base = (path: string) => ['init', '--name', 'tracker', '--subscription', subscriptionId,
    '--web-location', 'westus2', '--data-location', 'same', '--resource-group', 'rg-tracker',
    '--resource-group-mode', 'new', '--environment', 'prod', '--sharing', 'team',
    '--client-ip', '203.0.113.10', '--config', join(root, path)];
  const replace = (args: string[], flag: string, value: string) => {
    const copy = [...args];
    copy[copy.indexOf(flag) + 1] = value;
    return copy;
  };

  await assert.rejects(main(['init', '--name', 'tracker', '--location', 'eastus'], () => {}, run), /--location was replaced/);
  await assert.rejects(main(base('a.json').filter((_, i, all) => all[i] !== '--sharing' && all[i - 1] !== '--sharing'), () => {}, run),
    /--sharing is required/);
  await assert.rejects(main(base('missing-ip.json').filter((_, i, all) => all[i] !== '--client-ip' && all[i - 1] !== '--client-ip'), () => {}, run),
    /--client-ip is required/);
  await assert.rejects(main(replace(base('invalid-ip.json'), '--client-ip', '0.0.0.0'), () => {}, run),
    /Deployment client IP must identify one operator/);
  await assert.rejects(main(replace(base('b.json'), '--web-location', 'southcentralus'), () => {}, run),
    /Static Web Apps region must be one of: westus2/);
  await assert.rejects(main(replace(base('c.json'), '--subscription', '99999999-9999-4999-8999-999999999999'), () => {}, run),
    /signed in to subscription Personal[\s\S]*az account set/);
  groupExists = true;
  await assert.rejects(main(base('d.json'), () => {}, run), /already exists[\s\S]*--resource-group-mode existing/);

  const output: string[] = [];
  await main(replace(base('e.json'), '--resource-group-mode', 'existing'), message => output.push(message), run);
  assert.match(output[0]!, /web: westus2; data: westus2; resource group: rg-tracker \(existing\); environment: prod; sharing: team/);
});
