import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { application } from '../examples/todo/application.js';

test('selected demo DAB is anonymous internal procedure execution only', async () => {
  const config = JSON.parse(await readFile('examples/todo/demo/dab-config.json', 'utf8'));
  assert.equal(config.runtime.host.mode, 'production');
  assert.equal(config.runtime.host.authentication.provider, 'Unauthenticated');
  assert.equal(config.runtime.graphql.enabled, false);
  assert.equal(config.runtime.mcp.enabled, false);
  assert.equal(config['data-source']['connection-string'], "@env('SQL_CONNECTION_STRING')");
  assert.equal(config['data-source'].options['set-session-context'], false);
  assert.deepEqual(Object.keys(config.entities).sort(), [...application.procedures].sort());
  for (const entity of Object.values(config.entities) as { source: { type: string }; rest: { methods: string[] }; permissions: unknown[] }[]) {
    assert.equal(entity.source.type, 'stored-procedure');
    assert.deepEqual(entity.rest.methods, ['post']);
    assert.deepEqual(entity.permissions, [{ role: 'anonymous', actions: ['execute'] }]);
  }
});

test('selected schema owns hashed visitor data separately from authenticated example tables', async () => {
  const schema = await readFile('examples/todo/demo/schema.sql', 'utf8');
  assert.match(schema, /token_hash char\(64\)/i);
  assert.match(schema, /expires_at datetime2/i);
  assert.match(schema, /ON DELETE CASCADE/i);
  assert.doesNotMatch(schema, /owner_oid|SESSION_CONTEXT|varchar\(43\)/i);
  const grants = await readFile('examples/todo/demo/grants.sql', 'utf8');
  assert.doesNotMatch(grants, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|CONTROL)|db_owner|db_datareader|db_datawriter/i);
  assert.equal((grants.match(/GRANT EXECUTE ON /g) ?? []).length, application.procedures.length);
  const project = await readFile('examples/todo/demo/database.sqlproj', 'utf8');
  assert.match(project, /SqlAzureV12DatabaseSchemaProvider/);
  assert.doesNotMatch(project, /owner\.sql|FileJobs|Include=.*\.\./);
});
