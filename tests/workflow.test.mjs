import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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

async function readAttribution() {
  const relative = 'skills/sql-apps/references/deployment-attribution.md';
  assert.ok(existsSync(new URL(relative, root)), 'Missing bundled deployment attribution reference');
  return read(relative);
}

test('PoC free-first defaults preserve explicit strict-zero choices', () => {
  assert.ok(policy, 'The copied project policy must exist');
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy, readme })) {
    assert.match(text, /intent: poc/, `${name}: missing default intent`);
    assert.match(text, /costPreference: free-first/, `${name}: missing default preference`);
    assert.match(text, /zero-azure-spend/, `${name}: missing explicit strict-zero option`);
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

test('the cost review covers the entire deployable application', () => {
  const gate = constitution.split('## Complete topology and cost review\n')[1]?.split('\n## ')[0];
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
  assert.match(gate, /strict zero-spend/);
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

test('unapproved cloud writes stop without ending safe investigation', () => {
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy })) {
    assert.match(text, /unapproved cloud writes/i, `${name}: missing write gate`);
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
  assert.match(plan, /costPreference: free-first/);
  assert.match(plan, /React\/DAB\/Azure SQL PoC profile/);
  assert.match(plan, /no automatic Express-to-SQL CRUD/);
  assert.match(plan, /actual installed manifests and skill bytes/);
  assert.doesNotMatch(plan, /Server-side, parameterized access using `mssql`/);
  assert.doesNotMatch(plan, /workflow across React, Express, and SQL/);
});

test('local delivery includes deployment-shaped packaging without provisioning', () => {
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy })) {
    for (const requirement of ['deployment-ready', 'pinned DAB', 'portable configuration', 'authentication', 'packaging']) {
      assert.ok(text.includes(requirement), `${name}: missing readiness requirement ${requirement}`);
    }
  }
  assert.ok(skill.includes('./references/deployment.md'));
});

test('deployment recovery is bounded and scoped decisions survive resume', async () => {
  const deployment = await read('skills/sql-apps/references/deployment.md').catch((error) => {
    assert.fail(`Missing deployment guidance: ${error.message}`);
  });
  for (const category of ['confirmed incompatibility', 'missing evidence', 'recoverable tooling failure']) {
    assert.ok(deployment.includes(category), `Missing finding category: ${category}`);
  }
  for (const requirement of ['one retry', 'one alternative', 'B1', 'SQL-free', 'post-create readback',
    'not guaranteed cost-free', 'deployed workflow', 'No exercised recipe']) {
    assert.ok(deployment.includes(requirement), `Missing safe-progress requirement: ${requirement}`);
  }
  assert.match(deployment, /strict zero-spend forbids an experiment with unresolved charge exposure/);
  assert.match(deployment, /check whether a timed-out write already took effect before retrying/);
  assert.match(deployment, /separately approved isolated provisioning attempt/);
  assert.match(deployment, /Evaluate the deployed runtime artifact, not the source language/);
  assert.match(deployment, /Retest when a pinned component or topology changes/);
  for (const [name, text] of Object.entries({ skill, policy })) {
    assert.match(text, /routine.*local build\/test/i, name);
    assert.match(text, /cloud writes, spend changes, access changes, and destructive actions/, name);
    assert.match(text, /accepted decisions/, name);
  }
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy, readme, plan })) {
    assert.doesNotMatch(text, /stop cloud work/i, `${name}: uncertainty must not halt all safe work`);
  }
});

test('deployment attribution uses one compact version tag and a final naming suffix', async () => {
  const attribution = await readAttribution();
  const metadata = attribution.split('## Attribution metadata\n')[1]?.split('\n## ')[0];
  assert.ok(metadata, 'Missing default attribution metadata contract');
  const tags = [...metadata.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
  assert.deepEqual(tags, ['sqlapps-version']);
  assert.match(metadata, /actual plugin manifest.*`plugin\.json`/);
  assert.match(metadata, /not the application or DAB version/);
  assert.match(attribution, /resource-name suffix is `sqlapps`/);
  assert.match(attribution, /uniqueness token before the final `sqlapps` suffix/);
  const examples = [...attribution.matchAll(/^\| [^|\n]+ \| `([^`]+)` \|$/gm)]
    .map((match) => match[1]);
  assert.deepEqual(examples, [
    'rg-demo-dev-sqlapps', 'app-demo-dev-a1b2c3-sqlapps',
    'sql-demo-dev-a1b2c3-sqlapps', 'stdemodeva1b2c3sqlapps',
  ]);
  for (const name of examples) {
    assert.ok(name.endsWith('sqlapps'), `Attribution must be the final suffix: ${name}`);
  }
  assert.match(examples[3], /^[a-z0-9]{3,24}$/);
});

test('deployment attribution is metadata only, not active-usage telemetry', async () => {
  const attribution = await readAttribution();
  assert.match(attribution, /No runtime events, SDK instrumentation, callbacks, collectors, or new monitoring resources/);
  assert.match(attribution, /Do not query customer data or metrics/);
  assert.match(attribution, /does not grant Microsoft.*access/);
  assert.match(attribution, /not active application usage/);
  assert.match(attribution, /unique people, unique applications, or deployment-event counts/);
  assert.match(attribution, /Local-only delivery requires no Azure sign-in/);
  assert.ok(policy.includes('Keep names and tags free of personal, sensitive, or confidential information'),
    'The durable policy must preserve the metadata privacy boundary without the installed plugin');
  assert.ok(policy.includes('resource footprint, not active usage'),
    'The durable policy must not imply active-usage measurement');
});

test('attribution survives the brief durable policy and Azure handoffs', () => {
  assert.ok(skill.includes('./references/deployment-attribution.md'));
  assert.ok(constitution.includes('./deployment-attribution.md'));
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy })) {
    assert.ok(text.includes('sqlapps-version'), `${name}: missing attribution tag`);
    assert.match(text, /sqlapps.{0,30}suffix/, `${name}: missing naming suffix`);
  }
  for (const field of ['## Deployment attribution', '- sqlapps-version:', '- Resource naming:', '- Exceptions:']) {
    assert.ok(brief.includes(field), `Missing durable attribution field: ${field}`);
  }
  const handoff = skill.match(/\*\*Every specialist handoff\*\*([^\n]+)/)?.[1];
  for (const field of ['sqlapps-version', 'sqlapps', 'suffix', 'exceptions']) {
    assert.ok(handoff?.includes(field), `Handoff omits attribution: ${field}`);
  }
  assert.match(policy, /Every Azure handoff must explicitly carry/);
  const resume = skill.split('## Resume or change\n')[1]?.split('\n## ')[0];
  assert.ok(resume);
  assert.match(resume, /Preserve the recorded `sqlapps-version`/);
  assert.match(resume, /newer installed plugin must not relabel/);
});

test('attribution preserves existing resources and explicit overrides', async () => {
  const attribution = await readAttribution();
  assert.match(attribution, /case-insensitively/);
  assert.match(attribution, /conflicting values or tag-limit exhaustion/);
  assert.match(attribution, /Customer naming requirements take precedence/);
  assert.match(attribution, /child names such as `default`/);
  assert.match(attribution, /Resource-group tags are not inherited/);
  assert.match(attribution, /each newly created tag-capable resource/);
  for (const [name, text] of Object.entries({ constitution, policy })) {
    assert.match(text, /Never rename or replace existing resources for attribution/, name);
    assert.match(text, /Preserve customer tags/, name);
    assert.match(text, /overrides.*exceptions/, name);
  }
});

test('attribution verification reads deployed metadata without adding telemetry', () => {
  assert.match(skill, /Read back actual resource tags and names/);
  assert.match(policy, /read back actual resource tags and names/);
  assert.match(brief, /actual resource tags and names/);
  assert.match(policy, /No runtime telemetry or data access for attribution/);
  assert.match(policy, /Local-only delivery needs no Azure attribution checks/);
  assert.match(skill, /Report attribution mismatches/);
  assert.match(skill, /approved exceptions as exceptions/);
});

test('public guidance discloses attribution without promising usage tracking', () => {
  for (const [name, text] of Object.entries({ readme, plan })) {
    assert.ok(text.includes('sqlapps-version'), `${name}: missing public attribution disclosure`);
    assert.match(text, /sqlapps.{0,30}suffix/, `${name}: missing naming suffix disclosure`);
    assert.match(text, /not active usage/, `${name}: resource footprint is not active usage`);
  }
  assert.ok(readme.includes('./skills/sql-apps/references/deployment-attribution.md'));
  assert.match(readme, /No runtime instrumentation, new monitoring resources, or direct data access/);
  assert.match(readme, /does not grant Microsoft additional visibility/);
});

test('release acceptance distinguishes attribution scenarios from static checks', async () => {
  const releasing = await read('docs/reference/releasing.md');
  assert.match(releasing, /Deployment attribution acceptance \(unverified\)/);
  for (const requirement of [
    'sqlapps-version', 'sqlapps', 'suffix', 'rendered infrastructure', 'unrelated customer tag',
    'existing/shared resources', 'fixed child names', 'naming override',
    'read back actual resource tags and names', 'Local-only',
  ]) {
    assert.ok(releasing.toLowerCase().includes(requirement.toLowerCase()), `Missing attribution acceptance case: ${requirement}`);
  }
  assert.match(releasing, /Static checks do not prove/);
});

test('attribution guidance consistently uses the compact version tag', async () => {
  const attribution = await readAttribution();
  const releasing = await read('docs/reference/releasing.md');
  for (const [name, text] of Object.entries({ attribution, skill, constitution, brief, policy, readme, plan, releasing })) {
    assert.ok(text.includes('sqlapps-version'), `${name}: missing canonical version tag`);
    assert.doesNotMatch(text, /sql-apps-version/, `${name}: obsolete attribution tag`);
  }
});
