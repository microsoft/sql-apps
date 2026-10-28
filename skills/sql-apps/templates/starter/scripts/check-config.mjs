import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root } from '../dist/scripts/config.js';

const read = file => readFileSync(resolve(root, file), 'utf8');
const baseline = JSON.parse(read('baseline.json'));
const dab = JSON.parse(read('packages/data/dab-config.json'));
assert.ok(dab.$schema.includes(`/v${baseline.dab}/`));
assert.equal(dab['data-source']['connection-string'], "@env('SQL_CONNECTION_STRING')");
assert.equal(dab['data-source'].options['set-session-context'], true);
assert.equal(dab.runtime.host.authentication.provider, 'Custom');
assert.equal(dab.runtime.graphql.enabled, false);
assert.equal(dab.runtime.mcp.enabled, false);
for (const entity of Object.values(dab.entities)) {
  assert.ok(entity.permissions.every(permission => permission.role === 'authenticated'));
}
for (const image of Object.values(baseline.images)) assert.ok(read('compose.yml').includes(image));
console.log('Static DAB/baseline checks passed; live DAB metadata validation requires local:start.');
