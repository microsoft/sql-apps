# Container Apps Consumption + Azure SQL recipe

**End-to-end cloud acceptance: incomplete. Not permission to provision.** This is
concrete app-owned Bicep and container packaging. A 2026-10-27 maintainer cloud review
provisioned the foundation and applications, verified free-limit settings,
managed-identity SQL startup, internal HTTPS routing and authentication denials,
but real-user data acceptance remains blocked by tenant admin consent.
Local compilation/builds alone cannot prove subscription eligibility, managed
identity, real-provider sign-in, service quotas, or deployed acceptance. Preserve
existing approved infrastructure rather than silently migrating it.

Local evidence: Bicep compilation/resource assertions, both image builds, starter
build/unit checks, and actual-image API/authorization/concurrency/restart checks
passed with synthetic identities and real local SQL at the proposed container
limits. Local SQL bootstrap refusal guards passed; positive external-user creation
and Azure managed-identity authentication did not. Local image tests used loopback
HTTP, not Azure internal HTTPS. Keep those evidence boundaries distinct.

## Topology and cost boundary

| Component | Configuration | Cost class and boundary |
| --- | --- | --- |
| Web | Public HTTPS Container App; compiled React plus the Node same-origin proxy; port 5180 | Consumption **metered allowance**, 0.25 vCPU/0.5 GiB, minimum 0 / maximum 1 replica |
| DAB | Separate internal HTTPS Container App; pinned DAB with the app's configuration; port 5000 | Same allocation/scaling; shared subscription allowance, not a second free grant |
| Environment | One Consumption workload profile, no application log storage (empty `appLogsConfiguration`, not the invalid literal destination `'none'`) | No dedicated profile, Log Analytics workspace, NAT, or private endpoint |
| SQL | General Purpose serverless free offer, 32 GiB data maximum, local backup redundancy | **Free offer with enforced quota stop** only when eligible; `useFreeLimit: true`, `freeLimitExhaustionBehavior: AutoPause` |
| Images | Prepublished immutable app-owned web and DAB images; public by default or an explicitly approved private registry | No registry created by this template; publication, public disclosure or private registry charges, storage and transfer require review |
| Identity | External single-tenant SPA/API registration; DAB user-assigned managed identity for SQL | No browser secret or SQL administrator password; migrations use a separate operator identity |

Container Apps grants are shared per subscription: check current
[billing guidance](https://learn.microsoft.com/azure/container-apps/billing), including
compute, requests, network transfer and other resources. Container Apps overages
can incur charges. Scale-to-zero is not a
hard spending cap. Cold starts, SQL resume and quota exhaustion can return unavailable
responses; the app must not fabricate success. At zero replicas compute stops, but
running replicas and usage beyond grants can incur charges. Budget alerts do not
stop spending. Preserve `intent: poc` / `costPreference: free-first` and obtain
explicit spend approval. **Strict zero Azure spend blocks this recipe unless an
independently verified hard no-charge boundary exists.**

SQL monthly quota AutoPause is distinct from idle auto-pause. Never substitute
`BillOverUsage`, paid SQL Basic, a paid plan, or trial credits if the free offer is
unavailable. Check current [SQL free-offer eligibility](https://learn.microsoft.com/azure/azure-sql/database/free-tier)
for the actual subscription/region before an approved deployment. Do not treat
template settings as proof that the service accepted them.

## Prerequisites and explicit approvals

Work in a copied application, never inside the installed plugin. Use the existing
assistant with Azure CLI, Bicep, Docker Linux containers, the application's existing
SQL tools/guidance, and current first-party documentation. No additional cloud skills
plugin or onboarding state machine is required.

Before cloud writes, record one deployment review in `app-brief.md` covering:

- Subscription, tenant, region, isolated resource group, allowed actions and costs.
- Exact immutable image references and permission to publish app source/artifacts.
  Public pulls need no registry settings. For private images, set
  `privateRegistryServer` to the approved registry hostname and separately authorize
  an `AcrPull` grant for the recipe's user-assigned identity on that registry.
  Both Container Apps use that identity for image pulls; only DAB uses its SQL
  permissions. No registry or role assignment is created by this template. A private
  Basic ACR has standing charges outside Container Apps grants. Do not enable
  registry admin credentials or publish private code to bypass missing pull access.
  An explicitly approved temporary alternative is an ACR token restricted to
  `content/read` and `metadata/read` on only the two application repositories.
  Set `privateRegistryUsername` to that token's name and supply the
  `@secure()` `privateRegistryPassword` only through a secure deployment channel,
  never committed parameters, command-line values, or logs. Container Apps stores
  it as the `registry-pull` secret. SQL continues using managed identity. Record
  the token expiry/rotation and cleanup obligation; this is not a registry admin
  account or a managed-identity pull grant.
- External OIDC authority, issuer, API audience, SPA client, delegated scope, consent,
  tenant-bound GUID `oid`, and the final exact redirect/logout URI. Entra v2 access
  tokens are the starter contract; an ID token is not an API access token.
- SQL Entra administrator user/group, migration operator, DAB identity bootstrap,
  SQL connectivity, firewall exceptions, and cleanup. No automatic app registration,
  consent, credentials, or Graph directory-read grants.
- Adopted `sqlapps-version` from the actual plugin manifest, final `sqlapps` naming
  suffix, customer tags, approved exceptions, and resource readback checks.

The recipe creates new isolated resources. Names use a 1-8 character lowercase
alphanumeric workload token starting with a letter and a stable group-derived
uniqueness token. Do not repoint it at existing/shared resources to overwrite their
settings or metadata. Merge approved customer tags into `infra/main.bicep` before
deployment, preserving case-insensitive keys and resolving conflicts; do not overwrite
an existing `sqlapps-version`. Resource-group tags are not inherited: tag a newly
created isolated group explicitly, but do not reattribute an existing group.

### SQL networking is not implicit

`allowAzureServices` defaults to **false**. The baseline uses SQL's public TLS
endpoint with no allowed client addresses. **It cannot serve data until an approved
connectivity path and SQL bootstrap exist.** Managed identity authenticates; it does
not bypass the firewall.

For a minimal PoC, an explicitly approved `allowAzureServices = true` creates the
`0.0.0.0` SQL firewall exception. This allows connections from **all Azure services,
including other customers' resources**, not just these Container Apps; SQL still
requires authentication and least-privilege permissions. If that boundary is
unacceptable, stop and design a separately approved network topology. Do not
silently add paid private networking or claim the default-off deployment works.

`operatorIpAddress` optionally permits one approved operator IPv4 address for
bootstrap. Use no broad operator range. Remove the actual firewall rule after
bootstrap and clear the parameter so future deployments do not recreate it.
Incremental ARM deployment does **not** delete a formerly declared conditional rule.
Disabling a flag alone does not close an existing firewall exception.

## 1. Build and verify locally

From the copied app directory, with approved dependency access and cached/approved
base images:

```powershell
npm ci
npm run build
npm test
docker build --platform linux/amd64 -f Dockerfile.web -t app-web:review .
docker build --platform linux/amd64 -f Dockerfile.dab -t app-dab:review .
az bicep build --file infra\main.bicep --outfile .local\main.json
```

Create `.local` first if absent. Compilation needs no Azure sign-in. Installing a
missing compiler or pulling images changes the host and requires applicable
permission. The web build defaults to npm's public registry; where a trusted mirror
is required use `--build-arg NPM_CONFIG_REGISTRY=https://approved-mirror/`.
Never pass registry credentials as build arguments or disable TLS verification.

The web image builds from the committed lockfile and runs as the non-root Node
user without build dependencies. It requires `APP_HOST=0.0.0.0` / `APP_PORT=5180`.
The DAB image includes `packages/data/dab-config.json` on the digest pinned in
`baseline.json`; rebuild it whenever entities/permissions change. No local `.env`,
test issuer/key, SQL container or administrator credentials belong in either image.

Exercise both images against an isolated real SQL/DAB test fixture before publishing,
including web routing, allowed/denied requests and restart. Web `/health` is process
liveness, not whole-stack readiness. DAB starts only after SQL migrations and grants
are available; startup can fail before bootstrap. Probes must not restart healthy
processes simply because SQL is paused. The Node proxy currently times out after
15 seconds, so cold-start requests can fail with explicit 503 and succeed on retry.

After separate publication approval, tag and push both images to an approved registry,
then resolve their actual immutable digests:

```powershell
docker tag app-web:review ghcr.io/APPROVED_OWNER/APP-web:REVIEWED_REVISION
docker tag app-dab:review ghcr.io/APPROVED_OWNER/APP-dab:REVIEWED_REVISION
docker push ghcr.io/APPROVED_OWNER/APP-web:REVIEWED_REVISION
docker push ghcr.io/APPROVED_OWNER/APP-dab:REVIEWED_REVISION
```

Registry authentication is user-controlled. Use the registry's published
`repository@sha256:...` references, not a mutable tag or local image ID. No registry
push occurs during SQL Apps local validation.

## 2. Review parameters and preview infrastructure

Edit `infra/main.bicepparam`, replacing every `REPLACE_`/zero-ID placeholder.
Set the SQL administrator type to `Group` (default) or `User`. Use object IDs from
the approved tenant, not a managed identity's client ID for SQL user provisioning.
Pin actual published image digests. The sample location is not proof of availability.
Keep `deployApplications = false` for the first stage: create SQL, identity and the
environment without trying to start DAB before schema/permissions are ready.

Only for an explicitly selected cloud task, let the user complete any necessary
`az login`, verify `az account show`, and select the approved subscription. The
following commands require the recorded cloud/read-access approvals:

```powershell
$group = 'rg-demo-dev-sqlapps' # Existing approved isolated group.
az deployment group what-if --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
```

Review additions, replacements, deletions, identities, public endpoints, firewall
rules, SKUs and tags. A what-if is not end-to-end runtime validation or spend approval.
Creating the group itself is a separate approved resource write; use the recorded
region and `sqlapps-version` tag if creating one. Do not assume a subscription or
group exists, auto-register providers, or retry writes without reconciling actual state.

## 3. Apply only the approved resource/access/spend changes

```powershell
az deployment group create --name sqlapps-reviewed --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
$outputs = az deployment group show --name sqlapps-reviewed --resource-group $group --query properties.outputs --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Read deployment outputs failed.' }
```

Check each native command's exit code before proceeding. No applications are created
in this first stage; the outputs provide SQL and identity values for bootstrap.
If provisioning times out, reconcile resources before any retry.

## 4. Bootstrap SQL with the authorized operator

Use the approved SQL Entra administrator/operator, not the DAB identity. Connect to
the **application database**, not `master`, using the installed SQL tool's supported
Entra authentication. Do not paste tokens/passwords into commands or source.
The examples assume ODBC `sqlcmd` with `-G` already usable by that operator;
resolve interactive sign-in through SQL guidance if it is not. Keep encryption and
certificate verification on (`-N`, never `-C`).

For the starter's first migration, run from the application root:

```powershell
$sqlHost = $outputs.sqlHost.value
$database = $outputs.sqlDatabaseName.value
$clientId = $outputs.dabClientId.value
$parsedClientId = [guid]::Parse($clientId)
if ($parsedClientId -eq [guid]::Empty) { throw 'Invalid deployed identity client ID.' }
$hash = node -e "const fs=require('node:fs'),c=require('node:crypto');console.log(c.createHash('sha256').update(fs.readFileSync('packages/data/migrations/001-initial.sql','utf8').replace(/\r\n/g,'\n')).digest('hex'))"
if ($LASTEXITCODE -ne 0) { throw 'Migration checksum failed.' }
$existing = sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -h -1 -W -Q "SET NOCOUNT ON; IF OBJECT_ID('dbo.SchemaVersions') IS NOT NULL SELECT Checksum FROM dbo.SchemaVersions WHERE Version=1;"
if ($LASTEXITCODE -ne 0) { throw 'Migration history read failed.' }
if (-not $existing) {
  sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -v "MigrationHash=$hash" -i packages\data\migrations\001-initial.sql
  if ($LASTEXITCODE -ne 0) { throw 'Migration failed; do not start DAB or reset the database.' }
} elseif (($existing | Out-String).Trim() -ne $hash.Trim()) {
  throw 'Applied migration changed. Review a forward migration; never reset data.'
}
sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -v "DabClientId=$clientId" -i infra\bootstrap.sql
if ($LASTEXITCODE -ne 0) { throw 'SQL identity bootstrap failed.' }
```

`infra/bootstrap.sql` binds `app_runtime` to the known DAB identity's **application
client ID** using `SID`/`TYPE=E`, then reuses `packages/data/permissions.sql`. The
principal object ID is used for Azure role assignments, not this SQL SID. The
cloud review confirmed this by comparing a directory-resolved user with both IDs.
It avoids
Graph directory lookup, refuses to replace a different existing principal, and grants
only the read view/create procedure while denying direct `dbo` data access. This
syntax does not validate the object with Entra: read the actual deployed identity
and test the real connection. See [CREATE USER](https://learn.microsoft.com/sql/t-sql/statements/create-user-transact-sql?view=azuresqldb-current).
The pinned local preview image rejected the cloud `TYPE` creation syntax during
validation; this is not a successful cloud bootstrap test. Refusal of a mismatched
existing principal and a zero object ID can be tested locally, but external-user
creation/idempotency and actual managed-identity authentication require a separately
approved Azure SQL check. The maintainer cloud review passed external-user creation
and repeated bootstrap, and DAB initialized using its managed identity after the
client-ID SID correction; this does not certify every tenant or replace application
acceptance. Do not replace managed identity with SQL administrator access.
Consult the current
[container limitations](https://microsoft.github.io/azure-sql-database-container/known-limitations.html)
before inferring cloud feature support from the local preview.

Create the tenant service principal (enterprise application) for each newly approved
app registration before sign-in. An application registration alone is insufficient:
the review encountered `AADSTS650052` when the custom API lacked its service
principal. API-owner preauthorization may trust the approved SPA for the API's own
scope only; it is not permission to change tenant consent policy. If tenant policy
still requires administrator approval, stop the authenticated acceptance gate and
provide the exact app/scope for an authorized administrator. Do not weaken JWT
validation or switch to test identities to claim deployed user acceptance.

Adapt numbered forward migrations and narrowly scoped grants to the actual app using
SQL guidance. Never rerun an already applied migration, use `db_owner` as runtime,
or grant generic write access alongside invariant-enforcing procedures.

Remove the approved temporary operator firewall rule using its exact server/group:

```powershell
az sql server firewall-rule delete --resource-group $group --server $outputs.sqlServerName.value --name bootstrap-operator-sqlapps
```

Run this only if that rule was created and its removal was approved. Clear
`operatorIpAddress` in parameters and read the actual firewall rules back. Removing
`allowAzureServices` later also requires deleting its existing rule explicitly.

## 5. Configure sign-in and accept the deployed application

Register the exact `redirectUri` output as the approved SPA redirect/logout URI.
Confirm delegated consent and tenant-bound issuer/audience/`oid` semantics; do not
ship test issuers or trust client-supplied identity headers. DAB accesses SQL using
its user-assigned managed identity client ID in the encrypted connection string.
The web app proxies `/api/*` over the internal HTTPS DAB endpoint; DAB is not a
public API endpoint and needs no browser CORS exception.

After successful SQL bootstrap, approved runtime connectivity and sign-in setup,
set `deployApplications = true` in the same parameter file. Preview the second-stage
application additions, then execute only those approved changes:

```powershell
az deployment group what-if --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
# After explicit approval of the preview and spend/access boundary:
az deployment group create --name sqlapps-reviewed --resource-group $group --template-file infra\main.bicep --parameters infra\main.bicepparam
$outputs = az deployment group show --name sqlapps-reviewed --resource-group $group --query properties.outputs --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Read application deployment outputs failed.' }
```

Changing `deployApplications` back to false is not teardown: incremental deployment
leaves previously created applications in place. Use explicit approved cleanup.

Read actual Container Apps settings, SQL settings, firewall rules, identity and
resource metadata back using authorized tools, for example:

```powershell
az containerapp show --resource-group $group --name $outputs.webAppName.value
az containerapp show --resource-group $group --name $outputs.dabAppName.value
az sql db show --resource-group $group --server $outputs.sqlServerName.value --name $database --query "{sku:sku,useFreeLimit:useFreeLimit,freeLimitExhaustionBehavior:freeLimitExhaustionBehavior,maxSizeBytes:maxSizeBytes}"
az sql server firewall-rule list --resource-group $group --server $outputs.sqlServerName.value
```

Compare actual Consumption profiles, allocations, ingress, zero/one replica bounds,
SQL free-limit flags, permissions, names/tags and all supporting resources against
the approved review. Record mismatches as failed acceptance, not permission for fixes
that add cost/access. Confirm internal DAB is not externally reachable.

Verify browser sign-in/save/reload, two-owner isolation, anonymous/forged-token and
forged-role denials with allowed controls, direct DAB authorization, SQL invalid and
concurrent mutation rejection, and persisted identity across restart plus a new
post-restart write. Direct DAB controls require an approved test path inside the
environment (for example execution in the web container); do not expose DAB publicly
to pass tests. Test cold-start/quota-unavailable states and desktop/narrow UI.
Record the request route and sanitized DAB runtime evidence.

Without a logging workspace, use authorized live Container Apps log streams for
diagnosis; this recipe does not provide durable log retention. Do not enable a paid
diagnostic destination without approval. Use a health check only as a control, never
as proof of SQL persistence or authorization.

## Restart, rollback, cleanup and evidence

Record the deployed immutable image digests and revision names before changes.
Use Container Apps revision restart for an approved restart test, leaving SQL data
intact. With single active revision mode, rollback means redeploying the previous
compatible image digests and reviewed parameters; it is not automatic database
rollback. Apply forward/recovery SQL migrations only after SQL review and approval.
No `down -v`, database deletion, group deletion, or free-limit relaxation to pass checks.

Cleanup needs separate explicit scope: enumerate the exact dedicated resources and
data loss before removing anything. Removing a new isolated group destroys its SQL
data and resources; never use that shortcut on a shared group. Preserve evidence and
customer data according to the agreed retention policy.

Private-registry redeployment must reuse the current approved credential, not
regenerate an active token password as a setup step. For rotation, generate the
inactive password slot, update both applications, verify image pulls after an
approved restart, and only then retire the previous slot. A failed compile,
validation, or what-if must not invalidate running applications' credentials.

Maintainer release guidance in the source repository describes two opt-in cloud
acceptance gates; those helpers are not shipped in the installed skill payload.
The SQL gate runs this shipped bootstrap twice and checks its SID against the
managed identity read from Azure, independently of SQL substitution. Its live
regression test deliberately substitutes the wrong principal ID and requires
refusal without replacing the existing user. The API gate requires two real users,
successful reads/writes, independent denial controls and an explicitly approved
restart. Missing users, failed authentication or missing restart approval must fail,
not count as a successful denial-only run. Browser sign-in/save/reload remains a
separate check; an operator's normal Edge session is not evidence that the integrated
browser, or an automated API gate, authenticated.

Retain an immutable source revision, exact image digests/runtime versions, local
build/compile/test results, approved cloud commands/results, timestamps, waits, actual
resource settings, failures and limitations. Keep local packaging, synthetic API
checks, real-provider sign-in, cloud identity and deployed workflow evidence separate.
Cloud checks not performed remain **unverified**; do not promote this recipe based
only on generated Bicep, compiler success, or a successful deployment command.
