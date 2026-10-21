import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { roleBasedDabProblem, roleBasedProfileProblem } from './role-based-rules.mjs';
import { projectPath } from './runtime-roots.js';

const reservedRoles = ['anonymous', 'authenticated', 'Function.Invoke', 'processor'];

export const requiredRoleSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9._-]{0,63}$/)
  .refine(value => !reservedRoles.some(role => role.toLowerCase() === value.toLowerCase()),
    'Choose a dedicated human application role');
export const readinessPathSchema = z.string().regex(/^\/api\/[A-Za-z][A-Za-z0-9_-]{0,63}$/);
export const roleBasedProfileSchema = z.strictObject({
  profile: z.literal('role-based-data'),
  requiredRole: requiredRoleSchema,
  readinessPath: readinessPathSchema,
});
export type RoleBasedProfile = z.infer<typeof roleBasedProfileSchema>;

export async function readRoleBasedProfile(path = projectPath('role-based-data.json')): Promise<RoleBasedProfile> {
  return parseRoleBasedProfile(JSON.parse(await readFile(path, 'utf8')));
}

export function parseRoleBasedProfile(input: unknown): RoleBasedProfile {
  const problem = roleBasedProfileProblem(input);
  if (problem) throw new Error(problem);
  return roleBasedProfileSchema.parse(input);
}

export function validateRoleBasedDab(input: unknown, profile: RoleBasedProfile): void {
  const problem = roleBasedDabProblem(input, profile);
  if (problem) throw new Error(problem);
  const config = z.object({
    autoentities: z.never().optional(),
    entities: z.record(z.string(), z.object({
      source: z.object({ type: z.literal('stored-procedure'), object: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/) }),
      rest: z.union([z.boolean(), z.object({ enabled: z.boolean(), path: z.string().optional(),
        methods: z.array(z.enum(['get', 'post'])).optional() })]),
      permissions: z.array(z.object({ role: z.string(), actions: z.array(z.literal('execute')).min(1) })).min(1),
    })).refine(entities => Object.keys(entities).length > 0, 'Define authorized procedures'),
  }).parse(input);
  for (const [name, entity] of Object.entries(config.entities)) {
    if (name === 'FileJob' || entity.permissions.some(permission => permission.role !== profile.requiredRole)) {
      throw new Error('Role-based-data DAB entities must expose only approved authorized procedures, not foundation or anonymous roles');
    }
  }
  const ready = Object.entries(config.entities).find(([name, entity]) =>
    `/api/${typeof entity.rest === 'object' && entity.rest.path ? entity.rest.path : name}` === profile.readinessPath &&
    typeof entity.rest === 'object' && entity.rest.enabled && entity.rest.methods?.includes('get'));
  if (!ready) throw new Error('Role-based-data readinessPath must identify an enabled read-only REST readiness procedure');
}

export function roleBasedProcedureGrants(input: unknown, profile: RoleBasedProfile, user: string): string {
  validateRoleBasedDab(input, profile);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(user)) throw new Error('Invalid authorized SQL principal');
  const entities = z.object({ entities: z.record(z.string(), z.object({
    source: z.object({ object: z.string() }),
  })) }).parse(input).entities;
  return [...new Set(Object.values(entities).map(entity => entity.source.object))].map(object => {
    const [schema, name] = object.split('.');
    return `GRANT EXECUTE ON OBJECT::[${schema}].[${name}] TO [${user}];\nGRANT VIEW DEFINITION ON OBJECT::[${schema}].[${name}] TO [${user}];`;
  }).join('\n');
}
