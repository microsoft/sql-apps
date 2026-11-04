# Container Apps / DAB deployment record

| Record | Approved value or result |
| --- | --- |
| Target | Tenant, subscription, region and isolated resource group |
| Scope | Resources, actions, network rules, identity grants, image publication and cleanup |
| Artifacts | Source revision, image digests, recipe revision and runtime versions |
| Cost | Per-resource estimates, limits, assumptions and business ceiling |
| Owners | Resource approver, identity owner, SQL operator and acceptance owner |
| Results | Commands, actual settings, evidence, failures and open gates |

## 1. Review the local plan

```powershell
npm ci
npm run build
npm test
npm run deployment:preflight
npm run deployment:plan
npm run deployment:prepare
```

Confirm region/SQL-offer eligibility and compare plan with approval.

## 2. Build and approve images

Use an approved credential-free HTTPS npm registry. Web runs `npm ci`/`npm run build`
inside Docker, not local `dist`; DAB uses its pinned base. Never copy `.npmrc`/credentials.

```powershell
npm run images:build -- --web-image app-web:review --dab-image app-dab:review --npm-registry https://APPROVED-REGISTRY/
```

Test with isolated SQL/DAB; after publication approval, push and record digests,
never mutable tags.

Private pulls incur registry charges. Choose an approved method:

| Method | Approval and cleanup |
| --- | --- |
| **Default:** `privateRegistryServer` and user-assigned identity `AcrPull` | Registry owner approves image/grant scope; remove grant when no longer needed |
| **Exception:** repository-scoped read token via `privateRegistryUsername`/secure `privateRegistryPassword` | Registry/resource owners approve token/channel/expiry; rotate and revoke after verified replacement |

No registry-admin credentials or tokens in files, commands, logs or this record.

## 3. Preview and create foundation resources

Fill `infra/main.bicepparam`: image digests, stable names, SQL administrator type/
approved object ID and `deployApplications = false`. Compile/preview:

```powershell
New-Item -ItemType Directory -Force .local | Out-Null
az bicep build --file infra\main.bicep --outfile .local\main.json
if ($LASTEXITCODE -ne 0) { throw 'Bicep compilation failed.' }
$group = '<approved-isolated-resource-group>'
az deployment group what-if --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Foundation preview failed.' }
```

Review resources, endpoints, firewall, identities and tags against approval.
After signing into the approved subscription and approving the preview:

```powershell
az deployment group create --name sqlapps-reviewed --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Foundation deployment failed.' }
$outputsJson = az deployment group show --name sqlapps-reviewed --resource-group $group --query properties.outputs --output json
if ($LASTEXITCODE -ne 0) { throw 'Reading deployment outputs failed.' }
$outputs = $outputsJson | ConvertFrom-Json
```

After timeout, inspect state before retry.

## 4. Migrate SQL and bootstrap DAB

Apply/verify [SQL migrations](./deployment-migrations.md) through the approved
Entra operator. Bootstrap restricted DAB grants using its **application client ID**:

```powershell
$sqlHost = $outputs.sqlHost.value
$database = $outputs.sqlDatabaseName.value
$clientId = $outputs.dabClientId.value
sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -v "DabClientId=$clientId" -i infra\bootstrap.sql
if ($LASTEXITCODE -ne 0) { throw 'SQL identity bootstrap failed.' }
```

`allowAzureServices` defaults false; enabling it admits all Azure services, not just
this app. Approve single-address operator IP rules separately. After bootstrap,
remove the rule, clear its parameter and verify; parameter changes alone do not remove rules.

## 5. Deploy the applications

Register the exact SPA redirect/consent; verify SQL connectivity/DAB grants.
Set `deployApplications = true`, preview again, then deploy after approval:

```powershell
az deployment group what-if --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Application preview failed.' }
az deployment group create --name sqlapps-reviewed --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Application deployment failed.' }
$outputsJson = az deployment group show --name sqlapps-reviewed --resource-group $group --query properties.outputs --output json
if ($LASTEXITCODE -ne 0) { throw 'Reading application outputs failed.' }
$outputs = $outputsJson | ConvertFrom-Json
```

Read back actual settings against approval.
Setting `deployApplications = false` does not remove apps.

```powershell
az containerapp show --resource-group $group --name $outputs.webAppName.value
az containerapp show --resource-group $group --name $outputs.dabAppName.value
az sql db show --resource-group $group --server $outputs.sqlServerName.value --name $outputs.sqlDatabaseName.value
az sql server firewall-rule list --resource-group $group --server $outputs.sqlServerName.value
```

## 6. Verify, recover and clean up

Verify real sign-in, direct/proxied allowed/denied requests, ownership/concurrency,
browser save/reload and persisted rows/new write after approved restart.
Confirm internal-only DAB. Record digests/settings/commands/results; health is liveness only.

The host authorizes phases/reconciles uncertain writes. No bundled Azure adapter/
standalone apply; `deployment:status` reads local receipts, not Azure.

Rollback needs reviewed schema-compatible images/parameters; no automatic SQL undo.
Approve exact cleanup resources/data loss separately; preserve shared resources
and data/evidence under the retention policy.

## Stop and ask

Stop for unknown ownership, changed migration checksums, unresolved charges
or any operation outside recorded approval.
