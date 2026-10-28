import assert from 'node:assert/strict';
import test from 'node:test';
import { runCloudAcceptance } from '../scripts/test-cloud-acceptance.mjs';

const tokens = ['owner-a', 'owner-b'].map(oid =>
  `header.${Buffer.from(JSON.stringify({ oid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`);

async function run(t, fault) {
  const rows = [];
  let restarted = false;
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    const bearer = options.headers.Authorization;
    const owner = bearer === `Bearer ${tokens[0]}` ? 'owner-a' : bearer === `Bearer ${tokens[1]}` ? 'owner-b' : null;
    if (!owner) return Response.json({}, { status: 401 });
    if (fault === 'denials-only') return Response.json({}, { status: 403 });
    if (options.method === 'POST') {
      const { Label } = JSON.parse(options.body);
      if (url.pathname === '/api/Items') return Response.json({}, { status: 405 });
      if (!Label.trim()) return Response.json({ error: { code: 'DatabaseOperationFailed' } }, { status: 400 });
      if (rows.some(row => row.owner === owner && row.Label === Label)) {
        return Response.json({}, { status: fault === 'race-outage' ? 503 : 409 });
      }
      rows.push({ Id: String(rows.length + 1), Label, owner });
      return Response.json({}, { status: 201 });
    }
    const filter = url.searchParams.get('$filter');
    const visible = rows.filter(row => (fault === 'ownership-leak' || row.owner === owner) &&
      filter === `Label eq '${row.Label}'`).map(({ owner, ...row }) => row);
    return Response.json({ value: restarted && fault === 'restart-loss' ? [] : visible });
  });
  return runCloudAcceptance({
    origin: 'https://review.example',
    tokens,
    restart: async () => { restarted = true; },
  });
}

for (const [fault, message] of [
  ['denials-only', /Authenticated read must succeed/],
  ['race-outage', /duplicate must be HTTP 409/],
  ['ownership-leak', /Other owner must not see/],
  ['restart-loss', /Saved row must survive/],
]) {
  test(`cloud acceptance fails closed for ${fault}`, async t => {
    await assert.rejects(run(t, fault), { name: 'AssertionError', message });
  });
}

test('cloud acceptance requires two distinct users before sending requests', async t => {
  const request = t.mock.method(globalThis, 'fetch', () => { throw new Error('Must not make a request'); });
  await assert.rejects(runCloudAcceptance({ origin: 'https://review.example', tokens: [] }), /two real-user access tokens/);
  await assert.rejects(runCloudAcceptance({ origin: 'https://review.example', tokens: [tokens[0], tokens[0]] }), /distinct/);
  assert.equal(request.mock.callCount(), 0);
});

test('cloud acceptance requires explicit restart and preserves the exact saved row', async t => {
  await assert.rejects(runCloudAcceptance({ origin: 'https://review.example', tokens }), /restart/);
  const result = await run(t);
  assert.equal(result.status, 'passed');
  assert.equal(result.authenticatedRead.count, 10);
  assert.ok(result.authenticatedRead.medianMs >= 0);
  assert.equal(result.restartPersistence, 'passed');
});
