import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyRelease } from '../scripts/verify-release.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const script = path.join(root, 'scripts', 'verify-release.mjs');
const metadata = [
  'plugin.json', 'gemini-extension.json',
  '.claude-plugin', '.codex-plugin', '.cursor-plugin', '.agents',
];

function fixture(t) {
  const directory = path.join(root, 'tests', `.release-verification-${randomUUID()}`);
  const sourceRoot = path.join(directory, 'source');
  const installedRoot = path.join(directory, 'installed');
  mkdirSync(sourceRoot, { recursive: true });
  t.after(() => rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  for (const entry of [...metadata, 'skills']) {
    cpSync(path.join(root, entry), path.join(sourceRoot, entry), { recursive: true });
  }
  cpSync(sourceRoot, installedRoot, { recursive: true });
  return { sourceRoot, installedRoot };
}

function editJSON(root, relative, change) {
  const file = path.join(root, relative);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  change(data);
  writeFileSync(file, JSON.stringify(data));
}

function cli(args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
}

test('an independent package copy matches source metadata and every skill byte', (t) => {
  const roots = fixture(t);
  const result = verifyRelease(roots);
  assert.equal(result.version, '0.2.1');
  assert.equal(result.skillFiles, 9);
  assert.match(result.payloadDigest, /^[a-f0-9]{64}$/);
  const command = cli(['--source-root', roots.sourceRoot, '--installed-root', roots.installedRoot]);
  assert.equal(command.status, 0, command.stderr);
  assert.match(command.stdout, /PASS sql-apps 0\.2\.1/);
  assert.ok(command.stdout.includes(result.payloadDigest));
});

test('the CLI defaults source to this checkout, not the current directory', (t) => {
  const { installedRoot } = fixture(t);
  const command = spawnSync(process.execPath, [script, '--installed-root', installedRoot], {
    cwd: installedRoot, encoding: 'utf8',
  });
  assert.equal(command.status, 0, command.stderr);
});

test('a stale installed version fails clearly', (t) => {
  const roots = fixture(t);
  editJSON(roots.installedRoot, 'plugin.json', (data) => { data.version = '0.1.0'; });
  const command = cli(['--source-root', roots.sourceRoot, '--installed-root', roots.installedRoot]);
  assert.equal(command.status, 1);
  assert.match(command.stderr, /installed plugin\.json: version 0\.1\.0; expected 0\.2\.1/);
});

test('same-version changed skill bytes fail, including newline-only drift', (t) => {
  const roots = fixture(t);
  const file = path.join(roots.installedRoot, 'skills', 'sql-apps', 'SKILL.md');
  writeFileSync(file, Buffer.concat([readFileSync(file), Buffer.from('\n')]));
  assert.throws(() => verifyRelease(roots), /payload bytes differ: skills\/sql-apps\/SKILL\.md/);
});

test('every relative link required by the installed skill exists in the copied payload', (t) => {
  const { installedRoot } = fixture(t);
  const skillPath = path.join(installedRoot, 'skills', 'sql-apps', 'SKILL.md');
  const skill = readFileSync(skillPath, 'utf8');
  for (const match of skill.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https:\/\/|mailto:)/.test(target) || target.startsWith('#')) continue;
    assert.ok(
      existsSync(path.resolve(path.dirname(skillPath), target.split('#')[0])),
      `Missing bundled skill dependency: ${target}`,
    );
  }
});

test('missing references, extra files, and missing skill directories fail', async (t) => {
  await t.test('missing reference', (t) => {
    const roots = fixture(t);
    rmSync(path.join(roots.installedRoot, 'skills', 'sql-apps', 'references', 'constitution.md'));
    assert.throws(() => verifyRelease(roots), /missing payload file: skills\/sql-apps\/references\/constitution\.md/);
  });
  await t.test('missing prerequisite guidance', (t) => {
    const roots = fixture(t);
    rmSync(path.join(roots.installedRoot, 'skills', 'sql-apps', 'references', 'prerequisites.md'));
    assert.throws(() => verifyRelease(roots), /missing payload file: skills\/sql-apps\/references\/prerequisites\.md/);
  });
  await t.test('stale prerequisite guidance', (t) => {
    const roots = fixture(t);
    const file = path.join(roots.installedRoot, 'skills', 'sql-apps', 'references', 'prerequisites.md');
    writeFileSync(file, 'Outdated prerequisite instructions.');
    assert.throws(() => verifyRelease(roots), /payload bytes differ: skills\/sql-apps\/references\/prerequisites\.md/);
  });
  await t.test('extra payload', (t) => {
    const roots = fixture(t);
    writeFileSync(path.join(roots.installedRoot, 'skills', 'sql-apps', 'stale.md'), 'old guidance');
    assert.throws(() => verifyRelease(roots), /unexpected payload file: skills\/sql-apps\/stale\.md/);
  });
  await t.test('no skills', (t) => {
    const roots = fixture(t);
    rmSync(path.join(roots.installedRoot, 'skills'), { recursive: true });
    assert.throws(() => verifyRelease(roots), /installed skills: cannot read/);
  });
});

test('missing or malformed metadata and incompatible names fail', async (t) => {
  await t.test('missing native manifest', (t) => {
    const roots = fixture(t);
    rmSync(path.join(roots.installedRoot, '.codex-plugin', 'plugin.json'));
    assert.throws(() => verifyRelease(roots), /installed \.codex-plugin\/plugin\.json: cannot read/);
  });
  await t.test('invalid JSON', (t) => {
    const roots = fixture(t);
    writeFileSync(path.join(roots.installedRoot, 'gemini-extension.json'), '{');
    assert.throws(() => verifyRelease(roots), /installed gemini-extension\.json: cannot read/);
  });
  await t.test('wrong plugin identity', (t) => {
    const roots = fixture(t);
    editJSON(roots.installedRoot, 'plugin.json', (data) => { data.name = 'another-plugin'; });
    assert.throws(() => verifyRelease(roots), /name another-plugin; expected sql-apps/);
  });
});

test('every versioned manifest and catalog is checked, not just plugin.json', (t) => {
  const roots = fixture(t);
  for (const relative of ['gemini-extension.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json']) {
    editJSON(roots.installedRoot, relative, (data) => { data.version = '0.1.0'; });
  }
  for (const host of ['.claude-plugin', '.cursor-plugin']) {
    editJSON(roots.installedRoot, `${host}/marketplace.json`, (data) => {
      data.metadata.version = '0.1.0';
      data.plugins[0].version = '0.1.0';
    });
  }
  assert.throws(() => verifyRelease(roots), (error) => {
    for (const expected of ['gemini-extension.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json', '.claude-plugin/marketplace.json metadata', '.cursor-plugin/marketplace.json plugin']) {
      assert.ok(error.message.includes(`installed ${expected}: version 0.1.0`), error.message);
    }
    return true;
  });
});

test('the Codex catalog has the correct identity without a duplicate version field', (t) => {
  const roots = fixture(t);
  editJSON(roots.installedRoot, '.agents/plugins/marketplace.json', (data) => {
    data.plugins[0].name = 'stale-plugin';
  });
  assert.throws(() => verifyRelease(roots), /installed \.agents\/plugins\/marketplace\.json plugin: name stale-plugin/);
});

test('inconsistent source metadata also fails', (t) => {
  const roots = fixture(t);
  editJSON(roots.sourceRoot, '.claude-plugin/plugin.json', (data) => { data.version = '0.1.0'; });
  assert.throws(() => verifyRelease(roots), /source \.claude-plugin\/plugin\.json: version 0\.1\.0/);
});

test('a source-directory loader is not evidence of installation', (t) => {
  const roots = fixture(t);
  assert.throws(() => verifyRelease({ ...roots, installedRoot: roots.sourceRoot }), /distinct from the source/);
});

test('a linked skill directory cannot masquerade as a copied installation', (t) => {
  const roots = fixture(t);
  const skills = path.join(roots.installedRoot, 'skills');
  rmSync(skills, { recursive: true, maxRetries: 10, retryDelay: 100 });
  symlinkSync(path.join(roots.sourceRoot, 'skills'), skills, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => verifyRelease(roots), /installed skills: linked payload/);
});

test('missing target and invalid CLI arguments fail with actionable usage', (t) => {
  const roots = fixture(t);
  const command = cli(['--installed-root', path.join(roots.installedRoot, 'absent')]);
  assert.equal(command.status, 1);
  assert.match(command.stderr, /installed root: cannot read/);
  for (const args of [[], ['--installed-root'], ['--unknown', roots.installedRoot]]) {
    const result = cli(args);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Usage:.*--installed-root/);
  }
});
