import type { BlobClient, BlobLeaseClient, ContainerClient } from '@azure/storage-blob';
import { deleteLocalJob, type localJobData } from './local-job-data.js';

function blobMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'BlobNotFound';
}

async function leased<T>(lease: BlobLeaseClient, action: (leaseId: string) => Promise<T>): Promise<T> {
  let failure: unknown;
  try {
    return await action(lease.leaseId);
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    try {
      await lease.releaseLease();
    } catch (error) {
      if (!blobMissing(error)) {
        if (failure) throw new AggregateError([failure, error], 'Job operation and snapshot lease release failed');
        throw error;
      }
    }
  }
}

export async function withJobSnapshotLease<T>(blob: BlobClient, action: () => Promise<T>): Promise<T> {
  const lease = blob.getBlobLeaseClient();
  await lease.acquireLease(-1);
  return leased(lease, action);
}

export async function deleteLocalJobSnapshot(
  jobs: Pick<ReturnType<typeof localJobData>, 'get' | 'delete'>,
  files: ContainerClient, tenantId: string, oid: string, id: string,
): Promise<boolean> {
  const blob = files.getBlockBlobClient(`${tenantId}/${oid}/jobs/${id}`);
  const lease = blob.getBlobLeaseClient();
  try {
    await lease.acquireLease(-1);
  } catch (error) {
    if (!blobMissing(error)) throw error;
    return deleteLocalJob(jobs, oid, id, async () => {});
  }
  return leased(lease, leaseId => deleteLocalJob(jobs, oid, id,
    () => blob.deleteIfExists({ conditions: { leaseId } })));
}
