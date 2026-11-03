import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? '../' : '../../', import.meta.url));

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

export type LocalApi = 'dab' | 'functions';

export function deploymentProfile(value: unknown) {
  const profiles: Record<string, { api: LocalApi; template: string }> = {
    'container-apps': { api: 'dab', template: 'infra/main.bicep' },
    'app-service-f1': { api: 'dab', template: 'infra/app-service-f1.bicep' },
    'static-web-apps': { api: 'functions', template: 'infra/static-web-apps.bicep' },
  };
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !['hosting', 'api'].includes(key)) ||
      !('hosting' in value) || typeof value.hosting !== 'string' ||
      !Object.hasOwn(profiles, value.hosting) || !('api' in value) ||
      value.api !== profiles[value.hosting].api) {
    throw new Error('deployment.json must select container-apps/dab, app-service-f1/dab, or static-web-apps/functions.');
  }
  return { hosting: value.hosting, ...profiles[value.hosting] };
}

export function localApi(): LocalApi {
  return deploymentProfile(JSON.parse(readFileSync(resolve(root, 'deployment.json'), 'utf8'))).api;
}

export function readEnvironment() {
  const file = resolve(root, '.env');
  return { ...(existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}), ...process.env };
}

export function composeArguments(env: NodeJS.ProcessEnv, api: LocalApi = 'dab'): string[] {
  const project = env.COMPOSE_PROJECT_NAME;
  if (!project || !/^sqlapps-[a-f0-9]{12}$/.test(project)) {
    throw new Error('Run local:init; an isolated Compose project is required.');
  }
  const files = env.COMPOSE_FILE ?
    env.COMPOSE_FILE.split(env.COMPOSE_PATH_SEPARATOR || (process.platform === 'win32' ? ';' : ':')) :
    [api === 'functions' ? 'compose.functions.yml' : 'compose.yml'];
  const args = ['compose', '--project-name', project, ...files.flatMap(file => ['-f', file])];
  if (env.SQL_PORT) {
    if (!/^\d+$/.test(env.SQL_PORT) || Number(env.SQL_PORT) < 1 || Number(env.SQL_PORT) > 65535) {
      throw new Error('SQL_PORT must be an integer from 1 to 65535; leave it unset to keep SQL private.');
    }
    args.push('-f', 'compose.database.yml');
  }
  return args;
}

export function localEndpoints(env: NodeJS.ProcessEnv, api: LocalApi = 'dab') {
  const port = (name: string, fallback: string) => {
    const value = env[name] || fallback;
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
      throw new Error(`${name} must be an integer from 1 to 65535.`);
    }
    return value;
  };
  const app = env.APP_ORIGIN || `http://127.0.0.1:${port('APP_PORT', '5180')}`;
  const name = api === 'functions' ? 'FUNCTIONS_URL' : 'DAB_URL';
  const apiPort = api === 'functions' ? port('FUNCTIONS_PORT', '7071') : port('DAB_PORT', '5081');
  const upstream = env[name] || `http://127.0.0.1:${apiPort}`;
  for (const [name, value, expected] of [['APP_ORIGIN', app, port('APP_PORT', '5180')],
    [api === 'functions' ? 'FUNCTIONS_URL' : 'DAB_URL', upstream, apiPort]]) {
    const url = new URL(value);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
        (url.port || '80') !== expected || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`${name} must be a loopback HTTP origin matching its configured port.`);
    }
  }
  if (api === 'functions' && apiPort === port('APP_PORT', '5180')) {
    throw new Error('FUNCTIONS_PORT and APP_PORT must be distinct.');
  }
  return { app: new URL(app).origin, api: new URL(upstream).origin };
}

export function localConfiguration(env: NodeJS.ProcessEnv, api: LocalApi = 'dab'): AppConfiguration {
  const endpoints = localEndpoints(env, api);
  const config = configuration(api === 'functions' ? { ...env, DAB_URL: endpoints.api } : env);
  composeArguments(env, api);
  if (env.ACCEPT_EULA !== 'Y') throw new Error('Review the SQL terms and explicitly set ACCEPT_EULA=Y before startup.');
  if (new URL(config.dab).hostname !== '127.0.0.1') {
    throw new Error(`Local startup requires ${api === 'functions' ? 'FUNCTIONS_URL' : 'DAB_URL'} on 127.0.0.1.`);
  }
  if (api === 'functions' && !env.SQL_PORT) {
    throw new Error('Functions runs on the host: set an unused SQL_PORT for its loopback-only database connection.');
  }
  if (api === 'functions' && [endpoints.app, endpoints.api]
    .some(origin => Number(new URL(origin).port || 80) === Number(env.SQL_PORT))) {
    throw new Error('SQL_PORT, FUNCTIONS_PORT and APP_PORT must be distinct.');
  }
  for (const name of ['MSSQL_SA_PASSWORD', 'APP_SQL_PASSWORD',
    ...(api === 'dab' ? ['SQL_CONNECTION_STRING'] : [])]) {
    if (!env[name]?.trim() || env[name]?.includes('REPLACE_')) {
      throw new Error(`Missing ${name}; run local:init for a fresh app or restore the original .env for an existing database.`);
    }
  }
  if (!/^Aa1![a-f0-9]{48}$/.test(env.APP_SQL_PASSWORD || '')) {
    throw new Error('Invalid APP_SQL_PASSWORD; restore the original .env for this database.');
  }
  return config;
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
