import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

for (const api of ['dab', 'functions']) {
  for (const outage of [false, true]) {
    test(`${api} local acceptance ${outage ? 'rejects validation outages' : 'uses the selected API contract'}`, async t => {
      const app = await mkdtemp(join(tmpdir(), 'sqlapps-acceptance-'));
      t.after(() => rm(app, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
      await cp(new URL('../skills/sql-apps/templates/starter/scripts/', import.meta.url), join(app, 'scripts'), { recursive: true });
      await writeFile(join(app, 'package.json'), '{"type":"module"}');
      await writeFile(join(app, 'deployment.json'), JSON.stringify({
        hosting: api === 'dab' ? 'container-apps' : 'static-web-apps', api,
      }));
      const tokens = ['owner-a', 'owner-b'].map(oid =>
        `header.${Buffer.from(JSON.stringify({ oid, exp: Date.now() / 1000 + 3600 })).toString('base64url')}.signature`);
      const result = spawnSync(process.execPath, [
        '--import', new URL('./fixtures/acceptance-tools.mjs', import.meta.url).href,
        join(app, 'scripts/acceptance.mjs'),
      ], {
        encoding: 'utf8', timeout: 10_000,
        env: {
          ...process.env, COMPOSE_PROJECT_NAME: 'sqlapps-0123456789ab', ACCEPT_EULA: 'Y', SQL_PORT: '14330',
          MSSQL_SA_PASSWORD: `Aa1!${'1'.repeat(48)}`, APP_SQL_PASSWORD: `Aa1!${'2'.repeat(48)}`,
          APP_ORIGIN: 'http://127.0.0.1:5180', APP_PORT: '5180',
          DAB_URL: api === 'dab' ? 'http://127.0.0.1:5081' : '',
          SQL_CONNECTION_STRING: api === 'dab' ? 'test-only-connection' : '',
          AUTH_ISSUER: 'https://identity.example/tenant', AUTH_AUTHORITY: 'https://identity.example/tenant',
          AUTH_CLIENT_ID: 'test-spa', AUTH_AUDIENCE: 'test-api', AUTH_SCOPE: 'openid api-access',
          ACCEPTANCE_TOKEN_A: tokens[0], ACCEPTANCE_TOKEN_B: tokens[1],
          SQLAPPS_TEST_API: api, SQLAPPS_TEST_OUTAGE: String(outage),
        },
      });
      if (outage) {
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /validation must be/);
      } else {
        assert.equal(result.status, 0, result.stderr || result.error?.message);
        assert.match(result.stdout, /LOCAL API ACCEPTANCE PASSED/);
      }
    });
  }
}
