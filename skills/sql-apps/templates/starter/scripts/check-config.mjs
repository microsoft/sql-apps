import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { localApi, root } from './config.ts';

const read = file => readFileSync(resolve(root, file), 'utf8');
const baseline = JSON.parse(read('baseline.json'));
const api = localApi();
if (api === 'dab') {
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
}
const compose = read(api === 'functions' ? 'compose.functions.yml' : 'compose.yml') + read('compose.sql.yml');
for (const [name, image] of Object.entries(baseline.images)) {
  if (api === 'dab' || name === 'sql') assert.ok(compose.includes(image));
}
console.log(api === 'dab' ? 'Static DAB/baseline checks passed; live DAB metadata validation requires local:start.' :
  'Static Functions/SQL baseline checks passed; live API/SQL acceptance remains unverified.');
