import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeApplication, type ApplicationAdapter } from '../src/application.js';
import { application } from '../examples/todo/application.js';

const id = '11111111-1111-4111-8111-111111111111';
const subject = 'a'.repeat(64);

test('selected application uses the same registration and exact methods in both adapters', async t => {
  const manifests = [];
  for (const profile of ['local-simulation', 'public-demo'] as const) {
    const calls: { name: string; parameters: Record<string, string | boolean | null> }[] = [];
    const adapter: ApplicationAdapter = {
      profile, capabilities: ['data', 'visitor-sessions'],
      async register() {},
      async subject() { return subject; },
      async ready() {},
      async execute(name, parameters) {
        calls.push({ name, parameters });
        return [{ outcome: 'ok', id, title: 'Synthetic item', completed: false }];
      },
    };
    const app = await composeApplication(application, adapter);
    t.after(() => app.close());
    const routes = await app.inject('/application/manifest');
    assert.equal(routes.statusCode, 200);
    manifests.push(routes.json());
    assert.deepEqual(routes.json().routes, application.routes);
    assert.equal((await app.inject('/todos')).statusCode, 200);
    assert.deepEqual((await app.inject('/todos')).json(), { items: [{ id, title: 'Synthetic item', completed: false }] });
    const created = await app.inject({ method: 'POST', url: '/todos', payload: { title: ' Synthetic item ' } });
    assert.equal(created.statusCode, 201);
    assert.deepEqual(calls.at(-1), {
      name: 'Create', parameters: { token_hash: subject, title: 'Synthetic item' },
    });
    assert.equal((await app.inject({ method: 'PATCH', url: `/todos/${id}`, payload: { completed: true } })).statusCode, 200);
    assert.equal((await app.inject({ method: 'DELETE', url: `/todos/${id}` })).statusCode, 204);
    for (const path of ['/api/Todo', '/graphql', '/local/session', '/storage', '/jobs']) {
      assert.equal((await app.inject(path)).statusCode, 404, path);
    }
  }
  assert.deepEqual(manifests[0], manifests[1], 'Profile differences must not change the application route contract');
});

test('selected composition rejects missing capabilities or changed route methods before readiness', async () => {
  const adapter: ApplicationAdapter = {
    profile: 'public-demo', capabilities: ['data'],
    async register() {}, async subject() { return subject; }, async ready() {}, async execute() { return []; },
  };
  await assert.rejects(composeApplication(application, adapter), /visitor-sessions/);
  await assert.rejects(composeApplication({
    ...application,
    routes: [...application.routes, { method: 'POST', path: '/missing' }],
  }, { ...adapter, capabilities: ['data', 'visitor-sessions'] }), /route contract/);
  await assert.rejects(composeApplication({
    ...application,
    routes: application.routes.map(route => route.method === 'PATCH' ? { ...route, method: 'PUT' } : route),
  }, { ...adapter, capabilities: ['data', 'visitor-sessions'] }), /route contract/);
});

test('application readiness probes its actual adapter and exposes failures as unavailable', async t => {
  const app = await composeApplication(application, {
    profile: 'public-demo', capabilities: ['data', 'visitor-sessions'],
    async register() {}, async subject() { return subject; },
    async ready() { throw new Error('SQL procedure cannot execute'); },
    async execute() { throw new Error('SQL offline'); },
  });
  t.after(() => app.close());
  assert.equal((await app.inject('/health/live')).statusCode, 200);
  assert.equal((await app.inject('/health/ready')).statusCode, 503);
  const failed = await app.inject('/todos');
  assert.equal(failed.statusCode, 500);
  assert.equal(failed.json().error, 'Service operation failed');
  assert.ok(failed.json().requestId);
});

test('application rejects owner fields, invalid input and malformed backend results', async t => {
  let calls = 0;
  let rows: unknown = [{ outcome: 'ok', id, title: 'Synthetic item', completed: false }];
  const app = await composeApplication(application, {
    profile: 'public-demo', capabilities: ['data', 'visitor-sessions'],
    async register() {}, async subject() { return subject; }, async ready() {},
    async execute() { calls++; return rows; },
  });
  t.after(() => app.close());
  for (const payload of [
    { title: '' }, { title: ' ' }, { title: 'x'.repeat(201) }, { title: 'item', owner_oid: id },
    { title: 'item', token_hash: subject }, { title: 'item', id }, { title: 'item', role: 'admin' },
  ]) {
    assert.equal((await app.inject({ method: 'POST', url: '/todos', payload })).statusCode, 400);
  }
  for (const payload of [{}, { owner_oid: id }, { title: 'x'.repeat(201) }, { completed: 'true' }]) {
    assert.equal((await app.inject({ method: 'PATCH', url: `/todos/${id}`, payload })).statusCode, 400);
  }
  assert.equal((await app.inject('/todos?owner_oid=forged')).statusCode, 400);
  assert.equal((await app.inject({ method: 'DELETE', url: '/todos/invalid' })).statusCode, 400);
  assert.equal(calls, 0);
  assert.equal((await app.inject({ method: 'POST', url: '/todos', payload: { title: 'x'.repeat(200) } })).statusCode, 201);
  for (const malformed of [[], {}, [{ outcome: 'ok', id }], [{ outcome: 'ok', id, title: 'item', completed: false, owner_oid: id }]]) {
    rows = malformed;
    assert.equal((await app.inject('/todos')).statusCode, 502);
  }
  for (const [outcome, expected] of [['expired', 401], ['quota', 409], ['rate_limited', 429], ['not_found', 404]] as const) {
    rows = [{ outcome, id: null, title: null, completed: null }];
    assert.equal((await app.inject({ method: 'POST', url: '/todos', payload: { title: 'item' } })).statusCode, expected);
  }
  rows = [{ outcome: 'ok', id: null, title: null, completed: null }];
  assert.deepEqual((await app.inject('/todos')).json(), { items: [] });
  assert.equal((await app.inject({ method: 'POST', url: '/todos', payload: { title: 'item' } })).statusCode, 502);
});
