import { after, test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import sql from 'mssql';
import type { Run } from '../src/process.js';
import { run as execute } from '../src/process.js';

const root = await mkdtemp(join(tmpdir(), 'sql-apps-publish-workflow-'));
const previous = { project: process.env.SQL_APPS_PROJECT_HOME, tools: process.env.SQL_APPS_TOOLING_HOME };
process.env.SQL_APPS_PROJECT_HOME = root;
process.env.SQL_APPS_TOOLING_HOME = resolve('.');
after(async () => {
  await rm(root, { recursive: true, force: true });
  for (const [key, value] of [
    ['SQL_APPS_PROJECT_HOME', previous.project], ['SQL_APPS_TOOLING_HOME', previous.tools],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const deployment = await import('../src/personal-free-deployment.js');
const { buildPersonalFreeArtifact } = await import('../src/personal-free-build.js');
const config = {
  profile: 'personal-free' as const, name: 'tracker', environment: 'dev' as const,
  subscriptionId: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  sqlAdministratorObjectId: '33333333-3333-4333-8333-333333333333',
  sqlAdministratorName: 'operator@example.com',
  resourceGroup: 'rg-tracker', existingResourceGroup: false,
  webLocation: 'westus2' as const, dataLocation: 'westus2', sharing: 'personal' as const,
  deploymentClientIp: '203.0.113.10',
};
const outputs = {
  staticWebAppName: 'tracker-dev-abc', staticWebAppHostname: 'tracker-dev-abc.azurestaticapps.net',
  sqlServer: 'tracker-dev-abc.database.windows.net', databaseName: 'app',
};

async function fixture(t: TestContext) {
  await rm(join(root, '.sql-apps'), { recursive: true, force: true });
  for (const directory of ['public', 'sql']) await mkdir(join(root, directory), { recursive: true });
  for (const name of ['index.html', 'style.css', 'app.js', 'staticwebapp.config.json']) {
    await writeFile(join(root, 'public', name), '{}');
  }
  await writeFile(join(root, 'sql', 'personal-free.sqlproj'), '<Project />');
  await writeFile(join(root, 'sql', 'AppReady.sql'), 'APPROVED SQL');
  await writeFile(join(root, 'personal-free-api.json'), JSON.stringify({
    version: 1, authenticationProvider: 'aad',
    routes: [{ method: 'GET', path: '/api/AppReady', procedure: { name: 'AppReady', parameters: {} } }],
  }));
  const calls: { command: string; args: readonly string[] }[] = [];
  const rules = new Set<string>();
  const statePath = deployment.personalFreeStatePath(config);
  const hooks = {
    query: async (_statement: string) => {},
    publish: async (_path: string) => {},
    infrastructure: async (_path: string) => {},
    ready: true,
  };
  const run: Run = async (command, args) => {
    calls.push({ command, args: [...args] });
    const value = (flag: string) => args[args.indexOf(flag) + 1]!;
    if (command === 'dotnet' && args[0] === 'build') {
      await mkdir(value('--output'), { recursive: true });
      await writeFile(join(value('--output'), 'personal-free.dacpac'),
        await readFile(join(dirname(args[1]!), 'AppReady.sql')));
      return '';
    }
    if (command === 'dotnet' && args[0] === 'tool') {
      await hooks.publish(args.find(arg => arg.startsWith('/SourceFile:'))!.slice('/SourceFile:'.length));
      return '';
    }
    if (command === 'az') {
      if (args[0] === 'bicep') { await writeFile(value('--outfile'), '{"approved":"template"}'); return ''; }
      if (args[0] === 'provider') return 'Registered';
      if (args[0] === 'group') return '';
      if (args[0] === 'deployment') {
        await hooks.infrastructure(value('--template-file'));
        return JSON.stringify(Object.fromEntries(Object.entries(outputs).map(([key, entry]) => [key, { value: entry }])));
      }
      if (args[0] === 'account') return JSON.stringify({ accessToken: 'synthetic-test-token' });
      if (args[0] === 'sql' && args[1] === 'server') {
        const name = value('--name');
        if (args[3] === 'create') {
          assert.equal(value('--start-ip-address'), '203.0.113.10');
          assert.equal(value('--end-ip-address'), '203.0.113.10');
          rules.add(name);
        } else if (args[3] === 'delete') rules.delete(name);
        else throw new Error(`Unexpected firewall operation ${args.join(' ')}`);
        return '';
      }
      if (args[0] === 'staticwebapp') {
        if (args[1] === 'secrets') return 'synthetic-deployment-token';
        return JSON.stringify({ name: outputs.staticWebAppName, sku: { name: 'Free', tier: 'Free' } });
      }
      if (args[0] === 'sql' && args[1] === 'db') return JSON.stringify({
        name: 'app', edition: 'GeneralPurpose', currentServiceObjectiveName: 'GP_S_Gen5_2',
        maxSizeBytes: 34359738368, currentBackupStorageRedundancy: 'Local',
        requestedBackupStorageRedundancy: 'Local', useFreeLimit: true, freeLimitExhaustionBehavior: 'AutoPause',
      });
    }
    if (command === process.execPath || command === 'npx' || command === 'npx.cmd') return '';
    throw new Error(`Unexpected command ${command} ${args.join(' ')}`);
  };
  t.mock.method(sql.ConnectionPool.prototype, 'connect', async function (this: sql.ConnectionPool) { return this; });
  t.mock.method(sql.ConnectionPool.prototype, 'close', async () => {});
  t.mock.method(sql.Request.prototype, 'query', async (statement: string) => {
    await hooks.query(statement);
    return { recordsets: [], recordset: [], output: {}, rowsAffected: [] };
  });
  t.mock.method(globalThis, 'fetch', async () => Response.json(
    { status: hooks.ready ? 'ready' : 'not-ready' }, { status: hooks.ready ? 200 : 503 }));
  const artifact = join(root, '.sql-apps', 'deployments', 'tracker-dev-plan');
  const manifest = await buildPersonalFreeArtifact(root, artifact, run);
  const approval = deployment.planPersonalFreeDeployment(config, manifest.sourceHash).approval;
  const saved = deployment.createProtectedDeploymentState(approval);
  await deployment.saveProtectedDeploymentState(statePath, {
    ...saved, stage: 'ready', sqlServer: outputs.sqlServer,
    staticWebAppName: outputs.staticWebAppName, staticWebAppHostname: outputs.staticWebAppHostname,
  });
  calls.length = 0;
  return { run, calls, rules, statePath, saved, artifact, approval, hooks };
}

test('deployment publishes the approved SQL, infrastructure and API snapshots, not edited sources', async t => {
  const f = await fixture(t);
  await writeFile(join(root, 'sql', 'AppReady.sql'), 'UNAPPROVED SQL');
  await writeFile(join(root, 'personal-free-api.json'), 'invalid unapproved manifest');
  f.hooks.infrastructure = async path => {
    assert.equal(await readFile(path, 'utf8'), '{"approved":"template"}');
  };
  f.hooks.publish = async path => {
    assert.equal(await readFile(path, 'utf8'), 'APPROVED SQL');
    assert.equal(f.rules.size, 1, 'SQL publication needs the approved temporary client rule');
  };
  f.hooks.query = async statement => {
    assert.equal(f.rules.size, 1, 'runtime-user configuration needs the same client rule');
    if (statement.includes('GRANT EXECUTE')) assert.match(statement, /\[AppReady\]/);
  };
  const state = await deployment.deployPersonalFree(config, f.approval, f.run);
  assert.equal(state.stage, 'ready');
  assert.equal(f.rules.size, 0);
  assert.equal(f.calls.some(call => call.command === 'dotnet' && call.args[0] === 'build'), false);
});

test('deployment rejects changed approved artifacts before any Azure write', async t => {
  for (const path of ['static/app.js', 'deployment/database.dacpac', 'deployment/template.json', 'deployment/api.json']) {
    await t.test(path, async nested => {
      const f = await fixture(nested);
      await writeFile(join(f.artifact, path), 'tampered');
      await assert.rejects(deployment.deployPersonalFree(config, f.approval, f.run), /artifact|approval/i);
      assert.equal(f.calls.length, 0);
    });
  }
});

test('SQL publication failure still removes the deployment-owned firewall rule', async t => {
  const f = await fixture(t);
  f.hooks.publish = async () => { throw new Error('synthetic SQL publication failure'); };
  await assert.rejects(deployment.deployPersonalFree(config, f.approval, f.run), /synthetic SQL publication failure/);
  const operations = f.calls.filter(call => call.args[2] === 'firewall-rule').map(call => call.args[3]);
  assert.deepEqual(operations, ['create', 'delete']);
  assert.equal(f.rules.size, 0);
});

test('firewall cleanup failure reports a recovery command and never reports ready', async t => {
  const f = await fixture(t);
  const run: Run = async (command, args, options) => {
    if (args[2] === 'firewall-rule' && args[3] === 'delete') throw new Error('synthetic firewall cleanup failure');
    return f.run(command, args, options);
  };
  await assert.rejects(deployment.deployPersonalFree(config, f.approval, run),
    /Could not remove temporary SQL firewall rule sql-apps-deploy-[a-f0-9]+;.*az sql server firewall-rule delete/);
  assert.notEqual(JSON.parse(await readFile(f.statePath, 'utf8')).stage, 'ready');
});

test('cloud planning requires explicit operator SQL access and binds it to approval', () => {
  const { deploymentClientIp: _address, ...missing } = config;
  assert.throws(() => deployment.planPersonalFreeDeployment(missing, 'source'), /deploymentClientIp/);
  const first = deployment.planPersonalFreeDeployment(config, 'source');
  assert.match(first.summary, /203\.0\.113\.10\/32/);
  assert.notEqual(first.approval,
    deployment.planPersonalFreeDeployment({ ...config, deploymentClientIp: '203.0.113.11' }, 'source').approval);
});

test('deployment launches the installed SWA JavaScript entry with Node on every platform', async t => {
  const f = await fixture(t);
  await deployment.deployPersonalFree(config, f.approval, f.run);
  const command = f.calls.find(call => call.command === process.execPath);
  assert.ok(command, 'deployment must not invoke npx or a Windows command script');
  assert.equal(command.args[1], 'deploy');
  assert.match(command.args[0]!, /[\\/]@azure[\\/]static-web-apps-cli[\\/]dist[\\/]cli[\\/]bin\.js$/);
  const version = await execute(process.execPath, [command.args[0]!, '--version'], {
    env: { SWA_CLI_TELEMETRY_OPTOUT: '1' }, timeoutMs: 30_000,
  });
  assert.match(version, /2\.0\.10/);
});

test('rotation durably saves its pending password before SQL and resumes it after a disconnect', async t => {
  const f = await fixture(t);
  let password: string | undefined;
  f.hooks.query = async statement => {
    if (!statement.includes('ALTER USER')) return;
    password = /PASSWORD = ''([^']+)''/.exec(statement)?.[1];
    throw new Error('synthetic disconnect after ALTER USER');
  };
  await assert.rejects(deployment.rotatePersonalFreeRuntimeSecret(config, f.approval, f.run), /synthetic disconnect/);
  const pending = JSON.parse(await readFile(f.statePath, 'utf8'));
  assert.equal(pending.runtimePassword, password);
  assert.notEqual(pending.runtimePassword, f.saved.runtimePassword);
  assert.notEqual(pending.stage, 'ready');
  assert.equal(f.rules.size, 0);

  f.hooks.query = async statement => {
    if (statement.includes('ALTER USER')) assert.ok(statement.includes(`PASSWORD = ''${password}''`));
  };
  const resumed = await deployment.rotatePersonalFreeRuntimeSecret(config, f.approval, f.run);
  assert.equal(resumed.runtimePassword, password);
  assert.equal(resumed.stage, 'ready');
  assert.equal(f.rules.size, 0);
});

test('rotation cannot mark an application ready when the final readiness check fails', async t => {
  const f = await fixture(t);
  f.hooks.ready = false;
  await assert.rejects(deployment.rotatePersonalFreeRuntimeSecret(config, f.approval, f.run), /readiness/i);
  assert.notEqual(JSON.parse(await readFile(f.statePath, 'utf8')).stage, 'ready');
  assert.equal(f.rules.size, 0);
});
