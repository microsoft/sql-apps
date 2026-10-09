import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoClient } from '../examples/todo/web/client.js';

test('selected browser client uses session cookies and common CRUD with no submitted owner identity', async () => {
  const calls: { path: string; body: unknown; method: string }[] = [];
  const id = '11111111-1111-4111-8111-111111111111';
  const client = new DemoClient(async (input, options) => {
    const path = String(input);
    assert.ok(path.startsWith('/'));
    assert.equal(options?.credentials, 'same-origin');
    assert.equal(new Headers(options?.headers).get('authorization'), null);
    calls.push({ path, body: options?.body ? JSON.parse(String(options.body)) : null, method: options?.method ?? 'GET' });
    if (options?.method === 'DELETE') return new Response(null, { status: 204 });
    if (path === '/session') return Response.json({ expiresAt: '2026-10-09T12:00:00.000Z' });
    const item = { id, title: 'Synthetic item', completed: false };
    return Response.json(path === '/todos' && !options?.method ? { items: [item] } : item);
  });
  assert.ok((await client.start()).expiresAt);
  assert.deepEqual(await client.list(), [{ id, title: 'Synthetic item', completed: false }]);
  assert.equal((await client.create('Synthetic item')).id, id);
  await client.update(id, { completed: true });
  await client.delete(id);
  await client.end();
  assert.deepEqual(calls, [
    { path: '/session', body: { synthetic: true }, method: 'POST' },
    { path: '/todos', body: null, method: 'GET' },
    { path: '/todos', body: { title: 'Synthetic item' }, method: 'POST' },
    { path: `/todos/${id}`, body: { completed: true }, method: 'PATCH' },
    { path: `/todos/${id}`, body: null, method: 'DELETE' },
    { path: '/session', body: null, method: 'DELETE' },
  ]);
});

test('browser client reports errors and rejects malformed public records without empty-list fallbacks', async () => {
  const malformed = new DemoClient(async () => Response.json({ items: [{ id: 'invalid', title: 'item' }] }));
  await assert.rejects(malformed.list(), /Invalid application response/);
  const unavailable = new DemoClient(async () => Response.json({ error: 'Session expired' }, { status: 401 }));
  await assert.rejects(unavailable.list(), /Session expired/);
  const nonJson = new DemoClient(async () => new Response('not json'));
  await assert.rejects(nonJson.list(), /JSON/);
});

test('browser fetch is invoked without a class receiver', async () => {
  const client = new DemoClient(async function (this: unknown) {
    assert.equal(this, undefined, 'Browser fetch must not receive DemoClient as its Window receiver');
    return Response.json({ items: [] });
  });
  assert.deepEqual(await client.list(), []);
});
