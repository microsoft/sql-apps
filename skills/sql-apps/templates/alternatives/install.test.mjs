import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { installAlternative } from './install.mjs';

test('alternative installer refuses to overwrite a modified existing application', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sql-apps-alternative-'));
  try {
    await cp(new URL('../starter/', import.meta.url), directory, {
      recursive: true,
      filter: source => !source.split(sep).includes('node_modules'),
    });
    const template = join(directory, 'infra', 'main.bicep');
    await writeFile(template, 'targetScope = \'resourceGroup\'\n// app-owned change\n');

    await assert.rejects(installAlternative('app-service-f1', directory), /Refusing to replace modified infra\/main\.bicep/);
    assert.match(await readFile(template, 'utf8'), /app-owned change/);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'deployment.json'), 'utf8')), {
      hosting: 'container-apps',
      api: 'dab',
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
