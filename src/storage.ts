import { BlobServiceClient } from '@azure/storage-blob';
import type { TokenCredential } from '@azure/identity';

export interface StoredFile {
  bytes: Buffer;
  contentType: string;
}

export interface FileStore {
  list?(prefix: string): Promise<{ name: string; size: number }[]>;
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<StoredFile | undefined>;
  delete(key: string): Promise<boolean>;
}

export function objectKey(tenantId: string, oid: string, name: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(name) || name.includes('..')) {
    throw new Error('File names must be a single safe path segment');
  }
  return `${tenantId}/${oid}/${name}`;
}

export function blobStore(accountUrl: string, container: string, credential: TokenCredential): FileStore {
  const client = new BlobServiceClient(accountUrl, credential).getContainerClient(container);
  return containerFileStore(client);
}

export function connectionFileStore(connection: string, container: string): FileStore {
  return containerFileStore(BlobServiceClient.fromConnectionString(connection).getContainerClient(container));
}

function containerFileStore(client: ReturnType<BlobServiceClient['getContainerClient']>): FileStore {
  return {
    async list(prefix) {
      const files: { name: string; size: number }[] = [];
      for await (const blob of client.listBlobsFlat({ prefix })) {
        const name = blob.name.slice(prefix.length);
        if (name && !name.includes('/')) {
          if (typeof blob.properties.contentLength !== 'number') throw new Error('Blob listing omitted file size');
          files.push({ name, size: blob.properties.contentLength });
        }
      }
      return files;
    },
    async put(key, bytes) {
      await client.getBlockBlobClient(key).uploadData(bytes, {
        blobHTTPHeaders: { blobContentType: 'application/octet-stream' },
      });
    },
    async get(key) {
      try {
        const blob = client.getBlockBlobClient(key);
        return { bytes: await blob.downloadToBuffer(), contentType: 'application/octet-stream' };
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404) {
          return undefined;
        }
        throw error;
      }
    },
    async delete(key) {
      return (await client.getBlockBlobClient(key).deleteIfExists()).succeeded;
    },
  };
}
