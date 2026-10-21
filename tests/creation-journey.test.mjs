import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm, readFile, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { planProjectCreation, createProject } from '../scripts/projects.mjs';

test('approved creation only scaffolds an independent project without a helper or workspace state', async t => {
  const userHome = await realpath(await mkdtemp(join(tmpdir(), 'sql-apps-creation-journey-')));
  t.after(() => rm(userHome, { recursive: true, force: true }));
  const source = resolve(import.meta.dirname, '..');
  const plan = await planProjectCreation(source, 'Scaffold fixture', { userHome });
  assert.equal(plan.effects.some(effect => /Start an owned/.test(effect)), false);
  await assert.rejects(createProject(source, 'Scaffold fixture', { userHome, approval: 'wrong' }), /approve/i);
  const project = await createProject(source, 'Scaffold fixture', {
    userHome, approval: plan.approval, initializeGit: false,
  });
  assert.equal(project.launchUrl, undefined);
  assert.equal(JSON.parse(await readFile(join(project.path, '.sql-apps-project.json'), 'utf8')).name, 'Scaffold fixture');
  await assert.rejects(access(join(project.path, '.sql-apps')), { code: 'ENOENT' });
  await assert.rejects(access(join(project.path, 'node_modules')), { code: 'ENOENT' });
  assert.deepEqual(await readdir(join(userHome, '.sql-apps')), ['projects.json']);
});
