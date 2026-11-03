import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCorrectionFeedback,
  recordBenchmarkEvent,
  submitCorrectionFeedback,
  summarizeBenchmarkLog,
} from '../scripts/deployment-acceptance.mjs';

const start = { kind: 'idea-start', utc: '2026-01-01T09:00:00.000Z', phase: 'idea', result: 'started', evidenceRefs: [] };
const local = {
  kind: 'local-verified', utc: '2026-01-01T09:10:00.000Z', phase: 'local',
  result: 'verified', evidenceRefs: ['build:sha256-a', 'tests:run-1'],
};
const deployed = {
  kind: 'deployed-verified', utc: '2026-01-01T09:30:00.000Z', phase: 'cloud',
  result: 'verified', evidenceRefs: ['browser-save-reload:run-1', 'restart-persistence:run-1'],
};

function logWithMilestones() {
  return [start, local, deployed].reduce((log, event) => recordBenchmarkEvent(log, event), undefined);
}

test('first valid milestone events are immutable', () => {
  let log = recordBenchmarkEvent(undefined, start);
  log = recordBenchmarkEvent(log, local);
  log = recordBenchmarkEvent(log, deployed);

  assert.throws(() => recordBenchmarkEvent(log, {
    ...local,
    utc: '2026-01-01T09:11:00.000Z',
  }), /immutable/);
  assert.equal(log.events.find(event => event.kind === 'local-verified').utc, local.utc);
});

test('resumed phase events append without changing the original milestones', () => {
  let log = logWithMilestones();
  log = recordBenchmarkEvent(log, {
    kind: 'phase', utc: '2026-01-01T09:35:00.000Z', phase: 'applications',
    result: 'resumed', evidenceRefs: ['receipt:sha256-b'],
  });
  log = recordBenchmarkEvent(log, {
    kind: 'phase', utc: '2026-01-01T09:40:00.000Z', phase: 'applications',
    result: 'succeeded', evidenceRefs: ['receipt:sha256-c'],
  });

  assert.equal(log.events.filter(event => event.kind === 'deployed-verified').length, 1);
  assert.equal(summarizeBenchmarkLog(log).wallClockMs.deployed, 30 * 60 * 1000);
});

test('approval and sign-in wait intervals remain separate from wall-clock totals', () => {
  let log = recordBenchmarkEvent(undefined, start);
  log = recordBenchmarkEvent(log, {
    kind: 'wait', utc: '2026-01-01T09:02:00.000Z', phase: 'approval', result: 'started', evidenceRefs: [],
  });
  log = recordBenchmarkEvent(log, {
    kind: 'wait', utc: '2026-01-01T09:05:00.000Z', phase: 'approval', result: 'ended', evidenceRefs: [],
  });
  log = recordBenchmarkEvent(log, {
    kind: 'wait', utc: '2026-01-01T09:06:00.000Z', phase: 'sign-in', result: 'started', evidenceRefs: [],
  });
  log = recordBenchmarkEvent(log, {
    kind: 'wait', utc: '2026-01-01T09:07:00.000Z', phase: 'sign-in', result: 'ended', evidenceRefs: [],
  });
  log = recordBenchmarkEvent(log, local);
  log = recordBenchmarkEvent(log, deployed);
  const summary = summarizeBenchmarkLog(log);

  assert.equal(summary.wallClockMs.local, 10 * 60 * 1000);
  assert.equal(summary.wallClockMs.deployed, 30 * 60 * 1000);
  assert.equal(summary.wallClockMs.localToDeployed, 20 * 60 * 1000);
  assert.deepEqual(summary.waitIntervals, [
    { phase: 'approval', durationMs: 3 * 60 * 1000 },
    { phase: 'sign-in', durationMs: 60 * 1000 },
  ]);
});

test("Leonard's recorded milestone arithmetic remains internally consistent", () => {
  const startUtc = Date.UTC(2026, 0, 1, 9);
  const timestamp = offset => new Date(startUtc + offset).toISOString();
  let log = recordBenchmarkEvent(undefined, start);
  log = recordBenchmarkEvent(log, {
    ...local,
    utc: timestamp(15 * 60 * 1000 + 50_619),
  });
  log = recordBenchmarkEvent(log, {
    ...deployed,
    utc: timestamp(44 * 60 * 1000 + 18_372),
  });
  const summary = summarizeBenchmarkLog(log);

  assert.equal(summary.wallClockMs.local, 15 * 60 * 1000 + 50_619);
  assert.equal(summary.wallClockMs.localToDeployed, 28 * 60 * 1000 + 27_753);
  assert.equal(summary.wallClockMs.deployed, 44 * 60 * 1000 + 18_372);
});

test('later owner verification remains separate from deployment verification', () => {
  let log = logWithMilestones();
  log = recordBenchmarkEvent(log, {
    kind: 'owner-verified', utc: '2026-01-01T10:00:00.000Z', phase: 'owner-acceptance',
    result: 'verified', evidenceRefs: ['owner:signoff-1'],
  });
  const summary = summarizeBenchmarkLog(log);

  assert.equal(summary.milestones['deployed-verified'].utc, deployed.utc);
  assert.equal(summary.ownerAcceptance, 'verified');
  assert.equal(summary.ownerAcceptanceElapsedMs, 60 * 60 * 1000);
  assert.equal(summary.ownerAcceptanceAfterDeploymentMs, 30 * 60 * 1000);
});

test('correction feedback is single-line and redacts secret-like values', () => {
  const feedback = createCorrectionFeedback({
    reproduction: 'Set Authorization: Bearer fake-value\\nthen retry',
    expected: 'Password=secret-value should not appear',
    actual: 'https://user:pass@example.test returned 503',
    impact: 'One customer was blocked',
    correction: 'Retry using a scoped reference',
  });

  assert.ok(!feedback.summary.includes('\n'));
  assert.match(feedback.summary, /Bearer \[REDACTED\]/);
  assert.match(feedback.summary, /Password=\[REDACTED\]/i);
  assert.ok(!/fake-value|secret-value|user:pass/.test(feedback.summary));
});

test('unavailable issue destinations preserve a local feedback record without retries', async () => {
  let posts = 0;
  const result = await submitCorrectionFeedback({
    log: logWithMilestones(),
    details: {
      reproduction: 'Reproduce once',
      expected: 'A controlled response',
      actual: 'A timeout',
      impact: 'Request blocked',
      correction: 'Reconcile before retry',
    },
    destination: 'microsoft/sql-apps#1',
    authorizeDestination: async () => true,
    postIssue: async () => {
      posts += 1;
      throw Object.assign(new Error('issue destination unavailable'), { code: 'ISSUE_UNAVAILABLE' });
    },
    utc: '2026-01-01T10:01:00.000Z',
  });

  assert.equal(result.posted, false);
  assert.equal(result.reason, 'issue-destination-unavailable');
  assert.ok(result.localLog.events.some(event => event.kind === 'feedback'));
  assert.equal(posts, 1);
});

test('feedback is not posted when the destination is not authorized', async () => {
  let posts = 0;
  const result = await submitCorrectionFeedback({
    log: undefined,
    details: {
      reproduction: 'Reproduce once',
      expected: 'A controlled response',
      actual: 'A timeout',
      impact: 'Request blocked',
      correction: 'Reconcile before retry',
    },
    destination: 'microsoft/sql-apps#1',
    authorizeDestination: async () => false,
    postIssue: async () => { posts += 1; },
    utc: '2026-01-01T10:01:00.000Z',
  });

  assert.equal(result.posted, false);
  assert.equal(result.reason, 'destination-not-authorized');
  assert.equal(posts, 0);
  assert.ok(result.localLog.events.some(event => event.kind === 'feedback'));
});
