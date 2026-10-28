using './main.bicep'

param workload = 'demo'
param location = 'eastus'
// Copy the actual adopted plugin.json version from app-brief.md.
param sqlappsVersion = 'REPLACE_ADOPTED_VERSION'
param webImage = 'ghcr.io/REPLACE_OWNER/REPLACE_WEB@sha256:REPLACE_DIGEST'
param dabImage = 'ghcr.io/REPLACE_OWNER/REPLACE_DAB@sha256:REPLACE_DIGEST'
// Optional private registry hostname; separately approve the registry cost and managed-identity pull grant.
param privateRegistryServer = ''
param authAuthority = 'https://login.microsoftonline.com/REPLACE_TENANT/v2.0'
param authIssuer = 'https://login.microsoftonline.com/REPLACE_TENANT/v2.0'
param authAudience = 'REPLACE_API_AUDIENCE'
param authClientId = 'REPLACE_SPA_CLIENT_ID'
param authScope = 'openid profile api://REPLACE_API_CLIENT_ID/access_as_user'
param sqlAdministratorName = 'REPLACE_APPROVED_ENTRA_GROUP'
param sqlAdministratorObjectId = '00000000-0000-0000-0000-000000000000'
// Default denies SQL connectivity. Enable only after the documented access approval.
param allowAzureServices = false
param operatorIpAddress = ''
// Enable only after SQL migrations, managed identity grants and network access are ready.
param deployApplications = false
