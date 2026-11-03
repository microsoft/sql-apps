import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentProfile } from '../scripts/config.ts';
import { resolveShape } from '../scripts/deployment-shapes.mjs';
import { createDeploymentPlan } from '../scripts/deployment-plan.mjs';

const profile = (hosting, api) => deploymentProfile({ hosting, api });

test('default profile resolves to the experimental Container Apps and DAB shape', () => {
  const shape = resolveShape(profile('container-apps', 'dab'));

  assert.equal(shape.id, 'container-apps-dab');
  assert.equal(shape.status, 'experimental');
  assert.deepEqual(shape.phases, ['publish', 'foundation', 'bootstrap', 'applications', 'verify']);
  assert.deepEqual(shape.artifacts, ['web-image', 'dab-image', 'infrastructure']);
});

test('existing alternative profiles resolve to their own shapes', () => {
  assert.equal(resolveShape(profile('app-service-f1', 'dab')).id, 'app-service-f1-dab');

  const functionsShape = resolveShape(profile('static-web-apps', 'functions'));
  assert.equal(functionsShape.id, 'static-web-apps-functions');
  assert.deepEqual(functionsShape.artifacts, ['static-web-app', 'functions-package', 'infrastructure']);
});

test('Functions plans contain no DAB artifact and keep identity as a credential reference', () => {
  const shape = resolveShape(profile('static-web-apps', 'functions'));
  const plan = createDeploymentPlan({
    shape,
    inputs: {
      applicationName: 'functions-test',
      targetTenant: 'tenant-1',
      targetSubscription: 'subscription-1',
      hostingRegion: 'westus2',
      sqlRegion: 'westus2',
      ownerIdentity: 'owner@example.test',
      database: 'app-functions-test',
      resourceReuse: {},
      size: { minimumReplicas: 0, maximumReplicas: 1 },
    },
    observations: { zeroSpendRequired: false, registry: 'https://registry.example.test/' },
    artifacts: {
      'static-web-app': { reference: 'app.example.test', digest: `sha256:${'a'.repeat(64)}` },
      'functions-package': { reference: 'functions-package', digest: `sha256:${'b'.repeat(64)}` },
      infrastructure: { reference: 'infra/static-web-apps.bicep', digest: `sha256:${'c'.repeat(64)}` },
    },
  });

  assert.deepEqual(plan.artifacts.map(item => item.name), shape.artifacts);
  assert.ok(!plan.artifacts.some(item => item.name.includes('dab')));
  assert.deepEqual(plan.actions.identity, [{
    action: 'configure-secret-reference',
    principal: 'sql-runtime-service-principal',
    scope: 'existing-azure-sql-database',
  }]);
  assert.ok(!JSON.stringify(plan).match(/client_secret|password\s*[:=]|bearer\s+\S+/i));
});

test('unsupported hosting and API pairs fail through the existing profile validator', () => {
  assert.throws(() => resolveShape({ hosting: 'static-web-apps', api: 'dab' }),
    /deployment\.json must select container-apps\/dab, app-service-f1\/dab, or static-web-apps\/functions/);
  assert.throws(() => resolveShape({ hosting: 'app-service-f1', api: 'functions' }),
    /deployment\.json must select container-apps\/dab, app-service-f1\/dab, or static-web-apps\/functions/);
});

test('catalog entries expose bounded inputs and never claim unproven verification', () => {
  for (const profile of [
    { hosting: 'container-apps', api: 'dab' },
    { hosting: 'app-service-f1', api: 'dab' },
    { hosting: 'static-web-apps', api: 'functions' },
  ]) {
    const shape = resolveShape(deploymentProfile(profile));
    assert.equal(typeof shape.revision, 'string');
    assert.equal(shape.status, 'experimental');
    assert.ok(Array.isArray(shape.inputKeys));
    assert.ok(!JSON.stringify(shape).includes('"verified"'));
  }
});
