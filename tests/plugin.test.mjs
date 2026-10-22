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
  assert.equal(manifest.version, '0.2.1', 'Keep the patch release version explicit');
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
  assert.ok(skill.split(/\r?\n/).length < 200, 'Keep the router small');
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

test('release and installation guidance verify payloads and require discovered DAB', () => {
  const installation = read(path.join('docs', 'installation.md'));
  const releasing = read(path.join('docs', 'reference', 'releasing.md'));
  assert.match(installation, /0\.2\.1 patch release candidate/);
  assert.match(installation, /microsoft-sql@microsoft-sql/);
  assert.match(installation, /mandatory/);
  assert.match(installation, /dab-rest-and-graphql/);
  assert.match(installation, /mssql_dab/);
  assert.match(installation, /Do not silently substitute direct Express-to-SQL CRUD for DAB/);
  for (const document of [installation, releasing]) {
    assert.match(document, /--installed-root/);
    assert.match(document, /actual installed|actual installed root|actually loaded/);
    assert.match(document, /fresh session/);
    assert.match(document, /source: live/);
  }
  assert.match(releasing, /immutable/);
  assert.match(releasing, /byte-exact/);
  assert.ok(existsSync(path.join(root, 'scripts', 'verify-release.mjs')));
});

test('missing SQL, Azure Skills, or Azure CLI has actionable setup guidance', () => {
  const installation = read(path.join('docs', 'installation.md'));
  const skill = read(skillPath);
  const readme = read('README.md');
  for (const requirement of [
    'Quick setup when a capability is missing',
    'microsoft-sql@microsoft-sql',
    'microsoft-sql-vscode',
    'Azure MCP extension',
    'winget install --exact --id Microsoft.AzureCLI',
    'Azure Cloud Shell',
    'az version',
    'az login',
    'Use SQL Apps. First inspect this host',
  ]) {
    assert.ok(installation.includes(requirement), `Missing setup guidance: ${requirement}`);
  }
  assert.match(installation, /Local-only has no Azure CLI or subscription requirement/);
  assert.match(installation, /Do not install, enable, authenticate, or change host\/system configuration until I approve/);
  assert.match(installation, /Never ask for, read, store, or echo credentials/);
  assert.match(installation, /Before any Azure write,.*wait for explicit approval/);
  assert.ok(skill.includes('../../docs/installation.md#quick-setup-when-a-capability-is-missing'));
  assert.ok(readme.includes('./docs/installation.md#quick-setup-when-a-capability-is-missing'));
});

test('shared guidance persists policy for each active host without five copies', () => {
  const skill = read(skillPath);
  const constitution = read(path.join('skills', 'sql-apps', 'references', 'constitution.md'));
  for (const destination of [
    '.github/copilot-instructions.md', 'CLAUDE.md', 'AGENTS.md', 'GEMINI.md',
  ]) {
    assert.ok(skill.includes(destination), `Missing skill instruction destination: ${destination}`);
    assert.ok(constitution.includes(destination), `Missing constitution destination: ${destination}`);
  }
  assert.match(skill, /Write only for the active host/);
  const readme = read('README.md');
  for (const host of ['GitHub Copilot', 'Claude Code', 'OpenAI Codex', 'Gemini CLI', 'Cursor']) {
    assert.ok(readme.includes(host), `Missing installation guidance: ${host}`);
  }
  assert.match(read(path.join('docs', 'reference', 'releasing.md')), /No host has passed end-to-end/);
});

test('every bundled Markdown link resolves inside the plugin', () => {
  const documents = [
    'README.md', 'plan.md', 'SECURITY.md', 'SUPPORT.md', 'CODE_OF_CONDUCT.md',
    ...filesIn('skills'), ...filesIn('docs'),
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

test('constitution contains one portable durable project-policy block', () => {
  const constitution = read(path.join('skills', 'sql-apps', 'references', 'constitution.md'));
  const block = constitution.match(/```markdown\r?\n([\s\S]+?)\r?\n```/);
  assert.ok(block);
  assert.equal((block[1].match(/sql-apps:constitution:start/g) ?? []).length, 1);
  assert.equal((block[1].match(/sql-apps:constitution:end/g) ?? []).length, 1);
  for (const required of [
    'TypeScript', 'React/Vite', 'Express', 'Azure SQL Database', 'mssql', 'DAB',
    'intent: poc', 'costPreference: free-first', 'zero-azure-spend', 'AutoPause',
    'Local-only', 'app-brief.md', 'host permissions',
  ]) {
    assert.ok(block[1].includes(required), `Missing durable policy: ${required}`);
  }
  assert.doesNotMatch(block[1], /C:\\|PLUGIN_ROOT|node_modules/);
  assert.match(read(skillPath), /preserving|Preserve/);
  assert.match(read(skillPath), /rather than appending duplicates/);
});

test('brief stays about intent and observable acceptance', () => {
  const brief = read(path.join('skills', 'sql-apps', 'templates', 'app-brief.md'));
  for (const heading of [
    '## Outcome and users', '## Essential workflows and checks',
    '## Data and access rules', '## First delivery', '## Technical boundary',
    '## Complete topology and cost boundary', '## Architecture and cost acceptance',
    '## Design and migration intent',
  ]) {
    assert.ok(brief.includes(heading), `Missing brief heading: ${heading}`);
  }
  assert.ok(brief.split(/\r?\n/).length < 90);
  assert.match(brief, /Do not store secrets/);
});

test('router wires Rayfin-aligned design and migration metadata into generated apps', () => {
  const skill = read(skillPath);
  for (const resource of [
    './references/app-design.md', './references/rayfin-alignment.md',
    './templates/rayfin.yml',
  ]) {
    assert.ok(skill.includes(resource), `Missing router resource: ${resource}`);
  }
  assert.match(skill, /Copy.*rayfin\/rayfin\.yml/);
  assert.match(skill, /dialect: mssql/);
  assert.match(skill, /supplied `mssql` intent does not prove released SQL support/);
  const alignment = read(path.join('skills', 'sql-apps', 'references', 'rayfin-alignment.md'));
  for (const required of [
    'packages/frontend', 'packages/data', 'packages/shared', 'packages/server',
    'npm workspaces', 'dist/index.html', 'same-origin',
    'SQL Apps does not execute it',
    'not a guarantee of compatibility',
  ]) {
    assert.ok(alignment.includes(required), `Missing migration boundary: ${required}`);
  }
  const constitution = read(path.join('skills', 'sql-apps', 'references', 'constitution.md'));
  const block = constitution.match(/```markdown\r?\n([\s\S]+?)\r?\n```/)[1];
  assert.ok(block.includes('rayfin/rayfin.yml'));
  assert.ok(block.includes('presence alone does not transfer workflow ownership'));
  assert.ok(block.includes('services.data.dialect: mssql'));
  assert.ok(block.includes('not proof of released Rayfin SQL support'));
});

test('design guidance adopts UI conventions without Rayfin runtime coupling', () => {
  const design = read(path.join('skills', 'sql-apps', 'references', 'app-design.md'));
  for (const required of [
    'Tailwind CSS v4', 'Radix', 'Lucide React', 'clsx', 'tailwind-merge',
    'Vitest', 'React Testing Library', 'global.css', 'keyboard', 'rollback',
    'system or locally bundled licensed fonts', 'Do not import `@microsoft/rayfin-*`',
    '0979439a7a0806abd0ee48c2619b37f297ae1324',
  ]) {
    assert.ok(design.includes(required), `Missing design convention: ${required}`);
  }
});

test('Rayfin reference stays focused on alignment rather than platform implementation', () => {
  const alignment = read(path.join('skills', 'sql-apps', 'references', 'rayfin-alignment.md'));
  assert.ok(alignment.split(/\r?\n/).length <= 30);
  assert.match(alignment, /Leave migration and runtime implementation to Rayfin/);
  assert.doesNotMatch(alignment, /custom-aca|operation poller|schema job|2026-10-01-preview/);
});

test('future service YAML preserves the proposed mssql shape and safe capability defaults', () => {
  const yaml = read(path.join('skills', 'sql-apps', 'templates', 'rayfin.yml'));
  const body = yaml.split(/\r?\n/).filter((line) => !line.startsWith('#')).join('\n').trim();
  assert.equal(body, `services:
  auth:
    enabled: false
    password:
      enabled: false
    allowedRedirectUris: []
    fabric:
      enabled: false
  data:
    enabled: true
    dialect: mssql
    path: packages/data
    buildCommand: npm run build
  realtime:
    enabled: false
    backplane: none
  storage:
    enabled: false
  functions:
    enabled: false
    durable:
      enabled: false
  staticHosting:
    enabled: true
    path: packages/frontend
    folder: dist
    buildCommand: npm run build
    indexDocument: index.html
    assetAccess: public`);
  assert.match(yaml, /Copy to rayfin\/rayfin\.yml/);
  assert.ok(!existsSync(path.join(root, 'rayfin', 'rayfin.yml')));
});

test('payload has no executable runtime, hooks, MCP config, or vendored specialists', () => {
  const payload = filesIn('skills');
  assert.equal(payload.length, 8);
  assert.ok(payload.includes(path.join('skills', 'sql-apps', 'references', 'deployment.md')));
  assert.ok(payload.includes(path.join('skills', 'sql-apps', 'references', 'deployment-attribution.md')));
  assert.ok(payload.every((file) => file.endsWith('.md') || file.endsWith('.yml')));
  for (const component of ['mcp.json', '.mcp.json', 'hooks', 'agents', 'package.json']) {
    assert.ok(!existsSync(path.join(root, component)), `Unexpected runtime component: ${component}`);
  }
});
