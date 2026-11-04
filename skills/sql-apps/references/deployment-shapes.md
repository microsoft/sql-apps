# Deployment shapes

A shape fixes topology, packaging and access.
[Select it before customization](../templates/alternatives/README.md);
follow [deployment approvals and verification](./deployment.md).
All profiles are **Experimental**; see [live acceptance status](https://github.com/microsoft/sql-apps/blob/main/docs/reference/releasing.md#profile-status).

## Profile bundles and request boundaries

`container-apps` (default) and `app-service-f1` use DAB.
`static-web-apps` uses protected Functions; `static-web-apps-public` adds
`access: public-submissions` to that same bundle.

| API/access | Browser-to-SQL path | Enforcing boundary and alternate routes |
| --- | --- | --- |
| Protected DAB | Browser OIDC/PKCE token -> web proxy -> DAB -> restricted SQL | DAB validates JWT/permissions on direct and proxied requests; SQL session `oid` enforces ownership. Web has no SQL driver. Local DAB is loopback-only; cloud ingress differs below. |
| Protected Functions | Browser OIDC/PKCE token -> SWA `/api` -> Functions -> restricted SQL | Validates signature, issuer, audience, tenant, expiry, `oid` and delegated scope. Leased transactions set/clear owner context. Direct handlers enforce the same checks; fake SWA headers cannot bypass them. |
| Public Functions | POST `/api/Submit` -> bounded SQL procedure; GET `/api/Submissions` -> bearer validation -> SQL enrollment | Direct handlers enforce the same checks. See [public access, enrollment and limits](./public-submissions.md). |

## Container Apps / DAB — revision 1.1.0

- **Resources:** Consumption environment, web/DAB container apps with pinned images,
  serverless General Purpose Azure SQL. No registry is created.
- **Identity:** User-assigned DAB managed identity; separate SQL operator.
- **Network:** Public HTTPS web, internal DAB, public TLS SQL; approve SQL firewall/operator access separately.
- **Cost:** SQL is a **Free offer with enforced quota stop** only when eligible
  and configured with `AutoPause`. Container Apps uses a **Metered allowance**;
  registry, publication, network transfer and other dependencies need review.

## App Service F1 / DAB — revision 1.1.0

- **Resources:** One Linux F1 plan, separate web/DAB sites, publicly pullable pinned
  images and existing approved SQL.
- **Identity:** DAB managed identity; preserve existing `app_runtime` bindings.
- **Network:** Both sites public HTTPS; protect direct/proxied DAB. SQL firewall unchanged.
- **Cost:** F1 is a **Free SKU** with shared CPU, memory and capacity limits.
  SQL and network charges are reviewed separately.
- **Profile checks:** Regional capacity, combined headroom, public image pulls,
  SQL access and sleep/wake.

## Static Web Apps / Functions — revision 1.1.0

- **Resources:** Static Web Apps Free, managed Node.js 22 Functions, frontend/API
  package and existing approved SQL. No DAB/images.
- **Identity:** External browser OIDC/PKCE; no managed identity for managed Functions.
  SQL uses an approved service-principal credential reference.
- **Network:** Public site and `/api`; approve SQL connectivity/credentials separately.
- **Cost:** Static Web Apps Free is a **Free SKU**. Functions uses a
  **Metered allowance**; check current quotas and other dependency costs.
- **Profile checks:** SQL pooling, credential rotation, Node 22 publication,
  idle/resume, quota errors and persisted reload after redeploy.

## Bounded inputs

Inputs: name, tenant/subscription/region, owner, database, resource reuse and scaling.
Topology/SKU/identity/packaging/network changes need a shape revision or approved
deviation. Use secret references; resolve unknown ownership/costs or unsupported combinations.
