import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = async (path) => (await readFile(new URL(path, root), 'utf8')).replace(/\r\n/g, '\n');
const skill = await read('skills/sql-apps/SKILL.md');
const constitution = await read('skills/sql-apps/references/constitution.md');
const prerequisites = await read('skills/sql-apps/references/prerequisites.md');
const deployment = await read('skills/sql-apps/references/deployment.md');
const brief = await read('skills/sql-apps/templates/app-brief.md');
const alignment = await read('skills/sql-apps/references/rayfin-alignment.md');
const design = await read('skills/sql-apps/references/app-design.md');
const readme = await read('README.md');
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
  for (const [name, text] of Object.entries({ skill, constitution })) {
    assert.match(text, /intent: poc/, `${name}: missing default intent`);
    assert.match(text, /costPreference: free-first/, `${name}: missing default preference`);
    assert.match(text, /zero-azure-spend/, `${name}: missing explicit strict-zero option`);
    assert.match(text, /availability, scale, (or|and) compliance/i, `${name}: explicit production boundary`);
    assert.match(text, /deploy.{0,100}(not|does not)/i, `${name}: deploy is not spend/production consent`);
  }
  assert.match(policy, /intent: poc/);
  assert.match(policy, /costPreference: free-first/);
  assert.match(policy, /zero-azure-spend/);
  assert.match(brief, /- intent: poc/);
  assert.match(brief, /- costPreference: free-first/);
  assert.match(brief, /zero-azure-spend/);
});

test('every specialist receives explicit architecture and cost constraints', () => {
  const handoff = skill.match(/\*\*Every specialist handoff\*\*([^\n]+)/)?.[1];
  assert.ok(handoff);
  for (const requirement of ['intent', 'costPreference', 'Azure SQL target', 'compatibility gaps', 'DAB', 'SQL invariants', 'topology', 'acceptance']) {
    assert.ok(handoff.includes(requirement), `Handoff omits ${requirement}`);
  }
  assert.match(handoff, /link alone is insufficient/);
  assert.match(handoff, /stop and reconcile/);
  assert.match(policy, /carry current cost, topology, security, and acceptance choices into specialist handoffs/);
});

test('DAB is default, explicit Functions is allowed, and Express is not the default data API', () => {
  assert.match(skill, /DAB application data APIs/);
  assert.match(constitution, /Node\.js\/Express only for necessary authentication, orchestration, or domain behavior/);
  assert.match(skill, /azuresql-db-dab/);
  assert.match(skill, /dab-rest-and-graphql/);
  assert.match(skill, /continue useful UI, schema, or scaffolding work/i);
  assert.match(prerequisites, /persistence and end-to-end checks stay incomplete/);
  assert.match(prerequisites, /Do not substitute mock persistence/);
  assert.match(constitution, /transaction-safe stored procedures/);
  assert.match(constitution, /ordinary table writes cannot bypass the invariant/);
  assert.match(policy, /no permission path that bypasses them/);
  assert.match(constitution, /DAB is the default runtime, not a requirement for the explicit Functions profile/);
  assert.match(skill, /static-web-apps\/functions/);
  assert.match(policy, /Static Web Apps\/Functions/);
});

test('missing SQL/DAB guidance allows scaffold work without false persistence', () => {
  assert.match(skill, /continue useful UI, schema, or scaffolding work/i);
  assert.match(prerequisites, /let the user decide/);
  assert.match(prerequisites, /persistence and end-to-end checks stay incomplete/);
  assert.match(prerequisites, /Do not substitute mock persistence/);
  assert.doesNotMatch(skill, /pause all application changes|stop app creation/i);
});

test('onboarding discovers first, groups missing choices, and keeps cloud opt-in', () => {
  const boundary = skill.split('## Establish the boundary\n')[1]?.split('\n## ')[0];
  assert.ok(boundary);
  assert.match(boundary, /Discover.*before asking setup questions/);
  assert.match(boundary, /one grouped routing question only for unknown choices/);
  assert.match(boundary, /Reuse known answers; defer detailed questions until needed/);
  const routes = prerequisites.split('## Choose the shortest setup path\n')[1]?.split('\n## ')[0];
  assert.ok(routes);
  for (const [situation, action] of [
    ['Working Azure SQL/DAB and a recorded target', /Reuse them; do not repeat onboarding/],
    ['Target unknown', /Offer local or cloud; default to local/],
    ['Cloud selected', /subscription exists only if unknown/],
    ['Azure subscription exists, target undecided', /ownership is not cloud intent or provisioning approval/],
    ['Local selected, Azure SQL container unavailable', /Private Preview signup.*explicitly selected Azure SQL Database cloud access.*never switch to cloud automatically/],
    ['Neither Azure SQL target is ready, or DAB is missing', /continue useful UI\/schema\/scaffolding and mark integration incomplete/],
    ['Existing on-premises database', /outside this profile.*do not reuse it as a fallback.*without explicit scope/],
  ]) {
    const row = routes.split('\n').find((line) => line.startsWith(`| ${situation} |`));
    assert.ok(row, `Missing routing case: ${situation}`);
    assert.match(row, action, situation);
  }
  assert.match(routes, /Host permissions, interactive sign-in, license acceptance, and cloud\/access\/destructive approvals still apply/);
});

test('database targets stay Azure SQL-only without creating on-premises debt', async () => {
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy })) {
    assert.match(text, /local Azure SQL (Database )?container/, name);
    assert.match(text, /Azure SQL (Database )?cloud/, name);
    assert.match(text, /(No|Never substitute) SQL Server Express.*on-premises/, name);
    assert.doesNotMatch(text, /sql-server-express\.md/, name);
  }
  assert.match(prerequisites, /SQL Server Express and other on-premises engines are not fallback paths/);
  assert.match(prerequisites, /Cloud selection is not approval to sign in, create resources, spend, or change access/);
  assert.match(policy, /Never substitute mocks or another database/);
  assert.match(policy, /Before moving to cloud.*actual cloud target/);
  assert.match(brief, /Database: <local Azure SQL container or Azure SQL Database cloud/);
  const resume = skill.split('## Resume or change\n')[1]?.split('\n## ')[0];
  assert.match(resume, /Preserve supported Azure SQL target and setup decisions/);
  assert.match(resume, /older project records an on-premises fallback.*obtain migration scope.*never install or extend/);
  assert.match(resume, /Before moving from the container to cloud.*actual cloud target/);
  assert.ok(!existsSync(new URL('skills/sql-apps/references/sql-server-express.md', root)));
  for (const relative of ['README.md', 'docs/installation.md', 'docs/reference/releasing.md']) {
    const document = await read(relative);
    assert.doesNotMatch(document, /sql-server-express\.md|disposable Windows Express|Express selected/);
  }
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
  assert.match(constitution, /useFreeLimit: true/);
  assert.match(constitution, /freeLimitExhaustionBehavior: AutoPause/);
  assert.match(constitution, /idle.*auto-pause/i);
  assert.match(constitution, /Trials|trials/);
  assert.match(constitution, /credits/);
  assert.match(constitution, /not `BillOverUsage`/);
  assert.match(constitution, /budget alerts are not spending caps/);
});

test('unapproved cloud writes stop without ending safe investigation', () => {
  for (const [name, text] of Object.entries({ skill, constitution, deployment })) {
    assert.match(text, /unapproved cloud writes/i, `${name}: missing write gate`);
  }
  assert.match(skill, /Do not silently remove authorization, SQL invariants, or the selected API/);
  assert.match(constitution, /Do not weaken authorization or SQL invariants/);
  assert.match(policy, /obtain explicit approval for resource writes, spend or access changes, and destructive actions/);
});

test('acceptance requires observed DAB requests, direct authorization, and SQL enforcement', () => {
  assert.match(skill, /actual request route and corresponding API runtime request\/log evidence/);
  assert.match(skill, /DAB directly as well as through the UI\/custom server/);
  assert.match(skill, /denied operation and an allowed positive control/);
  assert.match(skill, /forged-role/);
  assert.match(skill, /concurrent conflicts/);
  assert.match(skill, /SQL rejects them atomically with no partial change/);
  assert.match(skill, /unused process is not proof/);
  assert.match(constitution, /direct DAB authorization denials/);
  assert.match(deployment, /direct DAB negative\/positive authorization checks/);
  assert.match(brief, /Workflows, data, and access/);
  assert.match(design, /real DAB requests backed by SQL/);
});

test('cloud acceptance reads actual settings instead of trusting estimates or templates', () => {
  assert.match(skill, /Read actual resource settings back from Azure/);
  assert.match(skill, /every hosting\/supporting SKU and overage setting/);
  assert.match(skill, /not just a portal estimate or deployment template/);
  assert.match(skill, /mismatch as failed acceptance/);
  assert.match(constitution, /each SKU, SQL free-limit flags, and every supporting meter/);
  assert.match(deployment, /resource settings\/attribution readback/);
  assert.match(brief, /For requested Azure work, record the approved target, complete topology\/cost boundary/);
});

test('Rayfin alignment no longer imposes a direct-SQL Express architecture', () => {
  assert.match(alignment, /DAB configuration/);
  assert.match(alignment, /packages\/server` only for necessary custom/);
  assert.match(alignment, /do not prescribe a paid host, a mandatory Express server/);
  assert.doesNotMatch(constitution, /Server-side `mssql`, parameterized queries/);
  assert.doesNotMatch(brief, /Express, server-side `mssql`/);
  assert.doesNotMatch(readme, /with server-side `mssql` access/);
});

test('local delivery includes deployment-shaped packaging without provisioning', () => {
  for (const [name, text] of Object.entries({ skill, constitution, deployment })) {
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
  assert.match(skill, /accepted decisions/);
  assert.match(policy, /Preserve `app-brief\.md`, existing behavior, and accepted decisions/);
  assert.match(deployment, /Stop unapproved cloud writes, not safe engineering work/);
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
  assert.match(attribution, /does not grant Microsoft additional access or send SQL Apps a usage report/);
  assert.match(attribution, /not active application usage/);
  assert.match(attribution, /unique people, unique applications, or deployment-event counts/);
  assert.match(attribution, /Local-only delivery requires no Azure sign-in/);
  assert.match(policy, /Never relabel or rename existing resources for attribution/);
});

test('attribution survives the brief durable policy and Azure handoffs', () => {
  assert.ok(skill.includes('./references/deployment-attribution.md'));
  assert.ok(constitution.includes('./deployment-attribution.md'));
  for (const [name, text] of Object.entries({ skill, constitution, brief, policy })) {
    assert.ok(text.includes('sqlapps-version'), `${name}: missing attribution tag`);
  }
  assert.match(brief, /Record the adopted `sqlapps-version` and naming exceptions/);
  const handoff = skill.match(/\*\*Every specialist handoff\*\*([^\n]+)/)?.[1];
  for (const field of ['sqlapps-version', 'sqlapps', 'suffix', 'exceptions']) {
    assert.ok(handoff?.includes(field), `Handoff omits attribution: ${field}`);
  }
  assert.match(policy, /For Azure work, preserve recorded `sqlapps-version`/);
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
  assert.match(policy, /existing resource names\/tags/);
});

test('attribution verification reads deployed metadata without adding telemetry', () => {
  assert.match(skill, /Read back actual resource tags and names/);
  assert.match(skill, /Report attribution mismatches/);
  assert.match(skill, /approved exceptions as exceptions/);
});

test('README links to canonical setup, policy, and verification guidance', () => {
  const targets = [...readme.matchAll(/\[[^\]]+\]\((\.\/[^)]+)\)/g)].map((match) => match[1]);
  for (const target of [
    './docs/installation.md',
    './skills/sql-apps/references/constitution.md',
    './skills/sql-apps/references/deployment.md',
    './skills/sql-apps/references/deployment-attribution.md',
    './docs/reference/releasing.md#verification-status',
  ]) {
    assert.ok(targets.includes(target), `README: missing reference link ${target}`);
    assert.ok(existsSync(new URL(target.split('#')[0], root)), `Missing reference file: ${target}`);
  }
});

test('reservation user prompt stays separate from runtime acceptance', async () => {
  const releasing = await read('docs/reference/releasing.md');
  const prompt = releasing.split('**User prompt**\n\n')[1]?.split('\n\n**Acceptance checks')[0];
  assert.ok(prompt, 'Missing realistic reservation-app user prompt');
  assert.match(prompt, /equipment reservation app/);
  assert.doesNotMatch(prompt, /direct DAB|concurrent|packaging|restart|runtime evidence/i);
  const acceptance = releasing.split('**Acceptance checks (separate from the prompt)**\n\n')[1]?.split('\n\n**2\\. Change')[0];
  assert.ok(acceptance, 'Missing separate runtime acceptance checks');
  assert.match(acceptance, /allowed and denied direct DAB requests/);
  assert.match(acceptance, /overlapping concurrent reservations/);
  assert.match(acceptance, /same user prompt without SQL Apps/);
  assert.match(acceptance, /persistence and end-to-end acceptance as incomplete/);
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
  for (const [name, text] of Object.entries({ attribution, skill, constitution, brief, policy, releasing })) {
    assert.ok(text.includes('sqlapps-version'), `${name}: missing canonical version tag`);
    assert.doesNotMatch(text, /sql-apps-version/, `${name}: obsolete attribution tag`);
  }
  assert.doesNotMatch(readme, /sql-apps-version/, 'README: obsolete attribution tag');
});

test('starter is wired into initial scoping and proves a thin slice before expansion', async () => {
  const starterReadme = await read('skills/sql-apps/templates/starter/README.md');
  const recipe = await read('skills/sql-apps/templates/starter/deployment.md');
  assert.match(skill, /\.\/templates\/starter\/README\.md/);
  assert.match(skill, /Never execute it in the plugin or overwrite an existing app/);
  assert.match(skill, /before expanding workflows/);
  assert.match(brief, /Starter\/identity\/routing/);
  for (const text of [deployment, starterReadme, recipe]) {
    assert.match(text, /identity/i);
    assert.match(text, /routing/i);
    assert.match(text, /unverified|unproven|separate/i);
  }
  assert.match(starterReadme, /There is no synthetic login fallback/);
  assert.match(starterReadme, /wall time a labor measurement/);
  assert.match(recipe, /End-to-end cloud acceptance: incomplete\. Not permission to provision/);
});

test('starter pins its workspace and container baseline without anonymous data access', async () => {
  const prefix = 'skills/sql-apps/templates/starter/';
  const baseline = JSON.parse(await read(prefix + 'baseline.json'));
  const lock = JSON.parse(await read(prefix + 'package-lock.json'));
  const compose = await read(prefix + 'compose.yml');
  const config = JSON.parse(await read(prefix + 'packages/data/dab-config.json'));
  assert.equal(baseline.version, '0.1.0');
  assert.equal(lock.lockfileVersion, 3);
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (!location.startsWith('node_modules/') || entry.link) continue;
    assert.equal(entry.resolved, undefined, 'Do not bind the starter lock to a maintainer-specific registry');
    let owner = location;
    while (lock.packages[owner].inBundle) {
      const boundary = owner.lastIndexOf('/node_modules/');
      assert.ok(boundary > 0, `${location}: bundled dependency must have a parent package`);
      owner = owner.slice(0, boundary);
    }
    assert.match(lock.packages[owner].integrity, /^sha(1|256|384|512)-/,
      `${location} or its containing bundle must retain an npm-supported integrity pin`);
  }
  for (const location of ['', 'packages/frontend', 'packages/data', 'packages/server', 'packages/shared']) {
    const manifest = JSON.parse(await read(prefix + (location ? location + '/' : '') + 'package.json'));
    for (const section of ['dependencies', 'devDependencies']) {
      assert.deepEqual(manifest[section], lock.packages[location][section]);
      for (const [name, version] of Object.entries(manifest[section] || {})) {
        if (name.startsWith('@app/')) continue;
        assert.match(version, /^\d+\.\d+\.\d+$/, `${name} must be pinned`);
        assert.equal(lock.packages[`node_modules/${name}`].version, version);
      }
    }
  }
  for (const image of Object.values(baseline.images)) {
    assert.match(image, /@sha256:[a-f0-9]{64}$/);
    assert.ok(compose.includes(image));
  }
  assert.match(compose, /pull_policy: never/);
  assert.equal(config['data-source'].options['set-session-context'], true);
  assert.equal(config.runtime.host.authentication.provider, 'Custom');
  for (const entity of Object.values(config.entities)) {
    assert.ok(entity.permissions.every(permission => permission.role === 'authenticated'));
  }
  assert.equal(config.entities.Items.source.type, 'view');
  assert.equal(config.entities.CreateItem.source.type, 'stored-procedure');
  const migration = await read(prefix + 'packages/data/migrations/001-initial.sql');
  assert.match(migration, /SESSION_CONTEXT\(N'oid'\)/);
  assert.match(migration, /UNIQUE \(OwnerId, Label\)/);
  assert.match(migration, /BEGIN TRANSACTION/);
  assert.match(migration, /COMMIT TRANSACTION/);
  assert.match(await read(prefix + 'packages/data/permissions.sql'), /DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo/);
});
