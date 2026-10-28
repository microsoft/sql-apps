using './static-web-apps.bicep'

param workload = 'demo'
param location = 'eastus2'
param sqlappsVersion = 'REPLACE_ADOPTED_VERSION'
param sqlHost = 'REPLACE_APPROVED_SQL.database.windows.net'
param sqlDatabaseName = 'REPLACE_APPROVED_DATABASE'
param sqlClientId = '00000000-0000-0000-0000-000000000000'
// Set only in the operator process from an approved secret source; never put the value in this file.
param sqlClientSecret = readEnvironmentVariable('SQL_CLIENT_SECRET')
param authAuthority = 'https://login.microsoftonline.com/REPLACE_TENANT/v2.0'
param authIssuer = 'https://login.microsoftonline.com/REPLACE_TENANT/v2.0'
param authAudience = 'REPLACE_API_AUDIENCE'
param authClientId = 'REPLACE_SPA_CLIENT_ID'
param authScope = 'openid profile api://REPLACE_API_CLIENT_ID/access_as_user'
