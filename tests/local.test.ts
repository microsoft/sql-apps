import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, realpath, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { initLocal, localCommand, localConnection, localDabConfig, localPrincipal, verifyLocal, startLocalSql, sqlImage, dabImage } from '../src/local.js';
import { run, type Run } from '../src/process.js';
import { startLocalApplication } from '../src/local-startup.js';
import { proposeWorkspace, runtimeFor, type WorkspaceRuntime } from '../src/workspace.mjs';
import { planBundle, grantBundle } from '../src/local-consent.mjs';
import { localWorkspaceFixture } from './local-workspace-fixture.js';

function sqlOwnership(runtime: WorkspaceRuntime, args: readonly string[]): string | undefined {
  if (args[0] === 'volume' || args[0] === 'network') {
    const name = args[0] === 'volume' ? `${runtime.sqlContainer}-data` : runtime.names.sqlNetwork;
    assert.ok(args.includes(name) || args.includes(`name=^${name}$`));
    if (args[1] === 'ls') return name;
    assert.equal(args[1], 'inspect');
    return JSON.stringify({ workspace: runtime.id, role: args[0] === 'volume' ? 'sql' : 'sql-network' });
  }
  if (args[0] === 'inspect') {
    if (args.some(arg => arg.includes('HostConfig.PortBindings'))) return JSON.stringify({
      workspace: runtime.id, image: sqlImage,
      ports: { '1433/tcp': [{ HostIp: '127.0.0.1', HostPort: String(runtime.ports.sql) }] },
    });
    if (args.includes('{{json .Mounts}}')) return JSON.stringify([
      { Type: 'volume', Name: `${runtime.sqlContainer}-data`, Destination: '/var/opt/mssql' },
    ]);
  }
  return undefined;
}

test('guided startup reports each existing stage, stops on failure and preserves the error cause', async () => {
  const expected = ['start-sql', 'init', 'data', 'serve'];
  for (let failure = 0; failure <= expected.length; failure++) {
    const calls: string[] = [];
    const messages: string[] = [];
    const cause = new Error('specific dependency failure');
    const action = async (step: string, container: string) => {
      assert.equal(container, 'owned-sql');
      calls.push(step);
      if (calls.length - 1 === failure) throw cause;
    };
    const promise = startLocalApplication('owned-sql', {
      command: action,
      serve: container => action('serve', container),
    }, message => messages.push(message));
    if (failure === expected.length) {
      await promise;
      assert.deepEqual(calls, expected);
    } else {
      await assert.rejects(promise, error => error instanceof Error && error.cause === cause &&
        /startup stopped at/.test(error.message) && /getting-started/.test(error.message));
      assert.deepEqual(calls, expected.slice(0, failure + 1));
      assert.equal(messages.some(message => message.includes('completed.') && message.startsWith(`[${failure + 1}/`)), false);
    }
    assert.equal(calls.some(call => ['stop', 'rm', 'reset'].includes(call)), false);
  }
});

test('actual application CLI rejects invalid input during preflight before startup can change services', async () => {
  await assert.rejects(run(process.execPath, ['dist/src/local-cli.js', 'app', 'bad;container'], {
    env: { NODE_ENV: 'development' },
  }), error => error instanceof Error && /failed \(1\)/.test(error.message) &&
    /Invalid SQL container name/.test(error.message) && !/Starting SQL container/.test(error.message));
});

test('endpoint CLI initializes its approved workspace without interpreting the port block as a container', async t => {
  const source = process.cwd();
  await localWorkspaceFixture(t);
  const home = await realpath(process.cwd());
  for (const directory of ['src', 'scripts', 'sql', 'dab', '.config']) {
    await cp(join(source, directory), join(home, directory), {
      recursive: true,
      filter: path => !/(?:^|[\\/])(?:bin|obj|node_modules)(?:[\\/]|$)/.test(path),
    });
  }
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.runtime.json']) {
    await cp(join(source, file), join(home, file));
  }
  await writeFile(join(home, 'role-based-data.json'),
    '{"profile":"role-based-data","requiredRole":"AppUser","readinessPath":"/api/Ready"}');
  const proposal = await proposeWorkspace(home, undefined, { includeSql: false });
  const selection = proposal.conflicts?.length ? proposal.alternative : proposal.descriptor;
  assert.ok(selection, 'A free workspace port block must be available');
  const workspace = String(selection.basePort);
  const sqlTarget = { version: 1, provider: 'express', instance: 'SQLEXPRESS', server: '127.0.0.1',
    port: 1433, database: 'development' } as const;
  const bundle = await planBundle(home, { profile: 'role-based-data', workspace, sqlTarget });
  await grantBundle(home, { profile: 'role-based-data', workspace, sqlTarget, approval: bundle.approval });
  await run(process.execPath, [resolve(source, 'dist', 'src', 'local-cli.js'), 'workspace-init', workspace],
    { env: { SQL_APPS_PROJECT_HOME: home } });
  assert.equal(JSON.parse(await readFile(join(home, '.sql-apps', 'workspace.json'), 'utf8')).basePort, Number(workspace));
});

test('local workflow fails closed on SQL Server instead of Azure SQL', async () => {
  await verifyLocal('sqldbdev', async () => '5|SQL Azure\r\n');
  for (const result of ['3|Developer Edition', '', '5|unrecognized']) {
    await assert.rejects(verifyLocal('sqldbdev', async () => result), /EngineEdition 5/);
  }
  let calls = 0;
  await assert.rejects(verifyLocal('bad;name', async () => { calls++; return ''; }));
  assert.equal(calls, 0);
});

for (const existing of ['database', 'login', 'unknown']) {
  test(`local init preserves missing credential state when ${existing} is already present or cannot be verified`, async t => {
    const runtime = await localWorkspaceFixture(t);
    const statements: string[] = [];
    const runner: Run = async (command, _args, options) => {
      assert.equal(command, 'docker', 'Missing credentials must fail before building or publishing SQL');
      const statement = options?.input ?? '';
      statements.push(statement);
      if (statement.includes("SERVERPROPERTY('EngineEdition')")) return '5|SQL Azure';
      if (statement.includes('SELECT CASE WHEN')) {
        if (existing === 'unknown') return '';
        return existing === 'database' ?
          (statement.includes('sys.databases') ? '1' : '0') :
          (statement.includes('SUSER_ID(') ? '1' : '0');
      }
      throw new Error('Unexpected SQL mutation before credentials were verified');
    };
    await assert.rejects(initLocal(runtime.sqlContainer, runner, {
      profile: 'role-based-data', requiredRole: 'AppUser', readinessPath: '/api/AppReady',
    }), /exist.*without.*credential|verify.*existing SQL/i);
    assert.equal(statements.some(statement => /\b(CREATE|ALTER|GRANT)\b/.test(statement)), false);
    await assert.rejects(readFile(runtime.names.sqlState), { code: 'ENOENT' });
  });
}

test('local init creates credentials only for fresh SQL objects and reuses them on restart', async t => {
  const runtime = await localWorkspaceFixture(t);
  let probes = 0;
  let publications = 0;
  const runner: Run = async (command, args, options) => {
    if (command === 'dotnet') {
      if (args.includes('/Version')) return '170.5.96.0';
      if (args.includes('/Action:Publish')) publications++;
      return '';
    }
    assert.equal(command, 'docker');
    if (args.includes('{{json .Config.Env}}')) return '["MSSQL_SA_PASSWORD=fixture-only-administrator-password"]';
    if (args.some(arg => arg.includes('.NetworkSettings.Ports'))) return '[{"HostIp":"127.0.0.1","HostPort":"54321"}]';
    const statement = options?.input ?? '';
    if (statement.includes("SERVERPROPERTY('EngineEdition')")) return '5|SQL Azure';
    if (statement.includes('SELECT CASE WHEN')) { probes++; return '0'; }
    if (options?.env?.SQLCMDPASSWORD) return 'LOCAL SQL ACCEPTANCE PASSED';
    assert.match(statement, /CREATE|GRANT/);
    return '';
  };
  const profile = { profile: 'role-based-data', requiredRole: 'AppUser', readinessPath: '/api/AppReady' } as const;
  await initLocal(runtime.sqlContainer, runner, profile);
  const first = await readFile(runtime.names.sqlState, 'utf8');
  assert.match(JSON.parse(first).password, /^SqlApps1![a-f0-9]{64}$/);
  await initLocal(runtime.sqlContainer, runner, profile);
  assert.equal(await readFile(runtime.names.sqlState, 'utf8'), first);
  assert.equal(probes, 1);
  assert.equal(publications, 2);
});

test('local verification uses master and passes SQL through stdin, not shell interpolation', async () => {
  const run: Run = async (command, args, options) => {
    assert.equal(command, 'docker');
    assert.equal(args.includes('-i'), true);
    assert.equal(args.at(-1), 'master');
    assert.ok(options?.input?.includes("SERVERPROPERTY('EngineEdition')"));
    assert.equal(args.some(arg => arg.includes('SELECT')), false);
    return '5|SQL Azure';
  };
  await verifyLocal('sqldbdev', run);
});

test('local DAB uses production entities with separate claim simulation configuration', async () => {
  const local = await localDabConfig({ profile: 'role-based-data', requiredRole: 'AppUser', readinessPath: '/api/AppReady' }) as { runtime: { host: { mode: string; authentication: { provider: string } } }; entities: Record<string, unknown> };
  const production = JSON.parse(await readFile('dab/dab-config.json', 'utf8'));
  assert.equal(local.runtime.host.mode, 'development');
  assert.equal(local.runtime.host.authentication.provider, 'AppService');
  assert.deepEqual(Object.keys(local.entities), ['AppReady']);
  assert.deepEqual(local.entities, production.entities);
  assert.equal(production.runtime.host.authentication.provider, 'AzureAD');
  assert.equal(production.runtime.host.mode, 'production');
});

test('local app connection is encrypted and is not the SA bootstrap login', () => {
  const runtime = runtimeFor();
  const connection = localConnection('quotes";semicolon', '127.0.0.1,1434');
  assert.ok(connection.includes(`Database=${runtime.database};`));
  assert.ok(connection.includes(`User Id=${runtime.login};`));
  assert.match(connection, /Encrypt=True;TrustServerCertificate=True;/);
  assert.match(connection, /Password="quotes"";semicolon";/);
  assert.equal(connection.includes('User Id=sa'), false);
});

test('local test principal carries owner and scope without tenant infrastructure', () => {
  const principal = JSON.parse(Buffer.from(localPrincipal('alice'), 'base64').toString());
  assert.deepEqual(principal.claims.filter((claim: { typ: string }) => ['oid', 'scp'].includes(claim.typ)),
    [{ typ: 'oid', val: 'alice' }, { typ: 'scp', val: 'access_as_user' }]);
});

for (const selection of [42000] as const) {
  const mode = 'isolated';
  test(`starting SQL binds loopback, uses durable volume, and avoids password command arguments (${mode})`, async t => {
    const runtime = await localWorkspaceFixture(t, selection);
    const calls: string[][] = [];
    const resources = new Map<string, { name: string; creation: string | undefined }>();
    const runner: Run = async (_command, args, options) => {
      calls.push([...args]);
      if (args[0] === 'ps') return '';
      if (args[0] === 'volume' || args[0] === 'network') {
        if (args[1] === 'ls') return resources.get(args[0])?.name ?? '';
        if (args[1] === 'inspect') return JSON.stringify({
          workspace: runtime.id, role: args[0] === 'volume' ? 'sql' : 'sql-network',
          creation: resources.get(args[0])?.creation,
        });
        assert.equal(args[1], 'create');
        assert.ok(args.includes(`sql-apps.workspace=${runtime.id}`));
        resources.set(args[0], {
          name: args.at(-1)!, creation: args.find(arg => arg.startsWith('sql-apps.creation='))?.slice('sql-apps.creation='.length),
        });
        return '';
      }
      if (args.includes('{{json .State}}')) return JSON.stringify({ StartedAt: new Date(Date.now() - 10_000).toISOString(), Status: 'running' });
      if (args.some(value => value.includes('stat -c %Y'))) return String(Math.floor(Date.now() / 1_000));
      if (args[0] === 'run') {
        const password = options?.env?.MSSQL_SA_PASSWORD;
        assert.ok(password);
        assert.match(password, /^SqlApps1![a-f0-9]{64}$/);
        assert.equal(args.some(value => value.includes(password)), false);
        assert.equal(args.includes(`127.0.0.1:${runtime.ports.sql ?? ''}:1433`), true);
        assert.equal(args.includes(`type=volume,source=${runtime.sqlContainer}-data,target=/var/opt/mssql`), true);
        assert.equal(args.includes('sql-apps.local=sql'), true);
        if (runtime.mode === 'isolated') assert.ok(args.includes(`sql-apps.workspace=${runtime.id}`));
        return '';
      }
      if (args[0] === 'exec') return '5|SQL Azure';
      assert.fail(`Unexpected fixture command: ${args.join(' ')}`);
    };
    await startLocalSql(runtime.sqlContainer, runner);
    assert.equal(calls.filter(call => call[0] === 'run').length, 1);
  });

  test(`start-sql never overwrites or restarts someone else's container (${mode})`, async t => {
    await localWorkspaceFixture(t, selection);
    const calls: string[][] = [];
    await assert.rejects(startLocalSql('existing', async (_command, args) => {
      calls.push([...args]);
      if (args[0] === 'ps') return 'existing';
      assert.equal(args[0], 'inspect');
      return '';
    }), /already in use/);
    assert.equal(calls.some(call => ['run', 'start', 'rm'].includes(call[0]!)), false);
  });

  test(`local stop refuses unowned containers and removes only a verified data container (${mode})`, async t => {
    const runtime = await localWorkspaceFixture(t, selection);
    const calls: string[][] = [];
    await assert.rejects(localCommand('stop', runtime.sqlContainer, async (_command, args) => {
      calls.push([...args]);
      return '';
    }), /ownership label/);
    assert.equal(calls.some(call => call[0] === 'rm'), false);
    calls.length = 0;
    await localCommand('stop', runtime.sqlContainer, async (_command, args) => {
      calls.push([...args]);
      if (args[0] === 'inspect') {
        if (args.some(arg => arg.includes('HostConfig.PortBindings'))) return JSON.stringify({
          workspace: runtime.id, image: dabImage,
          ports: { '5000/tcp': [{ HostIp: '127.0.0.1', HostPort: String(runtime.ports.data) }] },
        });
        assert.ok(args.includes('{{index .Config.Labels "sql-apps.local"}}'));
        return 'data';
      }
      assert.deepEqual(args, ['rm', '--force', runtime.names.data]);
      return '';
    });
    assert.deepEqual(calls.filter(call => call[0] === 'rm'), [['rm', '--force', runtime.names.data]]);
  });

  test(`local start reuses project SQL without recreating its volume or resetting credentials (${mode})`, async t => {
    const runtime = await localWorkspaceFixture(t, selection);
    const calls: string[][] = [];
    await startLocalSql(runtime.sqlContainer, async (_command, args) => {
      calls.push([...args]);
      const ownership = sqlOwnership(runtime, args);
      if (ownership !== undefined) return ownership;
      if (args[0] === 'ps') return runtime.sqlContainer;
      if (args.includes('{{json .State}}')) return JSON.stringify({ StartedAt: new Date(Date.now() - 10_000).toISOString(), Status: 'running' });
      if (args.some(value => value.includes('stat -c %Y'))) return String(Math.floor(Date.now() / 1_000));
      if (args.includes('{{index .Config.Labels "sql-apps.local"}}')) return 'sql';
      if (args[0] === 'exec') return '5|SQL Azure';
      assert.deepEqual(args, ['start', runtime.sqlContainer]);
      return '';
    });
    assert.deepEqual(calls.filter(call => ['run', 'start', 'rm'].includes(call[0]!)), [['start', runtime.sqlContainer]]);
    assert.ok(calls.every(call => !['volume', 'network'].includes(call[0]!) || ['ls', 'inspect'].includes(call[1]!)));
  });

  test(`SQL startup retries the preview recovery race and waits for control-plane completion (${mode})`, async t => {
    const runtime = await localWorkspaceFixture(t, selection);
    let stateChecks = 0;
    let starts = 0;
    const runner: Run = async (_command, args) => {
      const ownership = sqlOwnership(runtime, args);
      if (ownership !== undefined) return ownership;
      if (args[0] === 'ps') return runtime.sqlContainer;
      if (args.includes('{{json .State}}')) return JSON.stringify({
        StartedAt: new Date(Date.now() - 10_000).toISOString(), Status: stateChecks++ === 0 ? 'exited' : 'running',
      });
      if (args.includes('{{index .Config.Labels "sql-apps.local"}}')) return 'sql';
      if (args[0] === 'start') { starts++; return ''; }
      if (args[0] === 'logs') return 'Msg904,Database32760cannotbeautostartedduringstartup. Reconcile finished with 1 failure(s).';
      if (args.some(value => value.includes('stat -c %Y'))) return String(Math.floor(Date.now() / 1_000));
      if (args[0] === 'exec') return '5|SQL Azure';
      assert.fail(`Unexpected fixture command: ${args.join(' ')}`);
    };
    await startLocalSql(runtime.sqlContainer, runner);
    assert.equal(starts, 2);
    assert.equal(stateChecks, 2);
  });

  test(`SQL startup bounds recovery retries and never bypasses control-plane initialization (${mode})`, async t => {
    const runtime = await localWorkspaceFixture(t, selection);
    let starts = 0;
    await assert.rejects(startLocalSql(runtime.sqlContainer, async (_command, args) => {
      const ownership = sqlOwnership(runtime, args);
      if (ownership !== undefined) return ownership;
      if (args[0] === 'ps') return runtime.sqlContainer;
      if (args.includes('{{json .State}}')) return JSON.stringify({ StartedAt: new Date().toISOString(), Status: 'exited' });
      if (args.includes('{{index .Config.Labels "sql-apps.local"}}')) return 'sql';
      if (args[0] === 'start') { starts++; return ''; }
      if (args[0] === 'logs') return 'Reconcile finished with 1 failure(s). Database cannot be autostarted.';
      assert.fail('Exited SQL should never proceed to database queries');
    }), /SQL container exited/);
    assert.equal(starts, 4);
  });

  test(`SQL startup rejects a stale readiness marker from a previous boot (${mode})`, async t => {
    const runtime = await localWorkspaceFixture(t, selection);
    const started = Date.now() - 10_000;
    let markerChecks = 0;
    let engineChecks = 0;
    await startLocalSql(runtime.sqlContainer, async (_command, args) => {
      const ownership = sqlOwnership(runtime, args);
      if (ownership !== undefined) return ownership;
      if (args[0] === 'ps') return runtime.sqlContainer;
      if (args.includes('{{json .State}}')) return JSON.stringify({ StartedAt: new Date(started).toISOString(), Status: 'running' });
      if (args.includes('{{index .Config.Labels "sql-apps.local"}}')) return 'sql';
      if (args.some(value => value.includes('stat -c %Y'))) {
        assert.equal(engineChecks, 0);
        return String(Math.floor((markerChecks++ === 0 ? started - 5_000 : Date.now()) / 1_000));
      }
      if (args[0] === 'exec') { engineChecks++; return '5|SQL Azure'; }
      assert.deepEqual(args, ['start', runtime.sqlContainer]);
      return '';
    });
    assert.equal(markerChecks, 2);
    assert.equal(engineChecks, 1);
  });
}

test('start-sql reports a preserved-volume password mismatch without resetting data', async t => {
  const runtime = await localWorkspaceFixture(t, 42100);
  let stateChecks = 0;
  const started = startLocalSql(runtime.sqlContainer, async (_command, args) => {
    const ownership = sqlOwnership(runtime, args);
    if (ownership !== undefined) return ownership;
    if (args[0] === 'ps') return runtime.sqlContainer;
    if (args.includes('{{index .Config.Labels "sql-apps.local"}}')) return 'sql';
    if (args[0] === 'start') return '';
    if (args.includes('{{json .State}}')) {
      if (stateChecks++) throw new Error('readiness retried after known password mismatch');
      return JSON.stringify({ StartedAt: new Date(Date.now() - 10_000).toISOString(), Status: 'running' });
    }
    if (args.some(value => value.includes('stat -c %Y'))) return String(Math.floor(Date.now() / 1_000));
    if (args[0] === 'exec') throw new Error('sqlcmd failed');
    if (args[0] === 'logs') return "Login failed for user 'sa'. Reason: Password did not match that for the login provided.";
    assert.fail(`Unexpected fixture command: ${args.join(' ')}`);
  });
  await assert.rejects(started, /password no longer matches the preserved SQL volume/);
});

test('start-sql preserves an orphaned owned volume instead of resetting its password', async t => {
  const runtime = await localWorkspaceFixture(t, 42100);
  const calls: string[][] = [];
  await assert.rejects(startLocalSql(runtime.sqlContainer, async (_command, args) => {
    calls.push([...args]);
    if (args[0] === 'ps') return '';
    const ownership = sqlOwnership(runtime, args);
    if (ownership !== undefined) return ownership;
    if (args[0] === 'run') throw new Error('unsafe container recreation attempted');
    assert.fail(`Unexpected fixture command: ${args.join(' ')}`);
  }), /Owned SQL volume exists without its credential-bearing container/);
  assert.equal(calls.some(call => call[0] === 'run'), false);
});

for (const failure of ['volume', 'network', 'container', 'created-container']) {
  test(`start-sql resumes initial creation after interrupted ${failure} without changing credentials`, async t => {
    const runtime = await localWorkspaceFixture(t, 42100);
    let volume = false;
    let network = false;
    let exists = false;
    let interrupted = false;
    let changedPassword = false;
    let starts = 0;
    let creation = '';
    let password: string | undefined;
    const path = `${runtime.names.sqlState}.creation.json`;
    const runner: Run = async (_command, args, options) => {
      const format = args.at(-1) ?? '';
      if (args[0] === 'ps') return exists ? runtime.sqlContainer : '';
      if (args[0] === 'volume') {
        if (args[1] === 'ls') return volume ? `${runtime.sqlContainer}-data` : '';
        if (args[1] === 'inspect') return JSON.stringify({ workspace: runtime.id, role: 'sql', creation });
        assert.equal(args[1], 'create');
        const pending = JSON.parse(await readFile(path, 'utf8'));
        creation = pending.token;
        assert.ok(creation);
        assert.ok(args.includes(`sql-apps.creation=${creation}`));
        assert.equal(pending.workspace, runtime.id);
        assert.equal(pending.container, runtime.sqlContainer);
        password = pending.password;
        volume = true;
      } else if (args[0] === 'network') {
        if (args[1] === 'ls') return network ? runtime.names.sqlNetwork : '';
        if (args[1] === 'inspect') return JSON.stringify({ workspace: runtime.id, role: 'sql-network' });
        assert.equal(args[1], 'create');
        network = true;
      } else if (args[0] === 'run') {
        assert.equal(options?.env?.MSSQL_SA_PASSWORD, password);
        assert.ok(options?.redact?.includes(password!));
        assert.equal(args.some(arg => arg.includes(password!)), false);
        if (failure !== 'container' || interrupted) exists = true;
      } else if (args[0] === 'inspect') {
        if (format.includes('HostConfig.PortBindings')) return JSON.stringify({
          workspace: runtime.id, image: sqlImage,
          ports: { '1433/tcp': [{ HostIp: '127.0.0.1', HostPort: String(runtime.ports.sql) }] },
        });
        if (format.includes('Mounts')) return JSON.stringify([
          { Type: 'volume', Name: `${runtime.sqlContainer}-data`, Destination: '/var/opt/mssql' },
        ]);
        if (format.includes('Config.Env')) return JSON.stringify([
          `MSSQL_SA_PASSWORD=${changedPassword ? 'a-different-password' : password}`,
        ]);
        if (format.includes('json .State')) return JSON.stringify({
          Status: 'running', StartedAt: new Date(Date.now() - 10000).toISOString(),
        });
        return 'sql';
      } else if (args[0] === 'exec') {
        return args.some(arg => arg.includes('stat -c %Y')) ? String(Math.floor(Date.now() / 1000)) : '5|SQL Azure';
      } else {
        assert.equal(args[0], 'start');
        starts++;
      }
      if (!interrupted && ((failure === args[0]) || (failure.endsWith('container') && args[0] === 'run'))) {
        interrupted = true;
        throw new Error('Synthetic initial creation interruption');
      }
      return '';
    };
    await assert.rejects(startLocalSql(runtime.sqlContainer, runner), /Synthetic initial creation interruption/);
    const pending = JSON.parse(await readFile(path, 'utf8'));
    if (failure === 'volume') {
      await writeFile(path, JSON.stringify({ ...pending, workspace: 'another-workspace' }));
      await assert.rejects(startLocalSql(runtime.sqlContainer, runner), /another workspace/);
      await writeFile(path, JSON.stringify(pending));
    } else if (failure === 'container') {
      creation = 'another-creation';
      await assert.rejects(startLocalSql(runtime.sqlContainer, runner), /Owned SQL volume/);
      creation = pending.token;
    } else if (failure === 'created-container') {
      changedPassword = true;
      await assert.rejects(startLocalSql(runtime.sqlContainer, runner), /credentials differ/);
      assert.equal(starts, 0);
      changedPassword = false;
    }
    await startLocalSql(runtime.sqlContainer, runner);
    assert.equal(password, pending.password);
    assert.equal(exists, true);
    await assert.rejects(readFile(path), { code: 'ENOENT' });
    await startLocalSql(runtime.sqlContainer, runner);
    assert.equal(password, pending.password);
  });
}

test('start-sql refuses a volume replaced between initial discovery and creation', async t => {
  const runtime = await localWorkspaceFixture(t, 42100);
  const mutations: string[] = [];
  let volume = false;
  let network = false;
  await assert.rejects(startLocalSql(runtime.sqlContainer, async (_command, args) => {
    if (args[0] === 'ps') return '';
    if (args[0] === 'volume') {
      if (args[1] === 'ls') return volume ? `${runtime.sqlContainer}-data` : '';
      if (args[1] === 'inspect') return JSON.stringify({
        workspace: runtime.id, role: 'sql', creation: 'another-creation',
      });
      assert.equal(args[1], 'create');
      volume = true;
      return '';
    }
    if (args[0] === 'network') {
      if (args[1] === 'ls') return network ? runtime.names.sqlNetwork : '';
      if (args[1] === 'inspect') return JSON.stringify({ workspace: runtime.id, role: 'sql-network' });
      assert.equal(args[1], 'create');
      network = true;
      return '';
    }
    mutations.push(args[0]!);
    throw new Error('Unsafe container creation');
  }), /Owned SQL volume exists without its credential-bearing container/);
  assert.deepEqual(mutations, []);
});
