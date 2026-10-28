import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));

export interface PublicConfiguration {
  authority: string;
  clientId: string;
  scope: string;
  redirectUri: string;
}

export interface AppConfiguration {
  host: string;
  port: number;
  dab: string;
  publicConfig: PublicConfiguration;
}

export function readEnvironment() {
  const file = resolve(root, '.env');
  return { ...(existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}), ...process.env };
}

export function configuration(env: NodeJS.ProcessEnv): AppConfiguration {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value || value.includes('REPLACE_')) throw new Error(`Configure ${name} in .env before startup.`);
    return value;
  };
  const secureUrl = (name: string, allowLoopback = false) => {
    const value = required(name);
    const url = new URL(value);
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(allowLoopback && local && url.protocol === 'http:'))) {
      throw new Error(`${name} requires HTTPS (HTTP is allowed only for a loopback app or DAB endpoint).`);
    }
    return url;
  };
  const origin = secureUrl('APP_ORIGIN', true);
  const dab = secureUrl('DAB_URL', true);
  if ([origin, dab].some(url => url.pathname !== '/' || url.search || url.hash)) {
    throw new Error('APP_ORIGIN and DAB_URL must be origins, without paths, queries, or fragments.');
  }
  secureUrl('AUTH_ISSUER');
  const authority = secureUrl('AUTH_AUTHORITY').href.replace(/\/$/, '');
  const port = Number(env.APP_PORT || 5180);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('APP_PORT must be an integer from 1 to 65535.');
  const scope = required('AUTH_SCOPE');
  if (!scope.split(/\s+/).includes('openid') ||
      !scope.split(/\s+/).some(value => !['openid', 'profile', 'email', 'offline_access'].includes(value))) {
    throw new Error('AUTH_SCOPE must include openid and an API access scope.');
  }
  required('AUTH_AUDIENCE');
  return {
    host: env.APP_HOST || '127.0.0.1',
    port,
    dab: dab.origin,
    publicConfig: {
      authority,
      clientId: required('AUTH_CLIENT_ID'),
      scope,
      redirectUri: `${origin.origin}/`,
    },
  };
}
