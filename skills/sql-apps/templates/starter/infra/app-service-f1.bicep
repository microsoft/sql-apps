targetScope = 'resourceGroup'

@minLength(1)
@maxLength(8)
param workload string = 'demo'
param location string = resourceGroup().location
@minLength(1)
param sqlappsVersion string

@description('Publicly pullable app-owned image pinned as registry/repository@sha256:digest. This recipe creates no registry or registry credentials.')
@minLength(72)
param webImage string
@minLength(72)
param dabImage string
@description('Existing approved Azure SQL fully qualified hostname; no SQL resources or firewall changes are made here.')
@minLength(1)
param sqlHost string
@minLength(1)
param sqlDatabaseName string
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
var webName = 'web-${workload}-${unique}-sqlapps'
var dabName = 'dab-${workload}-${unique}-sqlapps'
var tags = {
  'sqlapps-version': sqlappsVersion
}

resource plan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: 'plan-${workload}-${unique}-sqlapps'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: true
  }
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: 'id-f1-${workload}-${unique}-sqlapps'
  location: location
  tags: tags
}

resource dab 'Microsoft.Web/sites@2024-11-01' = {
  name: dabName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${dabImage}'
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'WEBSITES_PORT', value: '5000' }
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'AUTH_ISSUER', value: authIssuer }
        { name: 'AUTH_AUDIENCE', value: authAudience }
        {
          name: 'SQL_CONNECTION_STRING'
          value: 'Server=tcp:${sqlHost},1433;Database=${sqlDatabaseName};Authentication=Active Directory Managed Identity;User Id=${identity.properties.clientId};Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;'
        }
      ]
    }
  }
}

resource web 'Microsoft.Web/sites@2024-11-01' = {
  name: webName
  location: location
  tags: tags
  kind: 'app,linux,container'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${webImage}'
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

resource webSettings 'Microsoft.Web/sites/config@2024-11-01' = {
  parent: web
  name: 'appsettings'
  properties: {
    WEBSITES_PORT: '5180'
    WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false'
    APP_HOST: '0.0.0.0'
    APP_PORT: '5180'
    APP_ORIGIN: 'https://${web.properties.defaultHostName}'
    DAB_URL: 'https://${dab.properties.defaultHostName}'
    AUTH_AUTHORITY: authAuthority
    AUTH_ISSUER: authIssuer
    AUTH_AUDIENCE: authAudience
    AUTH_CLIENT_ID: authClientId
    AUTH_SCOPE: authScope
  }
}

output appUrl string = 'https://${web.properties.defaultHostName}'
output redirectUri string = 'https://${web.properties.defaultHostName}/'
output dabUrl string = 'https://${dab.properties.defaultHostName}'
output dabClientId string = identity.properties.clientId
output dabPrincipalObjectId string = identity.properties.principalId
