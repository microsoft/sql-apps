import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deploymentProfile } from '../scripts/config.ts';
import { resolveShape } from '../scripts/deployment-shapes.mjs';
import {
  compareApprovedScope,
  createDeploymentPlan,
  runDeploymentCommand,
} from '../scripts/deployment-plan.mjs';

const shape = resolveShape(deploymentProfile({ hosting: 'container-apps', api: 'dab' }));
const validInputs = {
  applicationName: 'sample-app',
  targetTenant: 'tenant-1',
  targetSubscription: 'subscription-1',
  hostingRegion: 'westus2',
  sqlRegion: 'westus2',
  ownerIdentity: 'owner@example.test',
  database: 'app-sample',
  resourceReuse: {},
  size: { minimumReplicas: 0, maximumReplicas: 1 },
};
const validArtifacts = {
  'web-image': { reference: 'registry.example.test/sample/web', digest: `sha256:${'a'.repeat(64)}` },
  'dab-image': { reference: 'registry.example.test/sample/dab', digest: `sha256:${'b'.repeat(64)}` },
  infrastructure: { reference: 'infra/main.bicep', digest: `sha256:${'c'.repeat(64)}` },
};
const observations = {
  zeroSpendRequired: false,
  regionEligibility: 'not-established-read-only',
  networkActions: [],
};

function createPlan(overrides = {}) {
  return createDeploymentPlan({
    shape,
    inputs: validInputs,
    observations,
    artifacts: validArtifacts,
    ...overrides,
  });
}

test('deployment plan hashes are canonical and retain immutable artifact identifiers', () => {
  const first = createPlan();
  const second = createPlan({
    inputs: Object.fromEntries(Object.entries(validInputs).reverse()),
    observations: Object.fromEntries(Object.entries(observations).reverse()),
    artifacts: Object.fromEntries(Object.entries(validArtifacts).reverse()),
  });

  assert.equal(first.schemaVersion, 1);
  assert.equal(first.shapeId, 'container-apps-dab');
  assert.equal(first.shapeRevision, shape.revision);
  assert.equal(first.planHash, second.planHash);
  assert.equal(first.artifacts.find(item => item.name === 'web-image').identifier,
    `registry.example.test/sample/web@sha256:${'a'.repeat(64)}`);
});

test('every planned resource has an explicit supported cost classification', () => {
  const plan = createPlan();
  const classifications = new Set([
    'free-sku',
    'free-offer-with-enforced-quota-stop',
    'metered-allowance',
    'paid',
    'unresolved',
    'no-direct-charge',
  ]);

  assert.ok(plan.resources.length > 0);
  assert.equal(plan.costs.length, plan.resources.length);
  for (const resource of plan.resources) assert.ok(classifications.has(resource.costClass));
  for (const cost of plan.costs) assert.ok(classifications.has(cost.classification));
});

test('strict zero-spend plans reject metered or unresolved cost exposure', () => {
  assert.throws(() => createPlan({
    observations: { ...observations, zeroSpendRequired: true },
  }), /Strict zero-spend cannot be established/);
});

test('unsupported observations cannot silently alter plan scope', () => {
  assert.throws(() => createPlan({
    observations: { ...observations, firewallRule: 'allow-all' },
  }), /Unsupported deployment observation: firewallRule/);
});

test('artifact references containing embedded credentials are rejected', () => {
  assert.throws(() => createPlan({
    artifacts: {
      ...validArtifacts,
      'web-image': {
        ...validArtifacts['web-image'],
        reference: 'https://reader:password@registry.example.test/sample/web',
      },
    },
  }), /Artifact web-image reference must not contain credentials/);
});

test('secret values and connection strings cannot enter deployment plan inputs', () => {
  assert.throws(() => createPlan({
    inputs: { ...validInputs, database: 'Server=sql.example;Password=must-not-be-recorded' },
  }), /Credential material is not allowed in deployment plan inputs/);
});

test('network actions cannot record bearer tokens or credential strings', () => {
  assert.throws(() => createPlan({
    observations: {
      ...observations,
      networkActions: [{ action: 'allow', scope: 'Bearer do-not-record' }],
    },
  }), /Credential material is not allowed in deployment plan observations/);
});

test('missing owner and deployment inputs are surfaced as uncertainties', () => {
  const plan = createPlan({
    inputs: { applicationName: 'sample-app' },
  });
  const missing = plan.uncertainty
    .filter(item => item.kind === 'missing-input')
    .map(item => item.name);

  assert.ok(missing.includes('ownerIdentity'));
  assert.ok(missing.includes('targetSubscription'));
  assert.ok(missing.includes('hostingRegion'));
});

test('changed region, firewall action, or image digest requires a new scope review', () => {
  const approvedPlan = createPlan();
  const proposedPlan = createPlan({
    inputs: { ...validInputs, sqlRegion: 'eastus2' },
    observations: {
      ...observations,
      networkActions: [{ action: 'add-sql-firewall-rule', scope: 'operator-ip' }],
    },
    artifacts: {
      ...validArtifacts,
      'web-image': { ...validArtifacts['web-image'], digest: `sha256:${'d'.repeat(64)}` },
    },
  });
  const comparison = compareApprovedScope(approvedPlan, proposedPlan);

  assert.equal(comparison.applicable, false);
  assert.ok(comparison.changes.includes('inputs.sqlRegion'));
  assert.ok(comparison.changes.includes('actions.network'));
  assert.ok(comparison.changes.includes('artifacts.web-image'));
});

test('scope comparison reports newly supplied inputs without throwing', () => {
  const approvedPlan = createPlan({ inputs: { applicationName: validInputs.applicationName } });
  const proposedPlan = createPlan();

  assert.deepEqual(compareApprovedScope(approvedPlan, proposedPlan), {
    applicable: false,
    changes: [
      'inputs.database',
      'inputs.hostingRegion',
      'inputs.ownerIdentity',
      'inputs.resourceReuse',
      'inputs.size',
      'inputs.sqlRegion',
      'inputs.targetSubscription',
      'inputs.targetTenant',
      'uncertainty',
    ],
  });
});

test('preflight and plan commands inspect local state without writes or interactive Azure actions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sql-apps-deployment-plan-'));
  try {
    await mkdir(join(directory, 'infra'));
    await writeFile(join(directory, 'deployment.json'), JSON.stringify({ hosting: 'container-apps', api: 'dab' }));
    await writeFile(join(directory, 'infra', 'main.bicep'), 'targetScope = \'resourceGroup\'\n');
    const calls = [];
    const run = async (command, args) => {
      calls.push([command, ...args]);
      if (command === 'npm') {
        return { ok: true, stdout: 'https://reader:password@registry.example.test/?token=secret' };
      }
      return { ok: true, stdout: 'C:\\Tools\\' + args.at(-1) + '.exe' };
    };
    const before = await readdir(directory);
    const preflight = await runDeploymentCommand('preflight', { directory, run });
    const planResult = await runDeploymentCommand('plan', { directory, run });
    const after = await readdir(directory);
    const observed = JSON.stringify({ preflight, planResult });

    assert.deepEqual(after, before);
    assert.equal(preflight.provisioningEligibility, 'not-established-read-only');
    assert.equal(preflight.access, 'not-established-read-only');
    assert.equal(preflight.npmRegistry, 'https://registry.example.test/');
    assert.ok(preflight.uncertainty.some(item => item.kind === 'registry-not-approved'));
    assert.ok(preflight.missingConfiguration.some(item => item.name === 'Dockerfile.web'));
    assert.match(planResult.plan.uncertainty.map(item => item.name).join(' '), /ownerIdentity/);
    assert.ok(!observed.includes('password'));
    assert.ok(!observed.includes('token=secret'));
    assert.ok(calls.some(call => call[0] === 'npm' && call.includes('config') && call.includes('get')));
    assert.ok(calls.every(call => !/\b(login|consent|deploy|create|update|push|delete)\b/i.test(call.join(' '))));
    await assert.rejects(runDeploymentCommand('preflight', {
      directory,
      run: async (command, args) => command === 'npm' ?
        { ok: true, stdout: 'http://registry.example.test/' } :
        { ok: true, stdout: args.at(-1) },
    }), /npm registry must use HTTPS/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Windows preflight reads the configured registry through the npm command shim', {
  skip: process.platform !== 'win32',
}, async () => {
  const preflight = await runDeploymentCommand('preflight');

  assert.match(preflight.npmRegistry, /^https:\/\//);
  assert.equal(preflight.access, 'not-established-read-only');
});
