targetScope = 'resourceGroup'

@minLength(1)
@maxLength(8)
param workload string = 'demo'
@description('A region that supports Static Web Apps, checked before an approved deployment.')
param location string = resourceGroup().location
@minLength(1)
param sqlappsVersion string
@description('Existing approved Azure SQL hostname. No database or firewall changes are made here.')
@minLength(1)
param sqlHost string
@minLength(1)
param sqlDatabaseName string
@description('Separately approved least-privilege SQL runtime service principal application client ID; always required.')
@minLength(36)
@maxLength(36)
param sqlClientId string
@secure()
@minLength(1)
param sqlClientSecret string

@sealed()
type OwnerAuthentication = {
  @minLength(1)
  authority: string
  @minLength(1)
  issuer: string
  @minLength(1)
  audience: string
  @minLength(1)
  clientId: string
  @minLength(1)
  scope: string
}

@description('Null intentionally disables owner sign-in and reads. Configure all five real values together after identity approval; SQL owner enrollment remains separate.')
param ownerAuth OwnerAuthentication?

var unique = take(uniqueString(resourceGroup().id, workload), 6)
var ownerSettings = ownerAuth == null ? {} : {
  AUTH_AUTHORITY: ownerAuth!.authority
  AUTH_ISSUER: ownerAuth!.issuer
  AUTH_AUDIENCE: ownerAuth!.audience
  AUTH_CLIENT_ID: ownerAuth!.clientId
  AUTH_SCOPE: ownerAuth!.scope
}

resource site 'Microsoft.Web/staticSites@2024-11-01' = {
  name: 'swa-${workload}-${unique}'
  location: location
  tags: {
    'sqlapps-version': sqlappsVersion
  }
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    provider: 'Custom'
    stagingEnvironmentPolicy: 'Disabled'
    publicNetworkAccess: 'Enabled'
    allowConfigFileUpdates: true
  }
}

resource settings 'Microsoft.Web/staticSites/config@2024-11-01' = {
  parent: site
  name: 'appsettings'
  properties: union({
    APP_ORIGIN: 'https://${site.properties.defaultHostname}'
    SQL_SERVER: sqlHost
    SQL_DATABASE: sqlDatabaseName
    SQL_TENANT_ID: tenant().tenantId
    SQL_CLIENT_ID: sqlClientId
    SQL_CLIENT_SECRET: sqlClientSecret
  }, ownerSettings)
}

output appUrl string = 'https://${site.properties.defaultHostname}'
output redirectUri string = 'https://${site.properties.defaultHostname}/'
output sqlRuntimeClientId string = sqlClientId
