import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deploymentProfile } from '../scripts/config.ts';
import { resolveShape } from '../scripts/deployment-shapes.mjs';
import { createDeploymentPlan } from '../scripts/deployment-plan.mjs';
import { deploymentStatus, executeDeploymentPhase, reconcileDeployment } from '../scripts/deployment-execution.mjs';

const shape = resolveShape(deploymentProfile({ hosting: 'container-apps', api: 'dab' }));
const phases = ['publish', 'foundation', 'bootstrap', 'applications', 'verify'];
const inputs = {
  applicationName: 'execution-test',
  targetTenant: 'tenant-1',
  targetSubscription: 'subscription-1',
  hostingRegion: 'westus2',
  sqlRegion: 'westus2',
  ownerIdentity: 'owner@example.test',
  database: 'app-execution-test',
  resourceReuse: {},
  size: { minimumReplicas: 0, maximumReplicas: 1 },
};
const artifacts = {
  'web-image': { reference: 'registry.example.test/app/web', digest: `sha256:${'a'.repeat(64)}` },
  'dab-image': { reference: 'registry.example.test/app/dab', digest: `sha256:${'b'.repeat(64)}` },
  infrastructure: { reference: 'infra/main.bicep', digest: `sha256:${'c'.repeat(64)}` },
};
const plan = createDeploymentPlan({
  shape,
  inputs,
  observations: { zeroSpendRequired: false, registry: 'https://registry.example.test/' },
  artifacts,
});
const publishNames = new Set(plan.actions.publication.map(action => action.artifact));
const planArtifactRefs = plan.artifacts
  .filter(artifact => publishNames.has(artifact.name))
  .map(({ name, reference, digest }) => ({ name, reference, digest }));

const authorize = async ({ phase, planHash }) => ({ authorized: true, phase, planHash });
const successAdapter = (calls, reconciles = []) => ({
  async execute({ phase }) {
    calls.push(phase);
    if (phase === 'publish') {
      return {
        status: 'succeeded',
        artifacts: [
          { name: 'web-image', reference: 'registry.example.test/app/web', digest: artifacts['web-image'].digest },
          { name: 'dab-image', reference: 'registry.example.test/app/dab', digest: artifacts['dab-image'].digest },
        ],
      };
    }
    if (phase === 'foundation') {
      return { status: 'succeeded', resources: [{ id: 'sql-database', reference: 'sql.example.test/app' }] };
    }
    if (phase === 'bootstrap') {
      return {
        status: 'succeeded',
        migrationChecksums: [{ version: 1, checksum: `sha256:${'d'.repeat(64)}` }],
      };
    }
    return { status: 'succeeded' };
  },
  async reconcile({ phase, receipt }) {
    reconciles.push(phase);
    return { status: 'succeeded', ...receipt.phaseReferences[phase] };
  },
});

test('execution advances through the complete authorized phase order', async () => {
  const calls = [];
  const adapter = successAdapter(calls);
  let receipt;
  for (const phase of phases) {
    const result = await executeDeploymentPhase({ plan, phase, receipt, authorize, adapter });
    receipt = result.receipt;
    assert.equal(result.status, 'succeeded');
    assert.equal(receipt.phases[phase], 'succeeded');
  }

  assert.deepEqual(calls, phases);
  assert.equal(receipt.artifacts.length, 2);
  assert.equal(receipt.resources[0].id, 'sql-database');
  assert.equal(receipt.phaseReferences.bootstrap.migrationChecksums.length, 1);
  assert.ok(!JSON.stringify(receipt).match(/password|token|secret/i));
});

test('bootstrap cannot succeed without consecutive forward-migration checksums', async () => {
  const calls = [];
  let receipt;
  for (const phase of ['publish', 'foundation']) {
    receipt = (await executeDeploymentPhase({
      plan, phase, receipt, authorize, adapter: successAdapter(calls),
    })).receipt;
  }
  const adapter = {
    ...successAdapter(calls),
    async execute({ phase }) {
      calls.push(phase);
      return {
        status: 'succeeded',
        migrationChecksums: [{ version: 2, checksum: `sha256:${'e'.repeat(64)}` }],
      };
    },
  };

  await assert.rejects(executeDeploymentPhase({
    plan, phase: 'bootstrap', receipt, authorize, adapter,
  }), error => {
    assert.match(error.message, /uncertain outcome/);
    assert.equal(error.receipt.phases.bootstrap, 'uncertain');
    return true;
  });
});

test('missing or mismatched host authorization prevents adapter execution', async () => {
  const calls = [];
  const adapter = successAdapter(calls);

  await assert.rejects(executeDeploymentPhase({ plan, phase: 'publish', adapter }), /host authorization/);
  await assert.rejects(executeDeploymentPhase({
    plan,
    phase: 'publish',
    authorize: async () => ({ authorized: true, phase: 'publish', planHash: 'different-scope' }),
    adapter,
  }), /matching plan scope and phase/);
  assert.deepEqual(calls, []);
});

test('failed bootstrap blocks application deployment', async () => {
  const calls = [];
  const adapter = successAdapter(calls);
  let receipt;
  for (const phase of ['publish', 'foundation']) {
    receipt = (await executeDeploymentPhase({ plan, phase, receipt, authorize, adapter })).receipt;
  }
  const failedBootstrap = {
    ...successAdapter(calls),
    async execute({ phase }) {
      calls.push(phase);
      return { status: 'failed', errorCode: 'sql-bootstrap-failed' };
    },
  };
  receipt = (await executeDeploymentPhase({
    plan, phase: 'bootstrap', receipt, authorize, adapter: failedBootstrap,
  })).receipt;

  assert.equal(receipt.phases.bootstrap, 'failed');
  await assert.rejects(executeDeploymentPhase({
    plan, phase: 'applications', receipt, authorize, adapter,
  }), /bootstrap.*failed/);
  assert.ok(!calls.includes('applications'));
});

test('unchanged completed phase reuses recorded resources without a duplicate adapter call', async () => {
  const calls = [];
  const adapter = successAdapter(calls);
  const first = await executeDeploymentPhase({ plan, phase: 'publish', authorize, adapter });
  const rerun = await executeDeploymentPhase({
    plan, phase: 'publish', receipt: first.receipt, authorize, adapter,
  });

  assert.equal(rerun.reused, true);
  assert.deepEqual(rerun.receipt.artifacts, first.receipt.artifacts);
  assert.deepEqual(calls, ['publish']);
  const status = deploymentStatus(rerun.receipt);
  assert.equal(status.phases.publish, 'succeeded');
  assert.ok(!JSON.stringify(status).match(/password|token|secret/i));
  assert.throws(() => deploymentStatus({ ...rerun.receipt, secret: 'must-not-be-reported' }), /malformed shape/);
  assert.throws(() => deploymentStatus(null), /malformed shape/);
});

test('uncertain phase outcomes are reconciled before retry or continuation', async () => {
  const calls = [];
  const uncertainAdapter = {
    async execute({ phase }) {
      calls.push(phase);
      throw new Error('write response was lost');
    },
    async reconcile() {
      return {
        status: 'succeeded',
        artifacts: [{ name: 'web-image', reference: artifacts['web-image'].reference, digest: artifacts['web-image'].digest }],
      };
    },
  };
  let uncertainReceipt;
  await assert.rejects(executeDeploymentPhase({
    plan, phase: 'publish', authorize, adapter: uncertainAdapter,
  }), error => {
    assert.match(error.message, /uncertain outcome/);
    uncertainReceipt = error.receipt;
    assert.equal(uncertainReceipt.phases.publish, 'uncertain');
    return true;
  });

  const reconciled = await executeDeploymentPhase({
    plan, phase: 'publish', receipt: uncertainReceipt, authorize, adapter: uncertainAdapter,
  });
  assert.equal(reconciled.status, 'succeeded');
  assert.equal(reconciled.reused, true);
  assert.deepEqual(calls, ['publish']);
});

test('a changed plan scope invalidates execution continuation', async () => {
  const calls = [];
  const adapter = successAdapter(calls);
  const first = await executeDeploymentPhase({ plan, phase: 'publish', authorize, adapter });
  const changedPlan = createDeploymentPlan({
    shape,
    inputs: { ...inputs, sqlRegion: 'eastus2' },
    observations: { zeroSpendRequired: false, registry: 'https://registry.example.test/' },
    artifacts,
  });

  await assert.rejects(executeDeploymentPhase({
    plan: changedPlan, phase: 'foundation', receipt: first.receipt, authorize, adapter,
  }), /receipt.*different plan scope/);
  assert.deepEqual(calls, ['publish']);
  const recovery = reconcileDeployment({
    plan: changedPlan,
    receipt: first.receipt,
    observed: { inventory: [], resources: [], phases: {} },
  });
  assert.ok(recovery.discrepancies.some(item => item.kind === 'plan-scope-changed'));
  assert.ok(recovery.proposedRecovery[0].scopeDelta.includes('inputs.sqlRegion'));
});

test('failed SQL name reservations remain visible when generic inventory omits them', () => {
  const result = reconcileDeployment({
    plan,
    observed: {
      inventory: [],
      resources: [{
        id: 'azure-sql-server',
        phase: 'foundation',
        state: 'failed',
        ownership: 'unknown',
        reference: '/subscriptions/subscription-1/resourceGroups/app/providers/Microsoft.Sql/servers/sql-execution',
      }],
      phases: { foundation: { status: 'failed' } },
    },
  });

  assert.ok(result.discrepancies.some(item => item.kind === 'failed-resource-name-reservation' &&
    item.resourceId === 'azure-sql-server'));
  assert.ok(!result.completedPhases.includes('foundation'));
  assert.equal(result.proposedRecovery[0].action, 'inspect-resource-reservation');
  assert.equal(result.proposedRecovery[0].automatic, false);
});

test('a timed-out write that created an owned resource can be reconciled without repeating it', async () => {
  const calls = [];
  const adapter = successAdapter(calls);
  const execute = adapter.execute.bind(adapter);
  adapter.execute = async context => {
    if (context.phase === 'foundation') {
      calls.push(context.phase);
      throw new Error('response lost after resource creation');
    }
    return execute(context);
  };
  const published = await executeDeploymentPhase({ plan, phase: 'publish', authorize, adapter });
  let receipt;
  await assert.rejects(executeDeploymentPhase({
    plan, phase: 'foundation', receipt: published.receipt, authorize, adapter,
  }), error => {
    receipt = error.receipt;
    return true;
  });

  const foundationResources = plan.resources.filter(resource => resource.lifecycle !== 'conditional' &&
    !/Microsoft\.App\/containerApps|Microsoft\.Web\/(?:sites|staticSites)|Functions component/i.test(resource.type))
    .map(resource => ({ id: resource.id, reference: `/resources/${resource.id}` }));
  const observed = {
    inventory: foundationResources,
    resources: foundationResources.map(resource => ({
      ...resource, phase: 'foundation', state: 'succeeded', ownership: 'owned',
    })),
    phases: {
      publish: { status: 'succeeded', artifacts: planArtifactRefs },
      foundation: {
        status: 'succeeded',
        resources: foundationResources,
      },
    },
  };
  const reconciled = reconcileDeployment({ plan, receipt, observed });

  assert.ok(reconciled.completedPhases.includes('foundation'));
  assert.ok(reconciled.proposedRecovery.some(item =>
    item.action === 'record-observed-phase' && item.phase === 'foundation'));
  assert.deepEqual(calls, ['publish', 'foundation']);
});

test('partial bootstrap is not reported complete and proposes only forward recovery', async () => {
  const calls = [];
  const adapter = successAdapter(calls);
  const published = await executeDeploymentPhase({ plan, phase: 'publish', authorize, adapter });
  const foundation = await executeDeploymentPhase({
    plan, phase: 'foundation', receipt: published.receipt, authorize, adapter,
  });
  const partial = {
    ...successAdapter(calls),
    async execute({ phase }) {
      calls.push(phase);
      throw new Error('bootstrap response lost');
    },
  };
  let receipt;
  await assert.rejects(executeDeploymentPhase({
    plan, phase: 'bootstrap', receipt: foundation.receipt, authorize, adapter: partial,
  }), error => {
    receipt = error.receipt;
    return true;
  });
  const result = reconcileDeployment({
    plan,
    receipt,
    observed: {
      inventory: [{ id: 'azure-sql-database', reference: 'sql.example.test/app' }],
      resources: [{
        id: 'azure-sql-database', phase: 'foundation', state: 'succeeded',
        ownership: 'owned', reference: 'sql.example.test/app',
      }],
      phases: {
        publish: { status: 'succeeded', artifacts: planArtifactRefs },
        foundation: {
          status: 'succeeded',
          resources: [{ id: 'azure-sql-database', reference: 'sql.example.test/app' }],
        },
        bootstrap: {
          status: 'in-progress',
          migrationChecksums: [{ version: 1, checksum: `sha256:${'d'.repeat(64)}` }],
        },
      },
    },
  });

  assert.ok(!result.completedPhases.includes('bootstrap'));
  assert.ok(result.discrepancies.some(item => item.kind === 'partial-bootstrap'));
  assert.ok(result.proposedRecovery.some(item =>
    item.action === 'complete-forward-migrations' && item.automatic === false));
});

test('reconciliation preserves existing SQL and image references without automatic replacement', async () => {
  const calls = [];
  const adapter = successAdapter(calls);
  const published = await executeDeploymentPhase({ plan, phase: 'publish', authorize, adapter });
  const foundation = await executeDeploymentPhase({
    plan,
    phase: 'foundation',
    receipt: published.receipt,
    authorize,
    adapter: {
      ...adapter,
      async execute({ phase }) {
        calls.push(phase);
        return {
          status: 'succeeded',
          resources: [{ id: 'azure-sql-database', reference: '/sql/approved-existing-database' }],
        };
      },
    },
  });
  const observedArtifactRefs = planArtifactRefs.map(artifact => artifact.name === 'web-image'
    ? { ...artifact, reference: 'registry.example.test/app/web-existing' }
    : artifact);
  const result = reconcileDeployment({
    plan,
    receipt: foundation.receipt,
    observed: {
      inventory: [{ id: 'azure-sql-database', reference: '/sql/customer-database' }],
      resources: [{
        id: 'azure-sql-database', phase: 'foundation', state: 'succeeded',
        ownership: 'approved-reuse', reference: '/sql/customer-database',
      }],
      phases: {
        publish: {
          status: 'succeeded',
          artifacts: observedArtifactRefs,
        },
        foundation: {
          status: 'succeeded',
          resources: [{ id: 'azure-sql-database', reference: '/sql/customer-database' }],
        },
      },
    },
  });

  assert.ok(result.discrepancies.some(item => item.kind === 'resource-reference-changed'));
  assert.ok(result.discrepancies.some(item => item.kind === 'artifact-reference-changed'));
  assert.ok(result.proposedRecovery.every(item =>
    item.automatic === false && !['delete', 'recreate', 'replace-region', 'replace-tier'].includes(item.action)));
  assert.equal(foundation.receipt.resources[0].reference, '/sql/approved-existing-database');
  assert.equal(foundation.receipt.artifacts.find(item => item.name === 'web-image').reference, artifacts['web-image'].reference);
});

if (existsSync(fileURLToPath(new URL('../scripts/build-images.mjs', import.meta.url)))) {
  const { buildImages } = await import('../scripts/build-images.mjs');
  test('web image build context includes deployment.json and uses only the explicitly selected HTTPS registry', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile.web', import.meta.url), 'utf8');
  assert.match(dockerfile, /^COPY .*deployment\.json/m);
  const calls = [];
  buildImages({
    webImage: 'registry.example.test/app/web:review',
    dabImage: 'registry.example.test/app/dab:review',
    npmRegistry: 'https://approved-mirror.example.test/',
    run(command, args) {
      calls.push([command, args]);
      if (args.some(arg => arg.includes('npm config get registry'))) {
        return { status: 0, stdout: 'https://unapproved-registry.example.test/\n' };
      }
      return { status: 0 };
    },
  });

  const dockerCalls = calls.filter(([command]) => command === 'docker');
  assert.equal(dockerCalls.length, 2);
  assert.ok(dockerCalls[0][1].includes('NPM_CONFIG_REGISTRY=https://approved-mirror.example.test/'));
  assert.ok(!dockerCalls[1][1].some(arg => arg.startsWith('NPM_CONFIG_REGISTRY=')));
  assert.ok(!calls.some(([, args]) => args.some(arg => arg.includes('npm config get registry'))));
  assert.throws(() => buildImages({
    webImage: 'registry.example.test/app/web:review',
    dabImage: 'registry.example.test/app/dab:review',
    npmRegistry: 'https://user:password@mirror.example.test/',
    run: () => ({ status: 0 }),
  }), /credential-free HTTPS URL/);
  assert.throws(() => buildImages({
    webImage: 'registry.example.test/app/web:review',
    dabImage: 'registry.example.test/app/dab:review',
    npmRegistry: 'https://approved-mirror.example.test/',
    run: () => ({ status: null, error: Object.assign(new Error('network unavailable'), { code: 'ENETUNREACH' }) }),
  }), /ENETUNREACH.*https:\/\/approved-mirror\.example\.test\//);
  });
}
