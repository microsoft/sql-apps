import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSetup, parseArguments } from '../scripts/setup-check.mjs';
import { initializeWorkspace, runtimeFor } from '../src/workspace.mjs';

function fixture(overrides = {}) {
  const calls = [];
  return {
    calls,
    platform: 'win32', architecture: 'x64', nodeVersion: '22.22.2', memoryBytes: 8 * 1024 ** 3,
    read: async path => {
      if (path.endsWith('package.json')) return '{"name":"sql-apps","engines":{"node":">=22 <23 || >=24 <25"}}';
      if (path.endsWith('local.ts')) return "const sqlImage = 'preview.example/azure-sql/db-dev:latest';";
      throw Object.assign(new Error('absent'), { code: 'ENOENT' });
    },
    exists: async () => true,
    port: async () => 'free',
    fetch: async () => new Response('{}'),
    run: async (command, args) => {
      calls.push([command, ...args]);
      if (command === 'npm') return '10.9.4';
      if (command === 'dotnet') return args[0] === '--list-sdks' ? '8.0.421 [SDK]' : '8.0.421';
      if (args[0] === '--version') return 'Docker version 28.0.0';
      if (args[0] === 'info') return '{"OSType":"linux","Architecture":"x86_64","MemTotal":8589934592}';
      if (args[0] === 'image') return '[{"Architecture":"amd64","Os":"linux"}]';
      if (args[0] === 'ps') return '';
      if (args[0] === 'container') return '{"status":"running","owner":"","image":"user-image"}';
      throw new Error('Unexpected probe');
    },
    ...overrides,
  };
}

test('read-only pre-build diagnostics work on Windows, macOS and Linux without dependencies', async () => {
  for (const platform of ['win32', 'darwin', 'linux']) {
    const deps = fixture({ platform, exists: async () => false });
    const report = await checkSetup({ root: process.cwd() }, deps);
    assert.equal(report.ready, true);
    assert.equal(report.platform, platform);
    assert.equal(report.checks.find(c => c.id === 'dependencies').required, false);
    assert.equal(report.checks.find(c => c.id === 'build').status, 'action-required');
    assert.ok(deps.calls.every(call => !call.some(value => ['pull', 'run', 'login', 'start', 'stop', 'rm', 'install', 'restore'].includes(value))));
    assert.ok(deps.calls.every(call => !call.some(value => value.includes('Config.Env'))));
  }
});

test('missing prerequisites, engine modes and malformed results fail safely without raw secrets', async () => {
  for (const [command, code] of [['npm', 'NPM_UNAVAILABLE'], ['dotnet', 'SDK_UNAVAILABLE'], ['docker', 'DOCKER_UNAVAILABLE']]) {
    const deps = fixture();
    const run = deps.run;
    deps.run = async (cmd, args) => { if (cmd === command) throw new Error('password=secret'); return run(cmd, args); };
    const report = await checkSetup({}, deps);
    assert.equal(report.ready, false);
    assert.ok(report.checks.some(c => c.code === code));
    assert.equal(JSON.stringify(report).includes('password=secret'), false);
  }
  for (const result of ['{"OSType":"windows","Architecture":"amd64"}', 'not JSON']) {
    const deps = fixture();
    const run = deps.run;
    deps.run = (cmd, args) => args[0] === 'info' ? Promise.resolve(result) : run(cmd, args);
    assert.equal((await checkSetup({}, deps)).ready, false);
  }
  const deps = fixture();
  const run = deps.run;
  deps.run = (cmd, args) => args[0] === 'info' ? Promise.reject(new Error('timeout')) : run(cmd, args);
  assert.ok((await checkSetup({}, deps)).checks.some(c => c.code === 'DOCKER_NOT_RUNNING'));
});

test('unsupported Node, runtime-only SDK and global.json incompatibility are explicit', async () => {
  assert.equal((await checkSetup({}, fixture({ nodeVersion: '23.0.0' }))).ready, false);
  const deps = fixture();
  const run = deps.run;
  deps.run = (cmd, args) => args[0] === '--list-sdks' ? Promise.resolve('') : run(cmd, args);
  assert.ok((await checkSetup({}, deps)).checks.some(c => c.code === 'SDK_TOO_OLD'));
  deps.run = (cmd, args) => args[0] === '--version' && cmd === 'dotnet' ?
    Promise.reject(new Error('global.json could not resolve')) : run(cmd, args);
  assert.ok((await checkSetup({}, deps)).checks.some(c => c.code === 'SDK_SELECTION_FAILED'));
});

test('SQL cache, preview access, ARM and selected-container states are not confused with verified SQL', async () => {
  const deps = fixture({ architecture: 'arm64' });
  const run = deps.run;
  deps.run = (cmd, args) => args[0] === 'image' ? Promise.reject(new Error('absent')) : run(cmd, args);
  let report = await checkSetup({}, deps);
  assert.equal(report.ready, false);
  assert.ok(report.checks.some(c => c.code === 'SQL_IMAGE_ACCESS_REQUIRED'));
  assert.ok(report.checks.some(c => c.code === 'SQL_X64_EMULATION'));
  report = await checkSetup({ container: 'user-sql' }, deps);
  assert.equal(report.ready, true);
  assert.match(report.checks.find(c => c.id === 'sql-image').nextAction, /EngineEdition/);
  deps.run = (cmd, args) => args[0] === 'container' ?
    Promise.resolve('{"status":"exited","owner":"","image":"private"}') : run(cmd, args);
  report = await checkSetup({ container: 'user-sql' }, deps);
  assert.equal(report.ready, false);
  assert.ok(report.checks.some(c => c.code === 'SQL_CONTAINER_STOPPED'));
  await assert.rejects(checkSetup({ container: 'bad;name' }, deps), /container name/);
});

test('port conflicts never authorize killing services; healthy gateway alone is not proof of ownership', async () => {
  const deps = fixture({ port: async port => port === 18080 ? 'occupied' : 'free' });
  let report = await checkSetup({}, deps);
  assert.equal(report.ready, false);
  assert.ok(report.checks.some(c => c.code === 'EXISTING_GATEWAY_CHECK_OWNERSHIP'));
  const run = deps.run;
  deps.port = async () => 'occupied';
  deps.run = (cmd, args) => args[0] === 'ps' ? Promise.resolve(
    '{"owner":"data","ports":"127.0.0.1:15000->5000/tcp"}\n' +
    '{"owner":"storage","ports":"127.0.0.1:10000->10000/tcp, 127.0.0.1:10001->10001/tcp"}\n' +
    '{"owner":"functions","ports":"127.0.0.1:17071->80/tcp"}') : run(cmd, args);
  report = await checkSetup({}, deps);
  assert.ok(report.checks.filter(c => c.code === 'OWNED_SERVICE_RUNNING').length === 4);
  deps.port = async () => 'unknown';
  assert.equal((await checkSetup({}, deps)).ready, false);
});

test('configured setup diagnostics use derived ports and reject another workspace label', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-setup-isolated-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initializeWorkspace(root, 32000, async () => 'free');
  const runtime = runtimeFor(undefined, root);
  for (const workspace of [runtime.id, 'another-workspace']) {
    const deps = fixture({ port: async port => port === runtime.ports.data ? 'occupied' : 'free' });
    const run = deps.run;
    deps.run = (cmd, args) => args[0] === 'ps' ? Promise.resolve(JSON.stringify({
      owner: 'data', workspace, ports: `127.0.0.1:${runtime.ports.data}->5000/tcp`,
    })) : run(cmd, args);
    const report = await checkSetup({ root }, deps);
    assert.equal(report.workspace.origins.app, 'http://127.0.0.1:32000');
    assert.equal(report.workspace.origins.data, 'http://127.0.0.1:32001');
    const portCheck = report.checks.find(check => check.id === `port-${runtime.ports.data}`);
    assert.equal(portCheck.status, workspace === runtime.id ? 'ready' : 'action-required');
    assert.equal(report.ready, workspace === runtime.id);
    assert.ok(deps.calls.every(call => !call.some(value => ['pull', 'run', 'login', 'start', 'stop', 'rm'].includes(value))));
  }
});

test('diagnostic argument parsing is explicit and rejects malformed or duplicate values', () => {
  assert.deepEqual(parseArguments(['--json', '--container', 'existing']), { json: true, container: 'existing' });
  for (const args of [['--bad'], ['--container'], ['--json', '--json'], ['--container', '--json'], ['--container', 'bad;name']]) {
    assert.throws(() => parseArguments(args));
  }
});

test('unknown hosts and malformed Docker version cannot pass readiness', async () => {
  assert.equal((await checkSetup({}, fixture({ platform: 'unsupported' }))).ready, false);
  const deps = fixture();
  const run = deps.run;
  deps.run = (cmd, args) => cmd === 'docker' && args[0] === '--version' ? Promise.resolve('') : run(cmd, args);
  assert.ok((await checkSetup({}, deps)).checks.some(c => c.code === 'DOCKER_UNAVAILABLE'));
});

test('actual pre-build CLI exits nonzero with parseable JSON on invalid arguments', () => {
  const result = spawnSync(process.execPath, ['scripts/setup-check.mjs', '--json', '--unexpected'], {
    encoding: 'utf8', timeout: 10000, shell: false,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ready, false);
  assert.equal(report.checks[0].code, 'DIAGNOSTIC_FAILED');
  assert.match(report.checks[0].nextAction, /usage/);
  assert.equal(result.stderr, '');
});
