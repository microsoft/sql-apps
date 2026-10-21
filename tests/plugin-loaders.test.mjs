import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const names = [
  'sql-apps-application', 'sql-apps-cloud-preview', 'sql-apps-design',
  'sql-apps-diagnostics', 'sql-apps-getting-started', 'sql-apps-local', 'sql-apps-validation',
];
const details = `sql-apps 0.1.0
  Source: sql-apps@inline
Component inventory
  Skills (7)  sql-apps-application, sql-apps-cloud-preview, sql-apps-design, sql-apps-diagnostics, sql-apps-getting-started, sql-apps-local, sql-apps-validation
  Agents (0)
  Hooks (0)
  MCP servers (0)
  LSP servers (0)
Projected token cost
  Always-on:   ~267 tok   added to every session
`;

function cliFixture(host, change = {}) {
  const calls = [];
  let copied;
  const execute = async (command, args, options) => {
    calls.push({ command, args, options });
    assert.equal(options.shell, false);
    assert.equal(options.env.ANTHROPIC_API_KEY, undefined);
    assert.equal(options.env.GITHUB_TOKEN, undefined);
    assert.equal(options.env.SQL_APPS_HOME, undefined);
    assert.equal(options.env.HOME, options.env.USERPROFILE);
    assert.notEqual(options.env.HOME, process.env.HOME);
    assert.equal(options.env.COPILOT_HOME, options.env.CLAUDE_CONFIG_DIR);
    assert.ok(!args.includes('-p'), 'Never start a model session');
    if (args[0] === '--version') {
      if (change.missing) throw Object.assign(new Error('CLI missing'), { code: 'ENOENT' });
      return { stdout: change.version ?? (host === 'claude' ? '2.1.296 (Claude Code)' : 'GitHub Copilot CLI 1.0.98.'), stderr: '' };
    }
    if (change.commandFailure) throw new Error('native validation rejected the fixture');
    if (args.includes('--plugin-dir')) {
      copied = args[1];
      assert.notEqual(copied, process.cwd());
      assert.equal((await readdir(copied)).includes('node_modules'), false);
      assert.equal(JSON.parse(await readFile(join(copied, 'plugin.json'), 'utf8')).name, 'sql-apps');
      return { stdout: change.details ?? details, stderr: '' };
    }
    if (args[1] === 'marketplace' && args[2] === 'add') {
      const entry = JSON.parse(await readFile(join(args[3], '.github', 'plugin', 'marketplace.json'), 'utf8')).plugins[0];
      copied = join(args[3], entry.source);
    }
    if (args[1] === 'list') {
      return { stdout: JSON.stringify(args[0] === 'plugin'
        ? [{ name: 'sql-apps', marketplace: 'sql-apps-skills', version: '0.1.0', enabled: true, source: 'live' }]
        : names.slice(0, change.missingSkill ? -1 : undefined).map(name => ({
          name, source: 'plugin', enabled: !change.disabled, path: join(copied, 'skills', name),
        }))), stderr: '' };
    }
    return { stdout: 'Validation passed', stderr: '' };
  };
  return { calls, execute };
}

for (const host of ['claude', 'copilot']) {
  test(`${host} runner validates the copied package without exposing the user profile`, async () => {
    const { checkPluginLoaders } = await import('../scripts/check-plugin-loaders.mjs');
    const fixture = cliFixture(host);
    const reports = [];
    await checkPluginLoaders(host, {
      execute: fixture.execute,
      environment: { ...process.env, ANTHROPIC_API_KEY: 'not-for-the-child', GITHUB_TOKEN: 'not-for-the-child', SQL_APPS_HOME: 'not-for-the-child' },
      report: text => reports.push(text),
    });
    assert.match(reports.join('\n'), new RegExp(`${host}.*seven`, 'i'));
    assert.ok(fixture.calls.length >= 4);
    for (const call of fixture.calls) {
      assert.equal(call.command, host);
      await assert.rejects(access(call.options.cwd), { code: 'ENOENT' }, 'Temporary session must be cleaned');
      await assert.rejects(access(call.options.env.HOME), { code: 'ENOENT' });
    }
    if (host === 'claude') {
      assert.match(reports.join('\n'), /~267 tok/);
      assert.ok(fixture.calls.some(call => call.args.includes('--strict')));
    } else {
      assert.ok(fixture.calls.some(call => call.args.join(' ') === 'plugin install sql-apps@sql-apps-skills'));
      assert.ok(fixture.calls.some(call => call.args.join(' ') === 'skill list --json'));
    }
  });
}

for (const [host, filename] of [['claude', 'claude.exe'], ['copilot', 'npm-loader.js']]) {
  test(`${host} runner launches the explicit npm package entrypoint without a shell`, async () => {
    const { checkPluginLoaders } = await import('../scripts/check-plugin-loaders.mjs');
    const entrypoint = join(process.cwd(), 'npm tools with spaces', filename);
    const fixture = cliFixture(host);
    await checkPluginLoaders(host, {
      entrypoint,
      execute: (command, args, options) => {
        assert.equal(command, host === 'copilot' ? process.execPath : entrypoint);
        if (host === 'copilot') assert.equal(args[0], entrypoint);
        return fixture.execute(host, host === 'copilot' ? args.slice(1) : args, options);
      },
      report: () => {},
    });
  });
}

for (const [name, host, change, message] of [
  ['missing CLI', 'claude', { missing: true }, /CLI missing/],
  ['wrong version', 'claude', { version: '2.1.2 (Claude Code)' }, /2\.1\.296/],
  ['failed native check', 'claude', { commandFailure: true }, /native validation rejected/],
  ['missing skill', 'claude', { details: details.replace('Skills (7)', 'Skills (6)') }, /skill|inventory/i],
  ['unexpected hook', 'claude', { details: details.replace('Hooks (0)', 'Hooks (1)') }, /Hooks/],
  ['wrong Claude source', 'claude', { details: details.replace('@inline', '@other-marketplace') }, /source/i],
  ['missing cost evidence', 'claude', { details: details.replace(/  Always-on:.+\n/, '') }, /cost|Always-on/i],
  ['missing Copilot skill', 'copilot', { missingSkill: true }, /skill|inventory/i],
  ['disabled Copilot skill', 'copilot', { disabled: true }, /enabled/i],
]) {
  test(`loader runner rejects ${name} and cleans the fixture`, async () => {
    const { checkPluginLoaders } = await import('../scripts/check-plugin-loaders.mjs');
    const fixture = cliFixture(host, change);
    await assert.rejects(checkPluginLoaders(host, { execute: fixture.execute, report: () => {} }), message);
    for (const call of fixture.calls) await assert.rejects(access(call.options.cwd), { code: 'ENOENT' });
  });
}

test('checkout installer supports an explicit JavaScript CLI without executing an npm shell shim', async t => {
  const home = await mkdtemp(join(tmpdir(), 'sql apps installer '));
  t.after(() => rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const entrypoint = join(home, 'copilot-cli.mjs');
  const calls = join(home, 'calls.jsonl');
  const skills = names.map(name => ({
    name, source: 'plugin', enabled: true, path: resolve('plugins', 'sql-apps', 'skills', name),
  }));
  await writeFile(entrypoint, `
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)}, JSON.stringify(args) + '\\n');
if (args.join(' ') === 'plugin marketplace list --json') console.log(JSON.stringify([
  { name: 'sql-apps-skills', source: ${JSON.stringify(`Local: ${process.cwd()}`)} }
]));
else if (args.join(' ') === 'plugin list --json') console.log(JSON.stringify([
  { name: 'sql-apps', marketplace: 'sql-apps-skills', enabled: true }
]));
else if (args.join(' ') === 'skill list --json') console.log(JSON.stringify(${JSON.stringify(skills)}));
else if (args.join(' ') !== 'plugin enable sql-apps@sql-apps-skills') throw new Error('Unexpected installer command');
`);
  const result = spawnSync(process.execPath, ['scripts/install-plugin.mjs', entrypoint], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 30000, shell: false,
    env: { ...process.env, HOME: home, USERPROFILE: home, COPILOT_HOME: home },
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /All 7 skills are discovered and enabled/);
  assert.deepEqual((await readFile(calls, 'utf8')).trim().split('\n').map(JSON.parse), [
    ['plugin', 'marketplace', 'list', '--json'],
    ['plugin', 'list', '--json'],
    ['plugin', 'enable', 'sql-apps@sql-apps-skills'],
    ['plugin', 'list', '--json'],
    ['skill', 'list', '--json'],
  ]);
});

test('checkout installer rejects shell shims and relative CLI paths before registration', () => {
  for (const entrypoint of [resolve('copilot.cmd'), resolve('copilot.ps1'), 'copilot.js']) {
    const result = spawnSync(process.execPath, ['scripts/install-plugin.mjs', entrypoint], {
      encoding: 'utf8', timeout: 10000, shell: false,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /absolute native or Node CLI entrypoint, not an npm shell shim/);
  }
});
