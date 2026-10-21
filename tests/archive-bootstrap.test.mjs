import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { verifyToolingFeed } from '../scripts/verify-tooling-feed.mjs';
import { buildToolingPackage } from '../scripts/build-tooling-package.mjs';

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const staged = join(root, 'dist', 'tooling-archive-bootstrap-test-package');
let directory, archive;

async function pack(cwd) {
  const args = ['pack', '--ignore-scripts', '--json', '--pack-destination', directory];
  const npm = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const result = process.platform === 'win32'
    ? await execute(process.execPath, [npm, ...args], { cwd })
    : await execute('npm', args, { cwd });
  return join(directory, JSON.parse(result.stdout)[0].filename);
}

before(async () => {
  directory = await realpath(await mkdtemp(join(tmpdir(), 'sql-apps-archive candidate ')));
  const { inspectSource } = await import('../scripts/workspace-check.mjs');
  if (!(await inspectSource(root, { toolingHome: root, foundation: true })).build?.ready) {
    await execute(process.execPath, [join(root, 'scripts', 'build-provenance.mjs')], { cwd: root });
  }
  await buildToolingPackage(staged);
  archive = await pack(staged);
});

after(async () => {
  if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  await rm(staged, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});

test('the distributed archive creates, binds, restores and independently restores an app without foundation inputs', { timeout: 600000 }, async () => {
  const release = join(directory, 'release-metadata');
  await mkdir(join(release, 'packages', 'sql-apps'), { recursive: true });
  await cp(join(root, 'packages', 'sql-apps', 'package.json'), join(release, 'packages', 'sql-apps', 'package.json'));
  const report = await verifyToolingFeed(release, undefined, archive);
  assert.equal(report.version, JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version);
  assert.equal(report.archive, archive);
  assert.equal(report.bootstrapCreated, true);
  assert.equal(report.bootstrapPlanning, true);
  assert.equal(report.installedHandoff, true);
  assert.equal(report.independentRestore, true);
  assert.equal(report.installOnly, true);
  assert.match(report.cliOutput, /projects/);
});

test('archive verification explicitly rejects missing and wrong-version candidates', async () => {
  await assert.rejects(verifyToolingFeed(root, undefined, join(directory, 'missing.tgz')), /ENOENT/);
  const wrong = join(directory, 'wrong-package');
  await cp(staged, wrong, { recursive: true });
  const path = join(wrong, 'package.json');
  const pkg = JSON.parse(await readFile(path, 'utf8'));
  await writeFile(path, JSON.stringify({ ...pkg, version: '999.0.0' }));
  await assert.rejects(verifyToolingFeed(root, undefined, await pack(wrong)), /version|match|release/i);
  assert.equal((await lstat(archive)).isFile(), true);
});

test('archive verification rejects a linked candidate before installing it', async t => {
  const linked = join(directory, 'linked.tgz');
  try { await symlink(archive, linked, 'file'); }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) throw error;
    t.skip(`File links unavailable: ${error.code}`);
    return;
  }
  await assert.rejects(verifyToolingFeed(root, undefined, linked), /unlinked regular file/);
});

test('an unavailable dependency feed fails archive bootstrap instead of falling back to foundation or a warm cache', { timeout: 120000 }, async t => {
  let requests = 0;
  const server = createServer((_request, response) => { requests++; response.writeHead(404).end('unavailable'); });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise(done => server.close(done)));
  await assert.rejects(verifyToolingFeed(root, `http://127.0.0.1:${server.address().port}`, archive), /E404/);
  assert.ok(requests > 0, 'bootstrap installation must actually consult the explicitly selected feed');
});
