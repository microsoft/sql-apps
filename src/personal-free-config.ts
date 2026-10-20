import { z } from 'zod';

const uuid = z.string().uuid();

// Microsoft.Web/staticSites accepts only these regions (https://learn.microsoft.com/azure/static-web-apps/overview).
export const staticWebAppRegions = ['westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia'] as const;

const region = z.string().regex(/^[a-z0-9]+$/);

const currentConfigSchema = z.strictObject({
  profile: z.literal('personal-free'),
  subscriptionId: uuid,
  subscriptionName: z.string().min(1).max(128).optional(),
  tenantId: uuid,
  sqlAdministratorObjectId: uuid,
  sqlAdministratorName: z.string().min(1).max(128),
  resourceGroup: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.()-]{0,89}$/),
  existingResourceGroup: z.boolean().default(false),
  webLocation: z.enum(staticWebAppRegions, {
    message: `Static Web Apps region must be one of: ${staticWebAppRegions.join(', ')}`,
  }),
  dataLocation: region,
  sharing: z.enum(['personal', 'team']).default('personal'),
  deploymentClientIp: z.ipv4().refine(ip => ip !== '0.0.0.0', 'Deployment client IP must identify one operator, not all Azure services').optional(),
  environment: z.enum(['dev', 'test', 'prod']),
  name: z.string().regex(/^[a-z][a-z0-9-]{2,19}$/),
});

export function legacyLocationMessage(location: string): string {
  return `This config uses the retired single "location" (${location}), which Static Web Apps does not support, ` +
    `so its web app could not have been deployed. Move the config aside and rerun "npm run publish -- init" with the same ` +
    `--name, --environment and --resource-group, --web-location <${staticWebAppRegions.join('|')}> and ` +
    `--data-location ${location} to keep the data region, and --client-ip <public-ipv4> for temporary SQL publishing access; ` +
    `use --resource-group-mode existing if the group was created.`;
}

function migrateLegacyLocation(value: unknown, context: z.RefinementCtx): unknown {
  if (!value || typeof value !== 'object' || !('location' in value)) return value;
  const { location, ...rest } = value as Record<string, unknown>;
  if (typeof location === 'string' && !(staticWebAppRegions as readonly string[]).includes(location)) {
    context.addIssue({ code: 'custom', message: legacyLocationMessage(location) });
    return z.NEVER;
  }
  return { webLocation: location, dataLocation: location, ...rest };
}

export const personalFreeConfigSchema = z.preprocess(migrateLegacyLocation, currentConfigSchema);

export type PersonalFreeConfig = z.infer<typeof personalFreeConfigSchema>;

export const protectedDeploymentStateSchema = z.strictObject({
  approval: z.string().regex(/^[a-f0-9]{12}$/),
  stage: z.enum(['new', 'infrastructure', 'schema', 'runtime-user', 'application', 'ready']),
  sqlAdministratorPassword: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  runtimePassword: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  staticWebAppName: z.string().optional(),
  staticWebAppHostname: z.string().optional(),
  sqlServer: z.string().optional(),
});

export type ProtectedDeploymentState = z.infer<typeof protectedDeploymentStateSchema>;
