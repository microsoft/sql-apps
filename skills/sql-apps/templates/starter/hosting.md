# Hosting profiles

These are app-owned deployment integrations, not a guarantee of free operation or
live certification. Container Apps remains the default. Changing a profile prepares
files; it never migrates resources, grants access, installs tools, or deploys.
Preserve existing infrastructure and approvals.

## Select explicitly

Edit `deployment.json` and keep the app brief and `rayfin/rayfin.yml` consistent:

| hosting | api | Infrastructure | Runtime |
| --- | --- | --- | --- |
| `container-apps` | `dab` | `infra/main.bicep` | Existing public Node web/internal DAB recipe |
| `app-service-f1` | `dab` | `infra/app-service-f1.bicep` | Two Linux container web apps on one Free F1 plan |
| `static-web-apps` | `functions` | `infra/static-web-apps.bicep` | Static frontend plus managed Node 22 Functions; no DAB |

F1 and Static Web Apps recipes reuse an **existing approved Azure SQL database**.
They create no database, SQL administrator, firewall rules, registry, logging
workspace, or app registration. SQL free-offer eligibility and actual
`useFreeLimit: true` / `freeLimitExhaustionBehavior: AutoPause` must be checked
separately. Never relax those settings to finish a test.

For DAB use the bundled `rayfin.yml` intent; for Functions use
`rayfin.functions.yml`, copied to the app's `rayfin/rayfin.yml`. Both retain
`dialect: mssql`; Functions disables the Rayfin data runtime but keeps SQL migrations
in `packages/data`. These proposed files are not executable Rayfin configuration.
No custom hosting fields are added to Rayfin's schema.

From the copied application:

```powershell
npm ci
npm run build
npm test
npm run deployment:prepare
```

Preparation validates the host/API pair. Static Web Apps stages built assets and
a standalone API package under `.deployment/static-web-apps`; DAB profiles stage a
selection receipt and use the existing Docker recipes. Preparation refuses an
existing output directory to avoid mixing revisions. Retain or move that exact
directory before preparing again; it is not an automatic cleanup/deploy command.
Never install or execute this template inside the installed plugin.

## App Service F1 with DAB

Microsoft's [Linux custom-container quickstart](https://learn.microsoft.com/azure/app-service/quickstart-custom-container?pivots=container-linux)
explicitly offers F1. That is a candidate platform, not proof this app fits.
The [F1 limits](https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-app-service-limits)
include daily/short-window CPU limits, shared memory, and no Always On. The two
apps share one plan's limits. Sleep and CPU quota stops are expected PoC limits;
neither app silently upgrades the plan.

Build/publish the same `Dockerfile.web` and `Dockerfile.dab` images as the
[Container Apps recipe](./deployment.md). This F1 recipe accepts **publicly
pullable** immutable images only; publishing private application code requires
explicit permission. If images must stay private, stop and review identity-based
pulls separately. Do not create a paid registry or enable its administrator account.

Populate `infra/app-service-f1.bicepparam` with the approved existing SQL target,
images, identity values and adopted plugin version. Compile locally:

```powershell
bicep build infra\app-service-f1.bicep --stdout
```

After separate target/resource/cost approval, preview and apply using the established
Azure CLI resource-group deployment workflow. The outputs provide `dabClientId`,
`dabPrincipalObjectId`, `appUrl`, `redirectUri` and `dabUrl`. Register the exact SPA
redirect/logout URI. Bootstrap that DAB client ID with `infra/bootstrap.sql` and the
existing migration/permission runbook using an authorized SQL operator.

An existing `app_runtime` bound to another identity deliberately blocks bootstrap.
Do not overwrite it when switching profiles: use a separately approved database or
review the principal migration/grants first. SQL connectivity remains a separately
approved requirement. Deploying a host does not grant SQL network access.

Unlike Container Apps, the F1 DAB app has a **public HTTPS endpoint**. DAB validates
bearer tokens and exposes only the protected entities; browser CORS remains off.
The Node app proxies to DAB over HTTPS. Both direct and proxied allowed/denied
controls are required. No claim is made that F1 provides internal-only DAB.

**Open live gates:** region/subscription F1 container eligibility, immutable image
pulls, combined memory/CPU headroom, SQL managed identity, real sign-in, idle wake-up,
direct authorization, concurrent writes and restart/persistence.

## Static Web Apps Free with Functions

The [Free plan](https://learn.microsoft.com/azure/static-web-apps/plans) supports
managed Functions, not linking an existing Container App or Function App as its API.
The [old database connections feature](https://learn.microsoft.com/azure/static-web-apps/database-overview)
is retired. This profile implements the two starter endpoints in Functions instead
of attempting to host DAB there. It is not a generic replacement for DAB's query
language: only the starter list/order/exact-label filtering contract is supported.

External OIDC/PKCE sign-in remains in the browser. Functions validates Entra bearer
tokens itself, including issuer/audience and the immutable owner claim. It does
not trust `X-MS-CLIENT-PRINCIPAL`, caller roles, or SWA cookies. This does not depend
on the Free plan's built-in custom authentication-provider registration feature.
`/config.json` redirects to `/api/config`; only public identity settings are returned.
The frontend also handles a plain 404 by fetching that endpoint.

### SQL identity

Managed Functions [do not have managed identity](https://learn.microsoft.com/azure/static-web-apps/apis-functions).
Use a **separately approved Entra service principal** with a rotated secret, not
the SPA identity or a SQL administrator. This preserves the existing SQL server's
Entra-only authentication. Store its secret only in server-side application settings.
No registration, consent, directory role or secret is created by the template.

With the authorized operator, apply the same unchanged SQL migrations, then run
`infra/functions-bootstrap.sql` from the application root with
`-v FunctionsClientId="<approved service-principal application client ID>"` against
the application database. Use the existing encrypted Entra `sqlcmd` connection
runbook, never administrator credentials in commands. Bootstrap creates only the
known `app_functions` client-ID SID and includes
`packages/data/functions-permissions.sql`, which independently checks that identity.
It refuses to replace a different existing user. The grants allow only the protected
view/procedure and deny base-table data access, never `db_owner`. Keep the DAB
identity untouched. Re-run both API permission checks if they share a database.

Populate `infra/static-web-apps.bicepparam`; supply `SQL_CLIENT_SECRET` in the
operator process from an approved secret source. Never put its value in commands,
parameter files, reports, or logs. `readEnvironmentVariable` feeds a secure Bicep
parameter, but compiled parameter files and deployment artifacts containing resolved
values must still be protected. Preview/deploy only after the separate cloud review.
Register the resulting exact redirect/logout URI before sign-in.

Server settings: `APP_ORIGIN`, `AUTH_AUTHORITY`, `AUTH_ISSUER`, `AUTH_AUDIENCE`,
`AUTH_CLIENT_ID`, `AUTH_SCOPE`, `SQL_SERVER`, `SQL_DATABASE`, `SQL_TENANT_ID`,
`SQL_CLIENT_ID`, and secret `SQL_CLIENT_SECRET`. No SQL secret goes into frontend
build settings or the public configuration response.

### Publication

After building and preparing the copied app, install the staged API's production
dependencies from its standalone lock:

```powershell
npm ci --omit=dev --ignore-scripts --prefix .deployment\static-web-apps\api
```

Publish `.deployment/static-web-apps/app` and
`.deployment/static-web-apps/api` together with an approved Static Web Apps
deployment tool or CI action, using Node 22 and no second frontend build. The API
directory must include its production `node_modules`, `host.json` and package entry
point; do not upload only source and assume root workspace dependencies exist there.
Use the reviewed deploy tool's credential channel, not token literals in commands.
The infrastructure template creates a site, not application content or a pipeline.
Do not install a CLI or create a workflow credential without permission.

With an already approved/installed SWA CLI and the deploy credential supplied via
`SWA_CLI_DEPLOYMENT_TOKEN`, the separately approved content publication command is:

```powershell
swa deploy .deployment\static-web-apps\app --api-location .deployment\static-web-apps\api --api-language node --api-version 22 --env production
```

This performs a cloud write. The explicit `production` target avoids accidentally
publishing only a preview environment. Do not print or commit the deployment token.

Free hosting is not proof the **whole application** costs zero: check SQL free
limits, deployment/identity services, traffic limits and optional resources.
Standalone Functions are a separate metered hosting choice and are not this profile.

**Open live gates:** approved SQL service principal/secret and network path, SWA
Free Node 22 deployment, external provider sign-in, two-owner API checks against
real SQL, simultaneous pool requests, idle/resume, quota errors and persisted reload
after a new deployment. No live certification is claimed.

## Evidence and rollback

Retain the source revision, profile, immutable images or staged content, compiled
infrastructure, commands/results and actual resource settings. Keep local tests,
synthetic identities, real SQL, browser sign-in and deployed acceptance separate.
Use the existing same-origin acceptance contract for each profile; DAB-specific
inspection applies only to DAB, and Functions needs direct handler controls instead.

Changing `deployment.json` is not migration or teardown. Existing hosts and
credentials stay live until separately approved cleanup. Roll back to the previous
compatible content/images without undoing SQL data. Rotate service-principal secrets
by deploying the new credential, verifying access, then retiring the old one.
Never delete a database or broaden permissions to pass acceptance.
