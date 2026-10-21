import { after, test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
    parameters: async (_path: string) => {},
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
        await hooks.parameters(value('--parameters').slice(1));
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

test('deployment refuses to reuse saved credentials for another Azure target', async t => {
  const f = await fixture(t);
  await deployment.deployPersonalFree(config, f.approval, f.run);
  const before = await readFile(f.statePath, 'utf8');
  const manifest = JSON.parse(await readFile(join(f.artifact, 'personal-free-build.json'), 'utf8'));
  for (const target of [
    { ...config, resourceGroup: 'another-resource-group' },
    { ...config, subscriptionId: '44444444-4444-4444-8444-444444444444' },
  ]) {
    const approval = deployment.planPersonalFreeDeployment(target, manifest.sourceHash).approval;
    f.calls.length = 0;
    await assert.rejects(deployment.deployPersonalFree(target, approval, f.run), /another Azure target/);
    await assert.rejects(deployment.rotatePersonalFreeRuntimeSecret(target, approval, f.run), /another Azure target/);
    assert.deepEqual(f.calls, [], 'A target mismatch must fail before any Azure operation');
    assert.equal(await readFile(f.statePath, 'utf8'), before, 'Keep the original deployment receipt and credentials');
  }
});

test('first deployment saves its Azure target before infrastructure changes', async t => {
  const f = await fixture(t);
  await rm(f.statePath);
  f.hooks.infrastructure = async () => {
    const state = await deployment.readProtectedDeploymentState(f.statePath);
    assert.deepEqual(state.target, {
      subscriptionId: '11111111-1111-4111-8111-111111111111', resourceGroup: 'rg-tracker',
    });
  };
  const state = await deployment.deployPersonalFree(config, f.approval, f.run);
  assert.equal(state.stage, 'ready');
  assert.deepEqual(state.target, {
    subscriptionId: '11111111-1111-4111-8111-111111111111', resourceGroup: 'rg-tracker',
  });
});

test('deployment preserves legacy credentials when target verification cannot run', async t => {
  const f = await fixture(t);
  const before = await readFile(f.statePath, 'utf8');
  const target = { ...config, sharing: 'team' as const };
  const manifest = JSON.parse(await readFile(join(f.artifact, 'personal-free-build.json'), 'utf8'));
  const approval = deployment.planPersonalFreeDeployment(target, manifest.sourceHash).approval;
  await assert.rejects(deployment.deployPersonalFree(target, approval, async () => {
    throw Object.assign(new Error('spawn az ENOENT'), { code: 'ENOENT' });
  }), /spawn az ENOENT/);
  assert.equal(await readFile(f.statePath, 'utf8'), before);
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
  assert.notEqual((await deployment.readProtectedDeploymentState(f.statePath)).stage, 'ready');
});

test('cloud planning requires explicit operator SQL access and binds it to approval', () => {
  const { deploymentClientIp: _address, ...missing } = config;
  assert.throws(() => deployment.planPersonalFreeDeployment(missing, 'source'), /deploymentClientIp/);
  const first = deployment.planPersonalFreeDeployment(config, 'source');
  assert.match(first.summary, /203\.0\.113\.10\/32/);
  assert.notEqual(first.approval,
    deployment.planPersonalFreeDeployment({ ...config, deploymentClientIp: '203.0.113.11' }, 'source').approval);
});

test('temporary deployment parameters are protected before Azure can read their passwords', async t => {
  const f = await fixture(t);
  let parameters: string | undefined;
  f.hooks.parameters = async path => {
    parameters = path;
    assert.equal(JSON.parse(await readFile(path, 'utf8')).parameters.runtimePassword.value, f.saved.runtimePassword);
    if (process.platform === 'win32') {
      const access = JSON.parse(await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        '$ErrorActionPreference="Stop";$path=[Console]::In.ReadToEnd();$acl=[IO.Directory]::GetAccessControl($path);' +
        '@{protected=$acl.AreAccessRulesProtected;users=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])|ForEach-Object {$_.IdentityReference.Value});' +
        'current=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value}|ConvertTo-Json -Compress'],
      { input: dirname(path) }));
      assert.equal(access.protected, true);
      assert.deepEqual(access.users, [access.current]);
    } else {
      assert.equal((await stat(dirname(path))).mode & 0o777, 0o700);
      assert.equal((await stat(path)).mode & 0o777, 0o600);
    }
  };
  await deployment.deployPersonalFree(config, f.approval, f.run);
  assert.ok(parameters);
  await assert.rejects(readFile(parameters), { code: 'ENOENT' });
  await assert.rejects(stat(dirname(parameters)), { code: 'ENOENT' });
  f.hooks.parameters = async path => { parameters = path; throw new Error('synthetic infrastructure failure'); };
  await assert.rejects(deployment.deployPersonalFree(config, f.approval, f.run), /synthetic infrastructure failure/);
  await assert.rejects(stat(dirname(parameters)), { code: 'ENOENT' });
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
  const pending = await deployment.readProtectedDeploymentState(f.statePath);
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
  assert.notEqual((await deployment.readProtectedDeploymentState(f.statePath)).stage, 'ready');
  assert.equal(f.rules.size, 0);
});

test('publishing and rotation reject overlapping operations without changing the pending deployment', async t => {
  const operations = {
    deploy: deployment.deployPersonalFree,
    rotate: deployment.rotatePersonalFreeRuntimeSecret,
  };
  for (const [firstName, firstOperation] of Object.entries(operations)) {
    for (const [secondName, secondOperation] of Object.entries(operations)) {
      await t.test(`${firstName} then ${secondName}`, async nested => {
        const f = await fixture(nested);
        let enter!: () => void;
        let release!: () => void;
        const entered = new Promise<void>(resolve => { enter = resolve; });
        const released = new Promise<void>(resolve => { release = resolve; });
        let blocked = false;
        nested.mock.method(globalThis, 'fetch', async () => {
          if (!blocked) {
            blocked = true;
            enter();
            await released;
          }
          return Response.json({ status: 'ready' });
        });
        const first = firstOperation(config, f.approval, f.run);
        try {
          await Promise.race([entered, first.then(() => assert.fail('The first operation never reached readiness'))]);
          const before = await readFile(f.statePath, 'utf8');
          const calls = f.calls.length;
          await assert.rejects(secondOperation(config, f.approval, f.run), /Operation is locked/);
          assert.equal(await readFile(f.statePath, 'utf8'), before);
          assert.equal(f.calls.length, calls, 'The competing operation must not contact Azure or SQL');
        } finally {
          release();
          await first;
        }
        assert.equal((await secondOperation(config, f.approval, f.run)).stage, 'ready');
      });
    }
  }
});

test('rotation uses the deployed artifact after planning an undeployed release', async t => {
  const f = await fixture(t);
  const deployed = await deployment.deployPersonalFree(config, f.approval, f.run);
  await writeFile(join(root, 'sql', 'AppReady.sql'), 'UNDEPLOYED SQL');
  await writeFile(join(root, 'personal-free-api.json'), JSON.stringify({
    version: 1, authenticationProvider: 'aad',
    routes: [{ method: 'GET', path: '/api/PendingReady', procedure: { name: 'PendingReady', parameters: {} } }],
  }));
  const nextManifest = await buildPersonalFreeArtifact(root, f.artifact, f.run);
  const nextApproval = deployment.planPersonalFreeDeployment(config, nextManifest.sourceHash).approval;
  assert.notEqual(nextApproval, f.approval);
  await assert.rejects(deployment.rotatePersonalFreeRuntimeSecret(config, nextApproval, f.run),
    /does not match this deployment/);
  f.hooks.query = async statement => {
    if (statement.includes('GRANT EXECUTE')) {
      assert.match(statement, /\[AppReady\]/);
      assert.doesNotMatch(statement, /PendingReady/);
    }
  };
  const rotated = await deployment.rotatePersonalFreeRuntimeSecret(config, f.approval, f.run);
  assert.equal(rotated.stage, 'ready');
  assert.equal(rotated.approval, f.approval);
  assert.notEqual(rotated.runtimePassword, deployed.runtimePassword);
  assert.deepEqual(JSON.parse(await readFile(join(f.artifact, 'personal-free-build.json'), 'utf8')), nextManifest);
});

test('rotation does not need the next release plan once its deployed artifact is retained', async t => {
  const f = await fixture(t);
  await deployment.deployPersonalFree(config, f.approval, f.run);
  await rm(f.artifact, { recursive: true });
  const rotated = await deployment.rotatePersonalFreeRuntimeSecret(config, f.approval, f.run);
  assert.equal(rotated.stage, 'ready');
  assert.equal(rotated.approval, f.approval);
});

test('rotation refuses a modified retained artifact before changing credentials or contacting Azure', async t => {
  const f = await fixture(t);
  await deployment.deployPersonalFree(config, f.approval, f.run);
  const retained = join(root, '.sql-apps', 'deployments', `tracker-dev-${f.approval}-artifact`);
  await assert.doesNotReject(stat(retained), 'Publishing must retain its approved artifact for future rotation');
  await writeFile(join(retained, 'deployment', 'api.json'), 'tampered');
  const before = await readFile(f.statePath, 'utf8');
  f.calls.length = 0;
  await assert.rejects(deployment.rotatePersonalFreeRuntimeSecret(config, f.approval, f.run), /artifact|approval/i);
  assert.equal(await readFile(f.statePath, 'utf8'), before);
  assert.deepEqual(f.calls, []);
});
