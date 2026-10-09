import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readGuide, saveBrief, validateBrief } from '../scripts/guide.mjs';
import { initializeWorkspace } from '../src/workspace.mjs';

const brief = () => ({
  purpose: 'Track equipment loans',
  audience: 'Our equipment team',
  records: ['Equipment', 'Loans'],
  actions: ['Register equipment', 'Record a return'],
  capabilities: ['data'],
  nextChange: 'Add a due-date field',
});

async function fixture(t) {
  const home = await mkdtemp(join(tmpdir(), 'sql-apps-guide-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  for (const folder of ['src', 'sql', 'plugins/sql-apps']) await mkdir(join(home, folder), { recursive: true });
  await writeFile(join(home, 'package.json'), JSON.stringify({
    name: 'sql-apps', scripts: { local: 'node dist/src/local-cli.js' },
  }));
  await writeFile(join(home, 'application.json'), JSON.stringify({ name: 'fixture', selectedExamples: [] }));
  await writeFile(join(home, 'runtime-contract.json'), JSON.stringify({ version: 1, capabilities: ['local', 'setup-check'] }));
  for (const file of ['src/local-cli.ts', 'src/workspace.mjs', 'sql/database.sqlproj', 'plugins/sql-apps/plugin.json']) {
    await writeFile(join(home, file), '');
  }
  return home;
}

test('guide works before build and stays read-only without selecting an example or workspace', async t => {
  const home = await fixture(t);
  const before = await readdir(home);
  const report = await readGuide(home);
  assert.deepEqual(await readdir(home), before);
  assert.equal(report.brief, null);
  assert.equal(report.nextStage, 'describe');
  assert.equal(report.build.ready, false);
  assert.equal(report.workspace.selected, false);
  assert.equal(report.cloud.authorized, false);
  assert.equal(report.cost.phase, 'local-cost-awareness');
  assert.equal(report.cost.preference, 'zero-azure-spend');
  assert.equal(report.cost.spendingAuthorized, false);
  assert.deepEqual(report.application.selectedExamples, []);
  assert.deepEqual(report.stages.map(stage => stage.id), ['describe', 'run-locally', 'make-it-yours', 'share-optionally']);
});

test('guide persists decisions and reports evidence as historical, never current acceptance', async t => {
  const home = await fixture(t);
  const input = brief();
  input.checkpoint = { stage: 'run-locally', summary: 'Created and reloaded a loan', evidence: ['Browser create/reload passed; SQL row inspected'] };
  await saveBrief(home, input);
  const saved = await readFile(join(home, '.sql-apps', 'guide.json'), 'utf8');
  const report = await readGuide(home);
  assert.equal(await readFile(join(home, '.sql-apps', 'guide.json'), 'utf8'), saved);
  assert.deepEqual(report.brief, input);
  assert.equal(report.progress.status, 'reported-not-reverified');
  assert.equal(report.nextStage, 'make-it-yours');
  assert.equal(report.cloud.authorized, false);
  assert.equal(report.build.ready, false);
  assert.deepEqual(report.localServices, ['SQL', 'Data API', 'Browser/API']);
  assert.match(report.scope, /not.*live acceptance/i);
});

test('source changes invalidate reported progress and require local re-verification', async t => {
  const home = await fixture(t);
  const input = brief();
  input.checkpoint = { stage: 'make-it-yours', summary: 'Due date added', evidence: ['Browser validation and SQL persistence passed'] };
  await saveBrief(home, input);
  await writeFile(join(home, 'src/local-cli.ts'), 'changed');
  const report = await readGuide(home);
  assert.equal(report.progress.status, 'source-changed');
  assert.equal(report.nextStage, 'run-locally');
  assert.match(report.nextAction, /rebuild.*verify/i);
  assert.equal(report.brief.nextChange, input.nextChange);
});

test('guide records checkout-specific workspace selection without authorizing startup', async t => {
  const home = await fixture(t);
  await saveBrief(home, brief());
  await initializeWorkspace(home, 33000, async () => 'free');
  const report = await readGuide(home);
  assert.equal(report.workspace.selected, true);
  assert.equal(report.workspace.mode, 'isolated');
  assert.equal(report.workspace.origin, 'http://127.0.0.1:33000');
  assert.equal(report.nextStage, 'run-locally');
  assert.match(report.nextAction, /approval/i);
});

test('strict brief validation rejects unsupported choices, blank values and invented completion', () => {
  for (const input of [
    { ...brief(), deploy: true },
    { ...brief(), costPreference: 'unlimited-spend' },
    { ...brief(), purpose: ' ' },
    { ...brief(), records: [] },
    { ...brief(), records: ['x'.repeat(501)] },
    { ...brief(), capabilities: ['data', 'data'] },
    { ...brief(), capabilities: ['files'] },
    { ...brief(), capabilities: ['data', 'redis'] },
    { ...brief(), capabilities: ['data', 'background-jobs'] },
    { ...brief(), checkpoint: { stage: 'share-optionally', summary: 'Deployed', evidence: ['build passed'] } },
    { ...brief(), checkpoint: { stage: 'run-locally', summary: 'Works', evidence: [] } },
    { ...brief(), checkpoint: { stage: 'run-locally', summary: 'Works', evidence: ['ok'], verified: true } },
  ]) assert.throws(() => validateBrief(input), /brief|capabilit|checkpoint/i);
  assert.deepEqual(validateBrief(brief()), brief());
  assert.deepEqual(validateBrief({ ...brief(), capabilities: ['data', 'files', 'background-jobs'] }).capabilities,
    ['data', 'files', 'background-jobs']);
});

test('invalid, oversized and copied state fail explicitly and are never overwritten', async t => {
  const home = await fixture(t);
  const other = await fixture(t);
  await saveBrief(home, brief());
  const path = join(home, '.sql-apps', 'guide.json');
  const text = await readFile(path, 'utf8');
  await mkdir(join(other, '.sql-apps'));
  await writeFile(join(other, '.sql-apps', 'guide.json'), text);
  await assert.rejects(readGuide(other), /another checkout/);
  await writeFile(path, '{ invalid');
  await assert.rejects(readGuide(home), /Invalid.*guide/);
  await assert.rejects(saveBrief(home, brief()), /Invalid.*guide/);
  assert.equal(await readFile(path, 'utf8'), '{ invalid');
  await writeFile(path, ' '.repeat(17000));
  await assert.rejects(readGuide(home), /too large/);
});

test('saving a guide refuses a concurrent writer and preserves the previous brief', async t => {
  const home = await fixture(t);
  await saveBrief(home, brief());
  const before = await readFile(join(home, '.sql-apps', 'guide.json'), 'utf8');
  await mkdir(join(home, '.sql-apps', 'guide.lock'));
  await assert.rejects(saveBrief(home, { ...brief(), purpose: 'Changed' }), /already being saved/);
  assert.equal(await readFile(join(home, '.sql-apps', 'guide.json'), 'utf8'), before);
});

test('sharing reveals cost blockers without converting a saved preference into spending consent', async t => {
  const home = await fixture(t);
  const input = { ...brief(), costPreference: 'review-paid-costs',
    checkpoint: { stage: 'make-it-yours', summary: 'Due date added', evidence: ['Browser and SQL checks passed'] } };
  await saveBrief(home, input);
  const report = await readGuide(home);
  assert.equal(report.cost.phase, 'deployment-cost-review');
  assert.equal(report.cost.preference, 'review-paid-costs');
  assert.equal(report.cost.spendingAuthorized, false);
  assert.equal(report.cost.usageStatus, 'not-queried');
  assert.match(report.cost.message, /zero-spend intent is blocked/);
  assert.match(report.cost.scaleGuidance, /not.*scaling threshold/);
  assert.equal(report.cloud.authorized, false);
});

test('actual guide and plugin CLIs save/resume before build and reject invalid requests', async t => {
  const home = await fixture(t);
  await mkdir(join(home, 'scripts'));
  for (const file of ['scripts/guide.mjs', 'scripts/workspace-check.mjs', 'src/workspace.mjs']) {
    await writeFile(join(home, file), await readFile(file));
  }
  const script = join(home, 'scripts', 'guide.mjs');
  const invoke = args => spawnSync(process.execPath, args, {
    cwd: home, encoding: 'utf8', env: { ...process.env, SQL_APPS_HOME: home }, timeout: 15000,
  });
  let result = invoke([script, '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).nextStage, 'describe');
  const input = join(home, 'equipment brief.json');
  await writeFile(input, JSON.stringify(brief()));
  result = invoke([script, '--save', input, '--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).brief.purpose, brief().purpose);
  const launcher = join(process.cwd(), 'plugins', 'sql-apps', 'scripts', 'sql-apps.mjs');
  result = invoke([launcher, 'guide']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).brief.nextChange, brief().nextChange);
  result = invoke([launcher, 'guide-save', input]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).build.ready, false);
  const saved = await readFile(join(home, '.sql-apps', 'guide.json'), 'utf8');
  for (const args of [['--save'], ['--save', input, 'extra'], ['--unknown'], ['--json', '--json']]) {
    result = invoke([script, ...args]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage/);
  }
  await writeFile(input, '{"purpose":"incomplete"}');
  result = invoke([launcher, 'guide-save', input]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid project brief/);
  assert.equal(await readFile(join(home, '.sql-apps', 'guide.json'), 'utf8'), saved);
});

test('all beginner entry points use the same local-first journey and retain sharing boundaries', async () => {
  for (const file of ['content/start.md', 'skills/sql-apps-getting-started/SKILL.md',
    'docs/guides/build-your-app.md',
    'plugins/sql-apps/skills/sql-apps-local/SKILL.md', 'plugins/sql-apps/skills/sql-apps-application/SKILL.md']) {
    const content = await readFile(file, 'utf8');
    assert.match(content, /Describe -> Run locally -> Make it yours -> Share optionally/, file);
    assert.match(content, /guide/, file);
    assert.match(content, /historical/i, file);
  }
  const readme = await readFile('README.md', 'utf8');
  assert.match(readme, /Describe -> Run locally -> Make it yours -> Share optionally/);
  assert.match(readme, /docs\/guides\/build-your-app\.md/);
  assert.match(readme, /deployment workflow is not yet complete/);
  const guideReference = await readFile('docs/reference/guide.md', 'utf8');
  assert.match(guideReference, /historical/i);
  assert.match(guideReference, /does not authorize.*cloud deployment/);
  assert.equal((await readFile('content/start.md', 'utf8')).includes('"'), false);
  const cloud = await readFile('plugins/sql-apps/skills/sql-apps-cloud-preview/SKILL.md', 'utf8');
  assert.match(cloud, /optional final stage/);
  assert.match(cloud, /synthetic-only/);
  assert.match(cloud, /do not invent an estimate/);
  assert.match(cloud, /still in development/);
  assert.match(cloud, /blocked.*fixed|fixed charges/i);
  assert.match(cloud, /never.*retry as paid/i);
  assert.match(cloud, /Budgets.*not hard spending caps/);
  assert.match(cloud, /not a user-count threshold/);
});

test('reader documentation links and icons resolve after audience-based reorganization', async () => {
  const files = ['README.md', 'CONTRIBUTING.md', 'SUPPORT.md', 'SECURITY.md', 'examples/todo/README.md',
    ...(await readdir('docs', { recursive: true })).filter(file => file.endsWith('.md')).map(file => join('docs', file))];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    assert.doesNotMatch(content, /docs\/azure\/|pre-launch-naming-transition/, file);
    const targets = [
      ...Array.from(content.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g), match => match[1]),
      ...Array.from(content.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g), match => match[1]),
    ];
    for (const target of targets) {
      if (/^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      const [path, anchor] = target.split('#');
      const absolute = path ? resolve(dirname(file), decodeURIComponent(path)) : resolve(file);
      await assert.doesNotReject(access(absolute), `${file}: ${target}`);
      if (anchor && absolute.endsWith('.md')) {
        const destination = await readFile(absolute, 'utf8');
        const headings = Array.from(destination.matchAll(/^#{1,6}\s+(.+)$/gm), match =>
          match[1].trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-'));
        assert.ok(headings.includes(decodeURIComponent(anchor)), `${file}: missing heading ${target}`);
      }
    }
  }
});
