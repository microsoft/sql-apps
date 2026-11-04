# Deployment shapes

A shape fixes the host, API, runtime, packaging, identity and network boundaries,
SQL bootstrap, cost classes and acceptance checks. The starter maps the selected
`hosting` and `api` pair to a versioned shape. See the [deployment policy](./deployment.md)
for approvals and the [profile guide](../templates/alternatives/README.md) to
choose an alternative before customizing a fresh starter.

Current per-profile status and historical observations belong to the
[release record](https://github.com/microsoft/sql-apps/blob/main/docs/reference/releasing.md#profile-status);
the [evidence gates](./deployment.md#evidence-gates) define permitted claims.
The release record is repository documentation, not a required copied-app file.
Shape revisions below identify contracts, not proof of verification.

## Profile bundles and request boundaries

The default `container-apps` and explicit `app-service-f1` select DAB bundles.
`static-web-apps` selects protected Functions. `static-web-apps-public` selects
that same Functions hosting/API bundle with `access: public-submissions`;
retain the identifier for installer compatibility.

| API/access | Browser-to-SQL path | Enforcing boundary and alternate routes |
| --- | --- | --- |
| Protected DAB (both hosts) | Browser OIDC/PKCE access token -> same-origin web proxy -> DAB -> restricted SQL view/procedure | DAB validates issuer/audience/signature and authenticated permissions; session `oid` restricts SQL ownership and uniqueness. The web server has no SQL driver. Direct DAB access still requires JWT validation and the same SQL permissions; F1 exposes that endpoint publicly, Container Apps uses internal cloud ingress. Local DAB is loopback-accessible. |
| Protected Functions | Browser OIDC/PKCE access token -> local SWA proxy or deployed `/api` -> Functions -> SQL | Functions validates tenant, issuer, audience, signature, expiry, user `oid` and delegated scope. A leased SQL transaction sets/clears owner context for the restricted view/procedure. Direct local Functions calls traverse the same handlers; SWA fake identity/principal headers do not bypass bearer validation. |
| Public-submission Functions | Anonymous POST `/api/Submit` -> bounded SQL procedure; owner GET `/api/Submissions` -> real bearer validation -> tenant/owner SQL enrollment check | Anonymous writes never permit reads, ownership selection or enrollment. Unconfigured owner auth returns 503; configured missing/invalid identity is denied; valid unenrolled owners are denied by SQL. Legacy Items/CreateItem routes are disabled. Direct handler access has the same checks; CORS/origin controls are not authentication. |

SQL credentials stay server-side; runtime grants deny base-table writes and owner
enrollment. A privileged operator is a separate access boundary, not a supported
browser bypass. Test direct and proxied requests and SQL grants for each profile.

All local bundles require Node/npm and Docker with an authorized cached preview
SQL image. DAB also needs its cached DAB image. Functions needs installed Core
Tools/SWA CLI and loopback SQL; the deployed Functions package uses no container
images. [Prerequisites](./prerequisites.md) distinguish acquisition, recurring
local work, Azure CLI sign-in and application-user sign-in. Protected profiles
have no supplied unauthenticated/test-identity mode. Public anonymous-only use
needs no identity provider, but never proves protected owner access.

## Container Apps / DAB — revision 1.1.0

- **Resources:** Consumption environment; separate web and DAB container apps;
  app-owned digest-pinned images; serverless General Purpose Azure SQL Database.
  The template creates no image registry.
- **Identity:** User-assigned managed identity for DAB-to-SQL access; separate
  operator for migration and bootstrap.
- **Network:** Public HTTPS web ingress; internal DAB ingress; SQL public TLS
  endpoint. SQL firewall and operator access are separate decisions.
- **Cost:** SQL is a **Free offer with enforced quota stop** only when eligible
  and configured with `AutoPause`. Container Apps uses a **Metered allowance**;
  registry, publication, network transfer and other dependencies need review.
- **Open gates:** Live SQL provisioning eligibility, approved connectivity,
  publication, real sign-in, allowed and denied API checks, browser save and reload,
  concurrency and restart persistence.

## App Service F1 / DAB — revision 1.1.0

- **Resources:** One Linux F1 plan with separate web and DAB container sites;
  public-pull digest-pinned app images; reuses an existing approved SQL database.
- **Identity:** DAB uses managed identity for SQL. Preserve any existing
  `app_runtime` binding.
- **Network:** Both sites have public HTTPS endpoints. Protect direct and proxied
  DAB access. The template does not change SQL firewall rules.
- **Cost:** F1 is a **Free SKU** with shared CPU, memory and capacity limits.
  SQL and network charges are reviewed separately.
- **Open gates:** Regional capacity, combined plan headroom, public image pulls,
  SQL access, real sign-in, sleep/wake, concurrency and restart persistence.

## Static Web Apps / Functions — revision 1.1.0

- **Resources:** Static Web Apps Free site with managed Node.js 22 Functions;
  frontend and Functions package, not DAB or container images; reuses an existing
  approved SQL database. Functions implements the starter API contract, not DAB's
  general query language.
- **Identity:** Browser OIDC/PKCE stays external. Functions validates Entra
  issuer, audience and owner claims. Managed Functions has no managed identity;
  SQL uses an approved service-principal credential reference.
- **Network:** Public static site and managed `/api` endpoint. Keep SQL connectivity
  and credentials separately approved.
- **Cost:** Static Web Apps Free is a **Free SKU**. Functions uses a
  **Metered allowance**; check current quotas and other dependency costs.
- **Open gates:** Real provider sign-in, SQL ownership and pooling, credential
  rotation, Node 22 publication, idle/resume, quota errors and persisted reload
  after redeployment.

## Bounded inputs

Shapes accept only declared app parameters: application name, tenant, subscription,
approved regions, owner identity, database, approved resource reuse and bounded
scaling. Schema, migrations, business code and data remain app-owned. Runtime,
topology, SKU, identity, packaging and network boundaries are shape-owned; review
changes as a new shape revision or an approved deviation.

Plans may contain secret references through an approved channel, never secret
values. Report unknown ownership, cost exposure, unsupported profile pairs and
unverified assumptions as open gates.

## Verification

Verify a shape only for an immutable shape and source revision with real-provider
evidence: allowed and denied access, SQL save/reload, persistence after an owned
runtime restart, actual settings, artifact digests, cost assumptions and
limitations. Do not promote a profile until its own immutable revision is tested independently;
record the outcome in the release record rather than duplicating mutable status.
