import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, root), 'utf8');

test('DAB customization guidance is routed only for changed DAB contracts and preserves default header denial', async () => {
  const [skill, guide] = await Promise.all([
    read('skills/sql-apps/SKILL.md'),
    read('skills/sql-apps/references/dab-customization.md'),
  ]);
  assert.match(skill, /\[DAB customization\]\(\.\/references\/dab-customization\.md\)/);
  assert.match(guide, /baseline\.json/);
  assert.match(guide, /source-derived.*not live-verified/);
  assert.match(guide, /X-MS-API-ROLE/);
  assert.match(guide, /Keep the default proxy unchanged/);
  assert.match(guide, /DAB must validate role membership/);
  assert.match(guide, /SESSION_CONTEXT/);
  assert.match(guide, /DatabaseOperationFailed/);
  assert.match(guide, /Do not assume.*THROW.*409/);
  assert.match(guide, /direct and proxied/);
});

test('local acceptance stays outside cloud policy and tests business rules with a meaningful race', async () => {
  const [skill, starter] = await Promise.all([
    read('skills/sql-apps/SKILL.md'),
    read('skills/sql-apps/templates/starter/README.md'),
  ]);
  assert.match(skill, /Adapt acceptance to the actual business contract/);
  assert.match(skill, /\[acceptance checklist\]\(\.\/templates\/starter\/README\.md#adapting-acceptance-to-the-app\)/);
  const verification = skill.split('## 4. Verify and hand over')[1].split('## 5. Deploy only when requested')[0];
  assert.doesNotMatch(verification, /references\/deployment\.md/);
  assert.match(starter, /The bundled acceptance script tests the Items sample/);
  assert.match(starter, /### Adapting acceptance to the app/);
  assert.match(starter, /half-open intervals/);
  assert.match(starter, /every competing request conflicts/);
  assert.match(starter, /same batch succeeds/);
  assert.match(starter, /staff\/member/);
  assert.match(starter, /not accept any error as a valid business rejection/);
  assert.match(starter, /Local delivery can still require separately approved provider changes/);
});

test('blocked-backend visual review stays fixture-only and cannot satisfy authenticated acceptance', async () => {
  const design = await read('skills/sql-apps/references/app-design.md');
  assert.match(design, /### When SQL or identity is blocked/);
  assert.match(design, /fixture-only visual review/);
  assert.match(design, /not authentication, authorization or persistence/);
  assert.match(design, /reachable primary\/destructive actions/);
  assert.match(design, /actual viewport/);
  assert.match(design, /Remove test\s+interception/);
});

test('cloud intake discovers blockers early without making Azure a local prerequisite', async () => {
  const [skill, prerequisites, policy] = await Promise.all([
    read('skills/sql-apps/SKILL.md'),
    read('skills/sql-apps/references/prerequisites.md'),
    read('skills/sql-apps/references/deployment.md'),
  ]);
  assert.match(skill, /When cloud delivery is requested at intake/);
  assert.match(skill, /Do not require Azure discovery for local-only work/);
  assert.match(skill, /alongside safe local implementation/);
  assert.match(prerequisites, /az version/);
  assert.match(prerequisites, /az account show --query/);
  assert.match(prerequisites, /Check each exit status/);
  assert.match(prerequisites, /not an expired login/);
  assert.match(prerequisites, /Resume discovery after an approved repair/);
  assert.match(prerequisites, /Discovery authorizes no provisioning/);
  assert.match(policy, /Preflight does not sign in, contact Azure/);
  assert.match(policy, /Discovery failure is a tooling blocker, not deployment failure/);
  assert.match(policy, /tenant identity writes separately from hosting provisioning/);
});

test('delivery separates acceptance targets without mandatory timing or feedback bookkeeping', async () => {
  const [brief, starter, skill, policy] = await Promise.all([
    read('skills/sql-apps/templates/app-brief.md'),
    read('skills/sql-apps/templates/starter/README.md'),
    read('skills/sql-apps/SKILL.md'),
    read('skills/sql-apps/references/deployment.md'),
  ]);
  assert.match(brief, /Acceptance targets: <public-local/);
  assert.match(brief, /full authenticated-local/);
  assert.match(brief, /verified, blocked, unverified or not requested/);
  assert.match(starter, /Separate public-local,\s+full authenticated-local and cloud results/);
  assert.match(starter, /source\/dirty-state and artifact identities/);
  assert.match(starter, /Missing checks remain unverified/);
  assert.match(policy, /anonymous success never proves owner access/);
  for (const document of [brief, starter, skill, policy]) {
    assert.doesNotMatch(document, /milestones-and-timing|approval\/blocker intervals|one-line feedback/);
  }
});

test('deployment policy owns implemented version tagging without a separate branding guide', async () => {
  const [policy, skill] = await Promise.all([
    read('skills/sql-apps/references/deployment.md'),
    read('skills/sql-apps/SKILL.md'),
  ]);
  assert.match(policy, /### Version tags and names/);
  assert.match(policy, /sqlapps-version/);
  assert.match(policy, /\[plugin\.json\]\(\.\.\/\.\.\/\.\.\/plugin\.json\)/);
  assert.match(policy, /group tags are not inherited/);
  assert.match(policy, /compare keys case-insensitively/);
  assert.match(policy, /Tagging existing\/shared resources requires explicit scope/);
  assert.match(policy, /Verify actual tags during approved readback/);
  assert.match(policy, /never rename\/recreate resources for branding/);
  assert.doesNotMatch(skill, /deployment-attribution\.md/);
});

test('custom migration guidance checks session options without rewriting applied migrations', async () => {
  const guide = await read('skills/sql-apps/templates/starter/deployment-migrations.md');
  for (const option of ['ANSI_NULLS', 'ANSI_PADDING', 'ANSI_WARNINGS', 'ARITHABORT',
    'CONCAT_NULL_YIELDS_NULL', 'QUOTED_IDENTIFIER']) {
    assert.ok(guide.includes(`SET ${option} ON;`), `Missing session option: ${option}`);
  }
  assert.match(guide, /SET NUMERIC_ROUNDABORT OFF;/);
  assert.match(guide, /actual selected\s+migration runner and API/);
  assert.match(guide, /runtime write-session/);
  assert.match(guide, /Do not\s+change shipped or applied checksums/);
});

test('readiness guidance retains dependency risks and component-specific warning evidence', async () => {
  const [skill, policy] = await Promise.all([
    read('skills/sql-apps/SKILL.md'),
    read('skills/sql-apps/references/deployment.md'),
  ]);
  assert.match(skill, /locked production dependency advisories/);
  assert.match(skill, /Do not silently upgrade dependencies or accept residual risk/);
  assert.match(policy, /passing HTTP\/SQL\s+checks does not clear a storage warning/);
  assert.match(policy, /Do not\s+suppress warnings/);
});

test('starter lockfile pins only delivered workspaces and portable dependency integrity', async () => {
  const prefix = 'skills/sql-apps/templates/starter/';
  const lock = JSON.parse(await read(prefix + 'package-lock.json'));
  assert.equal(lock.lockfileVersion, 3);
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (!location.startsWith('node_modules/') || entry.link) continue;
    assert.equal(entry.resolved, undefined, 'Do not bind to a maintainer registry');
    let owner = location;
    while (lock.packages[owner].inBundle) {
      const boundary = owner.lastIndexOf('/node_modules/');
      assert.ok(boundary > 0);
      owner = owner.slice(0, boundary);
    }
    assert.match(lock.packages[owner].integrity, /^sha(1|256|384|512)-/);
  }
  for (const location of ['', 'packages/frontend', 'packages/data', 'packages/server', 'packages/shared']) {
    const manifest = JSON.parse(await read(prefix + (location ? location + '/' : '') + 'package.json'));
    for (const section of ['dependencies', 'devDependencies']) {
      assert.deepEqual(manifest[section], lock.packages[location][section]);
      for (const [name, version] of Object.entries(manifest[section] || {})) {
        if (name.startsWith('@app/')) continue;
        assert.match(version, /^\d+\.\d+\.\d+$/);
        assert.equal(lock.packages[`node_modules/${name}`].version, version);
      }
    }
  }
});

test('default runtime pins container images, denies anonymous data and enforces SQL invariants', async () => {
  const prefix = 'skills/sql-apps/templates/starter/';
  const baseline = JSON.parse(await read(prefix + 'baseline.json'));
  const compose = await read(prefix + 'compose.yml') + await read(prefix + 'compose.sql.yml');
  const config = JSON.parse(await read(prefix + 'packages/data/dab-config.json'));
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
  for (const statement of ["SESSION_CONTEXT(N'oid')", 'UNIQUE (OwnerId, Label)',
    'BEGIN TRANSACTION', 'COMMIT TRANSACTION']) assert.ok(migration.includes(statement));
  assert.match(await read(prefix + 'packages/data/permissions.sql'), /DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo/);
});
