import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compareApprovedScope } from './deployment-plan.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const phases = ['publish', 'foundation', 'bootstrap', 'applications', 'verify'];
const phaseStatuses = new Set(['pending', 'succeeded', 'failed', 'uncertain']);
const safeCode = /^[a-z0-9][a-z0-9._-]{0,100}$/i;
const referenceCredential = /(?:password|pwd|client_secret|access_token|refresh_token|authorization|secret|token|credential|connection.?string|sas)\s*[:=]|\bbearer\s+\S+/i;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function assertSafeReference(value, label) {
  if (typeof value !== 'string' || !value.trim() || referenceCredential.test(value)) {
    throw new Error(`${label} must be a non-empty reference without credential material.`);
  }
  if (/[?#\s]/.test(value.trim()) || /^[^/\s@]+:[^/\s@]+@/.test(value.trim()) ||
      /https?:\/\/[^/\s@]+:[^/\s@]+@/i.test(value.trim())) {
    throw new Error(`${label} must not contain credentials, query values, fragments, or whitespace.`);
  }
  if (value.includes('://')) {
    let url;
    try { url = new URL(value); }
    catch { throw new Error(`${label} is not a valid URL.`); }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error(`${label} must not contain credentials, query values, or fragments.`);
    }
  }
  return value.trim();
}

function normalizeReferences(value, kind) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Adapter ${kind} references must be an array.`);
  const allowed = kind === 'artifacts' ? new Set(['name', 'reference', 'digest']) : new Set(['id', 'reference']);
  const keyName = kind === 'artifacts' ? 'name' : 'id';
  const entries = value.map((entry, index) => {
    if (!isRecord(entry) || Object.keys(entry).some(key => !allowed.has(key))) {
      throw new Error(`Adapter ${kind} reference ${index} contains unsupported fields.`);
    }
    const key = entry[keyName];
    if (typeof key !== 'string' || !key.trim() || !/^[a-z0-9][a-z0-9._-]*$/i.test(key)) {
      throw new Error(`Adapter ${kind} reference ${index} has an invalid ${keyName}.`);
    }
    const reference = assertSafeReference(entry.reference, `Adapter ${kind} reference ${index}`);
    if (kind === 'artifacts') {
      if (typeof entry.digest !== 'string' || !/^sha256:[a-f0-9]{64}$/i.test(entry.digest)) {
        throw new Error(`Adapter artifact reference ${index} requires an immutable SHA-256 digest.`);
      }
      return { name: key, reference, digest: entry.digest.toLowerCase() };
    }
    return { id: key, reference };
  });
  entries.sort((left, right) => left[keyName].localeCompare(right[keyName]));
  if (new Set(entries.map(entry => entry[keyName])).size !== entries.length) {
    throw new Error(`Adapter ${kind} references must not contain duplicate names.`);
  }
  return entries;
}

function normalizeMigrationChecksums(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Bootstrap migration checksums must be an array.');
  return value.map((entry, index) => {
    if (!isRecord(entry) || Object.keys(entry).some(key => !['version', 'checksum'].includes(key)) ||
        !Number.isSafeInteger(entry.version) || entry.version !== index + 1 ||
        typeof entry.checksum !== 'string' || !/^sha256:[a-f0-9]{64}$/i.test(entry.checksum)) {
      throw new Error('Bootstrap migrations must be consecutive and include immutable SHA-256 checksums.');
    }
    return { version: entry.version, checksum: entry.checksum.toLowerCase() };
  });
}

function initialReceipt(planHash, planSnapshot) {
  return {
    schemaVersion: 1,
    planHash,
    planSnapshot: structuredClone(planSnapshot),
    phases: Object.fromEntries(phases.map(phase => [phase, 'pending'])),
    phaseReferences: Object.fromEntries(phases.map(phase => [phase, {
      artifacts: [], resources: [], migrationChecksums: [],
    }])),
    artifacts: [],
    resources: [],
    errorCodes: {},
  };
}

function normalizeReceipt(receipt, planHash, planSnapshot) {
  if (receipt === undefined || receipt === null) return initialReceipt(planHash, planSnapshot);
  const allowed = new Set(['schemaVersion', 'planHash', 'planSnapshot', 'phases', 'phaseReferences', 'artifacts', 'resources', 'errorCodes']);
  if (!isRecord(receipt) || Object.keys(receipt).some(key => !allowed.has(key)) ||
      receipt.schemaVersion !== 1 || typeof receipt.planHash !== 'string' ||
      !isRecord(receipt.planSnapshot) || receipt.planSnapshot.planHash !== receipt.planHash ||
      !compareApprovedScope(receipt.planSnapshot, receipt.planSnapshot).applicable ||
      !isRecord(receipt.phases) || !isRecord(receipt.phaseReferences) ||
      !isRecord(receipt.errorCodes)) {
    throw new Error('Deployment receipt has an unsupported or malformed shape.');
  }
  const normalized = initialReceipt(receipt.planHash, receipt.planSnapshot);
  for (const phase of phases) {
    const status = receipt.phases[phase];
    const references = receipt.phaseReferences[phase];
    if (!phaseStatuses.has(status) || !isRecord(references) ||
        Object.keys(references).some(key => !['artifacts', 'resources', 'migrationChecksums'].includes(key))) {
      throw new Error(`Deployment receipt has invalid state for phase ${phase}.`);
    }
    normalized.phases[phase] = status;
    normalized.phaseReferences[phase] = {
      artifacts: normalizeReferences(references.artifacts, 'artifacts'),
      resources: normalizeReferences(references.resources, 'resources'),
      migrationChecksums: normalizeMigrationChecksums(references.migrationChecksums),
    };
    const errorCode = receipt.errorCodes[phase];
    if (errorCode !== undefined) {
      if (typeof errorCode !== 'string' || !safeCode.test(errorCode)) {
        throw new Error(`Deployment receipt has an unsafe error code for phase ${phase}.`);
      }
      normalized.errorCodes[phase] = errorCode;
    }
  }
  if (Object.keys(receipt.phases).some(phase => !phases.includes(phase)) ||
      Object.keys(receipt.phaseReferences).some(phase => !phases.includes(phase)) ||
      Object.keys(receipt.errorCodes).some(phase => !phases.includes(phase))) {
    throw new Error('Deployment receipt contains an unknown phase.');
  }
  normalized.artifacts = normalizeReferences(receipt.artifacts, 'artifacts');
  normalized.resources = normalizeReferences(receipt.resources, 'resources');
  const expectedArtifacts = phases.flatMap(phase => normalized.phaseReferences[phase].artifacts);
  const expectedResources = phases.flatMap(phase => normalized.phaseReferences[phase].resources);
  if (!sameReferences(normalized.artifacts, mergeReferences([], expectedArtifacts, 'artifacts')) ||
      !sameReferences(normalized.resources, mergeReferences([], expectedResources, 'resources'))) {
    throw new Error('Deployment receipt aggregate references do not match phase references.');
  }
  return normalized;
}

function sameReferences(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeReferences(current, updates, kind) {
  const key = kind === 'artifacts' ? 'name' : 'id';
  const merged = new Map(current.map(reference => [reference[key], reference]));
  for (const reference of updates) merged.set(reference[key], reference);
  return [...merged.values()].sort((left, right) => left[key].localeCompare(right[key]));
}

function adapterResult(result, phase) {
  const allowed = new Set(['status', 'artifacts', 'resources', 'migrationChecksums', 'errorCode']);
  if (!isRecord(result) || Object.keys(result).some(key => !allowed.has(key)) ||
      !['succeeded', 'failed'].includes(result.status)) {
    throw new Error(`Adapter returned an invalid result for ${phase}.`);
  }
  const artifacts = normalizeReferences(result.artifacts, 'artifacts');
  const resources = normalizeReferences(result.resources, 'resources');
  const migrationChecksums = normalizeMigrationChecksums(result.migrationChecksums);
  if (phase === 'bootstrap' && result.status === 'succeeded' && migrationChecksums.length === 0) {
    throw new Error('Successful bootstrap requires checksums for every applied forward migration.');
  }
  if (phase !== 'bootstrap' && migrationChecksums.length > 0) {
    throw new Error('Migration checksums may be recorded only by the bootstrap phase.');
  }
  if (result.status === 'failed' && (typeof result.errorCode !== 'string' || !safeCode.test(result.errorCode))) {
    throw new Error(`Adapter failure for ${phase} must include a non-secret error code.`);
  }
  if (result.status === 'succeeded' && result.errorCode !== undefined) {
    throw new Error(`Successful adapter result for ${phase} must not include an error code.`);
  }
  return {
    status: result.status,
    artifacts,
    resources,
    migrationChecksums,
    ...(result.errorCode ? { errorCode: result.errorCode } : {}),
  };
}

function ensurePlan(plan) {
  const comparison = compareApprovedScope(plan, plan);
  if (!comparison.applicable) throw new Error(`Deployment plan scope is invalid: ${comparison.changes.join(', ')}.`);
}

async function observePhase({ phase, plan, receipt, adapter }) {
  if (typeof adapter.reconcile !== 'function') {
    throw new Error(`Adapter must reconcile completed phase ${phase} before execution can continue.`);
  }
  let observed;
  try {
    observed = adapterResult(await adapter.reconcile({
      phase,
      plan: structuredClone(plan),
      receipt: structuredClone(receipt),
    }), phase);
  } catch {
    const error = new Error(`Reconciliation of ${phase} failed or returned unsafe state; no next phase may run.`);
    error.code = 'DEPLOYMENT_RECONCILIATION_REQUIRED';
    error.receipt = structuredClone(receipt);
    throw error;
  }
  return observed;
}

async function reconcilePhase({ phase, plan, receipt, adapter }) {
  const observed = await observePhase({ phase, plan, receipt, adapter });
  const expected = receipt.phaseReferences[phase];
  if (observed.status !== 'succeeded' ||
      !sameReferences(observed.artifacts, expected.artifacts) ||
      !sameReferences(observed.resources, expected.resources) ||
      !sameReferences(observed.migrationChecksums, expected.migrationChecksums)) {
    throw new Error(`Observed state for ${phase} differs from its receipt; review the scope before continuing.`);
  }
}

function recordPhaseResult(receipt, phase, result) {
  const updated = structuredClone(receipt);
  updated.phases[phase] = result.status;
  updated.phaseReferences[phase] = {
    artifacts: result.artifacts,
    resources: result.resources,
    migrationChecksums: result.migrationChecksums,
  };
  updated.artifacts = mergeReferences(updated.artifacts, result.artifacts, 'artifacts');
  updated.resources = mergeReferences(updated.resources, result.resources, 'resources');
  if (result.errorCode) updated.errorCodes[phase] = result.errorCode;
  else delete updated.errorCodes[phase];
  return updated;
}

function normalizeObservedState(observed) {
  if (!isRecord(observed) || Object.keys(observed).some(key => !['inventory', 'resources', 'phases'].includes(key))) {
    throw new Error('Observed deployment state must contain only inventory, resources, and phases.');
  }
  const inventory = observed.inventory ?? [];
  const resources = observed.resources ?? [];
  const phaseResults = observed.phases ?? {};
  if (!Array.isArray(inventory) || !Array.isArray(resources) || !isRecord(phaseResults)) {
    throw new Error('Observed inventory, resources, or phases have an invalid shape.');
  }
  const normalizedInventory = inventory.map((item, index) => {
    if (!isRecord(item) || Object.keys(item).some(key => !['id', 'reference'].includes(key)) ||
        typeof item.id !== 'string' || !item.id.trim()) {
      throw new Error(`Observed inventory entry ${index} is invalid.`);
    }
    return { id: item.id, reference: assertSafeReference(item.reference, `Observed inventory entry ${index}`) };
  });
  const normalizedResources = resources.map((item, index) => {
    if (!isRecord(item) ||
        Object.keys(item).some(key => !['id', 'phase', 'state', 'ownership', 'reference'].includes(key)) ||
        typeof item.id !== 'string' || !item.id.trim() ||
        !['foundation', 'applications'].includes(item.phase) ||
        !['succeeded', 'failed', 'creating', 'absent', 'unknown'].includes(item.state) ||
        !['owned', 'approved-reuse', 'unknown'].includes(item.ownership ?? 'unknown')) {
      throw new Error(`Observed resource state ${index} is invalid.`);
    }
    return {
      id: item.id,
      phase: item.phase,
      state: item.state,
      ownership: item.ownership ?? 'unknown',
      ...(item.reference === undefined ? {} : {
        reference: assertSafeReference(item.reference, `Observed resource state ${index}`),
      }),
    };
  });
  const normalizedPhases = {};
  for (const [phase, result] of Object.entries(phaseResults)) {
    if (!phases.includes(phase) || !isRecord(result) ||
        Object.keys(result).some(key => !['status', 'artifacts', 'resources', 'migrationChecksums', 'errorCode'].includes(key)) ||
        !['succeeded', 'failed', 'in-progress', 'unknown'].includes(result.status)) {
      throw new Error(`Observed result for phase ${phase} is invalid.`);
    }
    const errorCode = result.errorCode;
    if (errorCode !== undefined && (typeof errorCode !== 'string' || !safeCode.test(errorCode))) {
      throw new Error(`Observed result for phase ${phase} has an unsafe error code.`);
    }
    normalizedPhases[phase] = {
      status: result.status,
      artifacts: normalizeReferences(result.artifacts, 'artifacts'),
      resources: normalizeReferences(result.resources, 'resources'),
      migrationChecksums: normalizeMigrationChecksums(result.migrationChecksums),
      ...(errorCode ? { errorCode } : {}),
    };
  }
  for (const [label, items] of [['inventory', normalizedInventory], ['resource states', normalizedResources]]) {
    const identifiers = items.map(item => item.id);
    if (new Set(identifiers).size !== identifiers.length) {
      throw new Error(`Observed ${label} must not contain duplicate resource IDs.`);
    }
  }
  return { inventory: normalizedInventory, resources: normalizedResources, phases: normalizedPhases };
}

function resourcePhase(resource) {
  return /Microsoft\.App\/containerApps|Microsoft\.Web\/(?:sites|staticSites)|Functions component/i.test(resource.type);
}

export function reconcileDeployment({ plan, receipt, observed }) {
  ensurePlan(plan);
  const currentReceipt = normalizeReceipt(receipt, plan.planHash, plan);
  const normalizedObserved = normalizeObservedState(observed);
  const discrepancies = [];
  const proposedRecovery = [];
  const addIssue = (kind, details = {}, proposal) => {
    discrepancies.push({ kind, ...details });
    if (proposal) proposedRecovery.push({ automatic: false, ...proposal });
  };
  if (currentReceipt.planHash !== plan.planHash) {
    const scope = compareApprovedScope(currentReceipt.planSnapshot, plan);
    addIssue('plan-scope-changed', {
      expectedPlanHash: currentReceipt.planHash,
      observedPlanHash: plan.planHash,
    }, {
      action: 'review-new-plan',
      scopeDelta: scope.applicable ? ['planHash'] : scope.changes,
    });
    return { completedPhases: [], discrepancies, proposedRecovery };
  }

  const plannedResources = new Map(plan.resources.map(resource => [resource.id, resource]));
  const inventory = new Map(normalizedObserved.inventory.map(item => [item.id, item]));
  const observedResources = new Map(normalizedObserved.resources.map(item => [item.id, item]));
  const blockedResources = new Set();
  for (const resource of normalizedObserved.resources) {
    const planned = plannedResources.get(resource.id);
    if (!planned) {
      blockedResources.add(resource.id);
      addIssue('unplanned-resource-observation', { resourceId: resource.id }, {
        action: 'review-resource-ownership',
        resourceId: resource.id,
        scopeDelta: { addedResource: resource.id },
      });
      continue;
    }
    const listed = inventory.get(resource.id);
    if (resource.state === 'failed') {
      blockedResources.add(resource.id);
      if (!listed || (resource.reference && listed.reference !== resource.reference)) {
        addIssue('failed-resource-name-reservation', {
          resourceId: resource.id,
          ...(resource.reference ? { reference: resource.reference } : {}),
        }, {
          action: 'inspect-resource-reservation',
          resourceId: resource.id,
          ...(resource.reference ? { reference: resource.reference } : {}),
          scopeDelta: { inventoryReference: listed?.reference ?? null, observedReference: resource.reference ?? null },
        });
      } else {
        addIssue('resource-provisioning-failed', { resourceId: resource.id }, {
          action: 'review-failed-resource',
          resourceId: resource.id,
          scopeDelta: { reference: resource.reference },
        });
      }
      continue;
    }
    if (resource.state !== 'succeeded' || resource.ownership === 'unknown' || !resource.reference) {
      blockedResources.add(resource.id);
      addIssue('resource-state-or-ownership-unknown', { resourceId: resource.id, state: resource.state }, {
        action: 'review-resource-ownership',
        resourceId: resource.id,
        scopeDelta: { observedState: resource.state, ownership: resource.ownership },
      });
      continue;
    }
    if (!listed || listed.reference !== resource.reference) {
      blockedResources.add(resource.id);
      addIssue('resource-inventory-mismatch', { resourceId: resource.id }, {
        action: 'inspect-resource-inventory',
        resourceId: resource.id,
        scopeDelta: { inventoryReference: listed?.reference ?? null, observedReference: resource.reference },
      });
      continue;
    }
    const explicitlyReused = planned.lifecycle === 'reuse' ||
      plan.inputs.resourceReuse?.[resource.id] === true ||
      plan.inputs.resourceReuse?.[resource.id] === 'approved';
    const priorReference = currentReceipt.resources.find(item => item.id === resource.id);
    if (priorReference && priorReference.reference !== resource.reference) {
      blockedResources.add(resource.id);
      addIssue('resource-reference-changed', {
        resourceId: resource.id,
        expectedReference: priorReference.reference,
        observedReference: resource.reference,
      }, {
        action: 'review-resource-reference',
        resourceId: resource.id,
        scopeDelta: { expectedReference: priorReference.reference, observedReference: resource.reference },
      });
    }
    if (resource.ownership === 'approved-reuse' && !explicitlyReused) {
      blockedResources.add(resource.id);
      addIssue('unapproved-resource-reuse', { resourceId: resource.id }, {
        action: 'review-resource-reuse',
        resourceId: resource.id,
        scopeDelta: { lifecycle: planned.lifecycle, ownership: resource.ownership },
      });
      continue;
    }
  }

  const phaseComplete = Object.fromEntries(phases.map(phase => [phase, false]));
  for (const phase of phases) {
    const observedPhase = normalizedObserved.phases[phase];
    if (!observedPhase) {
      if (['succeeded', 'uncertain'].includes(currentReceipt.phases[phase])) {
        addIssue('phase-not-observed', { phase }, {
          action: 'inspect-phase-state',
          phase,
          scopeDelta: { recordedStatus: currentReceipt.phases[phase], observedStatus: null },
        });
      }
      continue;
    }
    if (observedPhase.status !== 'succeeded') {
      if (phase === 'bootstrap' && observedPhase.migrationChecksums.length > 0) {
        addIssue('partial-bootstrap', { phase, recordedMigrationCount: observedPhase.migrationChecksums.length }, {
          action: 'complete-forward-migrations',
          phase,
          scopeDelta: { appliedChecksums: observedPhase.migrationChecksums },
        });
      } else if (currentReceipt.phases[phase] === 'succeeded') {
        addIssue('receipt-observation-mismatch', {
          phase,
          recordedStatus: currentReceipt.phases[phase],
          observedStatus: observedPhase.status,
        }, {
          action: 'review-phase-state',
          phase,
          scopeDelta: { recordedStatus: currentReceipt.phases[phase], observedStatus: observedPhase.status },
        });
      }
      continue;
    }

    let valid = true;
    if (phase === 'publish') {
      const publishNames = new Set(plan.actions.publication.map(action => action.artifact).filter(Boolean));
      const expected = plan.artifacts.filter(item => item.identifier && publishNames.has(item.name))
        .map(({ name, reference, digest }) => ({ name, reference, digest }));
      if (expected.length !== publishNames.size ||
          !sameReferences(observedPhase.artifacts, normalizeReferences(expected, 'artifacts'))) {
        valid = false;
        addIssue('artifact-reference-changed', { phase }, {
          action: 'review-artifact-reference',
          phase,
          scopeDelta: { planned: expected, observed: observedPhase.artifacts },
        });
      }
    }
    if (phase === 'foundation' || phase === 'applications') {
      const expectedResources = plan.resources.filter(resource =>
        resource.lifecycle !== 'conditional' && resourcePhase(resource) === (phase === 'applications'));
      const observedIds = new Set(observedPhase.resources.map(item => item.id));
      for (const resource of expectedResources) {
        if (!observedIds.has(resource.id)) {
          valid = false;
          addIssue('phase-resource-evidence-missing', { phase, resourceId: resource.id }, {
            action: 'inspect-phase-resources',
            phase,
            resourceId: resource.id,
            scopeDelta: { expectedResource: resource.id, observed: false },
          });
        }
      }
      if (observedPhase.resources.length === 0) {
        valid = false;
        addIssue('phase-resource-evidence-missing', { phase }, {
          action: 'inspect-phase-resources',
          phase,
          scopeDelta: { observedResourceCount: 0 },
        });
      }
      for (const reference of observedPhase.resources) {
        if (!expectedResources.some(resource => resource.id === reference.id)) {
          valid = false;
          addIssue('unplanned-phase-resource-reference', { phase, resourceId: reference.id }, {
            action: 'review-phase-resources',
            phase,
            resourceId: reference.id,
            scopeDelta: { observedResource: reference.id },
          });
          continue;
        }
        const resource = observedResources.get(reference.id);
        if (!resource || resource.phase !== phase || resource.state !== 'succeeded' ||
            resource.ownership === 'unknown' || resource.reference !== reference.reference ||
            blockedResources.has(reference.id)) {
          valid = false;
          if (!discrepancies.some(item => item.resourceId === reference.id)) {
            addIssue('phase-resource-not-reconciled', { phase, resourceId: reference.id }, {
              action: 'inspect-phase-resources',
              phase,
              resourceId: reference.id,
              scopeDelta: { phaseReference: reference.reference, observedState: resource?.state ?? null },
            });
          }
        }
      }
    }
    if (phase === 'bootstrap' && observedPhase.migrationChecksums.length === 0) {
      valid = false;
      addIssue('bootstrap-checksums-missing', { phase }, {
        action: 'inspect-forward-migrations',
        phase,
        scopeDelta: { checksumCount: 0 },
      });
    }
    const recorded = currentReceipt.phaseReferences[phase];
    if (currentReceipt.phases[phase] === 'succeeded' &&
        (!sameReferences(recorded.artifacts, observedPhase.artifacts) ||
         !sameReferences(recorded.resources, observedPhase.resources) ||
         !sameReferences(recorded.migrationChecksums, observedPhase.migrationChecksums))) {
      valid = false;
      addIssue('receipt-observation-mismatch', { phase }, {
        action: 'review-phase-references',
        phase,
        scopeDelta: { recorded: currentReceipt.phases[phase], observed: observedPhase.status },
      });
    }
    if (valid) {
      phaseComplete[phase] = true;
      if (currentReceipt.phases[phase] !== 'succeeded') {
        proposedRecovery.push({
          action: 'record-observed-phase',
          phase,
          automatic: false,
          scopeDelta: { recordedStatus: currentReceipt.phases[phase], observedStatus: 'succeeded' },
        });
      }
    }
  }

  const completedPhases = [];
  for (const phase of phases) {
    if (!phaseComplete[phase]) break;
    completedPhases.push(phase);
  }
  return { completedPhases, discrepancies, proposedRecovery };
}

export async function executeDeploymentPhase({ plan, phase, receipt, authorize, adapter }) {
  ensurePlan(plan);
  if (!phases.includes(phase)) throw new Error(`Unsupported deployment phase: ${phase}.`);
  const currentReceipt = normalizeReceipt(receipt, plan.planHash, plan);
  if (currentReceipt.planHash !== plan.planHash) {
    const scope = compareApprovedScope(currentReceipt.planSnapshot, plan);
    throw new Error(`Deployment receipt belongs to a different plan scope; create and approve a new plan. Scope changes: ${scope.changes.join(', ')}.`);
  }
  const index = phases.indexOf(phase);
  for (const previous of phases.slice(0, index)) {
    if (currentReceipt.phases[previous] !== 'succeeded') {
      throw new Error(`Deployment phase ${phase} is blocked because ${previous} is ${currentReceipt.phases[previous]}.`);
    }
  }
  if (typeof authorize !== 'function') {
    throw new Error('A host authorization callback is required; plans and receipts cannot authorize deployment.');
  }
  if (!adapter || typeof adapter.execute !== 'function') {
    throw new Error('A deployment adapter with execute() is required.');
  }

  const decision = await authorize({
    phase,
    planHash: plan.planHash,
    plan: structuredClone(plan),
    receipt: structuredClone(currentReceipt),
  });
  if (!isRecord(decision) || decision.authorized !== true ||
      decision.phase !== phase || decision.planHash !== plan.planHash) {
    throw new Error('Host authorization must approve the matching plan scope and phase.');
  }

  for (const previous of phases.slice(0, index)) {
    await reconcilePhase({ phase: previous, plan, receipt: currentReceipt, adapter });
  }

  if (currentReceipt.phases[phase] === 'succeeded') {
    await reconcilePhase({ phase, plan, receipt: currentReceipt, adapter });
    return {
      phase,
      status: 'succeeded',
      reused: true,
      receipt: currentReceipt,
      artifactRefs: structuredClone(currentReceipt.artifacts),
      resourceRefs: structuredClone(currentReceipt.resources),
    };
  }
  if (currentReceipt.phases[phase] === 'uncertain') {
    const observed = await observePhase({ phase, plan, receipt: currentReceipt, adapter });
    const updated = recordPhaseResult(currentReceipt, phase, observed);
    return {
      phase,
      status: observed.status,
      reused: true,
      receipt: updated,
      artifactRefs: structuredClone(updated.artifacts),
      resourceRefs: structuredClone(updated.resources),
    };
  }
  if (currentReceipt.phases[phase] !== 'pending') {
    throw new Error(`Deployment phase ${phase} is ${currentReceipt.phases[phase]}; reconcile it before retrying.`);
  }

  let result;
  try {
    result = adapterResult(await adapter.execute({
      phase,
      plan: structuredClone(plan),
      receipt: structuredClone(currentReceipt),
    }), phase);
  } catch {
    const uncertainReceipt = structuredClone(currentReceipt);
    uncertainReceipt.phases[phase] = 'uncertain';
    uncertainReceipt.errorCodes[phase] = 'adapter-outcome-uncertain';
    const error = new Error(`Deployment phase ${phase} has an uncertain outcome; reconcile state before continuing.`);
    error.code = 'DEPLOYMENT_OUTCOME_UNCERTAIN';
    error.receipt = uncertainReceipt;
    throw error;
  }

  const updated = recordPhaseResult(currentReceipt, phase, result);
  return {
    phase,
    status: result.status,
    reused: false,
    receipt: updated,
    artifactRefs: structuredClone(updated.artifacts),
    resourceRefs: structuredClone(updated.resources),
  };
}

export function deploymentStatus(receipt) {
  if (!isRecord(receipt)) throw new Error('Deployment receipt has an unsupported or malformed shape.');
  const normalized = normalizeReceipt(receipt, receipt.planHash, receipt.planSnapshot);
  return {
    planHash: normalized.planHash,
    phases: structuredClone(normalized.phases),
    errorCodes: structuredClone(normalized.errorCodes),
    artifactRefs: structuredClone(normalized.artifacts),
    resourceRefs: structuredClone(normalized.resources),
    migrationChecksums: structuredClone(normalized.phaseReferences.bootstrap.migrationChecksums),
  };
}

async function runCli(command) {
  if (command === 'apply') {
    throw new Error('Standalone deployment:apply is disabled. A VS Code host must supply authorization and the deployment adapter.');
  }
  if (command !== 'status') throw new Error(`Unsupported deployment execution command: ${command}.`);
  const receiptPath = resolve(root, '.deployment', 'receipt.json');
  let receipt;
  try { receipt = JSON.parse(await readFile(receiptPath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No deployment receipt exists; no deployment phases have been recorded.');
      return;
    }
    throw error;
  }
  console.log(JSON.stringify(deploymentStatus(receipt), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runCli(process.argv[2]);
}
