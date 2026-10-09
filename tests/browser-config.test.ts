import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrowserConfig } from '../src/browser-config.js';

test('browser configuration discriminates real Entra from isolated development sessions', () => {
  for (const config of [
    { mode: 'entra', tenantId: 'tenant', clientId: 'client', scope: 'scope', capabilities: { files: true, functions: true } },
    { mode: 'local', users: [{ id: 'alice', name: 'Alice' }], capabilities: { files: false, functions: false } },
  ]) assert.deepEqual(parseBrowserConfig(config), config);
  assert.deepEqual(parseBrowserConfig({ tenantId: 'tenant', clientId: 'client', scope: 'scope' }),
    { mode: 'entra', tenantId: 'tenant', clientId: 'client', scope: 'scope', capabilities: { files: true, functions: true } });
  for (const config of [
    null, {}, { mode: 'unknown', capabilities: { files: true, functions: true } },
    { mode: 'local', users: [], capabilities: { files: false, functions: false } },
    { mode: 'local', users: [{ id: 'alice' }], capabilities: { files: false, functions: false } },
    { mode: 'entra', clientId: 'client', capabilities: { files: 'yes', functions: false } },
  ]) assert.throws(() => parseBrowserConfig(config), /Invalid/);
});

test('processing controls require an explicit boolean capability', () => {
  const config = { mode: 'local', users: [{ id: 'alice', name: 'Alice' }],
    capabilities: { files: true, functions: true, processing: true } };
  assert.deepEqual(parseBrowserConfig(config), config);
  assert.throws(() => parseBrowserConfig({ ...config, capabilities: { ...config.capabilities, processing: 'yes' } }), /Invalid/);
  assert.equal(parseBrowserConfig({ ...config, capabilities: { files: true, functions: true } }).capabilities.processing, undefined);
});
