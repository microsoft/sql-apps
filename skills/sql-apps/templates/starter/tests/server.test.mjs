import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm, mkdir, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createAppServer } from '../dist/packages/server/server.js';
import { configuration, root } from '../dist/scripts/config.js';

const publicConfig = {
  authority: 'https://identity.example.test/tenant',
  clientId: 'public-client', scope: 'openid api-access', redirectUri: 'http://127.0.0.1/',
};

test('compiled configuration resolves the application root, not the output directory', () => {
  assert.equal(root, fileURLToPath(new URL('../', import.meta.url)));
});

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

test('proxy preserves bearer tokens but removes spoofed identity, role, and cookies', async () => {
  let observed;
  const dab = createServer((req, res) => {
    observed = req.headers;
    res.setHeader('content-type', 'application/json');
    res.setHeader('content-encoding', 'gzip');
    res.end(gzipSync('{"value":[]}'));
  });
  const dabUrl = await listen(dab);
  const app = createAppServer({ dab: dabUrl, publicConfig });
  const origin = await listen(app);
  try {
    const response = await fetch(`${origin}/api/Items`, {
      headers: { Authorization: 'Bearer test', 'X-MS-CLIENT-PRINCIPAL': 'forged', 'X-MS-API-ROLE': 'admin', Cookie: 'secret=test', Forwarded: 'forged' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { value: [] });
    assert.equal(observed.authorization, 'Bearer test');
    for (const header of ['x-ms-client-principal', 'x-ms-api-role', 'cookie', 'forwarded']) assert.equal(observed[header], undefined);
    assert.equal((await fetch(`${origin}/api/CreateItem`, { method: 'POST', headers: { Origin: 'https://attacker.example' } })).status, 403);
    assert.equal((await fetch(`${origin}/api/Items`, { method: 'DELETE' })).status, 405);
    assert.equal((await fetch(`${origin}/api/CreateItem`, { method: 'POST', body: 'x'.repeat(20_000) })).status, 413);
  } finally { await close(app); await close(dab); }
});

test('serves packaged assets and public configuration, never environment secrets', async () => {
  const assets = await mkdtemp(join(tmpdir(), 'sqlapps-assets-'));
  await writeFile(join(assets, 'index.html'), '<h1>Packaged</h1>');
  const app = createAppServer({ dab: 'http://127.0.0.1:1', publicConfig }, assets);
  const origin = await listen(app);
  try {
    assert.equal(await (await fetch(origin)).text(), '<h1>Packaged</h1>');
    assert.deepEqual(await (await fetch(`${origin}/config.json`)).json(), publicConfig);
    assert.equal((await fetch(`${origin}/.env`)).status, 404);
    assert.equal((await fetch(`${origin}/api/Items`)).status, 503);
  } finally { await close(app); await rm(assets, { recursive: true }); }
});

test('configuration fails closed for missing identity, remote HTTP, or invalid origins', () => {
  const env = {
    AUTH_AUTHORITY: publicConfig.authority, AUTH_ISSUER: publicConfig.authority,
    AUTH_CLIENT_ID: 'client', AUTH_SCOPE: 'openid api-access', AUTH_AUDIENCE: 'api',
    APP_ORIGIN: 'http://127.0.0.1:5180', DAB_URL: 'http://127.0.0.1:5081',
  };
  assert.equal(configuration(env).publicConfig.redirectUri, 'http://127.0.0.1:5180/');
  assert.throws(() => configuration({ ...env, AUTH_CLIENT_ID: 'REPLACE_CLIENT' }), /AUTH_CLIENT_ID/);
  assert.throws(() => configuration({ ...env, DAB_URL: 'http://remote.test' }), /HTTPS/);
  assert.throws(() => configuration({ ...env, APP_ORIGIN: 'https://app.test/path' }), /origins/);
  assert.throws(() => configuration({ ...env, AUTH_SCOPE: 'openid profile' }), /API access scope/);
});

test('occupied web port fails startup and closes the supervisor IPC channel', { timeout: 10_000 }, async () => {
  const app = await mkdtemp(join(tmpdir(), 'sqlapps-bind-'));
  for (const directory of ['dist/packages/server', 'packages/frontend/dist', 'dist/scripts']) await mkdir(join(app, directory), { recursive: true });
  await writeFile(join(app, 'package.json'), '{"type":"module"}');
  await copyFile(fileURLToPath(new URL('../dist/packages/server/server.js', import.meta.url)), join(app, 'dist/packages/server/server.js'));
  await copyFile(fileURLToPath(new URL('../dist/scripts/config.js', import.meta.url)), join(app, 'dist/scripts/config.js'));
  await writeFile(join(app, 'packages/frontend/dist/index.html'), '<h1>Test</h1>');
  const occupied = createServer();
  const origin = await listen(occupied);
  const port = new URL(origin).port;
  const child = fork(join(app, 'dist/packages/server/server.js'), [], {
    silent: true,
    env: { ...process.env, AUTH_AUTHORITY: publicConfig.authority, AUTH_ISSUER: publicConfig.authority,
      AUTH_AUDIENCE: 'api', AUTH_CLIENT_ID: 'client', AUTH_SCOPE: 'openid api-access',
      APP_HOST: '127.0.0.1', APP_PORT: port, APP_ORIGIN: origin, DAB_URL: origin },
  });
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  try {
    const [code] = await once(child, 'exit');
    assert.equal(code, 1);
    assert.match(errors, /EADDRINUSE/);
  } finally {
    if (child.exitCode === null) child.kill();
    await close(occupied);
    await rm(app, { recursive: true });
  }
});
