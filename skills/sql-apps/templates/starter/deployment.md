# Container Apps / DAB deployment record

**Cloud deployment not requested/approved; end-to-end acceptance unverified.**
This is the application's single deployment record. Fill in the selected target,
approvals and observations here; `app-brief.md` only links here and retains business
constraints. Shared durable rules live in the active host's SQL Apps policy, not
another runbook policy copy.

| App-owned decision | Value / approved scope |
| --- | --- |
| Host/API | <from `deployment.json`; Container Apps/DAB default> |
| Target | <tenant, subscription, region, isolated/shared resource scope> |
| Artifacts | <source revision, immutable image digests or staged content identity, adopted recipe/runtime versions> |
| Component costs | <estimates, allowances/limits, assumptions, business ceiling and approved exceptions> |
| Resource/spend approval | <who approved which actions, scope and limit; pending is not approved> |
| Identity/access approval | <provider/consent, API identity, SQL operator, networking, publication and secret channels; no secret values> |
| Attribution | <verified adopted `sqlapps-version`, customer tags and approved exceptions; product suffix optional> |
| Operator/recovery | <selected steps below, temporary-rule/credential cleanup, rollback and data retention> |
| Results/open gates | <actual settings, commands/results, failed/unrun acceptance and next safe action> |

Explain external identity registration/consent and its owner before timing the
protected save/reload journey. Local build/start is not real-user acceptance.

This runbook is for the default Container Apps/DAB profile. F1 and Functions
installers replace it with a short guide for the selected profile.

## Read-only preflight and plan

Before any cloud approval, run:

```powershell
npm run deployment:preflight
npm run deployment:plan
```

Both commands inspect local configuration only. They do not sign in, request
consent, contact Azure, write resources or publish artifacts. The plan is a
canonical draft, not authorization. Missing business/target inputs, immutable
artifact digests, cost evidence and provisioning eligibility remain explicit
uncertainties; a listed SKU or configured package registry is not an approval.
Record the reviewed plan and its hash in this file before any separately approved
cloud operation.

## Prepare the selected deployment

From the copied app, explicitly build/test before preparation:

```powershell
npm ci
npm run build
npm test
npm run deployment:prepare
```

DAB validates the selected profile and Docker inputs; it does not create a
`.deployment` receipt. The Functions overlay has its own staging procedure.

## Container Apps/DAB cloud acceptance

Follow the shared [cloud acceptance requirements](../../references/deployment.md)
and record actual settings against the approved target. Test direct DAB access only
over an internal path; do not expose it publicly. The maintainer API gate is not
shipped with the app.

## Container Apps Consumption + Azure SQL recipe

Partial maintainer deployment, managed-identity startup and denial checks exist;
real-user cloud data/browser/restart acceptance remains incomplete. Historical
local/synthetic evidence is not acceptance of this app. Preserve existing approved
resources and names; do not rename/recreate them merely to add/remove branding.

## Topology and cost boundary

| Component | Configuration | Cost class and boundary |
| --- | --- | --- |
| Web | Public HTTPS Container App; compiled React plus the Node same-origin proxy; port 5180 | Consumption **metered allowance**, 0.25 vCPU/0.5 GiB, minimum 0 / maximum 1 replica |
| DAB | Separate internal HTTPS Container App; pinned DAB with the app's configuration; port 5000 | Same allocation/scaling; shared subscription allowance, not a second free grant |
| Environment | One Consumption workload profile, no application log storage (empty `appLogsConfiguration`, not the invalid literal destination `'none'`) | No dedicated profile, Log Analytics workspace, NAT, or private endpoint |
| SQL | General Purpose serverless free offer, 32 GiB data maximum, local backup redundancy | **Free offer with enforced quota stop** only when eligible; `useFreeLimit: true`, `freeLimitExhaustionBehavior: AutoPause` |
| Images | Prepublished immutable app-owned web and DAB images; public by default or an explicitly approved private registry | No registry created by this template; publication, public disclosure or private registry charges, storage and transfer require review |
| Identity | External single-tenant SPA/API registration; DAB user-assigned managed identity for SQL | No browser secret or SQL administrator password; migrations use a separate operator identity |

Check current [billing guidance](https://learn.microsoft.com/azure/container-apps/billing)
for subscription-shared compute/request grants, network transfer and other meters.
Scale-to-zero/one replica is not a hard spending cap; overages incur charges and
budget alerts do not stop them. **Strict zero Azure spend blocks this recipe
without an independently verified hard no-charge boundary.** Record the approved
exposure above. Handle cold start, SQL resume and quota exhaustion as unavailable,
not successful operations.

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

Complete the record above before cloud writes, including these recipe-specific inputs:

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
- Adopted `sqlapps-version` from the actual plugin manifest, customer tags and
  approved exceptions. The product suffix is optional; preserve existing names.

The recipe creates new isolated resources with a 1-8 character lowercase
alphanumeric workload token starting with a letter and stable group-derived
uniqueness. New templates do not require a product suffix. Validate provider rules;
do not repoint templates at shared resources or rename existing deployments.
Merge approved customer tags, preserving case-insensitive keys and resolving
conflicts. Do not overwrite an existing `sqlapps-version`; tag a new isolated group
explicitly because group tags are not inherited.

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
npm run images:build -- --web-image app-web:review --dab-image app-dab:review
az bicep build --file infra\main.bicep --outfile .local\main.json
```

Create `.local` first if absent. Compilation needs no Azure sign-in. Installing a
missing compiler or pulling images changes the host and requires applicable
permission. Choose approved image names for `--web-image` and `--dab-image`.
The helper discovers only the host's effective `npm config get registry`, not
other npm settings ([npm configuration](https://docs.npmjs.com/cli/v11/commands/npm-config)).
Its registry URL must be HTTPS without credentials, query or fragment; it copies
no `.npmrc` or tokens. The advanced manual Docker build path still accepts
`--build-arg NPM_CONFIG_REGISTRY=https://approved-mirror/`.
Mirror credentials/custom trust need a separately reviewed mechanism, not build
arguments. Never use `strict-ssl=false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`.
An npm "Exit handler never called" wrapper error is not the root cause: inspect
sanitized underlying failures and use approved connectivity/TLS diagnosis.

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

Regional SQL SKU listings do not prove subscription-region provisioning eligibility.
Read available restrictions and disclose unknowns before partial writes; see
[SQL quota/region guidance](https://learn.microsoft.com/azure/azure-sql/database/quota-increase-request).
For new resources, `sqlLocation` defaults to hosting `location`. A separately
approved SQL region uses a distinct region-sensitive SQL name while preserving
hosting names. Existing deployments need explicit adoption review: never
automatically rename, migrate or delete them to apply new naming.

Only for an explicitly selected cloud task, let the user complete any necessary
`az login`, verify `az account show`, and select the approved subscription. The
following commands require the recorded cloud/read-access approvals:

```powershell
$group = '<approved-existing-isolated-group>' # Preserve its deployed name.
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

On `ProvisioningDisabled`, retain failed deployment operations and partial-resource
inventory before proposing a scoped alternative for approval. Do not sweep regions
or substitute paid resources. A failed SQL name can remain region-bound even when
generic inventory is empty: when permitted, inspect deployment failures,
SQL-specific server existence and
[name availability](https://learn.microsoft.com/rest/api/sql/servers/check-name-availability).
An empty list does not establish that the name is unreserved; preserve existing
hosting/resource names and use a distinct approved SQL name for a new SQL region.

## 4. SQL operator migrations and DAB bootstrap

Use the [shared SQL migration procedure](./deployment-migrations.md) with the
approved Entra SQL operator. It applies and verifies every migration in order.
Use SQL host/catalog outputs from this deployment:

```powershell
$sqlHost = $outputs.sqlHost.value
$database = $outputs.sqlDatabaseName.value
```

Then bootstrap the DAB identity using its application client ID:

```powershell
$clientId = $outputs.dabClientId.value
$parsedClientId = [guid]::Parse($clientId)
if ($parsedClientId -eq [guid]::Empty) { throw 'Invalid deployed identity client ID.' }
sqlcmd -S "tcp:$sqlHost,1433" -d $database -G -N -b -v "DabClientId=$clientId" -i infra\bootstrap.sql
if ($LASTEXITCODE -ne 0) { throw 'SQL identity bootstrap failed.' }
```

The bootstrap binds `app_runtime` to the DAB identity's **application client ID**,
not its role-assignment object ID. It refuses to overwrite a different identity and
grants only the selected procedures/views. Verify the deployed identity and a real
SQL connection; successful SQL substitution alone is not proof.

Remove the approved temporary operator firewall rule using its exact server/group:

```powershell
az sql server firewall-rule delete --resource-group $group --server $outputs.sqlServerName.value --name <actual-approved-operator-rule>
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
resource metadata back using authorized tools and record the results above, for example:

```powershell
az containerapp show --resource-group $group --name $outputs.webAppName.value
az containerapp show --resource-group $group --name $outputs.dabAppName.value
az sql db show --resource-group $group --server $outputs.sqlServerName.value --name $database --query "{sku:sku,useFreeLimit:useFreeLimit,freeLimitExhaustionBehavior:freeLimitExhaustionBehavior,maxSizeBytes:maxSizeBytes}"
az sql server firewall-rule list --resource-group $group --server $outputs.sqlServerName.value
```

Compare actual Consumption profiles, allocations, ingress, zero/one replica bounds,
SQL free-limit flags, permissions, names/tags and all supporting resources against
the approved deployment record. Record mismatches as failed acceptance, not permission for fixes
that add cost/access. Confirm internal DAB is not externally reachable.

Complete the selected-profile acceptance section above using the approved internal
DAB path (for example execution in the web container). Record the request route
and sanitized runtime evidence.

Without a logging workspace, use authorized live Container Apps log streams for
diagnosis; this recipe does not provide durable log retention. Do not enable a paid
diagnostic destination without approval. Use a health check only as a control, never
as proof of SQL persistence or authorization.

## Restart, rollback, cleanup and evidence

Record the deployed immutable image digests and revision names before changes.
Use the selected host's approved restart/redeployment, leaving SQL data intact.
Container Apps single-revision rollback redeploys compatible prior image digests
and reviewed parameters; F1 restores prior compatible images and SWA publishes
prior compatible content. None automatically rolls back SQL.
Rotate Functions service-principal secrets by deploying the new credential,
verifying access, then retiring the old one. Apply forward/recovery SQL migrations
only after SQL review and approval.
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

Keep results in this deployment record: source/artifact identities, exact runtime
versions, commands/timestamps, actual settings, failures and remaining gates.
Maintainer cloud helpers are not shipped with apps. An operator's normal browser
session, synthetic identities, denial-only checks or a successful deployment do
not establish authenticated API/browser acceptance; unrun checks stay unverified.
