import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export async function runCloudAcceptance({ origin, tokens, restart }) {
  assert.ok(new URL(origin).protocol === 'https:', 'Cloud acceptance requires HTTPS.');
  assert.ok(tokens?.length === 2 && tokens.every(Boolean), 'Supply two real-user access tokens through ACCEPTANCE_TOKEN_A/B.');
  const claims = tokens.map(token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url')));
  assert.ok(claims.every(claim => claim.oid && claim.exp > Date.now() / 1000 + 300),
    'Tokens need oid and at least five minutes remaining; the deployed API verifies signatures.');
  assert.notEqual(claims[0].oid, claims[1].oid, 'Use two distinct real users.');
  assert.equal(typeof restart, 'function', 'An explicitly approved restart is required for full cloud acceptance.');
  const request = (path, token, body, extraHeaders = {}) => fetch(new URL(path, origin), {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const label = `cloud-acceptance-${randomUUID()}`;
  const filter = `/api/Items?$filter=${encodeURIComponent(`Label eq '${label}'`)}`;
  async function rows(token) {
    const response = await request(filter, token);
    assert.equal(response.status, 200, 'Authenticated read must succeed.');
    const result = await response.json();
    assert.ok(Array.isArray(result.value), 'DAB must return a value array.');
    return result.value;
  }
  await rows(tokens[0]);
  await rows(tokens[1]);
  for (const [token, headers] of [
    [undefined, {}],
    [undefined, { 'X-MS-CLIENT-PRINCIPAL': 'forged', 'X-MS-API-ROLE': 'authenticated' }],
    ['forged', {}],
  ]) {
    const response = await request('/api/Items', token, undefined, headers);
    assert.ok([401, 403].includes(response.status), 'Unsigned headers, anonymous callers and forged tokens must be denied independently.');
  }
  const create = (token, Label) => request('/api/CreateItem', token, { Label });
  const race = await Promise.all([create(tokens[0], label), create(tokens[0], label)]);
  assert.equal(race.filter(response => response.ok).length, 1, 'Exactly one duplicate write must succeed.');
  assert.equal(race.filter(response => response.status === 409).length, 1, 'The duplicate must be HTTP 409, not an outage.');
  const saved = await rows(tokens[0]);
  assert.equal(saved.length, 1, 'Exactly one saved row must exist.');
  assert.equal(saved[0].Label, label);
  assert.equal((await rows(tokens[1])).length, 0, 'Other owner must not see the saved row.');
  assert.ok((await create(tokens[1], label)).ok, 'A different owner must be allowed the same label.');
  const other = await rows(tokens[1]);
  assert.equal(other.length, 1);
  assert.notEqual(other[0].Id, saved[0].Id, 'Distinct owners must have distinct rows.');
  assert.deepEqual(await rows(tokens[0]), saved, 'A second owner must not change the first owner row.');
  const invalid = await create(tokens[0], ' ');
  const invalidResult = await invalid.json();
  assert.ok([400, 500].includes(invalid.status) && invalidResult.error?.code === 'DatabaseOperationFailed',
    'Invalid input must be rejected by SQL, not by an outage.');
  const bypass = await request('/api/Items', tokens[0], { Label: label });
  assert.ok([400, 403, 405].includes(bypass.status), 'The read entity must not permit direct writes.');
  const durations = [];
  for (let index = 0; index < 10; index++) {
    const start = performance.now();
    assert.deepEqual(await rows(tokens[0]), saved);
    durations.push(performance.now() - start);
  }
  await restart();
  const deadline = Date.now() + 180_000;
  let ready = false;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await request(filter, tokens[0]);
      if (response.status === 200) { await response.arrayBuffer(); ready = true; break; }
      last = `HTTP ${response.status}`;
      await response.arrayBuffer();
    } catch (error) {
      if (!(error instanceof TypeError || error.name === 'TimeoutError')) throw error;
      last = error.message;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, `Authenticated API did not recover after restart: ${last}`);
  assert.deepEqual(await rows(tokens[0]), saved, 'Saved row must survive the approved app restart.');
  assert.deepEqual(await rows(tokens[1]), other, 'Second owner row must survive restart.');
  assert.ok((await create(tokens[0], `${label}-restarted`)).ok, 'A post-restart write must succeed.');
  const after = await request(`/api/Items?$filter=${encodeURIComponent(`Label eq '${label}-restarted'`)}`, tokens[0]);
  assert.equal(after.status, 200);
  assert.equal((await after.json()).value.length, 1, 'The post-restart write must persist.');
  durations.sort((a, b) => a - b);
  return {
    status: 'passed', origin, timestamp: new Date().toISOString(), restartPersistence: 'passed',
    authenticatedRead: { count: 10, medianMs: (durations[4] + durations[5]) / 2, maxMs: durations[9],
      conditions: 'Sequential warm filtered reads, including response parsing; not a load or cold-start test.' },
    retainedLabel: label,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: {
    origin: { type: 'string' }, subscription: { type: 'string' }, 'resource-group': { type: 'string' },
    'web-app': { type: 'string' }, 'dab-app': { type: 'string' }, 'approve-restart': { type: 'boolean' },
  } });
  for (const key of ['origin', 'subscription', 'resource-group', 'web-app', 'dab-app']) {
    assert.ok(values[key], `Supply --${key}.`);
  }
  assert.ok(values['approve-restart'], 'Explicitly approve restarting both named apps with --approve-restart.');
  const az = args => {
    assert.ok(args.every(arg => /^[A-Za-z0-9_.-]+$/.test(arg)), 'Use simple subscription, resource-group, app and revision names.');
    return execFileSync(process.platform === 'win32' ? process.env.ComSpec : 'az',
      process.platform === 'win32' ? ['/d', '/s', '/c', `az ${args.join(' ')}`] : args,
      { encoding: 'utf8', timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe'] });
  };
  const result = await runCloudAcceptance({
    origin: values.origin,
    tokens: [process.env.ACCEPTANCE_TOKEN_A, process.env.ACCEPTANCE_TOKEN_B],
    restart: async () => {
      for (const name of [values['dab-app'], values['web-app']]) {
        const scope = ['--subscription', values.subscription, '--resource-group', values['resource-group'], '--name', name];
        const app = JSON.parse(az(['containerapp', 'show', ...scope, '--output', 'json']));
        const revision = app.properties.latestReadyRevisionName;
        assert.ok(revision, `No ready revision for ${name}.`);
        az(['containerapp', 'revision', 'restart', ...scope, '--revision', revision, '--output', 'none']);
      }
    },
  });
  console.log(JSON.stringify(result, null, 2));
}
