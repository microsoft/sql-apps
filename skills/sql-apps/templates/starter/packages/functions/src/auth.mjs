import { createRemoteJWKSet, jwtVerify } from 'jose';
import { authenticationConfiguration, guid } from './config.mjs';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createAuthenticator(env, keys) {
  const config = authenticationConfiguration(env);
  const jwks = keys || createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${config.tenant}/discovery/v2.0/keys`),
    { timeoutDuration: 5000, cooldownDuration: 30000, cacheMaxAge: 600000 },
  );
  return async request => {
    const header = request.headers.get('authorization');
    const match = /^Bearer ([^\s,]+)$/i.exec(header || '');
    if (!match) throw new HttpError(401, 'A bearer access token is required.');
    let payload;
    try {
      ({ payload } = await jwtVerify(match[1], jwks, {
        algorithms: ['RS256'], issuer: config.issuer, audience: config.audience,
        requiredClaims: ['exp', 'iat', 'tid'], clockTolerance: 5,
      }));
      if (typeof payload.tid !== 'string' || payload.tid.toLowerCase() !== config.tenant.toLowerCase()) {
        throw new Error('Tenant mismatch.');
      }
    } catch {
      throw new HttpError(401, 'The access token is not accepted.');
    }
    if (typeof payload.oid !== 'string' || !guid.test(payload.oid) ||
        typeof payload.scp !== 'string' || !config.scopes.some(scope => payload.scp.split(' ').includes(scope))) {
      throw new HttpError(403, 'A user identity and delegated API scope are required.');
    }
    return payload.oid;
  };
}
