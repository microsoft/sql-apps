import { z } from 'zod';
import { SqlAppsClient } from './client.js';
import { developmentUsers, localAppOrigin } from './local-app.js';
import { fileJobSchema } from './file-jobs.js';

export async function testLocalApp(fetcher: typeof fetch = fetch): Promise<void> {
  const tokens: string[] = [];
  const failures: unknown[] = [];
  try {
    for (const user of developmentUsers) {
      const response = await fetcher(`${localAppOrigin}/local/session`, {
        method: 'POST', headers: { origin: localAppOrigin, 'content-type': 'application/json' },
        body: JSON.stringify({ user: user.id }), signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Local session setup failed (${response.status})`);
      const { token } = z.object({ token: z.string().min(32) }).parse(await response.json());
      tokens.push(token);
      const client = new SqlAppsClient({ baseUrl: localAppOrigin, getAccessToken: async () => token, fetch: fetcher });
      const identity = z.object({ oid: z.string() }).parse(await (await client.request('/auth/me')).json());
      if (identity.oid !== user.id) throw new Error('Gateway assigned the wrong development identity');
      z.object({ jobs: z.array(fileJobSchema.strict()) })
        .parse(await (await client.request('/jobs')).json());
    }
    if ((await fetcher(`${localAppOrigin}/auth/me`)).status !== 401) throw new Error('Gateway accepted anonymous access');
  } catch (error) { failures.push(error); }
  finally {
    for (const token of tokens) {
      try {
        const response = await fetcher(`${localAppOrigin}/local/session`, {
          method: 'DELETE', headers: { origin: localAppOrigin, authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) throw new Error(`Local session cleanup failed (${response.status})`);
      } catch (error) { failures.push(error); }
    }
  }
  if (failures.length) throw new AggregateError(failures, 'Local gateway acceptance or cleanup failed');
}
