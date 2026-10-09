import { randomUUID } from 'node:crypto';
import { TodoExampleClient as SqlAppsClient } from './client.js';
import { ApiError } from '../../src/client.js';
import { z } from 'zod';

const identitySchema = z.object({ oid: z.string().min(1), tenantId: z.string().min(1) });
const graphSchema = z.object({
  errors: z.array(z.unknown()).optional(),
  data: z.object({ todos: z.object({ items: z.array(z.object({ id: z.string() })) }) }).optional(),
});

export async function smoke(
  origin: string, userToken: string, otherUserToken: string, fetcher: typeof fetch = fetch, functionsUrl?: string,
): Promise<void> {
  const user = new SqlAppsClient({ baseUrl: origin, getAccessToken: async () => userToken, fetch: fetcher });
  const other = new SqlAppsClient({ baseUrl: origin, getAccessToken: async () => otherUserToken, fetch: fetcher });
  const who = identitySchema.parse(await (await user.request('/auth/me')).json());
  const otherWho = identitySchema.parse(await (await other.request('/auth/me')).json());
  if (!who.oid || !otherWho.oid || who.oid === otherWho.oid || who.tenantId !== otherWho.tenantId) {
    throw new Error('Two different verified users in the configured tenant are required');
  }
  const id = randomUUID();
  const filename = `acceptance-${id}.txt`;
  let created = false;
  let uploaded = false;
  const failures: unknown[] = [];
  try {
    await user.createTodo(`Acceptance ${id}`, id);
    created = true;
    if (!(await user.listTodos()).some(todo => todo.id === id)) throw new Error('Created Todo missing from owner list');
    if ((await other.listTodos()).some(todo => todo.id === id)) throw new Error('Cross-user Todo exposure');
    await user.updateTodo(id, { completed: true });
    if (!(await user.listTodos()).some(todo => todo.id === id && todo.completed)) throw new Error('Todo update did not persist');
    await expectDenied(() => other.updateTodo(id, { title: 'unauthorized' }));
    await expectDenied(() => other.deleteTodo(id));
    await user.upload(filename, Buffer.from('private acceptance data'));
    uploaded = true;
    const downloaded = Buffer.from(await user.download(filename)).toString();
    if (downloaded !== 'private acceptance data') throw new Error('File roundtrip payload mismatch');
    await expectDenied(() => other.download(filename));
    await expectDenied(() => other.deleteFile(filename));
    const graph = await user.request('/graphql', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ todos { items { id title completed } } }' }),
    });
    const graphData = graphSchema.parse(await graph.json());
    if (graphData.errors || !graphData.data?.todos?.items?.some(todo => todo.id.toLowerCase() === id)) {
      throw new Error('GraphQL owner query failed');
    }
    const otherGraph = graphSchema.parse(await (await other.request('/graphql', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ todos { items { id } } }' }),
    })).json());
    if (otherGraph.errors || !otherGraph.data || otherGraph.data.todos.items.some(todo => todo.id.toLowerCase() === id)) {
      throw new Error('GraphQL cross-user ownership check failed');
    }
    const result = z.object({ result: z.object({
      user: identitySchema, input: z.object({ acceptance: z.string() }),
    }) }).parse(await user.echo({ acceptance: id }));
    if (result.result.user.oid !== who.oid || result.result.user.tenantId !== who.tenantId || result.result.input.acceptance !== id) {
      throw new Error('Function user context or payload mismatch');
    }
    if (functionsUrl) {
      const direct = await fetcher(new URL('/api/echo', functionsUrl), {
        method: 'POST', headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
        body: '{}', signal: AbortSignal.timeout(10_000),
      });
      if (direct.status !== 401) throw new Error('Direct function user-token access was not rejected');
    }
    const anonymous = await fetcher(new URL('/api/Todo', origin), { signal: AbortSignal.timeout(5_000) });
    if (anonymous.status !== 401) throw new Error('Anonymous API access was not rejected');
  } catch (error) {
    failures.push(error);
  } finally {
    if (uploaded) {
      try { await user.deleteFile(filename); } catch (error) { failures.push(error); }
    }
    if (created) {
      try { await user.deleteTodo(id); } catch (error) { failures.push(error); }
    }
  }
  if (failures.length) throw new AggregateError(failures, 'Authenticated acceptance or fixture cleanup failed');
}

async function expectDenied(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof ApiError && [403, 404].includes(error.status)) return;
    throw error;
  }
  throw new Error('Cross-user operation unexpectedly succeeded');
}
