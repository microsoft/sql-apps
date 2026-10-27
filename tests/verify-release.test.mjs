import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

test('local release-check configuration is ignored without hiding public files', (t) => {
  const { sourceRoot } = fixture(t);
  cpSync(path.join(root, '.gitignore'), path.join(sourceRoot, '.gitignore'));
  const initialized = spawnSync('git', ['-C', sourceRoot, 'init', '--quiet', '--template='], { encoding: 'utf8' });
  assert.equal(initialized.status, 0, initialized.error?.message ?? initialized.stderr);
  const ignored = spawnSync('git', [
    '-C', sourceRoot, '-c', 'core.excludesFile=', 'check-ignore', '--no-index', '--stdin',
  ], {
    input: '.release-check-copilot-0.2.1/config.json\n.release-check-copilot-future/session-state/run/events.jsonl\nREADME.md\nplugin.json\n',
    encoding: 'utf8',
  });
  assert.equal(ignored.status, 0, ignored.error?.message ?? ignored.stderr);
  assert.deepEqual(ignored.stdout.trim().split(/\r?\n/), [
    '.release-check-copilot-0.2.1/config.json',
    '.release-check-copilot-future/session-state/run/events.jsonl',
  ]);
});

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

test('this checkout satisfies the instruction-only package contract', (t) => {
  const { installedRoot } = fixture(t);
  assert.equal(verifyRelease({ sourceRoot: root, installedRoot }).skillFiles, 9);
});

test('the CLI defaults source to this checkout, not the current directory', (t) => {
  const { installedRoot } = fixture(t);
  const command = spawnSync(process.execPath, [script, '--installed-root', installedRoot], {
    cwd: installedRoot, encoding: 'utf8',
  });
  assert.equal(command.status, 0, command.stderr);
});

test('the CLI verifies packages when launched through a linked script directory', async (t) => {
  const roots = fixture(t);
  const linkedScripts = path.join(path.dirname(roots.sourceRoot), 'linked-scripts');
  symlinkSync(path.dirname(script), linkedScripts, process.platform === 'win32' ? 'junction' : 'dir');
  const linkedScript = path.join(linkedScripts, 'verify-release.mjs');
  for (const [name, args, status, output] of [
    ['matching package', ['--source-root', roots.sourceRoot, '--installed-root', roots.installedRoot], 0, /PASS sql-apps 0\.2\.1/],
    ['missing package', ['--installed-root', path.join(roots.installedRoot, 'absent')], 1, /installed root: cannot read/],
    ['missing arguments', [], 2, /Usage:.*--installed-root/],
  ]) {
    await t.test(name, () => {
      const command = spawnSync(process.execPath, [linkedScript, ...args], { cwd: root, encoding: 'utf8' });
      assert.equal(command.status, status, command.stderr);
      assert.match(status === 0 ? command.stdout : command.stderr, output);
    });
  }
});

test('the exported verifier can be imported by stdin and eval programs', async (t) => {
  const roots = fixture(t);
  const source = `import { verifyRelease } from ${JSON.stringify(pathToFileURL(script).href)};
console.log(verifyRelease(${JSON.stringify(roots)}).skillFiles);`;
  for (const [name, args, input] of [
    ['stdin', ['--input-type=module', '-'], source],
    ['eval', ['--input-type=module', '--eval', source, 'non-file-argument'], undefined],
  ]) {
    await t.test(name, () => {
      const command = spawnSync(process.execPath, args, { cwd: root, input, encoding: 'utf8' });
      assert.equal(command.status, 0, command.stderr);
      assert.equal(command.stdout.trim(), '9');
    });
  }
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

test('changing only installed newline encoding is still rejected', (t) => {
  const roots = fixture(t);
  const relative = path.join('skills', 'sql-apps', 'SKILL.md');
  const lf = readFileSync(path.join(roots.sourceRoot, relative), 'utf8').replaceAll('\r\n', '\n');
  writeFileSync(path.join(roots.sourceRoot, relative), lf);
  writeFileSync(path.join(roots.installedRoot, relative), lf.replaceAll('\n', '\r\n'));
  assert.throws(() => verifyRelease(roots), /payload bytes differ: skills\/sql-apps\/SKILL\.md/);
});

test('Windows and Unix Git checkouts produce the same canonical skill bytes', (t) => {
  const { sourceRoot, installedRoot } = fixture(t);
  const windowsRoot = path.join(path.dirname(sourceRoot), 'windows');
  mkdirSync(windowsRoot);
  const attributes = path.join(root, '.gitattributes');
  if (existsSync(attributes)) cpSync(attributes, path.join(sourceRoot, '.gitattributes'));
  for (const entry of readdirSync(path.join(sourceRoot, 'skills'), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    writeFileSync(file, readFileSync(file, 'utf8').replace(/\r?\n/g, '\r\n'));
  }
  function git(args) {
    const env = Object.fromEntries(Object.entries(process.env)
      .filter(([name]) => !name.toUpperCase().startsWith('GIT_')));
    const command = spawnSync('git', [
      '-C', sourceRoot, '-c', 'core.autocrlf=true', '-c', 'core.safecrlf=false',
      '-c', 'core.attributesFile=', ...args,
    ], { env, encoding: 'utf8', timeout: 30_000 });
    assert.equal(command.status, 0, command.error?.message ?? command.stderr);
  }
  git(['init', '--quiet', '--template=']);
  git(['add', '--all']);
  git(['--work-tree', windowsRoot, 'checkout-index', '--all', '--force']);
  git(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', '--work-tree', installedRoot, 'checkout-index', '--all', '--force']);
  const result = verifyRelease({ sourceRoot: windowsRoot, installedRoot });
  assert.equal(result.skillFiles, 9);
  for (const entry of readdirSync(path.join(windowsRoot, 'skills'), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    assert.ok(!readFileSync(file).includes(Buffer.from('\r\n')), `${file}: expected canonical LF bytes`);
  }
});

test('host-loaded components are rejected in an instruction-only package', async (t) => {
  for (const label of ['source', 'installed']) {
    for (const relative of [
      path.join('hooks', 'hooks.json'), 'mcp.json', '.mcp.json', '.lsp.json',
      path.join('agents', 'reviewer.md'), path.join('commands', 'extra.md'),
      path.join('rules', 'extra.mdc'), 'settings.json', 'GEMINI.md',
      path.join('com.github.copilot', 'hooks', 'hooks.json'),
      path.join('automations', 'extra.automation.md'), path.join('output-styles', 'extra.md'),
      path.join('workflows', 'extra.js'), path.join('monitors', 'monitors.json'),
      path.join('themes', 'extra.json'), path.join('evals', 'extra.json'), 'package.json',
      '.MCP.JSON',
    ]) {
      await t.test(`${label} ${relative}`, (t) => {
        const roots = fixture(t);
        const directory = label === 'source' ? roots.sourceRoot : roots.installedRoot;
        const file = path.join(directory, relative);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, relative.endsWith('.json') ? '{}\n' : 'Unreviewed plugin component\n');
        const expected = `${label} ${relative.split(path.sep)[0]}: unexpected plugin component`;
        assert.throws(() => verifyRelease(roots), (error) => {
          assert.ok(error.message.includes(expected), error.message);
          return true;
        });
      });
    }
  }
});

test('matching metadata cannot introduce host components or redirect skill discovery', async (t) => {
  const locations = [
    'plugin.json', 'gemini-extension.json',
    '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json',
    '.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json',
    '.agents/plugins/marketplace.json',
  ];
  for (const relative of locations) {
    for (const field of ['hooks', 'mcpServers', 'lspServers', 'commands', 'agents', 'dependencies', 'experimental', 'extensions']) {
      await t.test(`${relative} ${field}`, (t) => {
        const roots = fixture(t);
        for (const directory of [roots.sourceRoot, roots.installedRoot]) {
          editJSON(directory, relative, (data) => { data[field] = {}; });
        }
        assert.throws(() => verifyRelease(roots), (error) => {
          for (const label of ['source', 'installed']) {
            assert.ok(error.message.includes(`${label} ${relative}: unsupported field ${field}`), error.message);
          }
          return true;
        });
      });
    }
    if (relative.endsWith('marketplace.json')) {
      await t.test(`${relative} inline catalog components`, (t) => {
        const roots = fixture(t);
        for (const directory of [roots.sourceRoot, roots.installedRoot]) {
          editJSON(directory, relative, (data) => { data.plugins[0].mcpServers = {}; });
        }
        assert.throws(() => verifyRelease(roots), /plugin: unsupported field mcpServers/);
      });
      await t.test(`${relative} redirected plugin source`, (t) => {
        const roots = fixture(t);
        for (const directory of [roots.sourceRoot, roots.installedRoot]) {
          editJSON(directory, relative, (data) => { data.plugins[0].source = './unverified-plugin/'; });
        }
        assert.throws(() => verifyRelease(roots), /source must reference only the root plugin/);
      });
    } else {
      await t.test(`${relative} redirected skills`, (t) => {
        const roots = fixture(t);
        for (const directory of [roots.sourceRoot, roots.installedRoot]) {
          editJSON(directory, relative, (data) => { data.skills = './unverified-skills/'; });
        }
        assert.throws(() => verifyRelease(roots), /skills must reference only \.\/skills\//);
      });
    }
  }
});

test('an extra linked hook directory is rejected even when its target is missing', (t) => {
  const roots = fixture(t);
  const target = path.join(path.dirname(roots.sourceRoot), 'hook-target');
  mkdirSync(target);
  symlinkSync(target, path.join(roots.installedRoot, 'hooks'), process.platform === 'win32' ? 'junction' : 'dir');
  rmSync(target, { recursive: true });
  assert.throws(() => verifyRelease(roots), /installed hooks: unexpected plugin component/);
});

test('ordinary documentation and maintainer scripts are allowed outside the skill payload', (t) => {
  const roots = fixture(t);
  cpSync(path.join(root, 'README.md'), path.join(roots.installedRoot, 'README.md'));
  cpSync(path.join(root, 'scripts'), path.join(roots.installedRoot, 'scripts'), { recursive: true });
  assert.equal(verifyRelease(roots).skillFiles, 9);
});

test('relative links in the installed skill and its references resolve in the copied package', (t) => {
  const { installedRoot } = fixture(t);
  const skillsRoot = path.join(installedRoot, 'skills');
  for (const relative of readdirSync(skillsRoot, { recursive: true }).filter((file) => file.endsWith('.md'))) {
    const document = path.join(skillsRoot, relative);
    for (const match of readFileSync(document, 'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https:\/\/|mailto:)/.test(target) || target.startsWith('#')) continue;
      const resolved = path.resolve(path.dirname(document), target.split('#')[0]);
      const packageRelative = path.relative(installedRoot, resolved);
      assert.ok(!packageRelative.startsWith('..') && !path.isAbsolute(packageRelative), `${relative}: escaping package link`);
      assert.ok(existsSync(resolved), `${relative}: missing bundled dependency: ${target}`);
    }
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
  await t.test('obsolete on-premises guidance', (t) => {
    const roots = fixture(t);
    const file = path.join(roots.installedRoot, 'skills', 'sql-apps', 'references', 'sql-server-express.md');
    writeFileSync(file, 'Obsolete on-premises setup instructions.');
    assert.throws(() => verifyRelease(roots), /unexpected payload file: skills\/sql-apps\/references\/sql-server-express\.md/);
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

test('hard-linked source files cannot masquerade as independent installed files', async (t) => {
  for (const relative of [
    'skills/sql-apps/SKILL.md',
    'skills/sql-apps/references/prerequisites.md',
    'plugin.json',
    '.claude-plugin/marketplace.json',
  ]) {
    await t.test(relative, (t) => {
      const roots = fixture(t);
      const source = path.join(roots.sourceRoot, relative);
      const installed = path.join(roots.installedRoot, relative);
      rmSync(installed);
      linkSync(source, installed);
      const expected = `installed ${relative}: shares filesystem identity with source`;
      assert.throws(() => verifyRelease(roots), (error) => {
        assert.ok(error.message.includes(expected), error.message);
        return true;
      });
      writeFileSync(source, readFileSync(source, 'utf8') + '\n');
      assert.equal(readFileSync(installed, 'utf8'), readFileSync(source, 'utf8'));
      assert.throws(() => verifyRelease(roots), (error) => {
        assert.ok(error.message.includes(expected), error.message);
        return true;
      });
    });
  }
  await t.test('a different source path with matching bytes', (t) => {
    const roots = fixture(t);
    const installed = path.join(roots.installedRoot, '.cursor-plugin', 'plugin.json');
    rmSync(installed);
    linkSync(path.join(roots.sourceRoot, '.claude-plugin', 'plugin.json'), installed);
    assert.throws(() => verifyRelease(roots), /installed \.cursor-plugin\/plugin\.json: shares filesystem identity with source/);
  });
});

test('missing target and invalid CLI arguments fail with actionable usage', (t) => {
  const roots = fixture(t);
  const command = cli(['--installed-root', path.join(roots.installedRoot, 'absent')]);
  assert.equal(command.status, 1);
  assert.match(command.stderr, /installed root: cannot read/);
  for (const args of [
    [], ['--installed-root'], ['--unknown', roots.installedRoot],
    ['toString', 'ignored', '--installed-root', roots.installedRoot],
    ['constructor', 'ignored', '--installed-root', roots.installedRoot],
    ['__proto__', 'ignored', '--installed-root', roots.installedRoot],
  ]) {
    const result = cli(args);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Usage:.*--installed-root/);
  }
});
