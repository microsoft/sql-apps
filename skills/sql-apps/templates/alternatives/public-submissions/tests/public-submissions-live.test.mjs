import assert from 'node:assert/strict';
import test from 'node:test';
import { createDatabase } from '../packages/functions/dist/database.js';

test('explicit live gate: independent hosts share the SQL rolling-minute stop', {
  skip: process.env.RUN_PUBLIC_BUDGET_LIVE !== 'I_APPROVE_BUDGET_CONSUMPTION',
}, async () => {
  const hosts = [createDatabase(process.env), createDatabase(process.env)];
  let accepted = 0;
  let limited = 0;
  try {
    // This deliberately consumes budget; never reset controls or create an identity.
    for (let index = 0; index < 70; index++) {
      try { await hosts[index % hosts.length].submit(`Live budget verification ${index}`); accepted++; }
      catch (error) {
        assert.equal(error.number, 51029, 'Only the SQL hard stop is an expected rejection.');
        limited++;
      }
    }
    assert.ok(accepted <= 60);
    assert.ok(limited >= 10);
  } finally { await Promise.all(hosts.map(host => host.close())); }
});
