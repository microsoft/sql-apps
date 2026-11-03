import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deploymentProfile } from './config.ts';
import { resolveShape } from './deployment-shapes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const requiredInputs = ['applicationName', 'targetTenant', 'targetSubscription', 'hostingRegion', 'ownerIdentity', 'database'];
const costClasses = new Set([
  'free-sku',
  'free-offer-with-enforced-quota-stop',
  'metered-allowance',
  'paid',
  'unresolved',
  'no-direct-charge',
]);
const strictZeroSpendBlockedClasses = new Set(['metered-allowance', 'paid', 'unresolved']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map(key => {
      if (value[key] === undefined) throw new Error(`Cannot canonicalize undefined value at ${key}.`);
      return [key, canonicalize(value[key])];
    }));
  }
  throw new Error('Deployment plans may contain only finite JSON values.');
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function assertNoCredentialMaterial(value, location, section) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCredentialMaterial(item, `${location}[${index}]`, section));
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (/(?:password|secret|token|credential|connection.?string|sas)/i.test(key)) {
        throw new Error(`Credential material is not allowed in deployment plan ${section} at ${location}.${key}.`);
      }
      assertNoCredentialMaterial(nested, `${location}.${key}`, section);
    }
    return;
  }
  if (typeof value === 'string' &&
      (/\b(?:password|pwd|client_secret|access_token|refresh_token|authorization)\s*[:=]/i.test(value) ||
       /\bbearer\s+\S+/i.test(value) ||
       /https?:\/\/[^/\s@]+:[^/\s@]+@/i.test(value))) {
    throw new Error(`Credential material is not allowed in deployment plan ${section} at ${location}.`);
  }
}

function hashPlan(plan) {
  const { planHash: _planHash, ...body } = plan;
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}

function normalizeInputs(shape, inputs) {
  if (!isRecord(inputs)) throw new Error('Deployment inputs must be a JSON object.');
  const allowed = new Set(shape.inputKeys);
  for (const key of Object.keys(inputs)) {
    if (!allowed.has(key)) throw new Error(`Unsupported deployment input: ${key}.`);
  }
  assertNoCredentialMaterial(inputs, '', 'inputs');
  return canonicalize(Object.fromEntries(Object.entries(inputs).map(([key, value]) => {
    if (typeof value === 'string') return [key, value.trim()];
    return [key, value];
  })));
}

function normalizeArtifacts(shape, artifacts, uncertainty) {
  if (!isRecord(artifacts)) throw new Error('Deployment artifacts must be a JSON object.');
  return shape.artifacts.map(name => {
    const artifact = artifacts[name];
    if (!isRecord(artifact)) {
      uncertainty.push({ kind: 'missing-artifact', name });
      return { name, reference: null, digest: null, identifier: null };
    }
    const reference = typeof artifact.reference === 'string' ? artifact.reference.trim() : '';
    const digest = typeof artifact.digest === 'string' ? artifact.digest.trim().toLowerCase() : '';
    if (reference.includes('@')) {
      throw new Error(`Artifact ${name} reference must not contain credentials or an embedded digest.`);
    }
    if (reference.includes('://')) {
      let url;
      try { url = new URL(reference); }
      catch { throw new Error(`Artifact ${name} reference is not a valid URL.`); }
      if (url.username || url.password || url.search || url.hash) {
        throw new Error(`Artifact ${name} reference must not contain credentials or query values.`);
      }
    }
    if (!reference || !/^sha256:[a-f0-9]{64}$/.test(digest)) {
      uncertainty.push({ kind: 'mutable-artifact', name, detail: 'An immutable SHA-256 digest is required.' });
      return { name, reference: reference || null, digest: digest || null, identifier: null };
    }
    return { name, reference, digest, identifier: `${reference}@${digest}` };
  });
}

function sanitizeRegistry(registry) {
  if (typeof registry !== 'string' || !registry.trim()) return null;
  let url;
  try { url = new URL(registry.trim()); }
  catch { throw new Error('The configured npm registry is not a valid URL.'); }
  if (url.protocol !== 'https:') throw new Error('The configured npm registry must use HTTPS.');
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  return url.href;
}

function normalizeNetworkActions(actions) {
  if (!Array.isArray(actions)) throw new Error('Observed network actions must be a JSON array.');
  return actions.map((action, index) => {
    if (!isRecord(action) || typeof action.action !== 'string' ||
        Object.keys(action).some(key => !['action', 'scope', 'boundary'].includes(key))) {
      throw new Error(`Observed network action ${index} must contain only action, scope, and boundary.`);
    }
    assertNoCredentialMaterial(action, `networkActions[${index}]`, 'observations');
    return canonicalize(action);
  });
}

function normalizeObservations(observations = {}) {
  if (!isRecord(observations)) throw new Error('Deployment observations must be a JSON object.');
  const allowed = new Set(['zeroSpendRequired', 'regionEligibility', 'registry', 'networkActions']);
  for (const key of Object.keys(observations)) {
    if (!allowed.has(key)) throw new Error(`Unsupported deployment observation: ${key}.`);
  }
  if (observations.regionEligibility !== undefined &&
      observations.regionEligibility !== 'not-established-read-only') {
    throw new Error('Read-only observations cannot establish subscription provisioning eligibility.');
  }
  if (observations.zeroSpendRequired !== undefined && typeof observations.zeroSpendRequired !== 'boolean') {
    throw new Error('zeroSpendRequired must be a boolean when supplied.');
  }
  return {
    zeroSpendRequired: observations.zeroSpendRequired ?? null,
    regionEligibility: 'not-established-read-only',
    registry: sanitizeRegistry(observations.registry),
    networkActions: normalizeNetworkActions(observations.networkActions ?? []),
  };
}

function planUncertainty(inputs, artifacts, resources, observations, shape) {
  const uncertainty = [];
  for (const name of requiredInputs) {
    const value = inputs[name];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      uncertainty.push({ kind: 'missing-input', name });
    }
  }
  for (const artifact of artifacts) {
    if (!artifact.identifier) uncertainty.push({ kind: 'artifact-not-immutable', name: artifact.name });
  }
  for (const resource of resources) {
    if (resource.costClass === 'unresolved') {
      uncertainty.push({ kind: 'cost-unresolved', name: resource.id });
    } else if (resource.costClass === 'metered-allowance') {
      uncertainty.push({ kind: 'cost-not-capped', name: resource.id });
    }
  }
  if (observations.registry === null) {
    uncertainty.push({ kind: 'missing-configuration', name: 'approvedNpmRegistry' });
  } else {
    uncertainty.push({ kind: 'registry-not-approved', name: 'npmRegistry' });
  }
  uncertainty.push({
    kind: 'eligibility-not-established',
    name: 'regionProvisioningEligibility',
    detail: 'SKU listings and read-only checks do not establish subscription provisioning eligibility.',
  });
  uncertainty.push({
    kind: 'access-not-established',
    name: 'targetAccess',
    detail: 'Read-only preflight does not sign in, request consent, or verify resource write permissions.',
  });
  if (shape.status !== 'verified') {
    uncertainty.push({ kind: 'shape-unverified', name: shape.id, revision: shape.revision });
  }
  return uncertainty;
}

export function createDeploymentPlan({ shape, inputs, observations, artifacts }) {
  if (!isRecord(shape) || typeof shape.id !== 'string' || typeof shape.revision !== 'string' ||
      !Array.isArray(shape.inputKeys) || !Array.isArray(shape.artifacts) ||
      !Array.isArray(shape.resources) || !isRecord(shape.actions)) {
    throw new Error('A resolved deployment shape with resources and actions is required.');
  }
  const normalizedInputs = normalizeInputs(shape, inputs);
  const normalizedObservations = normalizeObservations(observations);
  const uncertainty = [];
  const normalizedArtifacts = normalizeArtifacts(shape, artifacts, uncertainty);
  const resources = canonicalize(shape.resources);
  for (const resource of resources) {
    if (!costClasses.has(resource.costClass)) {
      throw new Error(`Deployment resource ${resource.id} has no supported cost classification.`);
    }
  }
  if (normalizedObservations.zeroSpendRequired) {
    const exposed = resources.filter(resource => strictZeroSpendBlockedClasses.has(resource.costClass));
    if (exposed.length) {
      throw new Error(`Strict zero-spend cannot be established: ${exposed.map(resource => resource.id).join(', ')}.`);
    }
  }

  const actions = canonicalize({
    publication: shape.actions.publication.map(action => ({
      ...action,
      observedRegistry: normalizedObservations.registry,
      approvalStatus: 'not-recorded',
    })),
    identity: shape.actions.identity,
    network: [...shape.actions.network, ...normalizedObservations.networkActions],
  });
  const plan = {
    schemaVersion: 1,
    shapeId: shape.id,
    shapeRevision: shape.revision,
    shapeStatus: shape.status,
    access: shape.access,
    inputs: normalizedInputs,
    artifacts: normalizedArtifacts,
    resources,
    costs: resources.map(resource => ({
      component: resource.id,
      classification: resource.costClass,
      sku: resource.sku,
      lifecycle: resource.lifecycle,
    })),
    actions,
    observations: normalizedObservations,
    uncertainty: [
      ...uncertainty,
      ...planUncertainty(normalizedInputs, normalizedArtifacts, resources, normalizedObservations, shape),
    ],
  };
  return { ...plan, planHash: hashPlan(plan) };
}

function validatePlanHash(plan, label) {
  if (!isRecord(plan) || typeof plan.planHash !== 'string' || hashPlan(plan) !== plan.planHash) {
    return { valid: false, change: `${label}.planHash` };
  }
  return { valid: true };
}

function sameValue(left, right) {
  if (left === undefined || right === undefined) return left === right;
  return canonicalJson(left) === canonicalJson(right);
}

export function compareApprovedScope(approvedPlan, proposedPlan) {
  const approvedHash = validatePlanHash(approvedPlan, 'approved');
  const proposedHash = validatePlanHash(proposedPlan, 'proposed');
  if (!approvedHash.valid || !proposedHash.valid) {
    return {
      applicable: false,
      changes: [approvedHash.change, proposedHash.change].filter(Boolean),
    };
  }

  const changes = [];
  for (const field of ['shapeId', 'shapeRevision', 'shapeStatus', 'access']) {
    if (!sameValue(approvedPlan[field], proposedPlan[field])) changes.push(field);
  }
  for (const key of new Set([...Object.keys(approvedPlan.inputs), ...Object.keys(proposedPlan.inputs)])) {
    if (!sameValue(approvedPlan.inputs[key], proposedPlan.inputs[key])) changes.push(`inputs.${key}`);
  }
  for (const [field, key] of [['artifacts', 'name'], ['resources', 'id'], ['costs', 'component']]) {
    const approved = new Map(approvedPlan[field].map(item => [item[key], item]));
    const proposed = new Map(proposedPlan[field].map(item => [item[key], item]));
    for (const name of new Set([...approved.keys(), ...proposed.keys()])) {
      if (!sameValue(approved.get(name), proposed.get(name))) changes.push(`${field}.${name}`);
    }
  }
  for (const category of ['publication', 'identity', 'network']) {
    if (!sameValue(approvedPlan.actions[category], proposedPlan.actions[category])) {
      changes.push(`actions.${category}`);
    }
  }
  for (const field of ['zeroSpendRequired', 'regionEligibility']) {
    if (!sameValue(approvedPlan.observations[field], proposedPlan.observations[field])) {
      changes.push(`observations.${field}`);
    }
  }
  if (!sameValue(approvedPlan.uncertainty, proposedPlan.uncertainty)) changes.push('uncertainty');
  return { applicable: changes.length === 0, changes };
}

function runReadOnly(command, args) {
  const windowsNpm = process.platform === 'win32' && command === 'npm';
  const executable = windowsNpm ? (process.env.ComSpec || 'cmd.exe') : command;
  const executableArgs = windowsNpm ? ['/d', '/s', '/c', 'npm config get registry'] : args;
  const result = spawnSync(executable, executableArgs, { encoding: 'utf8', windowsHide: true });
  if (result.error) {
    if (result.error.code === 'ENOENT') return { ok: false, missing: true, stdout: '' };
    throw new Error(`Could not inspect ${command}: ${result.error.message}`, { cause: result.error });
  }
  return { ok: result.status === 0, stdout: result.stdout || '' };
}

export async function inspectDeploymentPreflight({ directory = root, run = runReadOnly } = {}) {
  directory = resolve(directory);
  const profile = deploymentProfile(JSON.parse(await readFile(resolve(directory, 'deployment.json'), 'utf8')));
  const shape = resolveShape(profile);
  const requiredFiles = [
    'deployment.json',
    'package.json',
    'package-lock.json',
    profile.template,
    ...(profile.api === 'dab' ?
      ['Dockerfile.web', 'Dockerfile.dab'] :
      ['staticwebapp.config.json', 'packages/functions/package.json', 'packages/functions/package-lock.json']),
  ];
  const fileChecks = [];
  for (const file of requiredFiles) {
    let available = true;
    try { await access(resolve(directory, file)); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      available = false;
    }
    fileChecks.push({ path: file, available });
  }

  const locate = process.platform === 'win32' ? 'where.exe' : 'which';
  const tools = {};
  for (const tool of ['az', 'docker', 'node', 'npm']) {
    const result = await run(locate, [tool]);
    tools[tool] = { available: result.ok };
  }
  let registry = null;
  if (tools.npm.available) {
    const result = await run('npm', ['config', 'get', 'registry']);
    if (!result.ok) throw new Error('Could not read the configured npm registry.');
    registry = sanitizeRegistry(result.stdout.trim());
  }
  const plan = createDeploymentPlan({
    shape,
    inputs: {},
    observations: { registry, networkActions: [] },
    artifacts: {},
  });
  return {
    profile: { hosting: profile.hosting, api: profile.api, access: profile.access || 'protected' },
    shape: { id: shape.id, revision: shape.revision, status: shape.status },
    tools,
    requiredFiles: fileChecks,
    npmRegistry: registry,
    missingConfiguration: [
      ...plan.uncertainty.filter(item => item.kind === 'missing-input'),
      ...fileChecks.filter(item => !item.available)
        .map(item => ({ kind: 'missing-configuration', name: item.path })),
    ],
    uncertainty: [
      ...plan.uncertainty,
      ...fileChecks.filter(item => !item.available)
        .map(item => ({ kind: 'missing-configuration', name: item.path })),
    ],
    access: 'not-established-read-only',
    provisioningEligibility: 'not-established-read-only',
    sideEffects: [],
  };
}

export async function runDeploymentCommand(command, options = {}) {
  if (command !== 'preflight' && command !== 'plan') {
    throw new Error(`Unsupported deployment planning command: ${command}.`);
  }
  const preflight = await inspectDeploymentPreflight(options);
  if (command === 'preflight') return preflight;

  const shape = resolveShape({
    hosting: preflight.profile.hosting,
    api: preflight.profile.api,
    ...(preflight.profile.access === 'public-submissions' ? { access: 'public-submissions' } : {}),
  });
  const plan = createDeploymentPlan({
    shape,
    inputs: {},
    observations: { registry: preflight.npmRegistry, networkActions: [] },
    artifacts: {},
  });
  return { preflight, plan };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const command = process.argv[2];
  const result = await runDeploymentCommand(command);
  console.log(JSON.stringify(result, null, 2));
}
