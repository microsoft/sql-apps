import { deploymentProfile } from './config.ts';

const deploymentPhases = Object.freeze(['publish', 'foundation', 'bootstrap', 'applications', 'verify']);
const inputKeys = Object.freeze([
  'applicationName',
  'targetTenant',
  'targetSubscription',
  'hostingRegion',
  'sqlRegion',
  'ownerIdentity',
  'database',
  'resourceReuse',
  'size',
]);

const shapes = {
  'container-apps/dab': {
    id: 'container-apps-dab',
    revision: '1.1.0',
    status: 'experimental',
    phases: deploymentPhases,
    artifacts: ['web-image', 'dab-image', 'infrastructure'],
    inputKeys,
    resources: [
      { id: 'container-apps-environment', type: 'Microsoft.App/managedEnvironments', sku: 'Consumption', costClass: 'metered-allowance', lifecycle: 'create' },
      { id: 'web-container-app', type: 'Microsoft.App/containerApps', sku: 'Consumption', costClass: 'metered-allowance', lifecycle: 'create' },
      { id: 'dab-container-app', type: 'Microsoft.App/containerApps', sku: 'Consumption', costClass: 'metered-allowance', lifecycle: 'create' },
      { id: 'runtime-identity', type: 'Microsoft.ManagedIdentity/userAssignedIdentities', sku: 'UserAssigned', costClass: 'no-direct-charge', lifecycle: 'create' },
      { id: 'azure-sql-server', type: 'Microsoft.Sql/servers', sku: 'Azure SQL logical server', costClass: 'no-direct-charge', lifecycle: 'create' },
      {
        id: 'azure-sql-database',
        type: 'Microsoft.Sql/servers/databases',
        sku: 'GP_S_Gen5',
        costClass: 'free-offer-with-enforced-quota-stop',
        lifecycle: 'create',
        settings: { useFreeLimit: true, freeLimitExhaustionBehavior: 'AutoPause' },
      },
      { id: 'sql-firewall-rules', type: 'Microsoft.Sql/servers/firewallRules', sku: 'Conditional', costClass: 'no-direct-charge', lifecycle: 'conditional' },
    ],
    actions: {
      publication: [
        { action: 'publish-image', artifact: 'web-image', target: 'approved-registry' },
        { action: 'publish-image', artifact: 'dab-image', target: 'approved-registry' },
      ],
      identity: [{ action: 'grant-sql-access', principal: 'runtime-identity', scope: 'azure-sql-database' }],
      network: [
        { action: 'expose-web-ingress', boundary: 'public-https' },
        { action: 'keep-dab-ingress', boundary: 'internal-https' },
        { action: 'configure-sql-firewall', boundary: 'explicitly-approved-rule-only' },
      ],
    },
  },
  'app-service-f1/dab': {
    id: 'app-service-f1-dab',
    revision: '1.1.0',
    status: 'experimental',
    phases: deploymentPhases,
    artifacts: ['web-image', 'dab-image', 'infrastructure'],
    inputKeys,
    resources: [
      { id: 'app-service-plan', type: 'Microsoft.Web/serverfarms', sku: 'F1', costClass: 'free-sku', lifecycle: 'create' },
      { id: 'web-app', type: 'Microsoft.Web/sites', sku: 'F1', costClass: 'free-sku', lifecycle: 'create' },
      { id: 'dab-app', type: 'Microsoft.Web/sites', sku: 'F1', costClass: 'free-sku', lifecycle: 'create' },
      { id: 'runtime-identity', type: 'Microsoft.ManagedIdentity/userAssignedIdentities', sku: 'UserAssigned', costClass: 'no-direct-charge', lifecycle: 'create' },
      { id: 'existing-azure-sql-database', type: 'Microsoft.Sql/servers/databases', sku: 'Existing-approved-resource', costClass: 'unresolved', lifecycle: 'reuse' },
    ],
    actions: {
      publication: [
        { action: 'publish-image', artifact: 'web-image', target: 'approved-public-registry' },
        { action: 'publish-image', artifact: 'dab-image', target: 'approved-public-registry' },
      ],
      identity: [{ action: 'grant-sql-access', principal: 'runtime-identity', scope: 'existing-azure-sql-database' }],
      network: [
        { action: 'expose-web-ingress', boundary: 'public-https' },
        { action: 'expose-dab-ingress', boundary: 'public-https-protected-api' },
        { action: 'reuse-sql-firewall', boundary: 'existing-approved-connectivity-only' },
      ],
    },
  },
  'static-web-apps/functions': {
    id: 'static-web-apps-functions',
    revision: '1.1.0',
    status: 'experimental',
    phases: deploymentPhases,
    artifacts: ['static-web-app', 'functions-package', 'infrastructure'],
    inputKeys,
    resources: [
      { id: 'static-web-app', type: 'Microsoft.Web/staticSites', sku: 'Free', costClass: 'free-sku', lifecycle: 'create' },
      { id: 'managed-functions-api', type: 'Static Web Apps managed Functions component', sku: 'Tier-dependent', costClass: 'unresolved', lifecycle: 'included' },
      { id: 'sql-runtime-service-principal', type: 'Microsoft Entra application', sku: 'Application identity', costClass: 'no-direct-charge', lifecycle: 'reuse' },
      { id: 'existing-azure-sql-database', type: 'Microsoft.Sql/servers/databases', sku: 'Existing-approved-resource', costClass: 'unresolved', lifecycle: 'reuse' },
    ],
    actions: {
      publication: [
        { action: 'publish-static-site', artifact: 'static-web-app', target: 'selected-static-web-app' },
        { action: 'publish-managed-functions', artifact: 'functions-package', target: 'selected-static-web-app' },
      ],
      identity: [{ action: 'configure-secret-reference', principal: 'sql-runtime-service-principal', scope: 'existing-azure-sql-database' }],
      network: [
        { action: 'expose-static-site', boundary: 'public-https' },
        { action: 'expose-functions-api', boundary: 'public-api-with-token-validation' },
        { action: 'reuse-sql-firewall', boundary: 'existing-approved-connectivity-only' },
      ],
    },
  },
};

export function resolveShape(profile) {
  const validated = deploymentProfile({
    hosting: profile?.hosting,
    api: profile?.api,
    ...(profile?.access === undefined ? {} : { access: profile.access }),
  });
  const shape = shapes[`${validated.hosting}/${validated.api}`];
  if (!shape) {
    throw new Error(`No deployment shape is cataloged for ${validated.hosting}/${validated.api}.`);
  }
  return { ...structuredClone(shape), access: validated.access || 'protected' };
}
