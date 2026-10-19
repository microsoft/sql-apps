import { createHash } from 'node:crypto';
import { z } from 'zod';

const text = z.string().min(1).max(256);
const role = z.string().min(1).max(128);
export const appRoles = ['owner', 'member'] as const;
export type AppRole = typeof appRoles[number];
const principalSchema = z.strictObject({
  identityProvider: text,
  userId: text,
  userDetails: z.string().max(512),
  userRoles: z.array(role).min(1).max(32),
}).superRefine((value, context) => {
  if (new Set(value.userRoles).size !== value.userRoles.length) {
    context.addIssue({ code: 'custom', path: ['userRoles'], message: 'Principal roles must be unique' });
  }
  if (!appRoles.some(role => value.userRoles.includes(role))) {
    context.addIssue({ code: 'custom', path: ['userRoles'], message: 'Principal must have the owner or member role' });
  }
});

export interface SwaAppPrincipal {
  provider: string;
  userId: string;
  details: string;
  roles: string[];
  role: AppRole;
  ownerId: string;
}

function ownerUuid(provider: string, userId: string): string {
  const bytes = createHash('sha256').update(provider).update('\0').update(userId).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const value = bytes.toString('hex');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function parseAppPrincipal(header: string | null | undefined): SwaAppPrincipal {
  if (!header) throw new Error('SWA client principal is required');
  let decoded: Buffer;
  try {
    decoded = Buffer.from(header, 'base64');
  } catch {
    throw new Error('SWA client principal is invalid');
  }
  if (decoded.length === 0 || decoded.length > 8192) throw new Error('SWA client principal has an invalid size');
  let input: unknown;
  try {
    input = JSON.parse(decoded.toString('utf8'));
  } catch {
    throw new Error('SWA client principal is invalid JSON');
  }
  const parsed = principalSchema.safeParse(input);
  if (!parsed.success) throw new Error('SWA client principal or app role is invalid');
  const value = parsed.data;
  return {
    provider: value.identityProvider,
    userId: value.userId,
    details: value.userDetails,
    roles: [...value.userRoles],
    role: value.userRoles.includes('owner') ? 'owner' : 'member',
    ownerId: ownerUuid(value.identityProvider, value.userId),
  };
}
