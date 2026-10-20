import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalFreeHandler, parsePersonalFreeBody } from '../src/personal-free-app.js';

const ownerHeader = Buffer.from(JSON.stringify({
  identityProvider: 'aad',
  userId: 'owner-provider-id',
  userDetails: 'owner@example.com',
  userRoles: ['anonymous', 'authenticated', 'owner'],
})).toString('base64');

test('personal-free API maps only declared routes to typed procedures', async () => {
  const calls: unknown[] = [];
  const handler = createPersonalFreeHandler([{
    method: 'POST',
    path: '/api/UpdateItem',
    procedure: { name: 'UpdateItem', parameters: { id: 'uniqueidentifier', completed: 'bit' } },
  }], {
    async execute(ownerId, role, procedure, values) {
      calls.push({ ownerId, role, procedure, values });
      return [{ outcome: 'ok' }];
    },
    async ready() {},
  });
  const response = await handler({
    method: 'POST',
    url: 'https://example.test/api/UpdateItem',
    headers: new Headers({ 'x-ms-client-principal': ownerHeader }),
    body: { id: '22222222-2222-5222-8222-222222222222', completed: true },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { value: [{ outcome: 'ok' }] });
  assert.deepEqual(calls, [{
    ownerId: '9e63b381-bc6b-56ec-bb77-9dfe59f62474',
    role: 'owner',
    procedure: 'UpdateItem',
    values: { id: '22222222-2222-5222-8222-222222222222', completed: true },
  }]);
});

test('personal-free API rejects nonowners and undeclared routes', async () => {
  let called = false;
  const handler = createPersonalFreeHandler([], {
    async execute() { called = true; return []; },
    async ready() {},
  });
  const nonOwner = Buffer.from(JSON.stringify({
    identityProvider: 'aad', userId: 'user', userDetails: 'user@example.com',
    userRoles: ['anonymous', 'authenticated'],
  })).toString('base64');
  assert.equal((await handler({
    method: 'GET', url: 'https://example.test/api/anything',
    headers: new Headers({ 'x-ms-client-principal': nonOwner }),
  })).status, 403);
  assert.equal((await handler({
    method: 'GET', url: 'https://example.test/api/anything',
    headers: new Headers({ 'x-ms-client-principal': ownerHeader }),
  })).status, 404);
  assert.equal(called, false);
});

test('personal-free API validates values against declared SQL parameter types', async () => {
  let called = false;
  const handler = createPersonalFreeHandler([{
    method: 'POST',
    path: '/api/UpdateItem',
    procedure: { name: 'UpdateItem', parameters: { completed: 'bit' } },
  }], {
    async execute() { called = true; return []; },
    async ready() {},
  });
  const response = await handler({
    method: 'POST',
    url: 'https://example.test/api/UpdateItem',
    headers: new Headers({ 'x-ms-client-principal': ownerHeader }),
    body: { completed: 'false' },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid procedure parameters' });
  assert.equal(called, false);

  const extra = await handler({
    method: 'POST',
    url: 'https://example.test/api/UpdateItem',
    headers: new Headers({ 'x-ms-client-principal': ownerHeader }),
    body: { completed: false, unexpected: true },
  });
  assert.equal(extra.status, 400);
  assert.deepEqual(await extra.json(), { error: 'Invalid procedure parameters' });
  assert.equal(called, false);
});

test('personal-free API parses typed GET query parameters strictly', async () => {
  const calls: unknown[] = [];
  const handler = createPersonalFreeHandler([{
    method: 'GET',
    path: '/api/ListItems',
    procedure: {
      name: 'ListItems',
      parameters: { limit: 'int', completed: 'bit', name: 'nvarchar', since: 'datetime2' },
    },
  }], {
    async execute(_ownerId, _role, _procedure, values) { calls.push(values); return []; },
    async ready() {},
  });
  const get = (query: string) => handler({
    method: 'GET',
    url: `https://example.test/api/ListItems?${query}`,
    headers: new Headers({ 'x-ms-client-principal': ownerHeader }),
  });
  const accepted = await get('limit=10&completed=false&name=12&since=2026-01-02T03%3A04%3A05Z');
  assert.equal(accepted.status, 200);
  assert.deepEqual(calls, [{ limit: 10, completed: false, name: '12', since: '2026-01-02T03:04:05Z' }]);
  for (const query of [
    'limit=10.5&completed=false&name=a&since=2026-01-02',
    'limit=1e3&completed=false&name=a&since=2026-01-02',
    'limit=2147483648&completed=false&name=a&since=2026-01-02',
    'limit=10&completed=yes&name=a&since=2026-01-02',
    'limit=10&limit=11&completed=true&name=a&since=2026-01-02',
    'limit=&completed=true&name=a&since=2026-01-02',
  ]) {
    const rejected = await get(query);
    assert.equal(rejected.status, 400, query);
  }
  assert.equal(calls.length, 1);
});

test('personal-free API logs procedure failures without returning database details', async () => {
  const failures: unknown[] = [];
  const handler = createPersonalFreeHandler([{
    method: 'GET',
    path: '/api/AppReady',
    procedure: { name: 'AppReady', parameters: {} },
  }], {
    async execute() { throw new Error('Invalid object name dbo.PrivateLedger'); },
    async ready() {},
  }, (error: unknown) => failures.push(error));
  const response = await handler({
    method: 'GET',
    url: 'https://example.test/api/AppReady',
    headers: new Headers({ 'x-ms-client-principal': ownerHeader }),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Service operation failed' });
  assert.equal(failures.length, 1);
  assert.match(String(failures[0]), /PrivateLedger/);
});

test('personal-free request body parser reports malformed JSON as client input', () => {
  assert.deepEqual(parsePersonalFreeBody('{"completed":false}'), { completed: false });
  assert.throws(() => parsePersonalFreeBody('{broken'), error =>
    error instanceof Error && error.message === 'Invalid JSON request body' &&
    'statusCode' in error && error.statusCode === 400);
});

test('personal-free API admits team members only on routes that list the member role', async () => {
  const calls: { role: string; procedure: string }[] = [];
  const handler = createPersonalFreeHandler([
    { method: 'GET', path: '/api/ListLoans', roles: ['owner', 'member'], procedure: { name: 'ListLoans', parameters: {} } },
    { method: 'POST', path: '/api/DeleteLoan', procedure: { name: 'DeleteLoan', parameters: { id: 'int' } } },
  ], {
    async execute(_ownerId, role, procedure) { calls.push({ role, procedure }); return []; },
    async ready() {},
  });
  const memberHeader = Buffer.from(JSON.stringify({
    identityProvider: 'github', userId: 'member-id', userDetails: 'teammate',
    userRoles: ['anonymous', 'authenticated', 'member'],
  })).toString('base64');
  const call = (header: string, method: string, path: string, body?: unknown) => handler({
    method, url: `https://example.test${path}`, headers: new Headers({ 'x-ms-client-principal': header }), body,
  });
  assert.equal((await call(memberHeader, 'GET', '/api/ListLoans')).status, 200);
  const denied = await call(memberHeader, 'POST', '/api/DeleteLoan', { id: 1 });
  assert.equal(denied.status, 403, 'routes without roles stay owner-only');
  assert.deepEqual(await denied.json(), { error: 'Your role cannot perform this operation' });
  assert.equal((await call(ownerHeader, 'POST', '/api/DeleteLoan', { id: 1 })).status, 200);
  assert.deepEqual(calls, [
    { role: 'member', procedure: 'ListLoans' },
    { role: 'owner', procedure: 'DeleteLoan' },
  ]);
});

test('anonymous SQL readiness failures are logged without exposing database details', async () => {
  const failures: unknown[] = [];
  const handler = createPersonalFreeHandler([], {
    async execute() { throw new Error('not an API call'); },
    async ready() { throw new Error('Missing private schema dbo.PrivateLedger'); },
  }, error => failures.push(error));
  const response = await handler({
    method: 'GET', url: 'https://example.test/api/health/ready', headers: new Headers(),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'not-ready' });
  assert.equal(failures.length, 1);
  assert.match(String(failures[0]), /PrivateLedger/);
});
