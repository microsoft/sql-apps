import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type JWTPayload } from 'jose';

export interface UserIdentity {
  oid: string;
  tenantId: string;
}

export type VerifyUser = (token: string) => Promise<UserIdentity>;

export function entraVerifier(
  tenantId: string,
  audience: string,
  getKey: JWTVerifyGetKey = createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
  ),
): VerifyUser {
  return async token => {
    const { payload } = await jwtVerify(token, getKey, {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'oid', 'tid'],
    });
    return userFromClaims(payload, tenantId);
  };
}

export function userFromClaims(payload: JWTPayload, tenantId: string): UserIdentity {
  if (payload.tid !== tenantId || typeof payload.oid !== 'string' ||
      !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(payload.oid) ||
      typeof payload.scp !== 'string' || !payload.scp.split(' ').includes('access_as_user')) {
    throw new Error('A delegated access_as_user token from the configured tenant is required');
  }
  return { oid: payload.oid, tenantId };
}

export function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer ([^\s]+)$/i.exec(header ?? '');
  return match?.[1];
}
