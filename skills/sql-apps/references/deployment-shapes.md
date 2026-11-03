# Deployment shape catalog

A deployment shape owns the hosting/API topology, resource and SKU declarations,
runtime, packaging, identity and network boundaries, database bootstrap,
supported application inputs, and verification requirements. Selecting a shape
does not authorize provisioning, spend, publication, identity grants, network
changes, or cleanup. Keep approvals and operator results in the copied app's
`deployment.md`; see the [shared deployment policy](./deployment.md) and
[hosting profiles](../templates/starter/hosting.md).

The starter resolves the existing validated `hosting`/`api` profile pair into
one of these versioned catalog entries. All current entries are experimental:
the repository has no qualifying immutable-revision live evidence for them.
Catalog presence is not a recommendation or a verified compatibility claim.

| Shape | Revision | Existing profile | Resources and packaging | Identity and network boundary | Database and cost classification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `container-apps-dab` | `1.1.0` | `container-apps` / `dab` | Consumption managed environment; separate web and DAB container apps; user-assigned managed identity; app-owned, digest-pinned images. The template creates no registry. | Public HTTPS web ingress; internal DAB ingress; SQL public network access is enabled. DAB uses managed identity. Optional SQL operator IP and `allowAzureServices` rules are separate access decisions; the latter admits all Azure services. | Creates a serverless General Purpose SQL database configured for the free limit and `AutoPause`, subject to eligibility and quota. Container Apps Consumption grants are metered allowances, not a hard spend cap. Registry, image publication, network, and any unmodeled dependencies must be reviewed separately. | Experimental |
| `app-service-f1-dab` | `1.1.0` | `app-service-f1` / `dab` | One Linux App Service F1 plan with separate web and DAB container sites; user-assigned managed identity; public-pull, digest-pinned app images. | Both web and DAB have public HTTPS endpoints; authorization must hold for direct and proxied DAB access. DAB uses managed identity. This template does not change SQL firewall rules. | Reuses an existing approved SQL database; this template creates no SQL resources. F1 is a free SKU with capacity and quota constraints, not a zero-cost guarantee for the topology. | Experimental; capacity and end-to-end gates remain open |
| `static-web-apps-functions` | `1.1.0` | `static-web-apps` / `functions` | Static Web Apps Free site with managed Node.js 22 Functions; static frontend and Functions package, not DAB or container images. | Public static site and managed `/api` endpoint; Functions validates the configured identity claims. Browser sign-in remains external. Managed Functions has no managed identity; cloud SQL uses a separately approved service-principal credential reference. | Reuses an existing approved SQL database; this template creates no SQL resources. Static Web Apps Free is a free SKU; Functions and other dependencies remain subject to current tier quotas and cost review. Do not infer a zero-cost topology from the site SKU. | Experimental; SQL credential lifecycle and real-provider acceptance remain open |

## Bounded application inputs

Shapes accept only the catalog's declared application parameters: application
name; target tenant and subscription; approved hosting and SQL regions; owner
identity; database/catalog; approved resource reuse; and bounded size/scaling
settings. Schema and migrations, business code, and application data remain
application-owned. Runtime versions, topology, SKU, identity model, packaging,
and network boundaries are shape-owned; changes require a reviewed shape
revision or a recorded, approved deviation.

Plans may contain secret references through an approved secret channel, never
secret values. Unknown resource ownership, unresolved cost exposure, unsupported
profile pairs, or unverified deployment assumptions must be reported explicitly
instead of receiving a success-shaped default.

## Verification and promotion

An entry becomes verified only for an immutable shape and source revision backed
by real-provider evidence. Promotion includes applicable allowed and denied
access checks, real SQL save/reload, persistence after an owned runtime restart,
actual settings and artifact digests, cost assumptions, and recorded limitations.
Template validation, mocks, unit tests, local builds, and successful packaging
are useful checks but are not cloud acceptance evidence.

Keep the `app-service-f1-dab` and `static-web-apps-functions` entries
experimental until each is exercised independently. Do not silently substitute
a paid App Service tier or another host. A free SKU or allowance never implies a
zero-cost guarantee for the whole deployment.
