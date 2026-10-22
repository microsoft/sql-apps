import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => (await readFile(new URL(path, root), 'utf8')).replace(/\r\n/g, '\n');
const skill = await read('skills/sql-apps/SKILL.md');
const constitution = await read('skills/sql-apps/references/constitution.md');
const brief = await read('skills/sql-apps/templates/app-brief.md');
const alignment = await read('skills/sql-apps/references/rayfin-alignment.md');
const design = await read('skills/sql-apps/references/app-design.md');
const readme = await read('README.md');
const plan = await read('plan.md');
const policy = constitution.match(
  /<!-- sql-apps:constitution:start -->([\s\S]*?)<!-- sql-apps:constitution:end -->/,
)?.[1];

test('PoC and zero-spend defaults survive the brief and durable policy', () => {
  assert.ok(policy, 'The copied project policy must exist');
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy, readme })) {
    assert.match(text, /intent: poc/, `${name}: missing default intent`);
    assert.match(text, /costPreference: zero-azure-spend/, `${name}: missing cost constraint`);
    assert.match(text, /availability, scale, (or|and) compliance/i, `${name}: explicit production boundary`);
    assert.match(text, /deploy.{0,100}(not|does not)/i, `${name}: deploy is not spend/production consent`);
  }
});

test('every specialist receives explicit architecture and cost constraints', () => {
  const handoff = skill.match(/\*\*Every specialist handoff\*\*([^\n]+)/)?.[1];
  assert.ok(handoff);
  for (const requirement of ['intent', 'costPreference', 'DAB', 'SQL invariants', 'topology', 'acceptance']) {
    assert.ok(handoff.includes(requirement), `Handoff omits ${requirement}`);
  }
  assert.match(handoff, /link alone is insufficient/);
  assert.match(handoff, /stop and reconcile/);
  assert.match(policy, /Every specialist handoff must explicitly carry/);
  assert.match(brief, /every specialist handoff/);
});

test('DAB is mandatory and custom servers are not the default data API', () => {
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy })) {
    assert.match(text, /DAB/, `${name}: DAB is missing`);
    assert.match(text, /authentication, orchestration, or domain behavior/, `${name}: server boundary`);
    assert.match(text, /(not a default|not an automatic|never an automatic|not a default direct-SQL|not a default CRUD)/, `${name}: no automatic custom CRUD`);
  }
  assert.match(skill, /azuresql-db-dab/);
  assert.match(skill, /dab-rest-and-graphql/);
  assert.match(skill, /No suitable permitted engine or DAB runtime means a specific blocker/);
  assert.match(constitution, /transaction-safe stored procedures/);
  assert.match(constitution, /ordinary table writes cannot bypass the invariant/);
  assert.match(policy, /no generic write permission may bypass/);
});

test('the free-topology gate covers the entire deployable application', () => {
  const gate = constitution.split('## Complete free-topology gate\n')[1]?.split('\n## ')[0];
  assert.ok(gate);
  for (const component of [
    'Frontend and any custom server',
    'DAB runtime',
    'SQL',
    'Authentication/authorization',
    'Build/publication',
    'Supporting resources',
  ]) {
    assert.ok(gate.includes(`| ${component} |`), `Missing topology component: ${component}`);
  }
  assert.match(gate, /actual subscription\/region/);
  assert.match(gate, /runtime packaging/);
  assert.match(gate, /Unverified eligibility or a required uncapped meter fails/);
  assert.match(gate, /retired Static Web Apps database connections/);
  assert.match(gate, /Azure SQL Basic is paid/);
});

test('free SKUs are distinguished from allowances and quota-stop behavior is durable', () => {
  for (const label of ['free SKU', 'free offer with enforced quota stop', 'metered allowance', 'paid']) {
    assert.ok(constitution.includes(`**${label}**`));
  }
  for (const [name, text] of Object.entries({ constitution, brief, policy })) {
    assert.match(text, /useFreeLimit: true/, `${name}: SQL free-offer flag`);
    assert.match(text, /freeLimitExhaustionBehavior: AutoPause/, `${name}: SQL quota stop`);
    assert.match(text, /idle.*auto-pause/i, `${name}: distinguish idle auto-pause`);
    assert.match(text, /Trials|trials/, `${name}: distinguish trials`);
    assert.match(text, /credits/, `${name}: distinguish credits`);
  }
  assert.match(constitution, /not `BillOverUsage`/);
  assert.match(constitution, /budget alerts are not spending caps/);
});

test('a free incompatibility stops cloud work without weakening the app', () => {
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy })) {
    assert.match(text, /stop cloud work/i, `${name}: missing stop gate`);
    assert.match(text, /local DAB app/, `${name}: preserve the local app`);
    assert.match(text, /paid (alternatives|options)/i, `${name}: separate paid choices`);
    assert.match(text, /explicit (user )?approval/i, `${name}: paid approval required`);
  }
  assert.match(skill, /Do not silently remove authorization, SQL invariants, or DAB/);
  assert.match(constitution, /Do not weaken DAB, authorization, or SQL invariants/);
  assert.match(policy, /Never drop DAB, SQL rules, or authorization/);
});

test('acceptance requires observed DAB requests, direct authorization, and SQL enforcement', () => {
  assert.match(skill, /actual request route and corresponding DAB runtime request\/log evidence/);
  assert.match(skill, /DAB directly as well as through the UI\/custom server/);
  assert.match(skill, /denied operation and an allowed positive control/);
  assert.match(skill, /forged-role/);
  assert.match(skill, /concurrent conflicts/);
  assert.match(skill, /SQL rejects them atomically with no partial change/);
  assert.match(skill, /unused process is not proof/);
  assert.match(policy, /request\/runtime evidence/);
  assert.match(brief, /concurrent requests rejected atomically/);
  assert.match(design, /real DAB requests backed by SQL/);
});

test('cloud acceptance reads actual settings instead of trusting estimates or templates', () => {
  assert.match(skill, /Read actual resource settings back from Azure/);
  assert.match(skill, /every hosting\/supporting SKU and overage setting/);
  assert.match(skill, /not just a portal estimate or deployment template/);
  assert.match(skill, /mismatch as failed acceptance/);
  assert.match(constitution, /each SKU, SQL free-limit flags, and every supporting meter/);
  assert.match(policy, /read back actual SKUs, SQL free-limit flags, and supporting resource settings/);
  assert.match(brief, /read back actual SKUs, SQL free-limit flags, supporting meters/);
});

test('Rayfin alignment no longer imposes a direct-SQL Express architecture', () => {
  assert.match(alignment, /DAB configuration/);
  assert.match(alignment, /packages\/server` only for necessary custom/);
  assert.match(alignment, /do not prescribe a paid host, a mandatory Express server/);
  assert.doesNotMatch(constitution, /Server-side `mssql`, parameterized queries/);
  assert.doesNotMatch(brief, /Express, server-side `mssql`/);
  assert.doesNotMatch(readme, /with server-side `mssql` access/);
});

test('the product plan agrees with the shipped free-first DAB profile', () => {
  assert.match(plan, /intent: poc/);
  assert.match(plan, /costPreference: zero-azure-spend/);
  assert.match(plan, /React\/DAB\/Azure SQL PoC profile/);
  assert.match(plan, /no automatic Express-to-SQL CRUD/);
  assert.match(plan, /actual installed manifests and skill bytes/);
  assert.doesNotMatch(plan, /Server-side, parameterized access using `mssql`/);
  assert.doesNotMatch(plan, /workflow across React, Express, and SQL/);
});
