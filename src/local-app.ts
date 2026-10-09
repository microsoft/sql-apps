import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { bearerToken } from './auth.js';
import { createGateway } from './gateway.js';
import { localOrigin, localPrincipal } from './local.js';
import { localFunctionsOrigin, localServiceAdapters } from './local-services.js';
import { runtimeFor } from './workspace.mjs';

type LocalAdapters = Awaited<ReturnType<typeof localServiceAdapters>>;

export const localAppOrigin = runtimeFor().origins.app;
const tenantId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const developmentUsers = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Development Alice' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Development Bob' },
];

export async function createLocalApp(fetcher: typeof fetch = fetch, services?: LocalAdapters) {
  if (process.env.NODE_ENV === 'production') throw new Error('Local development server is disabled in production');
  const sessions = new Map<string, { oid: string; expires: number }>();
  const identity = async (token: string) => {
    const session = sessions.get(token);
    if (!session || session.expires <= Date.now()) {
      sessions.delete(token);
      throw new Error('Local session expired; select a development user again');
    }
    return { oid: session.oid, tenantId };
  };
  const unavailable = async (): Promise<never> => {
    throw Object.assign(new Error('This service is not configured in the local SQL development stack'), { statusCode: 503 });
  };
  const app = await createGateway({
    tenantId, apiClientId: tenantId, dabUrl: localOrigin,
    blobAccountUrl: 'https://unconfigured.invalid', blobContainer: 'files',
    functionsUrl: services ? localFunctionsOrigin : 'https://unconfigured.invalid', publicDirectory: 'public',
  }, {
    verifyUser: identity,
    files: services?.files ?? { put: unavailable, get: unavailable, delete: unavailable },
    functionToken: services?.functionToken ?? unavailable,
    ...(services ? { processing: services.processing, ...(services.telemetry ? { telemetry: services.telemetry } : {}) } : {}),
    browserConfig: { mode: 'local', users: developmentUsers, capabilities: {
      files: Boolean(services), functions: Boolean(services), ...(services ? {
        processing: true, jobSubmission: services.settings.processing,
        jobRetry: services.settings.processing && services.settings.jobRetry,
        automaticProgress: services.settings.automaticProgress,
        tracing: services.settings.tracing, progressIntervalMs: services.settings.progressIntervalMs,
      } : {}),
    } },
    requestGuard: async (request, reply) => {
      if (request.headers.host !== new URL(localAppOrigin).host) {
        return reply.code(403).send({ error: 'Use the loopback development origin' });
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== localAppOrigin) {
        return reply.code(403).send({ error: 'Local mutations require the same development origin' });
      }
    },
    fetch: async (url, options) => {
      const target = new URL(String(url));
      if (services && target.origin === localFunctionsOrigin && target.pathname === '/api/echo') return fetcher(target, options);
      if (target.origin !== localOrigin) throw new Error('Local adapter only connects to the loopback data service');
      if (target.pathname === '/health') return fetcher(target, options);
      const headers = new Headers(options?.headers);
      const token = bearerToken(headers.get('authorization') ?? undefined);
      if (!token) throw new Error('Local data adapter requires a verified session');
      const user = await identity(token);
      headers.delete('authorization');
      headers.delete('x-ms-api-role');
      headers.set('x-ms-client-principal', localPrincipal(user.oid));
      return fetcher(target, { ...options, headers });
    },
  });
  app.get('/local/workspace', async () => {
    const runtime = runtimeFor();
    return { version: 1, id: runtime.id, mode: runtime.mode, origins: runtime.origins };
  });
  app.post('/local/session', async (request, reply) => {
    const body = z.object({ user: z.string() }).safeParse(request.body);
    const user = body.success ? developmentUsers.find(value => value.id === body.data.user) : undefined;
    if (!user) return reply.code(400).send({ error: 'Choose a configured development user' });
    const previous = bearerToken(request.headers.authorization);
    if (previous) sessions.delete(previous);
    for (const [token, session] of sessions) if (session.expires <= Date.now()) sessions.delete(token);
    if (sessions.size >= 1_000) return reply.code(429).send({ error: 'Too many local sessions; restart the development server' });
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { oid: user.id, expires: Date.now() + 8 * 60 * 60 * 1_000 });
    reply.header('cache-control', 'no-store');
    return { token };
  });
  app.delete('/local/session', async (request, reply) => {
    const token = bearerToken(request.headers.authorization);
    if (token) sessions.delete(token);
    return reply.code(204).send();
  });
  app.addHook('onClose', async () => { sessions.clear(); });
  return app;
}

export async function serveLocalApp(container = runtimeFor().defaultSql, sqlOnly = false): Promise<void> {
  const app = await createLocalApp(fetch, sqlOnly ? undefined : await localServiceAdapters(container));
  await app.listen({ host: '127.0.0.1', port: runtimeFor(container).ports.gateway });
  console.log(`Local browser app ready at ${localAppOrigin}. Development identities are simulated; do not expose remotely.`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void app.close(); });
  }
}
