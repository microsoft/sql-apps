import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

export function serviceVerifier(
  tenantId: string, audience: string, gatewayPrincipalId: string,
  getKey: JWTVerifyGetKey = createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
  ),
) {
  return async (token: string) => {
    const { payload } = await jwtVerify(token, getKey, {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'oid', 'tid'],
    });
    if (payload.tid !== tenantId || payload.oid !== gatewayPrincipalId || payload.scp !== undefined ||
        !Array.isArray(payload.roles) || !payload.roles.includes('Function.Invoke')) {
      throw new Error('Gateway application identity required');
    }
  };
}
