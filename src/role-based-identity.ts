import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { DeploymentConfig } from './config.js';
import type { Run } from './process.js';
import { saveJson, applicationRoleId } from './deployment.js';

export async function assignApplicationRole(config: DeploymentConfig, principal: string, run: Run): Promise<void> {
  if (config.profile !== 'role-based-data') throw new Error('Application role assignment requires the role-based-data profile');
  const principalId = z.string().uuid().parse(principal);
  const tenant = z.object({ tenantId: z.string() }).parse(JSON.parse(await run('az', ['account', 'show', '-o', 'json'])));
  if (tenant.tenantId !== config.tenantId) throw new Error('Sign into the configured tenant before application role assignment');
  const service = z.object({ id: z.string().uuid(), appRoles: z.array(z.object({
    id: z.string().uuid(), value: z.string(), isEnabled: z.boolean(), allowedMemberTypes: z.array(z.string()),
  })) }).parse(JSON.parse(await run('az', ['ad', 'sp', 'show', '--id', config.apiClientId, '-o', 'json'])));
  const role = service.appRoles.find(value => value.value === config.requiredRole && value.isEnabled &&
    value.allowedMemberTypes.includes('User'));
  if (!role) throw new Error('The enabled human application role is missing from this service principal');
  const assignmentsUrl = `https://graph.microsoft.com/v1.0/servicePrincipals/${service.id}/appRoleAssignedTo`;
  let url: string | undefined = assignmentsUrl;
  const visited = new Set<string>();
  while (url) {
    if ((url !== assignmentsUrl && !url.startsWith(`${assignmentsUrl}?`)) || visited.has(url)) {
      throw new Error('Invalid or repeated application role assignment continuation URL');
    }
    visited.add(url);
    const page = z.object({ value: z.array(z.object({
      principalId: z.string(), appRoleId: z.string(), resourceId: z.string(),
    })), '@odata.nextLink': z.string().optional() }).parse(JSON.parse(
      await run('az', ['rest', '--method', 'GET', '--url', url, '-o', 'json']),
    ));
    if (page.value.some(item => item.principalId === principalId && item.appRoleId === role.id && item.resourceId === service.id)) return;
    url = page['@odata.nextLink'];
  }
  await mkdir('.sql-apps', { recursive: true });
  const path = resolve('.sql-apps', `role-assignment-${principalId}.json`);
  await saveJson(path, { principalId, resourceId: service.id, appRoleId: role.id });
  await run('az', ['rest', '--method', 'POST', '--url', assignmentsUrl, '--body', `@${path}`, '-o', 'none']);
}

export function applicationRegistrationRole(config: DeploymentConfig) {
  return {
    id: applicationRoleId, value: config.requiredRole, displayName: 'Application user',
    description: 'Allow users assigned this role to use this data application.',
    allowedMemberTypes: ['User'], isEnabled: true,
  };
}
