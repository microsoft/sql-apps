targetScope = 'resourceGroup'

@minLength(1)
@maxLength(8)
param workload string = 'demo'
@description('A region that supports Static Web Apps, checked before an approved deployment.')
param location string = resourceGroup().location
@minLength(1)
param sqlappsVersion string
@description('Existing approved Azure SQL fully qualified hostname. No database or firewall changes are made here.')
@minLength(1)
param sqlHost string
@minLength(1)
param sqlDatabaseName string
@description('Application client ID of a separately approved least-privilege Entra service principal, not the browser SPA or a SQL administrator.')
@minLength(36)
@maxLength(36)
param sqlClientId string
@secure()
@minLength(1)
param sqlClientSecret string
@minLength(1)
param authAuthority string
@minLength(1)
param authIssuer string
@minLength(1)
param authAudience string
@minLength(1)
param authClientId string
@minLength(1)
param authScope string

var unique = take(uniqueString(resourceGroup().id, workload), 6)

resource site 'Microsoft.Web/staticSites@2024-11-01' = {
  name: 'swa-${workload}-${unique}-sqlapps'
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
  properties: {
    APP_ORIGIN: 'https://${site.properties.defaultHostname}'
    AUTH_AUTHORITY: authAuthority
    AUTH_ISSUER: authIssuer
    AUTH_AUDIENCE: authAudience
    AUTH_CLIENT_ID: authClientId
    AUTH_SCOPE: authScope
    SQL_SERVER: sqlHost
    SQL_DATABASE: sqlDatabaseName
    SQL_TENANT_ID: tenant().tenantId
    SQL_CLIENT_ID: sqlClientId
    SQL_CLIENT_SECRET: sqlClientSecret
  }
}

output appUrl string = 'https://${site.properties.defaultHostname}'
output redirectUri string = 'https://${site.properties.defaultHostname}/'
output sqlRuntimeClientId string = sqlClientId
