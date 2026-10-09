import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runtimeFor } from '../src/workspace.mjs';

export async function checkApplicationApi(origin = runtimeFor().origins.app, fetcher = fetch) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Local API acceptance requires a plain 127.0.0.1 HTTP origin');
  }
  origin = url.origin;
  const request = (path, options = {}) => fetcher(`${origin}${path}`, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { origin, ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
  });
  const session = await request('/local/session', {
    method: 'POST', body: JSON.stringify({ user: '11111111-1111-4111-8111-111111111111' }),
  });
  assert.equal(session.status, 200, 'Local authenticated acceptance session required');
  const { token } = await session.json();
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 0, 'Local acceptance session must return a usable token');
  const headers = { authorization: `Bearer ${token}` };
  const failures = [];
  try {
    const rest = await request('/api/Todo', { headers });
    await rest.text();
    assert.equal(rest.status, 404, 'Unselected sample REST entity must be absent');
    const graph = await request('/graphql', { method: 'POST', headers,
      body: JSON.stringify({ query: '{ todos { items { id } } }' }) });
    assert.ok([200, 400].includes(graph.status), 'GraphQL must respond with schema validation, not an unavailable backend');
    const body = await graph.json();
    assert.ok(Array.isArray(body.errors) && body.errors.length > 0, 'Unselected sample GraphQL field must be rejected');
    assert.ok(body.errors.some(error => typeof error.message === 'string' &&
      /todos/i.test(error.message) && /not exist|unknown|cannot query/i.test(error.message)),
    'GraphQL must reject the missing field, not merely deny authentication');
    assert.ok(!body.data?.todos, 'No sample records may be returned');
  } catch (error) { failures.push(error); }
  finally {
    try {
      const cleanup = await request('/local/session', { method: 'DELETE', headers });
      await cleanup.text();
      assert.ok(cleanup.ok, `Acceptance session cleanup failed (HTTP ${cleanup.status})`);
    }
    catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, 'Clean application API acceptance failed');
  console.log(`Clean application API passed: authenticated sample REST absent and GraphQL field rejected at ${origin}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  checkApplicationApi(process.argv[2]).catch(error => {
    console.error(error.message);
    if (error instanceof AggregateError) for (const cause of error.errors) console.error(cause.message);
    process.exitCode = 1;
  });
}
