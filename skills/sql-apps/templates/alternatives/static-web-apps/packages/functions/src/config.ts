export const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value || value.includes('REPLACE_')) throw new Error(`Configure ${name}.`);
  return value;
}

export function publicConfiguration(env: NodeJS.ProcessEnv) {
  const origin = new URL(required(env, 'APP_ORIGIN'));
  const authority = new URL(required(env, 'AUTH_AUTHORITY'));
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
      (origin.protocol !== 'https:' && !(local && origin.protocol === 'http:'))) throw new Error('Invalid APP_ORIGIN.');
  if (authority.protocol !== 'https:' || authority.username || authority.password || authority.search || authority.hash) {
    throw new Error('Invalid AUTH_AUTHORITY.');
  }
  const scope = required(env, 'AUTH_SCOPE');
  if (!scope.split(/\s+/).includes('openid') ||
      !scope.split(/\s+/).some(s => !['openid', 'profile', 'email', 'offline_access'].includes(s))) {
    throw new Error('AUTH_SCOPE requires openid and an API scope.');
  }
  return {
    authority: authority.href.replace(/\/$/, ''),
    clientId: required(env, 'AUTH_CLIENT_ID'),
    scope,
    redirectUri: `${origin.origin}/`,
  };
}

export function authenticationConfiguration(env: NodeJS.ProcessEnv) {
  const issuer = required(env, 'AUTH_ISSUER');
  const match = /^(?:https:\/\/login\.microsoftonline\.com\/([0-9a-f-]+)\/v2\.0|https:\/\/sts\.windows\.net\/([0-9a-f-]+)\/)$/i.exec(issuer);
  const tenant = match?.[1] || match?.[2];
  if (!tenant || !guid.test(tenant)) throw new Error('AUTH_ISSUER must be tenant-bound Microsoft Entra.');
  const config = publicConfiguration(env);
  const authority = new URL(config.authority);
  if (authority.hostname !== 'login.microsoftonline.com' ||
      authority.pathname.toLowerCase() !== `/${tenant.toLowerCase()}/v2.0`) throw new Error('AUTH_AUTHORITY tenant mismatch.');
  const scopes = config.scope.split(/\s+/).filter(s => !['openid', 'profile', 'email', 'offline_access'].includes(s))
    .map(s => s.slice(s.lastIndexOf('/') + 1));
  return { issuer, tenant, audience: required(env, 'AUTH_AUDIENCE'), scopes };
}
