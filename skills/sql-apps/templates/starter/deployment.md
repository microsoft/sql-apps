# Container Apps / DAB deployment record

Use this file as the app's single deployment record. Fill it in before any cloud
write. The shared SQL Apps deployment policy defines approval and evidence
requirements; its shape catalog lists topology and cost classes. Both references
are in the installed SQL Apps plugin.

| Record | Approved value or result |
| --- | --- |
| Target | Tenant, subscription, region and isolated resource group |
| Scope | Resources, actions, network rules, identity grants, image publication and cleanup |
| Artifacts | Source revision, image digests, recipe revision and runtime versions |
| Cost | Per-resource estimates, limits, assumptions and business ceiling |
| Owners | Resource approver, identity owner, SQL operator and acceptance owner |
| Results | Commands, actual settings, evidence, failures and open gates |

This runbook covers only the default Container Apps/DAB profile. Alternative
installers replace it with the selected profile's instructions.

## 1. Review the local plan

From the copied app, build and test before preparing deployment:

```powershell
npm ci
npm run build
npm test
npm run deployment:preflight
npm run deployment:plan
npm run deployment:prepare
```

Review the draft against the target, resource, cost and access approvals above.
Confirm current region and SQL-offer eligibility before any write. Read-only
preflight cannot establish provisioning eligibility.

## 2. Build and approve images

Select an approved credential-free HTTPS npm registry. The web build uses it
without copying `.npmrc` or credentials; the DAB build does not use npm.

```powershell
npm run images:build -- --web-image app-web:review --dab-image app-dab:review --npm-registry https://APPROVED-REGISTRY/
```

Test both images against an isolated SQL and DAB fixture. After separate
publication approval, push to the approved registry and record immutable image
digests. Never deploy mutable tags.

For private image pulls, choose one approved method:

| What to set | Who approves | Cost | Cleanup |
| --- | --- | --- | --- |
| **Default:** `privateRegistryServer`; grant the user-assigned identity `AcrPull` on the registry. | Registry owner approves the grant and image scope. | Registry charges apply; see its current pricing. | Remove the grant when the app no longer pulls these images. |
| **Exception:** repository-scoped read token in `privateRegistryUsername` and secure `privateRegistryPassword`. | Registry and resource owners approve the token and secret channel. | Registry charges apply. | Record expiry; rotate and revoke the token after verified replacement. |

Never enable registry-admin credentials or place token values in parameter files,
commands, logs or this record.

## 3. Preview and create foundation resources

Replace placeholders in `infra/main.bicepparam`. Pin the published image digests,
preserve existing resource names, and set `deployApplications = false`. Choose
the SQL administrator type and approved identity object ID.

Compile and preview the exact target:

```powershell
New-Item -ItemType Directory -Force .local | Out-Null
az bicep build --file infra\main.bicep --outfile .local\main.json
if ($LASTEXITCODE -ne 0) { throw 'Bicep compilation failed.' }
$group = '<approved-isolated-resource-group>'
az deployment group what-if --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Foundation preview failed.' }
```

Review additions, replacements, deletions, public endpoints, firewall rules,
identities and tags against this record. Sign in and select the approved
subscription only for an explicitly requested cloud task. Create or deploy only
after approval of this preview and its cost/access scope:

```powershell
az deployment group create --name sqlapps-reviewed --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Foundation deployment failed.' }
$outputsJson = az deployment group show --name sqlapps-reviewed --resource-group $group --query properties.outputs --output json
if ($LASTEXITCODE -ne 0) { throw 'Reading deployment outputs failed.' }
$outputs = $outputsJson | ConvertFrom-Json
```

If a write times out, inspect actual state before retrying. Do not select another
region, tier or resource name without a new scope review.

## 4. Migrate SQL and bootstrap DAB

Use the shared [SQL migration procedure](./deployment-migrations.md) with the
approved Entra SQL operator. Apply each forward migration to the application
database and verify its checksum. Then grant the DAB identity its least-privilege
permissions using its **application client ID**:

```powershell
$sqlHost = $outputs.sqlHost.value
$database = $outputs.sqlDatabaseName.value
$clientId = $outputs.dabClientId.value
sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -v "DabClientId=$clientId" -i infra\bootstrap.sql
if ($LASTEXITCODE -ne 0) { throw 'SQL identity bootstrap failed.' }
```

The template does not create an app registration, grant consent or establish a
SQL firewall path. `allowAzureServices` defaults to false. If the owner approves
it, understand that it allows all Azure services, not only this app. An approved
operator IP rule should allow only one address; remove the actual rule after
bootstrap, clear its parameter and verify the resulting firewall rules. A flag
change alone does not remove a previously created rule.

## 5. Deploy the applications

Register the exact SPA redirect URI with the identity owner and complete approved
consent. Verify SQL connectivity and DAB permissions first. Then set
`deployApplications = true`, run `what-if` again and review its changes. Create the
applications only after that preview is approved:

```powershell
az deployment group what-if --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Application preview failed.' }
az deployment group create --name sqlapps-reviewed --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
if ($LASTEXITCODE -ne 0) { throw 'Application deployment failed.' }
$outputsJson = az deployment group show --name sqlapps-reviewed --resource-group $group --query properties.outputs --output json
if ($LASTEXITCODE -ne 0) { throw 'Reading application outputs failed.' }
$outputs = $outputsJson | ConvertFrom-Json
```

Read back actual Container Apps, SQL, firewall, identity and resource settings.
Record mismatches as failed checks, not permission to broaden access or cost.
Changing `deployApplications` back to false does not remove existing apps.

```powershell
az containerapp show --resource-group $group --name $outputs.webAppName.value
az containerapp show --resource-group $group --name $outputs.dabAppName.value
az sql db show --resource-group $group --server $outputs.sqlServerName.value --name $outputs.sqlDatabaseName.value
az sql server firewall-rule list --resource-group $group --server $outputs.sqlServerName.value
```

## 6. Verify, recover and clean up

Using real sign-in and the selected API, verify allowed and denied requests, SQL
ownership, concurrent-write invariants, browser save/reload and persistence after
an approved app restart. Confirm DAB is reachable only through its internal path.
Record image digests, actual settings, commands, timestamps and evidence. Use
health only for liveness; verify SQL with saved data after restart.

Deployment phases run through the VS Code host. The starter provides the
host-authorized phase API but no Azure adapter or standalone apply command. The
host must authorize and order phases, then reconcile uncertain writes before
retry. `deployment:status` only reads the sanitized receipt; it does not contact
Azure.

For rollback, redeploy a reviewed compatible image and parameters; SQL is not
rolled back automatically. Cleanup requires separate approval. List exact
resources and data loss first; never delete a shared group or SQL database as a
shortcut. Preserve evidence and customer data according to the agreed retention
policy.

## Stop and ask

Pause before a new region or tier, broader firewall rule, extra identity grant,
destructive recovery, changed migration checksum, unknown resource ownership,
unapproved publication, unresolved charge exposure or cleanup outside the
recorded scope.
