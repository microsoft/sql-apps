import { localPrincipal } from './local.js';
import { fileJobSchema, type FileJob } from './file-jobs.js';

export async function deleteLocalJob(
  jobs: Pick<ReturnType<typeof localJobData>, 'get' | 'delete'>,
  oid: string, id: string, removeSnapshot: () => Promise<unknown>,
): Promise<boolean> {
  const row = await jobs.get(oid, id);
  if (row && !['completed', 'failed'].includes(row.status)) {
    throw Object.assign(new Error('Wait for processing to finish before deleting this job'), { statusCode: 409 });
  }
  if (row) await jobs.delete(oid, id);
  await removeSnapshot();
  return row !== undefined;
}

export function localJobData(origin: string, fetcher: typeof fetch = fetch) {
  async function request(oid: string, path: string, method = 'GET', body?: unknown) {
    const response = await fetcher(new URL(path, origin), {
      method, headers: {
        'x-ms-client-principal': localPrincipal(oid, 'access_as_user', 'processor'), 'x-ms-api-role': 'processor',
        'content-type': 'application/json', ...(method === 'PATCH' ? { 'if-match': '*' } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Job data operation failed (${response.status})`);
    return response;
  }
  return {
    async create(oid: string, item: { id: string; filename: string; blob_key: string; parent_job_id?: string }) {
      await request(oid, '/api/FileJob', 'POST', item);
    },
    async get(oid: string, id: string): Promise<FileJob | undefined> {
      const response = await request(oid, `/api/FileJob?$filter=id eq ${id}`);
      const body = await response.json() as { value: unknown[] };
      if (!Array.isArray(body.value)) throw new Error('Invalid job response');
      return body.value[0] === undefined ? undefined : fileJobSchema.parse(body.value[0]);
    },
    async list(oid: string): Promise<FileJob[]> {
      const rows: FileJob[] = [];
      let next: string | undefined = '/api/FileJob';
      const visited = new Set<string>();
      while (next) {
        const url = new URL(next, origin);
        if (url.origin !== new URL(origin).origin || url.pathname !== '/api/FileJob' ||
            url.username || url.password || url.hash || visited.has(url.href)) throw new Error('Invalid job pagination');
        visited.add(url.href);
        const body = await (await request(oid, url.pathname + url.search)).json() as { value: unknown[]; nextLink?: string };
        if (!Array.isArray(body.value)) throw new Error('Invalid job response');
        rows.push(...body.value.map(value => fileJobSchema.parse(value)));
        if (body.nextLink !== undefined && (typeof body.nextLink !== 'string' || !body.nextLink)) throw new Error('Invalid job continuation');
        next = body.nextLink;
      }
      return rows;
    },
    async update(oid: string, id: string, changes: object) {
      await request(oid, `/api/FileJob/id/${encodeURIComponent(id)}`, 'PATCH', { ...changes, updated_at: new Date().toISOString() });
    },
    async delete(oid: string, id: string) {
      await request(oid, `/api/FileJob/id/${encodeURIComponent(id)}`, 'DELETE');
    },
  };
}
