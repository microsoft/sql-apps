import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');
const skillPath = path.join('skills', 'sql-apps', 'SKILL.md');

function filesIn(directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', 'coverage', '.local', '.deployment', '.npmrc'].includes(entry.name) ||
        (entry.name.startsWith('.env') && entry.name !== '.env.example') || /\.(log|pem|key)$/i.test(entry.name)) return [];
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(relative) : [relative];
  });
}

test('manifest uses only supported Agent Plugins 1.0 fields', () => {
  const manifest = JSON.parse(read('plugin.json'));
  const fields = new Set([
    '$schema', 'name', 'version', 'description', 'author', 'homepage',
    'repository', 'license', 'keywords', 'extensions',
  ]);
  for (const field of Object.keys(manifest)) {
    assert.ok(fields.has(field), `Unsupported manifest field: ${field}`);
  }
  assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(manifest.name, 'sql-apps');
  assert.match(manifest.name, /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
  assert.ok(manifest.name.length <= 64);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.version, '0.3.1', 'Keep the release candidate version explicit');
  assert.equal(typeof manifest.description, 'string');
  assert.ok(manifest.description.length > 0);
  assert.equal(manifest.license, 'MIT');
  assert.ok(manifest.keywords.every((keyword) => typeof keyword === 'string'));
  assert.ok(existsSync(path.join(root, 'LICENSE')));
});

test('skill is discoverable with valid, narrowly scoped metadata', () => {
  const skill = read(skillPath);
  const frontmatter = skill.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n/);
  assert.ok(frontmatter, 'Missing YAML frontmatter');
  const lines = frontmatter[1].split(/\r?\n/);
  assert.equal(lines.length, 2, 'Keep metadata to name and description');
  assert.equal(lines[0], 'name: sql-apps');
  assert.ok(lines[1].startsWith('description: '));
  // This package uses a JSON-quoted scalar, which is also valid YAML.
  const description = JSON.parse(lines[1].slice('description: '.length));
  assert.ok(description.length > 0 && description.length <= 1024);
  assert.match(description, /Use when/);
  assert.match(description, /user requests SQL Apps/);
  assert.match(description, /SQL Apps profile/);
  assert.ok(skill.split(/\s+/).length < 2200, 'Keep the router within a reading budget');
  assert.equal(readdirSync(path.join(root, 'skills')).length, 1);
});

test('marketplace lists the root plugin with matching release metadata', () => {
  const marketplace = JSON.parse(read(path.join('.claude-plugin', 'marketplace.json')));
  const manifest = JSON.parse(read('plugin.json'));
  assert.equal(marketplace.name, 'sql-apps-skills');
  assert.equal(marketplace.owner.name, 'Microsoft');
  assert.equal(marketplace.metadata.version, manifest.version);
  assert.equal(marketplace.plugins.length, 1);
  const entry = marketplace.plugins[0];
  assert.equal(entry.name, manifest.name);
  assert.equal(entry.version, manifest.version);
  assert.equal(typeof entry.description, 'string');
  assert.ok(entry.description.length > 0);
  assert.equal(entry.source, './');
  const source = path.resolve(root, entry.source);
  assert.equal(source, path.resolve(root));
  assert.ok(existsSync(path.join(source, 'plugin.json')));
  assert.ok(existsSync(path.join(source, skillPath)));
  assert.ok(read('README.md').includes(`${entry.name}@${marketplace.name}`));
});

test('host compatibility manifests share the canonical payload and release', () => {
  const manifest = JSON.parse(read('plugin.json'));
  for (const host of ['.claude-plugin', '.codex-plugin', '.cursor-plugin']) {
    const compatibility = JSON.parse(read(path.join(host, 'plugin.json')));
    for (const field of ['name', 'version', 'description', 'license']) {
      assert.equal(compatibility[field], manifest[field], `${host}: mismatched ${field}`);
    }
    assert.equal(compatibility.author.name, 'Microsoft');
    assert.equal(compatibility.skills, './skills/');
    const skills = path.resolve(root, compatibility.skills);
    assert.equal(skills, path.join(root, 'skills'));
    assert.ok(existsSync(path.join(skills, 'sql-apps', 'SKILL.md')));
    assert.ok(!existsSync(path.join(root, host, 'skills')), `${host}: duplicated skills`);
  }
  const codex = JSON.parse(read(path.join('.codex-plugin', 'plugin.json')));
  assert.equal(codex.interface.displayName, 'SQL Apps');
  assert.equal(codex.interface.category, 'Coding');
  assert.deepEqual(codex.interface.capabilities, ['Read', 'Write']);
});

test('Codex and Cursor marketplaces resolve to the same root plugin', () => {
  const shared = JSON.parse(read(path.join('.claude-plugin', 'marketplace.json')));
  const cursor = JSON.parse(read(path.join('.cursor-plugin', 'marketplace.json')));
  assert.deepEqual(cursor, shared, 'Keep shared and Cursor catalog metadata aligned');

  const codex = JSON.parse(read(path.join('.agents', 'plugins', 'marketplace.json')));
  assert.equal(codex.name, shared.name);
  assert.equal(codex.interface.displayName, 'SQL Apps Skills');
  assert.equal(codex.plugins.length, 1);
  const entry = codex.plugins[0];
  assert.equal(entry.name, shared.plugins[0].name);
  assert.deepEqual(entry.source, { source: 'local', path: './' });
  assert.deepEqual(entry.policy, { installation: 'AVAILABLE', authentication: 'ON_INSTALL' });
  assert.equal(entry.category, 'Coding');
  const pluginRoot = path.resolve(root, entry.source.path);
  assert.equal(pluginRoot, path.resolve(root));
  assert.ok(existsSync(path.join(pluginRoot, '.codex-plugin', 'plugin.json')));
  assert.ok(existsSync(path.join(pluginRoot, skillPath)));
});

test('Gemini extension uses native skill discovery without global context or code', () => {
  const extension = JSON.parse(read('gemini-extension.json'));
  const manifest = JSON.parse(read('plugin.json'));
  assert.deepEqual(Object.keys(extension).sort(), ['description', 'name', 'version']);
  for (const field of ['name', 'version', 'description']) {
    assert.equal(extension[field], manifest[field]);
  }
  assert.ok(existsSync(path.join(root, 'skills', extension.name, 'SKILL.md')));
  assert.ok(!existsSync(path.join(root, 'GEMINI.md')), 'Do not make plugin guidance always-on');
});

test('every bundled Markdown link resolves inside the plugin', () => {
  const copiedAppDocument = file => file.startsWith(path.join('skills', 'sql-apps', 'templates', 'alternatives') + path.sep) &&
    ['README.md', 'deployment.md'].includes(path.basename(file));
  const documents = [
    'README.md', 'SECURITY.md', 'SUPPORT.md', 'CODE_OF_CONDUCT.md',
    ...filesIn('skills').filter(file => file.endsWith('.md') && !copiedAppDocument(file)), ...filesIn('docs'),
  ];
  for (const document of documents) {
    const text = read(document);
    assert.equal((text.match(/^```/gm) ?? []).length % 2, 0, `${document}: unbalanced fences`);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https:\/\/|mailto:)/.test(target) || target.startsWith('#')) continue;
      const resolved = path.resolve(root, path.dirname(document), target.split('#')[0]);
      const relative = path.relative(root, resolved);
      assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), `${document}: escaping link`);
      assert.ok(existsSync(resolved), `${document}: missing ${target}`);
    }
  }
});

test('skill links resolve within an independent installed payload', () => {
  const skillFiles = filesIn('skills');
  const copiedAppDocument = file => file.startsWith(path.join('skills', 'sql-apps', 'templates', 'alternatives') + path.sep) &&
    ['README.md', 'deployment.md'].includes(path.basename(file));
  for (const document of skillFiles.filter(file => file.endsWith('.md') && !copiedAppDocument(file))) {
    const text = read(document);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https:\/\/|mailto:)/.test(target) || target.startsWith('#')) continue;
      const resolved = path.resolve(root, path.dirname(document), target.split('#')[0]);
      const packageRelative = path.relative(root, resolved);
      const skillRelative = path.relative(path.resolve(root, 'skills'), resolved);
      const isBundledReference = !skillRelative.startsWith('..') && !path.isAbsolute(skillRelative);
      const isPluginManifest = resolved === path.resolve(root, 'plugin.json');
      assert.ok(isBundledReference || isPluginManifest, `${document}: escaping package dependency: ${target}`);
      assert.ok(!resolved.startsWith(path.resolve(root, 'docs')), `${document}: skill depends on unbundled docs: ${target}`);
      assert.ok(!packageRelative.startsWith('..') && !path.isAbsolute(packageRelative), `${document}: escaping package root: ${target}`);
      assert.ok(existsSync(resolved), `${document}: missing in package: ${target}`);
    }
  }
});

test('constitution contains one portable durable project-policy block', () => {
  const constitution = read(path.join('skills', 'sql-apps', 'references', 'constitution.md'));
  const block = constitution.match(/```markdown\r?\n([\s\S]+?)\r?\n```/);
  assert.ok(block);
  assert.equal((block[1].match(/sql-apps:constitution:start/g) ?? []).length, 1);
  assert.equal((block[1].match(/sql-apps:constitution:end/g) ?? []).length, 1);
  assert.doesNotMatch(block[1], /C:\\|PLUGIN_ROOT|node_modules/);
  assert.ok(block[1].split(/\s+/).length < 300, 'Keep always-on policy concise');
});

test('starter source is inert template content, not a host runtime or vendored specialist', () => {
  const payload = filesIn('skills');
  const starter = path.join('skills', 'sql-apps', 'templates', 'starter') + path.sep;
  assert.ok(payload.includes(starter + 'package-lock.json'));
  assert.ok(payload.includes(starter + path.join('scripts', 'acceptance.mjs')));
  assert.ok(payload.includes(path.join('skills', 'sql-apps', 'references', 'deployment.md')));
  const alternatives = path.join('skills', 'sql-apps', 'templates', 'alternatives') + path.sep;
  assert.ok(payload.every((file) => file.startsWith(starter) || file.startsWith(alternatives) || file.endsWith('.md') || file.endsWith('.yml')));
  assert.ok(!payload.some(file => file.split(path.sep).some(part => ['node_modules', 'dist', '.local'].includes(part))));
  for (const component of [
    'mcp.json', '.mcp.json', '.lsp.json', 'hooks', 'agents', 'commands', 'rules',
    'settings.json', 'GEMINI.md', 'com.github.copilot', 'automations',
    'output-styles', 'workflows', 'monitors', 'themes', 'evals', 'package.json',
  ]) {
    assert.ok(!existsSync(path.join(root, component)), `Unexpected runtime component: ${component}`);
  }
});
