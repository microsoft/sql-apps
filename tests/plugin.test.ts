import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from '../src/process.js';

const launcher = resolve('plugins', 'sql-apps', 'scripts', 'sql-apps.mjs');
const moduleUrl = pathToFileURL(launcher).href;
const workspaceUrl = pathToFileURL(resolve('scripts', 'workspace-check.mjs')).href;
const recordFixture = (home: string) => run(process.execPath, ['--input-type=module', '-e',
  `import { recordBuild } from ${JSON.stringify(workspaceUrl)}; await recordBuild(process.env.SQL_APPS_HOME);`],
{ env: { SQL_APPS_HOME: home } });
const probe = async (code: string, env: NodeJS.ProcessEnv = {}) =>
  run(process.execPath, ['--input-type=module', '-e', `import { resolveHome, status, main } from ${JSON.stringify(moduleUrl)}; ${code}`], { env });

test('local plugin bundle validates its manifests, matching skill names and isolated sources', async () => {
  assert.match(await run(process.execPath, [resolve('scripts', 'check-plugin.mjs')]), /six skills/);
});

test('SQL Apps identity is consistent across packages, platform manifests and marketplaces', async () => {
  const repository = 'https://github.com/microsoft/sql-apps';
  for (const path of [
    'plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json',
    '.grok-plugin/plugin.json', '.kimi-plugin/plugin.json', 'plugins/sql-apps/plugin.json',
  ]) {
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(manifest.name, 'sql-apps', path);
    assert.equal(manifest.homepage, repository, path);
    assert.equal(manifest.repository, repository, path);
    assert.equal(manifest.version, '0.1.0', path);
    assert.deepEqual(manifest.author, { name: 'Microsoft SQL team (mssql)', url: 'https://github.com/microsoft' }, path);
    if (manifest.interface) {
      assert.equal(manifest.interface.displayName, 'SQL Apps');
      assert.equal(manifest.interface.websiteURL, repository);
      assert.equal(manifest.interface.developerName, 'Microsoft SQL team (mssql)');
    }
  }
  for (const path of ['.github/plugin/marketplace.json', '.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json']) {
    const marketplace = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(marketplace.name, 'sql-apps-skills', path);
    assert.equal(marketplace.plugins.length, 1, path);
    assert.equal(marketplace.plugins[0].name, 'sql-apps', path);
    if (marketplace.owner) assert.deepEqual(marketplace.owner, { name: 'Microsoft', url: 'https://www.microsoft.com' }, path);
    if (typeof marketplace.plugins[0].source === 'string') {
      assert.equal(marketplace.plugins[0].source, './plugins/sql-apps');
    } else {
      assert.deepEqual(marketplace.plugins[0].source, { source: 'local', path: './' });
      assert.equal(marketplace.interface.displayName, 'SQL Apps Skills');
    }
  }
  const kimi = JSON.parse(await readFile('kimi-marketplace.json', 'utf8')).plugins[0];
  assert.equal(kimi.id, 'sql-apps');
  assert.equal(kimi.displayName, 'SQL Apps');
  assert.equal(kimi.source, repository);
  assert.equal(JSON.parse(await readFile('gemini-extension.json', 'utf8')).name, 'sql-apps');
  for (const [path, name] of [
    ['package.json', 'sql-apps'], ['functions/package.json', 'sql-apps-functions'],
    ['functions/local-package.json', 'sql-apps-local-functions'],
  ] as const) assert.equal(JSON.parse(await readFile(path, 'utf8')).name, name);
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  assert.equal(lock.name, 'sql-apps');
  assert.equal(lock.packages[''].name, 'sql-apps');
  assert.deepEqual(JSON.parse(await readFile('application.json', 'utf8')), { name: 'sql-apps-foundation', selectedExamples: [] });
  assert.match(await readFile('skills/sql-apps-getting-started/SKILL.md', 'utf8'), /^---\r?\nname: sql-apps-getting-started\r?\n/);
});

test('SQL Apps UI, wordmark and private-state exclusions use the new brand', async () => {
  const html = await readFile('public/index.html', 'utf8');
  assert.match(html, /<title>SQL Apps<\/title>/);
  assert.match(html, /<h1>SQL Apps<\/h1>/);
  assert.match(await readFile('examples/todo/web/index.html', 'utf8'), /<title>SQL Apps - synthetic Todo demo<\/title>/);
  assert.match(await readFile('content/icons/sql-apps-wordmark.svg', 'utf8'), /<title id="title">SQL Apps<\/title>/);
  for (const path of ['.gitignore', '.dockerignore']) {
    const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
    assert.ok(lines.includes(path === '.gitignore' ? '.sql-apps/' : '.sql-apps'));
    assert.ok(lines.includes('sql-apps.json'));
    assert.ok(lines.includes('functions/local.settings.json'));
  }
});

test('beginner skills preserve per-action consent, pre-build guidance and safe resume boundaries', async () => {
  const local = await readFile(resolve('plugins', 'sql-apps', 'skills', 'sql-apps-local', 'SKILL.md'), 'utf8');
  for (const requirement of [
    /getting-started\.md/, /Windows, macOS and Linux/, /If Node is missing/,
    /Before EACH tool installation, ask explicit approval/, /human-only/, /version managers/,
    /private preview/, /credentials are entered in their own terminal/, /ACCEPT_EULA=Y/,
    /ask separately before `npm ci`\/build/i, /setup-check/, /never.*reset volumes/i,
    /HTTP liveness alone is not end-to-end acceptance/, /Ctrl\+C/,
  ]) assert.match(local, requirement);
  const diagnostic = await readFile(resolve('plugins', 'sql-apps', 'skills', 'sql-apps-diagnostics', 'SKILL.md'), 'utf8');
  assert.match(diagnostic, /setup-check.*before restore\/build/);
  assert.match(diagnostic, /Ask before every installation\/download/);
});

test('local guidance handles unavailable approval controls and observable launch gates', async () => {
  const local = await readFile(resolve('plugins', 'sql-apps', 'skills', 'sql-apps-local', 'SKILL.md'), 'utf8');
  for (const requirement of [
    /first.*user unavailable/i, /no approval was captured/i, /ordinary chat/i,
    /before the first approval prompt/i, /approved operations/i,
    /Startup passes `ACCEPT_EULA=Y`; there is no chat dialog/,
    /implemented.*built.*running.*workflow verified/is,
    /Publish.*URL only after.*responds/i, /proposed.*unavailable/i,
    /blocked, not complete/i, /user-reported/i,
  ]) assert.match(local, requirement);
});

test('application guidance preserves data-only scope, custom-role authorization and actual checkpoints', async () => {
  const application = await readFile(resolve('plugins', 'sql-apps', 'skills', 'sql-apps-application', 'SKILL.md'), 'utf8');
  for (const requirement of [
    /data-only/i, /serve-sql/, /role-based-app/, /role-based-serve/, /role-based-data/,
    /role definition/i, /application role assignment/i, /token claims/i,
    /gateway-selected DAB role/i, /procedure permissions/i, /custom-role forwarding/i,
    /Function\.Invoke/, /actual stage/i, /completed.*nextChange/i,
    /loaded skill source/i, /application checkout/i, /installed launcher/i,
  ]) assert.match(application, requirement);
});

test('cloud guidance selects the app profile and keeps discovery from changing deployment subject', async () => {
  const cloud = await readFile(resolve('plugins', 'sql-apps', 'skills', 'sql-apps-cloud-preview', 'SKILL.md'), 'utf8');
  for (const requirement of [
    /profile before.*cost command/i, /demo-only/i,
    /role-based-cost/, /role-based-assign/, /role-based-smoke/,
    /Existing-resource discovery must not change the deployment subject/,
    /potential collisions/i, /reuse.*explicitly requested/i,
    /loaded skill source/i, /application checkout/i, /installed launcher/i,
    /tenant ID.*email address/i,
  ]) assert.match(cloud, requirement);
});

test('frontend design guidance requires deliberate, accessible visual review', async () => {
  const frontendDesign = await readFile(resolve('plugins', 'sql-apps', 'skills', 'sql-apps-frontend-design', 'SKILL.md'), 'utf8');
  assert.match(frontendDesign, /^---\r?\nname: sql-apps-frontend-design\r?\n/m);
  for (const requirement of [
    /present\s+two or three app-appropriate visual directions/i,
    /get approval of the direction before implementation/i,
    /preserve existing app workflows and agreed capability boundaries/i,
    /inspect\s+the actual rendered interface in a browser at desktop and narrow[- ]mobile viewports/i,
    /keyboard.*focus|focus.*keyboard/is,
    /reduced[- ]motion/i,
    /if browser preview or a relevant state is unavailable or unsafe to reach,\s*state the limitation and report what you did inspect/i,
  ]) assert.match(frontendDesign, requirement);

  const application = await readFile(resolve('plugins', 'sql-apps', 'skills', 'sql-apps-application', 'SKILL.md'), 'utf8');
  assert.match(application, /for substantial new screens, visual redesigns, or UI-focused polish,\s*use `sql-apps-frontend-design` for app-specific visual direction and rendered-browser review/i);
  const guide = await readFile(resolve('docs', 'guides', 'build-your-app.md'), 'utf8');
  assert.match(guide, /for substantial new screens or a visual redesign,\s*ask your assistant to use the `sql-apps-frontend-design` skill for an app-appropriate visual direction and browser review of the rendered interface/i);
});

test('plugin launcher binds the actual checkout independently of plugin cache/session directory', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'sql-apps-plugin-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  const home = resolve('.');
  await writeFile(join(profile, 'sql-apps-local.json'), JSON.stringify({ version: 1, home }));
  assert.equal((await probe('process.chdir(process.env.COPILOT_HOME); console.log(await resolveHome());',
    { COPILOT_HOME: profile, SQL_APPS_HOME: undefined })).trim(), home);
  assert.equal((await probe('console.log(await resolveHome());', { SQL_APPS_HOME: home })).trim(), home);
});

test('plugin launcher reports invalid bindings and commands rather than falling back silently', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'sql-apps-plugin-invalid-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  await mkdir(join(profile, 'not-sql-apps'));
  await writeFile(join(profile, 'sql-apps-local.json'), '{ invalid');
  await assert.rejects(probe('await resolveHome();', { COPILOT_HOME: profile, SQL_APPS_HOME: undefined }), /JSON|SyntaxError/);
  await assert.rejects(probe('await resolveHome();', { SQL_APPS_HOME: join(profile, 'not-sql-apps') }), /ENOENT/);
  await assert.rejects(run(process.execPath, [launcher, 'deploy']), /Unsupported plugin command/);
  await assert.rejects(run(process.execPath, [launcher, 'verify', 'invalid;container']), /Invalid SQL container name/);
});

test('plugin status is bounded, read-only and distinguishes healthy, HTTP failure and connection failure', async () => {
  const result = await probe(`
    let calls = 0;
    const result = await status(async (url, options) => {
      if (!options.signal || options.redirect !== 'error') throw new Error('Missing bounded probe options');
      calls++;
      if (calls === 1) return new Response('{}', { status: 200 });
      if (calls === 2) return new Response('{}', { status: 503 });
      throw new TypeError('Network unavailable');
    });
    console.log(JSON.stringify(result));`);
  const body = JSON.parse(result);
  assert.equal(body.healthy, false);
  assert.equal(body.services.length, 3);
  assert.equal(body.services[0].healthy, true);
  assert.equal(body.services[1].status, 503);
  assert.equal(body.services[2].error, 'TypeError');
  const good = JSON.parse(await probe("console.log(JSON.stringify(await status(async () => new Response('{}'))));"));
  assert.equal(good.healthy, true);
});

test('plugin dispatch uses checkout cwd, passes literal arguments and preserves CLI failure', async t => {
  const home = await mkdtemp(join(tmpdir(), 'sql apps dispatch-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  for (const folder of ['src', 'sql', 'plugins/sql-apps', 'dist/src', 'scripts']) await mkdir(join(home, folder), { recursive: true });
  await writeFile(join(home, 'package.json'), JSON.stringify({ name: 'sql-apps', scripts: { local: 'node dist/src/local-cli.js' } }));
  for (const file of ['src/local-cli.ts', 'sql/database.sqlproj', 'plugins/sql-apps/plugin.json']) await writeFile(join(home, file), '');
  await writeFile(join(home, 'src', 'workspace.mjs'), await readFile(resolve('src', 'workspace.mjs')));
  await writeFile(join(home, 'application.json'), JSON.stringify({ name: 'fixture', selectedExamples: [] }));
  await writeFile(join(home, 'runtime-contract.json'), JSON.stringify({ version: 1, capabilities: ['local', 'setup-check'] }));
  await writeFile(join(home, 'scripts', 'workspace-check.mjs'), await readFile(resolve('scripts', 'workspace-check.mjs')));
  await assert.rejects(run(process.execPath, [launcher, 'verify'], { env: { SQL_APPS_HOME: home } }), /not built/);
  await writeFile(join(home, 'dist/src/local-cli.js'),
    'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)})); if(process.argv[2]==="test") process.exitCode=7;');
  await recordFixture(home);
  const output = JSON.parse(await run(process.execPath, [launcher, 'verify', 'custom-sql'], { env: { SQL_APPS_HOME: home } }));
  assert.equal(output.cwd, home);
  assert.deepEqual(output.args, ['verify', 'custom-sql']);
  for (const command of ['role-based-app', 'role-based-serve']) {
    const selected = JSON.parse(await run(process.execPath, [launcher, command, 'custom-sql'], { env: { SQL_APPS_HOME: home } }));
    assert.equal(selected.cwd, home);
    assert.deepEqual(selected.args, [command, 'custom-sql']);
  }
  const artifact = join(home, '.sql-apps', 'selected artifact; literal');
  for (const command of ['selected-app', 'selected-serve', 'selected-test']) {
    const selected = JSON.parse(await run(process.execPath, [launcher, command, artifact], { env: { SQL_APPS_HOME: home } }));
    assert.equal(selected.cwd, home);
    assert.deepEqual(selected.args, [command, artifact]);
    await assert.rejects(run(process.execPath, [launcher, command, 'relative-artifact'], { env: { SQL_APPS_HOME: home } }), /absolute artifact/);
  }
  const stopped = JSON.parse(await run(process.execPath, [launcher, 'selected-stop', 'inventory'], { env: { SQL_APPS_HOME: home } }));
  assert.deepEqual(stopped.args, ['selected-stop', 'inventory']);
  const configuredStatus = JSON.parse(await probe(`
    const { initializeWorkspace } = await import(${JSON.stringify(pathToFileURL(resolve('src', 'workspace.mjs')).href)});
    await initializeWorkspace(process.env.SQL_APPS_HOME, 31000, async () => 'free');
    globalThis.fetch = async () => new Response('{}');
    await main(['status']);`, { SQL_APPS_HOME: home }));
  assert.deepEqual(configuredStatus.services.map((service: { url: string }) => service.url), [
    'http://127.0.0.1:31000/health/live', 'http://127.0.0.1:31000/health/ready', 'http://127.0.0.1:31001/health',
  ]);
  await writeFile(join(home, 'scripts/setup-check.mjs'),
    'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)})); if(process.argv.includes("fail-sql")) process.exitCode=7;');
  const setup = JSON.parse(await run(process.execPath, [launcher, 'setup-check', 'custom-sql'], { env: { SQL_APPS_HOME: home } }));
  assert.equal(setup.cwd, home);
  assert.deepEqual(setup.args, ['--json', '--container', 'custom-sql']);
  const roleBasedSetup = JSON.parse(await run(process.execPath, [launcher, 'role-based-setup-check', 'custom-sql'], { env: { SQL_APPS_HOME: home } }));
  assert.deepEqual(roleBasedSetup.args, ['--json', '--profile', 'role-based-data', '--container', 'custom-sql']);
  await rm(join(home, 'dist'), { recursive: true });
  await writeFile(join(home, 'scripts/guide.mjs'),
    'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));');
  const guided = JSON.parse(await run(process.execPath, [launcher, 'guide'], { env: { SQL_APPS_HOME: home } }));
  assert.equal(guided.cwd, home);
  assert.deepEqual(guided.args, ['--json']);
  const briefPath = join(home, 'equipment brief.json');
  const savedGuide = JSON.parse(await run(process.execPath, [launcher, 'guide-save', briefPath], { env: { SQL_APPS_HOME: home } }));
  assert.equal(savedGuide.cwd, home);
  assert.deepEqual(savedGuide.args, ['--save', briefPath, '--json']);
  await assert.rejects(run(process.execPath, [launcher, 'guide-save', 'relative.json'], { env: { SQL_APPS_HOME: home } }), /absolute project brief/);
  await assert.rejects(run(process.execPath, [launcher, 'guide', 'extra'], { env: { SQL_APPS_HOME: home } }), /no arguments/);
  const beforeBuild = JSON.parse(await run(process.execPath, [launcher, 'setup-check'], { env: { SQL_APPS_HOME: home } }));
  assert.deepEqual(beforeBuild.args, ['--json']);
  await assert.rejects(run(process.execPath, [launcher, 'setup-check', 'fail-sql'], { env: { SQL_APPS_HOME: home } }), /failed \(7\)/);
  await mkdir(join(home, 'dist/src'), { recursive: true });
  await writeFile(join(home, 'dist/src/local-cli.js'), 'process.exitCode=7;');
  await recordFixture(home);
  await assert.rejects(run(process.execPath, [launcher, 'test'], { env: { SQL_APPS_HOME: home } }), /failed \(7\)/);
});
