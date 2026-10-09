import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { analyzeFile } from '../functions/src/file-analysis.js';
import { ensureOwned, serviceNames, stopLocalServices, storageConnection } from '../src/local-services.js';
import { deleteLocalJob, localJobData } from '../src/local-job-data.js';
import type { FileJob } from '../src/file-jobs.js';
import { jobMessageSchema } from '../src/file-jobs.js';
import { localDabConfig, localPrincipal } from '../src/local.js';
import { run } from '../src/process.js';

test('local Functions require the SQL Apps development guard and always reject production', async () => {
  for (const env of [
    { NODE_ENV: 'development', SQL_APPS_LOCAL_FUNCTIONS: undefined },
    { NODE_ENV: 'production', SQL_APPS_LOCAL_FUNCTIONS: 'true' },
  ]) {
    await assert.rejects(run(process.execPath, ['dist/functions/src/local-index.js'], { env }),
      /Local Functions entry point requires explicit development mode outside production/);
  }
  await assert.rejects(run(process.execPath, ['dist/functions/src/local-index.js'], {
    env: { NODE_ENV: 'development', SQL_APPS_LOCAL_FUNCTIONS: 'true', LOCAL_FUNCTION_SECRET: undefined,
      AzureWebJobsStorage: undefined, LOCAL_DAB_URL: undefined },
  }), /Local Functions settings are incomplete/);
});

test('file analysis has exact size, hash and CRLF/LF/CR text-line results', () => {
  for (const [text, count] of [['', 0], ['a', 1], ['a\n', 2], ['a\r\nb\rc\n', 4]] as const) {
    const bytes = Buffer.from(text);
    assert.deepEqual(analyzeFile(bytes), { sha256: createHash('sha256').update(bytes).digest('hex'),
      byte_count: bytes.length, line_count: count });
  }
  assert.equal(analyzeFile(Buffer.alloc(4 * 1024 * 1024)).byte_count, 4 * 1024 * 1024);
  assert.throws(() => analyzeFile(Buffer.alloc(4 * 1024 * 1024 + 1)), /4 MiB/);
});

test('local service lifecycle preserves volumes and refuses unowned service names before writes', async () => {
  const calls: string[][] = [];
  await assert.rejects(stopLocalServices('test-sql', async (_command, args) => {
    calls.push([...args]);
    return args[0] === 'ps' ? 'existing' : 'not-owned';
  }), /not project-owned/);
  assert.equal(calls.some(args => ['rm', 'stop'].includes(args[0]!)), false);
  await stopLocalServices('test-sql', async (_command, args) => {
    calls.push([...args]);
    return args[0] === 'ps' ? 'existing' : args.at(-1)?.includes('functions') ? 'functions' : 'storage';
  });
  assert.equal(calls.some(args => args[0] === 'volume'), false);
  assert.equal(await ensureOwned('service', 'storage', async () => ''), false);
  assert.throws(() => serviceNames('bad;name'), /Invalid/);
  assert.match(storageConnection('key'), /BlobEndpoint=http:\/\/127.0.0.1:10000\/sqlappslocal/);
});

test('job queue messages reject caller-managed or untrusted identity fields', () => {
  const job = { id: '11111111-1111-4111-8111-111111111111', oid: '22222222-2222-4222-8222-222222222222',
    tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', key: 'snapshot' };
  assert.equal(jobMessageSchema.safeParse(job).success, true);
  assert.equal(jobMessageSchema.safeParse({ ...job, status: 'completed' }).success, false);
  assert.equal(jobMessageSchema.safeParse({ ...job, oid: 'not-a-guid' }).success, false);
});

test('only server processor role can create or mutate local jobs; production exposes no job entity', async () => {
  const config = await localDabConfig() as { entities: { FileJob: { permissions: { role: string; actions: unknown[] }[] } } };
  assert.deepEqual(config.entities.FileJob.permissions.find(p => p.role === 'processor')?.actions, ['create', 'read', 'update', 'delete']);
  const authenticated = config.entities.FileJob.permissions.find(p => p.role === 'authenticated')!;
  assert.equal(authenticated.actions.length, 1);
  assert.equal((authenticated.actions[0] as { action: string }).action, 'read');
  const claims = JSON.parse(Buffer.from(localPrincipal('alice'), 'base64').toString()).claims;
  assert.equal(claims.find((c: { typ: string }) => c.typ === 'roles').val, 'authenticated');
});

test('processor adapter uses explicit trusted role and fails closed on invalid cross-origin pagination', async () => {
  const data = localJobData('http://127.0.0.1:15000', async (_url, options) => {
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('x-ms-api-role'), 'processor');
    const claims = JSON.parse(Buffer.from(headers.get('x-ms-client-principal')!, 'base64').toString()).claims;
    assert.equal(claims.find((c: { typ: string }) => c.typ === 'roles').val, 'processor');
    return Response.json({ value: [], nextLink: 'https://unexpected.invalid/api/FileJob' });
  });
  await assert.rejects(data.list('alice'), /Invalid job pagination/);
  await assert.rejects(localJobData('http://127.0.0.1:15000', async () => new Response('', { status: 503 })).list('alice'), /503/);
});

const deletionOwner = '22222222-2222-4222-8222-222222222222';
const deletionJob: FileJob = {
  id: '11111111-1111-4111-8111-111111111111', filename: 'sample.txt',
  status: 'failed', sha256: null, byte_count: null, line_count: null, error: 'worker failed',
};

test('failed SQL job deletion preserves the retry snapshot and reports the original error', async () => {
  const failure = new Error('SQL unavailable');
  const snapshot = Buffer.from('original bytes');
  let saved: Buffer | undefined = snapshot;
  await assert.rejects(deleteLocalJob({
    get: async (oid, id) => {
      assert.equal(oid, deletionOwner); assert.equal(id, deletionJob.id);
      return deletionJob;
    },
    delete: async (oid, id) => {
      assert.equal(oid, deletionOwner); assert.equal(id, deletionJob.id);
      throw failure;
    },
  }, deletionOwner, deletionJob.id, async () => { saved = undefined; }), error => error === failure);
  assert.equal(saved, snapshot);
});

for (const status of ['completed', 'failed'] as const) {
  test(`${status} job deletion removes SQL before its snapshot`, async () => {
    const calls: string[] = [];
    const removed = await deleteLocalJob({
      get: async () => ({ ...deletionJob, status }),
      delete: async () => { calls.push('sql'); },
    }, deletionOwner, deletionJob.id, async () => { calls.push('blob'); });
    assert.equal(removed, true);
    assert.deepEqual(calls, ['sql', 'blob']);
  });
}

test('snapshot deletion failure is reported and a repeat deletion cleans the orphan idempotently', async () => {
  let row: FileJob | undefined = deletionJob;
  let snapshotExists = true;
  let deletes = 0;
  let cleanups = 0;
  const failure = new Error('Blob unavailable');
  const jobs = {
    get: async () => row,
    delete: async () => { deletes++; row = undefined; },
  };
  const removeSnapshot = async () => {
    cleanups++;
    if (cleanups === 1) throw failure;
    const removed = snapshotExists;
    snapshotExists = false;
    return removed;
  };
  await assert.rejects(deleteLocalJob(jobs, deletionOwner, deletionJob.id, removeSnapshot), error => error === failure);
  assert.equal(row, undefined);
  assert.equal(snapshotExists, true);
  assert.equal(await deleteLocalJob(jobs, deletionOwner, deletionJob.id, removeSnapshot), false);
  assert.equal(snapshotExists, false);
  assert.equal(await deleteLocalJob(jobs, deletionOwner, deletionJob.id, removeSnapshot), false);
  assert.equal(deletes, 1);
});

for (const status of ['queued', 'processing'] as const) {
  test(`${status} job deletion rejects before modifying SQL or snapshots`, async () => {
    let changed = false;
    await assert.rejects(deleteLocalJob({
      get: async () => ({ ...deletionJob, status }),
      delete: async () => { changed = true; },
    }, deletionOwner, deletionJob.id, async () => { changed = true; }), { statusCode: 409 });
    assert.equal(changed, false);
  });
}
