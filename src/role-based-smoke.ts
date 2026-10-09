import type { DeploymentConfig } from './config.js';

export async function roleBasedSmoke(
  config: DeploymentConfig, origin: string, authorizedToken: string, unauthorizedToken: string, fetcher: typeof fetch = fetch,
): Promise<void> {
  if (config.profile !== 'role-based-data' || !config.readinessPath) throw new Error('Authorization acceptance requires the role-based-data profile');
  const target = new URL(origin);
  if (target.protocol !== 'https:' || target.origin !== origin) throw new Error('Authorization acceptance requires the deployed HTTPS origin');
  const call = (token?: string, role?: string) => fetcher(new URL(config.readinessPath!, origin), {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(role ? { 'x-ms-api-role': role } : {}) },
    signal: AbortSignal.timeout(10_000), redirect: 'error',
  });
  const authorized = await call(authorizedToken, 'forged-admin');
  if (!authorized.ok) throw new Error(`Authorized procedure failed with HTTP ${authorized.status}`);
  const unauthorized = await call(unauthorizedToken, config.requiredRole);
  if (unauthorized.status !== 403) throw new Error(`Expected valid token without the required role to be denied with 403; received ${unauthorized.status}`);
  const anonymous = await call(undefined, config.requiredRole);
  if (anonymous.status !== 401) throw new Error(`Expected anonymous access denial with 401; received ${anonymous.status}`);
}
