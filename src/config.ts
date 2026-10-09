import { z } from 'zod';

const uuid = z.string().uuid();
const image = z.string().regex(
  /^[a-z0-9.-]+(?::[0-9]+)?\/[a-z0-9._/-]+(?::[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}|@sha256:[a-f0-9]{64})$/,
  'Use a registry/repository with an explicit version or sha256 digest',
).refine(value => !value.endsWith(':latest'), 'Use an explicit version, not latest');

export const deploymentSchema = z.strictObject({
  subscriptionId: uuid,
  tenantId: uuid,
  apiClientId: uuid,
  sqlAdminObjectId: uuid,
  sqlAdminName: z.string().min(1).max(128),
  resourceGroup: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.()-]{0,89}$/),
  location: z.string().regex(/^[a-z0-9]+$/),
  environment: z.enum(['dev', 'test', 'prod']),
  name: z.string().regex(/^[a-z][a-z0-9-]{2,19}$/),
  gatewayImage: image,
  dabImage: image,
  functionsImage: image,
  registryServer: z.string().regex(/^[a-z0-9]+\.azurecr\.io$/),
}).superRefine((config, context) => {
  for (const field of ['gatewayImage', 'dabImage', 'functionsImage'] as const) {
    if (!config[field].startsWith(`${config.registryServer}/`)) {
      context.addIssue({ code: 'custom', path: [field], message: 'Image must belong to the configured ACR' });
    }
  }
});

export type DeploymentConfig = z.infer<typeof deploymentSchema>;

export const runtimeSchema = z.strictObject({
  tenantId: uuid,
  apiClientId: uuid,
  dabUrl: z.url(),
  blobAccountUrl: z.url(),
  blobContainer: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
  functionsUrl: z.url(),
  publicDirectory: z.string().min(1),
});

export type RuntimeConfig = z.infer<typeof runtimeSchema>;

export function loadRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  return runtimeSchema.parse({
    tenantId: env.AZURE_TENANT_ID,
    apiClientId: env.API_CLIENT_ID,
    dabUrl: env.DAB_URL,
    blobAccountUrl: env.BLOB_ACCOUNT_URL,
    blobContainer: env.BLOB_CONTAINER,
    functionsUrl: env.FUNCTIONS_URL,
    publicDirectory: env.PUBLIC_DIRECTORY ?? 'public',
  });
}

export function environmentKey(config: DeploymentConfig): string {
  return `${config.subscriptionId}/${config.resourceGroup}/${config.name}/${config.environment}`;
}

export function portFromEnvironment(value: string | undefined): number {
  return z.coerce.number().int().min(1).max(65535).parse(value ?? 8080);
}
