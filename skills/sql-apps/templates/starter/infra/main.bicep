targetScope = 'resourceGroup'

@description('Short non-sensitive lowercase workload token: letters and digits, starting with a letter.')
@minLength(1)
@maxLength(8)
param workload string = 'demo'

param location string = resourceGroup().location

@description('Recorded SQL Apps guidance version adopted by this app; preserve on redeployment.')
@minLength(1)
param sqlappsVersion string

@description('App-owned web image pinned as registry/repository@sha256:digest. Public pulls by default; private pulls require privateRegistryServer and a separately authorized pull grant.')
@minLength(72)
param webImage string

@description('App-owned DAB configuration image pinned as registry/repository@sha256:digest.')
@minLength(72)
param dabImage string

@description('Optional approved private registry hostname. Grant the runtime identity AcrPull on that registry separately before deploying applications. No registry, credentials, or role assignment is created here.')
param privateRegistryServer string = ''

@description('Optional explicitly approved repository-scoped pull token name. Empty uses managed identity. Never use registry admin credentials.')
param privateRegistryUsername string = ''

@secure()
@description('Approved repository-scoped token password, supplied securely at deployment time. Never commit or print it.')
param privateRegistryPassword string = ''

@description('Tenant-bound external OIDC authority, for example https://login.microsoftonline.com/TENANT/v2.0.')
@minLength(1)
param authAuthority string

@description('Exact access-token issuer. For Entra v2: https://login.microsoftonline.com/TENANT/v2.0.')
@minLength(1)
param authIssuer string

@minLength(1)
param authAudience string

@minLength(1)
param authClientId string

@description('Space-separated openid and delegated API access scope, not an ID-token audience.')
@minLength(1)
param authScope string

@description('Display name of the approved SQL Entra administrator user/group, not the runtime identity.')
@minLength(1)
param sqlAdministratorName string

@description('Object ID of the approved SQL Entra administrator user/group in the current tenant.')
@minLength(36)
@maxLength(36)
param sqlAdministratorObjectId string

@allowed([
  'Group'
  'User'
])
param sqlAdministratorType string = 'Group'

@description('Explicit access exception: allow connections from ALL Azure services, not only this application.')
param allowAzureServices bool = false

@description('Optional temporary operator IPv4 address for approved SQL bootstrap; empty creates no operator rule.')
param operatorIpAddress string = ''

@description('First deploy SQL/identity, bootstrap with the operator, then explicitly enable application deployment.')
param deployApplications bool = false

var unique = take(uniqueString(resourceGroup().id, workload), 6)
var environmentName = 'env-${workload}-${unique}-sqlapps'
var webName = 'web-${workload}-${unique}-sqlapps'
var dabName = 'dab-${workload}-${unique}-sqlapps'
var sqlName = 'sql-${workload}-${unique}-sqlapps'
var databaseName = 'app-${workload}-sqlapps'
var tags = {
  'sqlapps-version': sqlappsVersion
}

resource runtimeIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: 'id-${workload}-${unique}-sqlapps'
  location: location
  tags: tags
}

resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {}
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: sqlName
  location: location
  tags: tags
  properties: {
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    administrators: {
      administratorType: 'ActiveDirectory'
      principalType: sqlAdministratorType
      login: sqlAdministratorName
      sid: sqlAdministratorObjectId
      tenantId: tenant().tenantId
      azureADOnlyAuthentication: true
    }
  }
}

resource database 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: databaseName
  location: location
  tags: tags
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    catalogCollation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 34359738368
    minCapacity: json('0.5')
    autoPauseDelay: 60
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
    requestedBackupStorageRedundancy: 'Local'
  }
}

resource azureServicesRule 'Microsoft.Sql/servers/firewallRules@2023-08-01' = if (allowAzureServices) {
  parent: sqlServer
  name: 'azure-services-sqlapps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource operatorRule 'Microsoft.Sql/servers/firewallRules@2023-08-01' = if (!empty(operatorIpAddress)) {
  parent: sqlServer
  name: 'bootstrap-operator-sqlapps'
  properties: {
    startIpAddress: operatorIpAddress
    endIpAddress: operatorIpAddress
  }
}

resource dab 'Microsoft.App/containerApps@2025-01-01' = if (deployApplications) {
  name: dabName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${runtimeIdentity.id}': {}
    }
  }
  properties: {
    environmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: empty(privateRegistryUsername) ? [] : [
        {
          name: 'registry-pull'
          value: privateRegistryPassword
        }
      ]
      registries: empty(privateRegistryServer) ? [] : [
        empty(privateRegistryUsername) ? {
          server: privateRegistryServer
          identity: runtimeIdentity.id
        } : {
          server: privateRegistryServer
          username: privateRegistryUsername
          passwordSecretRef: 'registry-pull'
        }
      ]
      ingress: {
        external: false
        allowInsecure: false
        targetPort: 5000
        transport: 'http'
      }
    }
    template: {
      containers: [
        {
          name: 'dab'
          image: dabImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'SQL_CONNECTION_STRING'
              value: 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${database.name};Authentication=Active Directory Managed Identity;User Id=${runtimeIdentity.properties.clientId};Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;'
            }
            {
              name: 'AUTH_ISSUER'
              value: authIssuer
            }
            {
              name: 'AUTH_AUDIENCE'
              value: authAudience
            }
          ]
          probes: [
            {
              type: 'Startup'
              tcpSocket: {
                port: 5000
              }
              periodSeconds: 10
              failureThreshold: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: [
          {
            name: 'http'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// Derive the web origin without referencing its own resource configuration.
var appOrigin = 'https://${webName}.${environment.properties.defaultDomain}'

resource web 'Microsoft.App/containerApps@2025-01-01' = if (deployApplications) {
  name: webName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${runtimeIdentity.id}': {}
    }
  }
  properties: {
    environmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: empty(privateRegistryUsername) ? [] : [
        {
          name: 'registry-pull'
          value: privateRegistryPassword
        }
      ]
      registries: empty(privateRegistryServer) ? [] : [
        empty(privateRegistryUsername) ? {
          server: privateRegistryServer
          identity: runtimeIdentity.id
        } : {
          server: privateRegistryServer
          username: privateRegistryUsername
          passwordSecretRef: 'registry-pull'
        }
      ]
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 5180
        transport: 'http'
      }
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'APP_ORIGIN'
              value: appOrigin
            }
            {
              name: 'DAB_URL'
              value: 'https://${dab!.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'AUTH_AUTHORITY'
              value: authAuthority
            }
            {
              name: 'AUTH_ISSUER'
              value: authIssuer
            }
            {
              name: 'AUTH_AUDIENCE'
              value: authAudience
            }
            {
              name: 'AUTH_CLIENT_ID'
              value: authClientId
            }
            {
              name: 'AUTH_SCOPE'
              value: authScope
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 5180
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 5180
              }
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: [
          {
            name: 'http'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

output appUrl string = appOrigin
output redirectUri string = '${appOrigin}/'
output dabInternalUrl string = deployApplications ? 'https://${dab!.properties.configuration.ingress.fqdn}' : ''
output sqlServerName string = sqlServer.name
output sqlHost string = sqlServer.properties.fullyQualifiedDomainName
output sqlDatabaseName string = database.name
output dabPrincipalObjectId string = runtimeIdentity.properties.principalId
output dabClientId string = runtimeIdentity.properties.clientId
output webAppName string = webName
output dabAppName string = dabName
