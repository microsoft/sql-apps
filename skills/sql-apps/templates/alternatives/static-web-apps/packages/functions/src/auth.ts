import type { HttpRequest } from '@azure/functions';
import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { authenticationConfiguration, nonzeroGuid } from './config.js';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createAuthenticator(env: NodeJS.ProcessEnv, keys?: JWTVerifyGetKey) {
  const config = authenticationConfiguration(env);
  const jwks = keys || createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${config.tenant}/discovery/v2.0/keys`),
    { timeoutDuration: 5000, cooldownDuration: 30000, cacheMaxAge: 600000 },
  );
  return async (request: HttpRequest): Promise<string> => {
    const header = request.headers.get('authorization');
    const match = /^Bearer\s+([^\s]+)$/i.exec(header || '');
    if (!match) throw new HttpError(401, 'A bearer access token is required.');
    let payload;
    try {
      ({ payload } = await jwtVerify(match[1], jwks, {
        algorithms: ['RS256'], issuer: config.issuer, audience: config.audience,
        requiredClaims: ['exp', 'iat', 'tid'], clockTolerance: 5,
      }));
    } catch (error) {
      if (error instanceof errors.JWTClaimValidationFailed || error instanceof errors.JWTExpired ||
          error instanceof errors.JWTInvalid || error instanceof errors.JWSInvalid ||
          error instanceof errors.JOSEAlgNotAllowed || error instanceof errors.JOSENotSupported ||
          error instanceof errors.JWSSignatureVerificationFailed ||
          error instanceof errors.JWKSNoMatchingKey) {
        throw new HttpError(401, 'The access token is not accepted.');
      }
      throw error;
    }
    if (typeof payload.tid !== 'string' || payload.tid.toLowerCase() !== config.tenant.toLowerCase()) {
      throw new HttpError(401, 'The access token is not accepted.');
    }
    if (typeof payload.oid !== 'string' || !nonzeroGuid(payload.oid) ||
        typeof payload.scp !== 'string' || !config.scopes.some(scope => payload.scp.split(' ').includes(scope))) {
      throw new HttpError(403, 'A user identity and delegated API scope are required.');
    }
    return payload.oid;
  };
}
