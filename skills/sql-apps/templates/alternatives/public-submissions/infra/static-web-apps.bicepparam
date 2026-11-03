using './static-web-apps.bicep'

param workload = 'demo'
param location = 'eastus2'
param sqlappsVersion = 'REPLACE_ADOPTED_VERSION'
param sqlHost = 'REPLACE_APPROVED_SQL.database.windows.net'
param sqlDatabaseName = 'REPLACE_APPROVED_DATABASE'
param sqlClientId = '00000000-0000-0000-0000-000000000000'
// SQL runtime identity is always required; inject only through an approved secret source.
param sqlClientSecret = readEnvironmentVariable('SQL_CLIENT_SECRET')
// No fake owner values. Null omits all AUTH_* settings and keeps private reads disabled.
// After identity approval, provide all five real authority/issuer/audience/clientId/scope values.
param ownerAuth = null
