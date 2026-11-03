const milestoneKinds = ['idea-start', 'local-verified', 'deployed-verified', 'owner-verified'];
const deploymentPhases = new Set(['publish', 'foundation', 'bootstrap', 'applications', 'verify']);
const sensitiveValue = /([a-z0-9_-]*(?:password|pwd|client[_-]?secret|access[_-]?token|refresh[_-]?token|token|secret|credential|connection[_-]?string|sas|signature|sig|api[_-]?key)[a-z0-9_-]*\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s&;,]+)/gi;
const safeCode = /^[a-z0-9][a-z0-9._-]{0,100}$/i;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function oneLine(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value
    .replace(/https?:\/\/[^/\s@]+:[^/\s@]+@/gi, match => `${match.split('://')[0]}://[REDACTED]@`)
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(sensitiveValue, '$1[REDACTED]')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validUtc(value) {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value;
}

function normalizeEvent(event) {
  const keys = ['kind', 'utc', 'phase', 'result', 'evidenceRefs'];
  if (!isRecord(event) || Object.keys(event).some(key => !keys.includes(key)) ||
      keys.some(key => !Object.hasOwn(event, key)) || !validUtc(event.utc) ||
      typeof event.kind !== 'string' || typeof event.phase !== 'string' ||
      typeof event.result !== 'string' || !Array.isArray(event.evidenceRefs)) {
    throw new Error('Benchmark events require kind, UTC timestamp, phase, result, and evidence references.');
  }
  const kind = event.kind;
  const allowedKinds = new Set([...milestoneKinds, 'phase', 'wait', 'feedback']);
  if (!allowedKinds.has(kind)) throw new Error(`Unsupported benchmark event kind: ${kind}.`);
  const phase = oneLine(event.phase, 'Benchmark phase');
  if (!/^[a-z][a-z0-9._-]{0,80}$/i.test(phase)) throw new Error('Benchmark phase must be a short identifier.');
  const result = oneLine(event.result, 'Benchmark result');
  const evidenceRefs = event.evidenceRefs.map((reference, index) => oneLine(reference, `Evidence reference ${index}`));

  if (kind === 'idea-start' && (phase !== 'idea' || result !== 'started')) {
    throw new Error('idea-start must use phase idea and result started.');
  }
  if (kind === 'local-verified' && (phase !== 'local' || result !== 'verified' || evidenceRefs.length === 0)) {
    throw new Error('local-verified requires local phase evidence.');
  }
  if (kind === 'deployed-verified' &&
      (phase !== 'cloud' || result !== 'verified' || evidenceRefs.length === 0)) {
    throw new Error('deployed-verified requires cloud phase evidence.');
  }
  if (kind === 'owner-verified' &&
      (phase !== 'owner-acceptance' || !['verified', 'rejected'].includes(result) ||
       (result === 'verified' && evidenceRefs.length === 0))) {
    throw new Error('owner-verified requires a separate owner-acceptance result and evidence.');
  }
  if (kind === 'phase' &&
      (!deploymentPhases.has(phase) || !['started', 'resumed', 'succeeded', 'failed'].includes(result))) {
    throw new Error('Phase events require a known deployment phase and lifecycle result.');
  }
  if (kind === 'wait' && (!['approval', 'sign-in'].includes(phase) || !['started', 'ended'].includes(result))) {
    throw new Error('Wait events require approval or sign-in phase and a started/ended result.');
  }
  if (kind === 'feedback' && phase !== 'correction') {
    throw new Error('Feedback events must use the correction phase.');
  }
  return { kind, utc: event.utc, phase, result, evidenceRefs };
}

function validateLog(log) {
  if (log === undefined || log === null) return { schemaVersion: 1, events: [] };
  if (!isRecord(log) || Object.keys(log).some(key => !['schemaVersion', 'events'].includes(key)) ||
      log.schemaVersion !== 1 || !Array.isArray(log.events)) {
    throw new Error('Benchmark log has an unsupported or malformed shape.');
  }
  const events = log.events.map(normalizeEvent);
  let previousUtc = -Infinity;
  const milestones = new Map();
  const openWaits = new Set();
  for (const event of events) {
    const time = Date.parse(event.utc);
    if (time < previousUtc) throw new Error('Benchmark events must be appended in UTC order.');
    previousUtc = time;
    if (milestoneKinds.includes(event.kind)) {
      if (milestones.has(event.kind)) throw new Error(`${event.kind} milestone is immutable and may appear only once.`);
      milestones.set(event.kind, event);
    }
    if (event.kind === 'wait') {
      const key = event.phase;
      if (event.result === 'started') {
        if (openWaits.has(key)) throw new Error(`A ${key} wait interval is already open.`);
        openWaits.add(key);
      } else {
        if (!openWaits.has(key)) throw new Error(`A ${key} wait interval cannot end before it starts.`);
        openWaits.delete(key);
      }
    }
  }
  if (milestones.has('local-verified') && !milestones.has('idea-start')) {
    throw new Error('local-verified requires an earlier idea-start milestone.');
  }
  if (milestones.has('deployed-verified') && !milestones.has('local-verified')) {
    throw new Error('deployed-verified requires an earlier local-verified milestone.');
  }
  if (milestones.has('owner-verified') && !milestones.has('deployed-verified')) {
    throw new Error('Owner acceptance must be recorded separately after deployed verification.');
  }
  for (const [earlier, later] of [
    ['idea-start', 'local-verified'],
    ['local-verified', 'deployed-verified'],
    ['deployed-verified', 'owner-verified'],
  ]) {
    if (milestones.has(earlier) && milestones.has(later) &&
        Date.parse(milestones.get(later).utc) < Date.parse(milestones.get(earlier).utc)) {
      throw new Error(`${later} must not precede ${earlier}.`);
    }
  }
  return { schemaVersion: 1, events };
}

export function recordBenchmarkEvent(log, event) {
  const current = validateLog(log);
  const normalized = normalizeEvent(event);
  const existingMilestone = current.events.find(item => item.kind === normalized.kind);
  if (milestoneKinds.includes(normalized.kind) && existingMilestone) {
    if (JSON.stringify(existingMilestone) === JSON.stringify(normalized)) return current;
    throw new Error(`${normalized.kind} milestone is immutable and cannot be changed.`);
  }
  const previous = current.events.at(-1);
  if (previous && Date.parse(normalized.utc) < Date.parse(previous.utc)) {
    throw new Error('Benchmark events must be appended in UTC order.');
  }
  if (normalized.kind === 'local-verified' &&
      !current.events.some(item => item.kind === 'idea-start')) {
    throw new Error('local-verified requires an earlier idea-start milestone.');
  }
  if (normalized.kind === 'deployed-verified' &&
      !current.events.some(item => item.kind === 'local-verified')) {
    throw new Error('deployed-verified requires an earlier local-verified milestone.');
  }
  if (normalized.kind === 'owner-verified' &&
      !current.events.some(item => item.kind === 'deployed-verified')) {
    throw new Error('Owner acceptance must be recorded separately after deployed verification.');
  }
  if (normalized.kind === 'wait') {
    const open = current.events.filter(item => item.kind === 'wait' && item.phase === normalized.phase)
      .reduce((isOpen, item) => item.result === 'started' ? true : false, false);
    if (normalized.result === 'started' && open) throw new Error(`A ${normalized.phase} wait interval is already open.`);
    if (normalized.result === 'ended' && !open) throw new Error(`A ${normalized.phase} wait interval cannot end before it starts.`);
  }
  return { schemaVersion: 1, events: [...current.events, normalized] };
}

export function summarizeBenchmarkLog(log) {
  const current = validateLog(log);
  const milestones = Object.fromEntries(milestoneKinds
    .map(kind => [kind, current.events.find(event => event.kind === kind)])
    .filter(([, event]) => event));
  const ideaStart = milestones['idea-start'] ? Date.parse(milestones['idea-start'].utc) : null;
  const wallClockMs = {};
  if (ideaStart !== null && milestones['local-verified']) {
    wallClockMs.local = Date.parse(milestones['local-verified'].utc) - ideaStart;
  }
  if (ideaStart !== null && milestones['deployed-verified']) {
    wallClockMs.deployed = Date.parse(milestones['deployed-verified'].utc) - ideaStart;
  }
  if (milestones['local-verified'] && milestones['deployed-verified']) {
    wallClockMs.localToDeployed = Date.parse(milestones['deployed-verified'].utc) -
      Date.parse(milestones['local-verified'].utc);
  }
  const openWaits = new Map();
  const waitIntervals = [];
  for (const event of current.events.filter(item => item.kind === 'wait')) {
    if (event.result === 'started') openWaits.set(event.phase, event.utc);
    else {
      const started = openWaits.get(event.phase);
      waitIntervals.push({ phase: event.phase, durationMs: Date.parse(event.utc) - Date.parse(started) });
      openWaits.delete(event.phase);
    }
  }
  const owner = milestones['owner-verified'];
  return {
    milestones,
    wallClockMs,
    waitIntervals,
    openWaits: [...openWaits].map(([phase, utc]) => ({ phase, utc })),
    ownerAcceptance: owner?.result || 'pending',
    ...(ideaStart !== null && owner ? {
      ownerAcceptanceElapsedMs: Date.parse(owner.utc) - ideaStart,
    } : {}),
    ...(owner && milestones['deployed-verified'] ? {
      ownerAcceptanceAfterDeploymentMs: Date.parse(owner.utc) -
        Date.parse(milestones['deployed-verified'].utc),
    } : {}),
  };
}

export function createCorrectionFeedback({ reproduction, expected, actual, impact, correction }) {
  const details = { reproduction, expected, actual, impact, correction };
  const summary = Object.entries(details)
    .map(([label, value]) => `${label}: ${oneLine(value, `Feedback ${label}`)}`)
    .join(' | ');
  return { summary };
}

export async function submitCorrectionFeedback({
  log,
  details,
  destination,
  authorizeDestination,
  postIssue,
  utc = new Date().toISOString(),
}) {
  const feedback = createCorrectionFeedback(details);
  const localLog = recordBenchmarkEvent(log, {
    kind: 'feedback',
    utc,
    phase: 'correction',
    result: feedback.summary,
    evidenceRefs: [],
  });
  if (typeof destination !== 'string' || !destination.trim() ||
      typeof authorizeDestination !== 'function' || typeof postIssue !== 'function') {
    return { posted: false, reason: 'no-authorized-issue-destination', localLog, feedback };
  }
  let authorized;
  try { authorized = await authorizeDestination(destination); }
  catch (error) {
    const errorCode = typeof error?.code === 'string' && safeCode.test(error.code) ? error.code : 'authorization-unavailable';
    return { posted: false, reason: 'destination-authorization-unavailable', errorCode, localLog, feedback };
  }
  if (authorized !== true) {
    return { posted: false, reason: 'destination-not-authorized', localLog, feedback };
  }
  try { await postIssue(destination, feedback.summary); }
  catch (error) {
    const errorCode = typeof error?.code === 'string' && safeCode.test(error.code) ? error.code : 'issue-destination-unavailable';
    return { posted: false, reason: 'issue-destination-unavailable', errorCode, localLog, feedback };
  }
  return { posted: true, localLog, feedback };
}
