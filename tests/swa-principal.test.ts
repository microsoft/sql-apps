import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAppPrincipal } from '../src/swa-principal.js';

function principal(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

const owner = {
  identityProvider: 'aad',
  userId: 'owner-provider-id',
  userDetails: 'owner@example.com',
  userRoles: ['anonymous', 'authenticated', 'owner'],
};

test('SWA owner principal yields a stable opaque owner id', () => {
  const parsed = parseAppPrincipal(principal(owner));
  assert.deepEqual(parsed, {
    provider: 'aad',
    userId: 'owner-provider-id',
    details: 'owner@example.com',
    roles: ['anonymous', 'authenticated', 'owner'],
    role: 'owner',
    ownerId: '9e63b381-bc6b-56ec-bb77-9dfe59f62474',
  });
  assert.equal(parseAppPrincipal(principal(owner)).ownerId, parsed.ownerId);
});

test('SWA principal rejects missing, malformed and unauthorized identities', () => {
  for (const value of [
    undefined,
    '',
    'not-base64',
    principal({ ...owner, extra: true }),
    principal({ ...owner, userId: '' }),
    principal({ ...owner, userRoles: ['authenticated'] }),
    principal({ ...owner, userRoles: ['owner', 'owner'] }),
    principal({ ...owner, userRoles: ['owner', 'x'.repeat(129)] }),
    Buffer.alloc(8193).toString('base64'),
  ]) {
    assert.throws(() => parseAppPrincipal(value), /principal|owner|role/i);
  }
});

test('SWA member principal is admitted as a member and owner wins when both are assigned', () => {
  const member = parseAppPrincipal(principal({ ...owner, userRoles: ['authenticated', 'member'] }));
  assert.equal(member.role, 'member');
  assert.equal(member.ownerId, '9e63b381-bc6b-56ec-bb77-9dfe59f62474', 'identity, not role, determines the SQL subject');
  assert.equal(parseAppPrincipal(principal({ ...owner, userRoles: ['member', 'owner'] })).role, 'owner');
});
