# Hosting profiles

Choose the host/API explicitly; Container Apps/DAB is the default. This reference
explains differences, not deployment approval or live certification. The single
[deployment record/runbook](./deployment.md) owns target, component costs,
resource/access approvals, operator commands, SQL bootstrap, publication,
acceptance and recovery. Keep the brief linked to that record rather than copying it.

## Selection and materialization

| hosting | api | Runtime / infrastructure |
| --- | --- | --- |
| `container-apps` | `dab` | Public Node web/internal DAB; `infra/main.bicep` |
| `app-service-f1` | `dab` | Two Linux container web apps on one Free F1 plan; `infra/app-service-f1.bicep` |
| `static-web-apps` | `functions` | Static frontend/managed Node 22 Functions; `infra/static-web-apps.bicep` |

For a fresh starter, use the plugin's explicit alternative installer before
adapting the sample. It updates `deployment.json`, not running infrastructure.
F1 removes default `main.bicep`/`main.bicepparam` but preserves generic
`bootstrap.sql` and the DAB images. Functions verifies and removes unmodified
DAB-only server/tests/configuration/full-stack Compose and both web/DAB Dockerfiles;
shared SQL, frontend/shared/data and configuration remain. Modified files block
materialization. An existing app needs a scoped migration, not an overlay.

F1 and SWA reuse an **existing approved Azure SQL database**. Neither creates SQL,
an administrator, firewall rules, registry, logging workspace or app registration.
The full application still needs approved connectivity, identity and SQL free-offer
eligibility/settings; a free host does not imply zero total cost.
Changing selection never moves data, grants access or stops previous hosts.

## Container Apps Consumption / DAB

Web ingress is public HTTPS; DAB ingress is internal HTTPS. Web proxies the
selected API without browser CORS. The recipe separates the two container runtimes
and uses DAB managed identity for SQL. Its subscription-shared Consumption grants
are metered allowances, not spending caps; scale-to-zero reduces exposure but
does not prevent overages. The runbook supplies the two-stage foundation/bootstrap/
application sequence and explicitly approved SQL network path.

## App Service F1 / DAB

The [Linux custom-container quickstart](https://learn.microsoft.com/azure/app-service/quickstart-custom-container?pivots=container-linux)
offers F1, but eligibility/capacity must be checked for the actual region/subscription.
[F1 limits](https://learn.microsoft.com/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-app-service-limits)
include daily/short-window CPU quotas, shared memory and no Always On. Both apps
share one plan's limits; sleep, wake-up and quota stops are expected PoC constraints.

The recipe uses the same immutable web/DAB images but accepts **publicly pullable
images only**. Private-source publication needs permission; private image pulls
require a separate reviewed integration, not a registry-admin workaround.
DAB has a **public HTTPS endpoint**, unlike Container Apps. It still validates
bearer identity and exposes only protected entities; browser CORS remains off and
web proxies over HTTPS. Both direct and proxied authorization controls matter.

DAB uses managed identity for SQL. A pre-existing `app_runtime` bound to a different
identity blocks bootstrap; do not overwrite it while switching hosts.
See [F1 operator steps](./deployment.md#app-service-f1-operator-steps).
Open gates include image pulls, combined CPU/memory headroom, SQL identity/network,
real sign-in, idle wake-up, concurrent invariants and restart/persistence.

## Static Web Apps Free / Functions

The [Free plan](https://learn.microsoft.com/azure/static-web-apps/plans) supports
managed Functions, not linking existing Container Apps/Function Apps as its API.
[Database connections](https://learn.microsoft.com/azure/static-web-apps/database-overview)
are retired. Functions implements the starter's list/order/exact-label filtering
and create contract, not DAB's general query language.

Browser OIDC/PKCE stays external. Functions validates Entra issuer/audience and
immutable owner claims itself, never `X-MS-CLIENT-PRINCIPAL`, caller roles or SWA
cookies. It does not depend on Free-plan custom-provider registration.
Invalid/expired tokens return 401; signing-key/provider outages return 503, not
fake success or forced sign-out. Public configuration is served through `/api/config`.

Managed Functions [has no managed identity](https://learn.microsoft.com/azure/static-web-apps/apis-functions);
cloud SQL uses a separately approved rotated Entra service-principal secret,
not the SPA identity or SQL administrator. Local restricted SQL authentication
does not certify that cloud connection. See [SWA operator/publication steps](./deployment.md#static-web-apps-operator-steps).
Open gates include real SQL ownership/pooling, Node 22 publication, provider
sign-in, idle/resume, quota errors and persisted reload after redeployment.

### Local development

Both public starts dispatch the selected profile after Build.
[Local setup](./README.md#first-local-run) owns commands and ports; Functions
requires existing Core Tools/SWA CLI and loopback SQL, not DAB.
The [SWA auth emulator](https://learn.microsoft.com/azure/static-web-apps/local-development)
supplies fake identities, not real-provider acceptance.
