import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildPersonalFreeArtifact, type PersonalFreeBuildManifest } from '../src/personal-free-build.js';
import { parseBrowserConfig } from '../src/browser-config.js';
import type { Run } from '../src/process.js';

const compile: Run = async (command, args) => {
  if (command === 'dotnet' && args[0] === 'build') {
    const output = args[args.indexOf('--output') + 1]!;
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'personal-free.dacpac'),
      await readFile(join(dirname(args[1]!), 'AppReady.sql')));
    return '';
  }
  if (command === 'az' && args[0] === 'bicep') {
    await writeFile(args[args.indexOf('--outfile') + 1]!, JSON.stringify({
      source: await readFile(args[args.indexOf('--file') + 1]!, 'utf8'),
    }));
    return '';
  }
  throw new Error(`Unexpected compiler: ${command} ${args.join(' ')}`);
};

async function build(root: string, destination: string): Promise<PersonalFreeBuildManifest> {
  await mkdir(join(root, 'sql'), { recursive: true });
  await writeFile(join(root, 'sql', 'personal-free.sqlproj'), '<Project />');
  try { await readFile(join(root, 'sql', 'AppReady.sql')); }
  catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    await writeFile(join(root, 'sql', 'AppReady.sql'), 'SELECT CAST(1 AS bit) AS ready;');
  }
  return buildPersonalFreeArtifact(root, destination, compile);
}

test('personal-free build emits only static and managed Functions artifacts', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-personal-free-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'public'), { recursive: true });
  await writeFile(join(root, 'public', 'index.html'), '<main>Personal</main>');
  await writeFile(join(root, 'public', 'style.css'), 'main{display:block}');
  await writeFile(join(root, 'public', 'app.js'), 'document.body.dataset.ready="true";');
  await writeFile(join(root, 'public', 'staticwebapp.config.json'), JSON.stringify({
    routes: [{ route: '/api/*', allowedRoles: ['owner'] }],
  }));
  await writeFile(join(root, 'personal-free-api.json'), JSON.stringify({
    version: 1,
    authenticationProvider: 'aad',
    routes: [{
      method: 'GET',
      path: '/api/AppReady',
      procedure: { name: 'AppReady', parameters: {} },
    }],
  }));
  const destination = join(root, 'artifact');
  const manifest = await build(root, destination);
  assert.equal(manifest.version, 1);
  assert.deepEqual((await readdir(destination)).sort(), ['api', 'deployment', 'personal-free-build.json', 'static']);
  for (const file of [
    'static/index.html',
    'static/style.css',
    'static/app.js',
    'static/staticwebapp.config.json',
    'static/auth-config.json',
    'api/dist/index.mjs',
    'api/host.json',
    'api/package.json',
    'deployment/database.dacpac',
    'deployment/template.json',
    'deployment/api.json',
  ]) {
    assert.ok((await readFile(join(destination, file))).length > 0, file);
  }
  assert.deepEqual(JSON.parse(await readFile(join(destination, 'static', 'auth-config.json'), 'utf8')), {
    mode: 'static-web-apps',
    provider: 'aad',
    readinessPath: '/api/AppReady',
  });
  const serialized = await readFile(join(destination, 'personal-free-build.json'), 'utf8');
  assert.doesNotMatch(serialized, /password|token|connection/i);
  const entry = await readFile(join(destination, 'api', 'dist', 'index.mjs'), 'utf8');
  assert.doesNotMatch(entry, /test-only-not-a-real-password/);
  assert.match(entry, /parsePersonalFreeBody/);
});

test('personal-free build publishes every application asset under public', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-personal-free-assets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'public', 'images', 'icons'), { recursive: true });
  for (const [name, content] of [
    ['index.html', '<img src="/images/icons/logo.svg">'],
    ['style.css', '@font-face{src:url(/fonts/brand.woff2)}'],
    ['app.js', ''],
    ['staticwebapp.config.json', '{}'],
    ['images/icons/logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'],
  ] as const) await writeFile(join(root, 'public', name), content);
  await mkdir(join(root, 'public', 'fonts'));
  await writeFile(join(root, 'public', 'fonts', 'brand.woff2'), Buffer.from([0, 1, 2, 3]));
  await writeFile(join(root, 'personal-free-api.json'), JSON.stringify({
    version: 1, authenticationProvider: 'aad',
    routes: [{ method: 'GET', path: '/api/AppReady', procedure: { name: 'AppReady', parameters: {} } }],
  }));
  const destination = join(root, 'artifact');
  const manifest = await build(root, destination);
  assert.equal(await readFile(join(destination, 'static', 'images', 'icons', 'logo.svg'), 'utf8'),
    '<svg xmlns="http://www.w3.org/2000/svg"/>');
  assert.deepEqual([...await readFile(join(destination, 'static', 'fonts', 'brand.woff2'))], [0, 1, 2, 3]);
  const paths = manifest.files.map(file => file.path);
  assert.ok(paths.includes('static/images/icons/logo.svg'));
  assert.ok(paths.includes('static/fonts/brand.woff2'));

  await writeFile(join(root, 'public', 'auth-config.json'), '{}');
  await assert.rejects(build(root, destination), /auth-config\.json.*generated/i);
});

test('personal-free build rejects duplicate routes and procedure declarations before deployment', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-personal-free-duplicates-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'public'), { recursive: true });
  for (const [name, content] of [
    ['index.html', '<main>Personal</main>'],
    ['style.css', 'main{display:block}'],
    ['app.js', ''],
    ['staticwebapp.config.json', '{}'],
  ] as const) await writeFile(join(root, 'public', name), content);
  const destination = join(root, 'artifact');
  const route = {
    method: 'GET',
    path: '/api/AppReady',
    procedure: { name: 'AppReady', parameters: {} },
  };
  await writeFile(join(root, 'personal-free-api.json'), JSON.stringify({
    version: 1, authenticationProvider: 'aad', routes: [route, route],
  }));
  await assert.rejects(build(root, destination), /duplicate.*route/i);

  await writeFile(join(root, 'personal-free-api.json'), JSON.stringify({
    version: 1,
    authenticationProvider: 'aad',
    routes: [
      route,
      { method: 'POST', path: '/api/ReadyAgain', procedure: route.procedure },
    ],
  }));
  await assert.rejects(build(root, destination), /duplicate.*procedure/i);
});

test('personal-free build requires member access to readiness when members can call routes', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-personal-free-team-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'public'), { recursive: true });
  for (const name of ['index.html', 'style.css', 'app.js']) await writeFile(join(root, 'public', name), 'x');
  await writeFile(join(root, 'public', 'staticwebapp.config.json'), '{}');
  const api = (readinessRoles?: string[]) => JSON.stringify({
    version: 1, authenticationProvider: 'github', routes: [
      { method: 'GET', path: '/api/AppReady', ...(readinessRoles ? { roles: readinessRoles } : {}),
        procedure: { name: 'AppReady', parameters: {} } },
      { method: 'POST', path: '/api/SaveLoan', roles: ['owner', 'member'],
        procedure: { name: 'SaveLoan', parameters: { item: 'nvarchar' } } },
    ],
  });
  await writeFile(join(root, 'personal-free-api.json'), api());
  await assert.rejects(build(root, join(root, 'artifact')), /readiness route \/api\/AppReady must also list "member"/);
  await writeFile(join(root, 'personal-free-api.json'), api(['member', 'member']));
  await assert.rejects(build(root, join(root, 'artifact')), /unique/);
  await writeFile(join(root, 'personal-free-api.json'), api(['owner', 'member']));
  await build(root, join(root, 'artifact'));
  const entry = await readFile(join(root, 'artifact', 'api', 'dist', 'index.mjs'), 'utf8');
  assert.match(entry, /"roles":\["owner","member"\]/);
});

test('personal-free approval fingerprint includes the compiled SQL package', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-approved-sql-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'public'));
  for (const name of ['index.html', 'style.css', 'app.js', 'staticwebapp.config.json']) {
    await writeFile(join(root, 'public', name), '{}');
  }
  await writeFile(join(root, 'personal-free-api.json'), JSON.stringify({
    version: 1, authenticationProvider: 'aad',
    routes: [{ method: 'GET', path: '/api/AppReady', procedure: { name: 'AppReady', parameters: {} } }],
  }));
  const first = await build(root, join(root, 'artifact'));
  await writeFile(join(root, 'sql', 'AppReady.sql'), 'DELETE FROM dbo.PrivateData;');
  const changed = await build(root, join(root, 'artifact'));
  assert.notEqual(changed.sourceHash, first.sourceHash);

  const changedTemplate = await buildPersonalFreeArtifact(root, join(root, 'artifact'), async (command, args, options) => {
    const result = await compile(command, args, options);
    if (command === 'az') await writeFile(args[args.indexOf('--outfile') + 1]!, '{"changed":"template"}');
    return result;
  });
  assert.notEqual(changedTemplate.sourceHash, changed.sourceHash);
});

test('personal-free browser readiness skips parameterized and nested routes', async t => {
  const root = await mkdtemp(join(tmpdir(), 'sql-apps-browser-ready-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'public'));
  for (const name of ['index.html', 'style.css', 'app.js', 'staticwebapp.config.json']) {
    await writeFile(join(root, 'public', name), '{}');
  }
  const routes = [
    { method: 'GET', path: '/api/Items', procedure: { name: 'Items', parameters: { limit: 'int' } } },
    { method: 'GET', path: '/api/items/list', procedure: { name: 'ListItems', parameters: {} } },
    { method: 'GET', path: '/api/AppReady', procedure: { name: 'AppReady', parameters: {} } },
  ];
  const path = join(root, 'personal-free-api.json');
  await writeFile(path, JSON.stringify({ version: 1, authenticationProvider: 'aad', routes }));
  await build(root, join(root, 'artifact'));
  const config = parseBrowserConfig(JSON.parse(await readFile(join(root, 'artifact', 'static', 'auth-config.json'), 'utf8')));
  assert.equal(config.readinessPath, '/api/AppReady');
  const entry = await readFile(join(root, 'artifact', 'api', 'dist', 'index.mjs'), 'utf8');
  assert.match(entry, /readinessProcedure: "AppReady"/);

  for (const route of routes.slice(0, 2)) {
    await writeFile(path, JSON.stringify({ version: 1, authenticationProvider: 'aad', routes: [route] }));
    await assert.rejects(build(root, join(root, 'artifact')), /readiness.*no-parameter|compatible.*readiness/i);
  }
});
