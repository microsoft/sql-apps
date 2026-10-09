import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeWorkspace } from '../src/workspace.mjs';
import { verifyContainerWorkspace } from '../src/local-ownership.js';
import { localCommand, sqlImage } from '../src/local.js';
import type { Run } from '../src/process.js';

test('isolated ownership rejects wrong workspace, image and published ports before mutation', async t => {
  const home = await mkdtemp(join(tmpdir(), 'sql-apps ownership-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const runtime = await initializeWorkspace(home, 36000, async () => 'free');
  const good = { workspace: runtime.id, image: 'expected:digest',
    ports: { '5000/tcp': [{ HostIp: '127.0.0.1', HostPort: String(runtime.ports.data) }] } };
  for (const details of [
    { ...good, workspace: 'another' }, { ...good, image: 'different' },
    { ...good, ports: { '5000/tcp': [{ HostIp: '0.0.0.0', HostPort: String(runtime.ports.data) }] } },
    { ...good, ports: { '5000/tcp': [{ HostIp: '127.0.0.1', HostPort: '15000' }] } },
  ]) {
    const calls: string[][] = [];
    await assert.rejects(verifyContainerWorkspace('owned-data', runtime, 'expected:digest',
      { '5000/tcp': runtime.ports.data }, async (_command, args) => {
        calls.push([...args]); return JSON.stringify(details);
      }), /workspace|image|port/);
    assert.equal(calls.every(call => call[0] === 'inspect'), true);
  }
  await verifyContainerWorkspace('owned-data', runtime, 'expected:digest',
    { '5000/tcp': runtime.ports.data }, async () => JSON.stringify(good));
});

test('explicit SQL recovery preserves credentials and labeled data without touching running or foreign resources', async t => {
  const home = await mkdtemp(join(tmpdir(), 'sql-apps sql-recovery-'));
  const original = process.cwd();
  t.after(() => rm(home, { recursive: true, force: true }));
  const runtime = await initializeWorkspace(home, 37000, async () => 'free');
  process.chdir(home);
  try {
    const password = 'Existing1!SqlCredential';
    const imageId = `sha256:${'a'.repeat(64)}`;
    for (const scenario of ['good', 'create-failure', 'running', 'foreign-container', 'foreign-volume', 'foreign-network', 'changed-image', 'missing-password', 'external']) {
      const calls: string[][] = [];
      let containerExists = true;
      let failCreate = scenario === 'create-failure';
      const runner: Run = async (_command, args, options) => {
        calls.push([...args]);
        const format = args.at(-1) ?? '';
        if (args[0] === 'image') return `${scenario === 'changed-image' ? `sha256:${'b'.repeat(64)}` : imageId}\n${imageId}`;
        if (args[0] === 'volume') return args[1] === 'ls' ? `${runtime.defaultSql}-data` :
          JSON.stringify({ workspace: scenario === 'foreign-volume' ? 'another' : runtime.id, role: 'sql' });
        if (args[0] === 'network') return args[1] === 'ls' ? runtime.names.sqlNetwork :
          JSON.stringify({ workspace: scenario === 'foreign-network' ? 'another' : runtime.id, role: 'sql-network' });
        if (args[0] === 'ps') return containerExists ? runtime.defaultSql : '';
        if (args[0] === 'rm') { containerExists = false; return ''; }
        if (args[0] === 'inspect') {
          assert.equal(containerExists, true, 'Missing-container recovery must use the journal, not inspect a deleted container');
          if (format.includes('HostConfig.PortBindings')) return JSON.stringify({
            workspace: scenario === 'foreign-container' ? 'another' : runtime.id, image: sqlImage,
            ports: { '1433/tcp': [{ HostIp: '127.0.0.1', HostPort: String(runtime.ports.sql) }] },
          });
          if (format.includes('State.Status')) return JSON.stringify({
            role: 'sql', status: scenario === 'running' ? 'running' : 'exited', imageId,
          });
          if (format.includes('Config.Env')) return JSON.stringify(scenario === 'missing-password' ? [] : [`MSSQL_SA_PASSWORD=${password}`]);
          if (format.includes('Mounts')) return JSON.stringify([
            { Type: 'volume', Name: `${runtime.defaultSql}-data`, Destination: '/var/opt/mssql' },
          ]);
          if (format.includes('json .State')) return JSON.stringify({
            Status: 'running', StartedAt: new Date(Date.now() - 10_000).toISOString(),
          });
          return 'sql';
        }
        if (args[0] === 'exec') return args.some(value => value.includes('stat -c %Y')) ?
          String(Math.floor(Date.now() / 1_000)) : '5|SQL Azure';
        if (args[0] === 'run') {
          assert.equal(options?.env?.MSSQL_SA_PASSWORD, password);
          assert.equal(options?.redact?.includes(password), true);
          assert.equal(args.some(value => value.includes(password)), false);
          assert.equal(args.includes(`type=volume,source=${runtime.defaultSql}-data,target=/var/opt/mssql`), true);
          assert.equal(args.includes(`127.0.0.1:${runtime.ports.sql}:1433`), true);
          if (failCreate) throw new Error('Synthetic port conflict');
          containerExists = true;
        }
        return '';
      };
      const recover = localCommand('recover-sql', scenario === 'external' ? 'sqldbdev' : runtime.defaultSql, runner);
      if (scenario === 'good') {
        await recover;
        assert.deepEqual(calls.filter(call => call[0] === 'rm'), [['rm', runtime.defaultSql]]);
        assert.equal(calls.filter(call => call[0] === 'run').length, 1);
        assert.equal(calls.some(call => ['volume', 'network'].includes(call[0]!) && ['create', 'rm'].includes(call[1]!)), false);
      } else if (scenario === 'create-failure') {
        await assert.rejects(recover, /Synthetic port conflict/);
        const pending = JSON.parse(await readFile(`${runtime.names.sqlState}.recovery.json`, 'utf8'));
        assert.equal(pending.password, password, 'Failure must not lose the original administrator credential');
        assert.equal(pending.workspace, runtime.id);
        calls.length = 0;
        await assert.rejects(localCommand('start-sql', runtime.defaultSql, runner), /recover-sql/);
        assert.equal(calls.length, 0, 'Normal startup must not silently regenerate credentials after interrupted recovery');
        failCreate = false;
        await localCommand('recover-sql', runtime.defaultSql, runner);
        await assert.rejects(readFile(`${runtime.names.sqlState}.recovery.json`), { code: 'ENOENT' });
      } else {
        await assert.rejects(recover, /running|stopped|workspace|volume|network|image|credential|isolated|external/i);
        assert.equal(calls.some(call => ['rm', 'run', 'start'].includes(call[0]!)), false);
      }
    }
  } finally {
    process.chdir(original);
  }
});
