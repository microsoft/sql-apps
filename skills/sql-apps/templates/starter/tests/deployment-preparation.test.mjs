import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareDeployment } from '../scripts/deployment.mjs';

async function createFunctionsFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'sql-apps-deployment-prep-'));
  await mkdir(join(directory, 'infra'), { recursive: true });
  await mkdir(join(directory, 'packages', 'functions', 'dist'), { recursive: true });
  await mkdir(join(directory, 'packages', 'frontend', 'dist'), { recursive: true });
  await writeFile(join(directory, 'deployment.json'), '{"hosting":"static-web-apps","api":"functions"}');
  await writeFile(join(directory, 'infra', 'static-web-apps.bicep'), 'targetScope = \'resourceGroup\'\n');
  await writeFile(join(directory, 'packages', 'functions', 'dist', 'index.js'), 'export {};\n');
  await writeFile(join(directory, 'packages', 'functions', 'host.json'), '{}\n');
  await writeFile(join(directory, 'packages', 'functions', 'package.json'), '{}\n');
  await writeFile(join(directory, 'packages', 'functions', 'package-lock.json'), '{}\n');
  await writeFile(join(directory, 'packages', 'frontend', 'dist', 'index.html'), '<h1>fixture</h1>\n');
  await writeFile(join(directory, 'staticwebapp.config.json'), '{}\n');
  return directory;
}

test('preparation preserves generated output changed outside its ownership marker', async () => {
  const directory = await createFunctionsFixture();
  try {
    const prepared = await prepareDeployment(directory);
    const generatedFile = join(prepared.output, 'app', 'index.html');
    await writeFile(generatedFile, '<h1>operator change</h1>\n');

    await assert.rejects(prepareDeployment(directory), /unrecognized files or a changed marker/);
    assert.equal(await readFile(generatedFile, 'utf8'), '<h1>operator change</h1>\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preparation refuses generated output containing a symlink', async () => {
  const directory = await createFunctionsFixture();
  try {
    const prepared = await prepareDeployment(directory);
    const target = join(directory, 'packages', 'functions');
    const link = join(prepared.output, 'app', 'linked-assets');
    await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');

    await assert.rejects(prepareDeployment(directory), /Refusing staged symlink/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
