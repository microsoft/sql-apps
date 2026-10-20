import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('personal-free publishing is the only bundled Azure deployment command', async () => {
  const source = await readFile('packages/sql-apps/bin/sql-apps.mjs', 'utf8');
  assert.match(source, /publish:\s*'dist\/src\/personal-free-cli\.js'/);
  assert.doesNotMatch(source, /azure:\s*'dist\/src\/cli\.js'/);
});

test('cloud guidance orders free-first candidates without promoting the personal-free fallback', async () => {
  const skill = await readFile('plugins/sql-apps/skills/sql-apps-cloud-preview/SKILL.md', 'utf8');
  assert.match(skill, /App Service first[\s\S]*Container Apps second[\s\S]*SWA last/i);
  assert.match(skill, /personal project/i);
  assert.match(skill, /no .*SLA/i);
  assert.match(skill, /potentially \$0/i);
  assert.match(skill, /guard fails closed unless Free SKU and SQL free-tier\/AutoPause/i);
  assert.match(skill, /complete required setup fits Free/i);
  assert.match(skill, /candidate, not a bundled profile/i);
  assert.match(skill, /Preferences are not spending consent/i);
});

test('cost guidance distinguishes the zero-cost profile from almost-free architectures', async () => {
  const costs = await readFile('docs/guides/costs.md', 'utf8');
  assert.match(costs, /App Service Free[\s\S]*first[\s\S]*Container Apps Consumption second[\s\S]*SWA Free as the last fallback/i);
  assert.match(costs, /managed\s+Functions/i);
  assert.match(costs, /no\s+always-billable Azure service/i);
  assert.match(costs, /Exhaustion can interrupt[\s\S]*until allowances reset/i);
  assert.match(costs, /GitHub Actions[\s\S]*separate terms/i);
  assert.match(costs, /Budgets send delayed alerts; they do not stop spending/i);

  const deployment = await readFile('docs/reference/personal-free-deployment.md', 'utf8');
  assert.match(deployment, /Cost guard: verified/);
  assert.match(deployment, /stop rather than bill/i);
  assert.match(deployment, /manual.*upgrade|upgraded manually/i);
});

test('tooling ships no legacy cloud infrastructure or deployment implementation', async () => {
  for (const path of [
    'src/cli.ts',
    'src/azure-init.ts',
    'src/deployment.ts',
    'src/artifacts.ts',
    'src/role-based-identity.ts',
    'src/role-based-smoke.ts',
    'infra/main.bicep',
    'infra/rbac.bicep',
    'infra/private-endpoint.bicep',
    '.github/workflows/azure-native-deploy.yml',
  ]) {
    await assert.rejects(readFile(path, 'utf8'), { code: 'ENOENT' });
  }
});
