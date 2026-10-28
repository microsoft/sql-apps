import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { createServer } from 'node:https';
import { createServer as createTcpServer } from 'node:net';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn, spawnSync, fork } from 'node:child_process';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(process.argv[2] || '');
const openssl = process.argv[3];
if (!process.argv[2] || !openssl || !existsSync(resolve(appRoot, 'baseline.json'))) {
  throw new Error('Usage: node scripts\\test-starter-runtime.mjs <isolated copied starter> <openssl executable> [--browser]');
}
const envPath = resolve(appRoot, '.env');
const previous = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : undefined;
if (previous) {
  if (!process.argv.includes('--resume') || previous.AUTH_CLIENT_ID !== 'starter-test-spa' ||
      new URL(previous.AUTH_ISSUER).hostname !== 'host.docker.internal' ||
      !existsSync(resolve(appRoot, '.local/test-compose.yml'))) {
    throw new Error('Use a fresh isolated copy, or --resume only with an existing starter test fixture.');
  }
}
const local = resolve(appRoot, '.local');
mkdirSync(local, { recursive: true });
const keyPath = resolve(local, 'test-issuer-key.pem');
const certPath = resolve(local, 'test-issuer-cert.pem');
const cert = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', keyPath, '-out', certPath, '-days', '1', '-subj', '/CN=host.docker.internal',
  '-addext', 'subjectAltName=DNS:host.docker.internal,DNS:localhost,IP:127.0.0.1'], { encoding: 'utf8' });
if (cert.error) throw cert.error;
assert.equal(cert.status, 0, 'Test certificate generation must succeed.');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'starter-test', alg: 'RS256', use: 'sig' };
const users = ['7c344e4f-60b1-48b8-aa28-6de73065aa01', '7c344e4f-60b1-48b8-aa28-6de73065aa02'];
const client = 'starter-test-spa';
const audience = 'starter-test-api';
let issuer, origin;
const codes = new Map();
function token(user, aud = audience, extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  const encode = object => Buffer.from(JSON.stringify(object)).toString('base64url');
  const body = `${encode({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })}.${encode({
    iss: issuer, aud, sub: user, oid: user, name: 'Synthetic starter user', iat: now, nbf: now - 5, exp: now + 3600, ...extra,
  })}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
}
const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Cache-Control', 'no-store');
  const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  try {
    const url = new URL(req.url, issuer);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (url.pathname === '/.well-known/openid-configuration') return json(200, {
      issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/keys`, response_types_supported: ['code'], subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'], code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['openid', 'profile', 'api-access'],
    });
    if (url.pathname === '/keys') return json(200, { keys: [jwk] });
    if (['/authorize', '/token'].includes(url.pathname) &&
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
      return json(403, { error: 'test_login_is_loopback_only' });
    }
    if (url.pathname === '/authorize') {
      if (url.searchParams.get('redirect_uri') !== `${origin}/` || url.searchParams.get('client_id') !== client ||
          url.searchParams.get('code_challenge_method') !== 'S256') return json(400, { error: 'invalid_request' });
      const code = randomBytes(24).toString('hex');
      codes.set(code, { challenge: url.searchParams.get('code_challenge'), nonce: url.searchParams.get('nonce') });
      const redirect = new URL(`${origin}/`);
      redirect.searchParams.set('code', code);
      redirect.searchParams.set('state', url.searchParams.get('state'));
      res.writeHead(302, { Location: redirect.href });
      return res.end();
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) return json(413, { error: 'request_too_large' });
      }
      const form = new URLSearchParams(body);
      const code = codes.get(form.get('code'));
      codes.delete(form.get('code'));
      if (!code || form.get('client_id') !== client || form.get('redirect_uri') !== `${origin}/` ||
          createHash('sha256').update(form.get('code_verifier') || '').digest('base64url') !== code.challenge) {
        return json(400, { error: 'invalid_grant' });
      }
      return json(200, { access_token: token(users[0]), id_token: token(users[0], client, { nonce: code.nonce }),
        token_type: 'Bearer', expires_in: 3600, scope: 'openid profile api-access' });
    }
    return json(404, { error: 'not_found' });
  } catch (error) {
    console.error('Test issuer failed:', error.message);
    if (!res.headersSent) json(500, { error: 'test_issuer_failure' });
    else res.destroy();
  }
});
unlinkSync(keyPath);
async function unusedPort() {
  const probe = createTcpServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}
server.listen(previous ? Number(new URL(previous.AUTH_ISSUER).port) : 0, '0.0.0.0');
await once(server, 'listening');
issuer = `https://host.docker.internal:${server.address().port}`;
const webPort = previous ? Number(previous.APP_PORT) : await unusedPort();
const dabPort = previous ? Number(previous.DAB_PORT) : await unusedPort();
origin = `http://127.0.0.1:${webPort}`;
if (!previous) writeFileSync(envPath, [
  `AUTH_AUTHORITY=${issuer}`, `AUTH_ISSUER=${issuer}`, `AUTH_CLIENT_ID=${client}`,
  `AUTH_AUDIENCE=${audience}`, 'AUTH_SCOPE=openid profile api-access',
  `APP_ORIGIN=${origin}`, `APP_PORT=${webPort}`, 'APP_HOST=127.0.0.1',
  `DAB_PORT=${dabPort}`, `DAB_URL=http://127.0.0.1:${dabPort}`, 'ACCEPT_EULA=Y',
].join('\n') + '\n', { mode: 0o600 });
writeFileSync(resolve(local, 'test-compose.yml'), [
  'services:', '  dab:', '    environment:', '      SSL_CERT_FILE: /certs/test-issuer-cert.pem',
  '    volumes:', '      - ./.local/test-issuer-cert.pem:/certs/test-issuer-cert.pem:ro',
  '    extra_hosts:', '      - "host.docker.internal:host-gateway"', '',
].join('\n'));
const env = { ...process.env, COMPOSE_FILE: [resolve(appRoot, 'compose.yml'), resolve(local, 'test-compose.yml')].join(process.platform === 'win32' ? ';' : ':') };
const init = spawnSync(process.execPath, ['scripts/local.mjs', 'init'], { cwd: appRoot, env, stdio: 'inherit' });
assert.equal(init.status, 0);
let child;
try {
  const browserCheck = process.argv.indexOf('--browser-check');
  const browser = process.argv.includes('--browser') || browserCheck !== -1;
  const imageCheck = process.argv.includes('--image-check');
  const interactive = browser || imageCheck;
  child = fork(resolve(appRoot, interactive ? 'scripts/local.mjs' : 'scripts/acceptance.mjs'), interactive ? ['start'] : [], {
    cwd: appRoot, env: { ...env, ACCEPTANCE_TOKEN_A: token(users[0]), ACCEPTANCE_TOKEN_B: token(users[1]) },
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  });
  if (interactive) {
    await Promise.race([once(child, 'message'), once(child, 'exit').then(() => { throw new Error('Browser stack startup failed.'); })]);
    if (browser) console.log(`BROWSER TEST ORIGIN ${origin}; test issuer ${issuer}. Ignore the test certificate only in this browser context.`);
    const stop = () => { if (child.connected) child.send('stop'); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    process.on('message', message => { if (message === 'stop') stop(); });
    if (imageCheck) {
      const check = spawn(process.execPath, [fileURLToPath(new URL('./test-deployment-images.mjs', import.meta.url)), appRoot], {
        env: { ...env, ACCEPTANCE_TOKEN_A: token(users[0]), ACCEPTANCE_TOKEN_B: token(users[1]) }, stdio: 'inherit',
      });
      const [code] = await once(check, 'exit');
      const exited = once(child, 'exit');
      stop();
      const [stackCode] = await exited;
      assert.equal(stackCode, 0, 'Image test fixture must shut down cleanly.');
      assert.equal(code, 0, 'Deployment image acceptance must succeed.');
    } else if (browserCheck !== -1) {
      if (!process.argv[browserCheck + 1]) throw new Error('--browser-check requires an existing Playwright module entry.');
      const check = spawn(process.execPath, [fileURLToPath(new URL('./test-starter-browser.mjs', import.meta.url)),
        appRoot, process.argv[browserCheck + 1]], { stdio: 'inherit' });
      const [code] = await once(check, 'exit');
      stop();
      const [stackCode] = await once(child, 'exit');
      assert.equal(stackCode, 0, 'Browser stack must shut down cleanly.');
      assert.equal(code, 0, 'Browser acceptance must succeed.');
    } else {
      const [code] = await once(child, 'exit');
      assert.equal(code, 0, 'Starter runtime validation must succeed.');
    }
  } else {
    const [code] = await once(child, 'exit');
    assert.equal(code, 0, 'Starter runtime validation must succeed.');
  }
} finally {
  if (child?.connected && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.send('stop');
    await exited;
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
