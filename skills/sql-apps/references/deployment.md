# Deployment-shaped delivery

The [constitution](./constitution.md) owns durable policy. This reference owns
shared cloud review/recovery guidance; the app's single `deployment.md` owns its
target, approvals, operator commands and results. The brief links that record and
retains business constraints. Local-only delivery needs no Azure review or sign-in.

## Package the selected profile

Use the [starter](../templates/starter/README.md) and explicit
[alternative overlays](../templates/alternatives/README.md); preserve existing apps.
`deployment.json` selects Container Apps/DAB (default), F1/DAB or Static Web
Apps/Functions. Consult [hosting recipes](../templates/starter/hosting.md) for
profile-specific steps. DAB prerequisites and direct DAB checks apply only to DAB;
Functions validates bearer identity and request-scoped SQL ownership itself.

Build explicitly, then test and run compiled artifacts locally. Pin compatible
API/runtime versions, dependencies and images; record OS/architecture, startup,
ports, routing, environment names, health, shutdown/restart and migration commands.
No secret values belong in documentation. Static Web Apps preparation stages
built output and replaces only verified-inventory generated paths on rerun.
Unknown filenames anywhere outside npm-owned `api/node_modules`, invalid markers
and symlinks reject re-stage. Re-stage discards `api/node_modules`; repeat its
separate production-dependency install before publication. DAB
preparation validates selection without creating a `.deployment` receipt.

Evaluate compiled artifacts and production dependencies, not source language:
TypeScript alone does not rule out F1. Build success does not prove hosting,
identity, network, quota or ingress compatibility. Read current first-party service
documentation and use installed SQL guidance; no separate cloud plugin/runtime is
required.

## One app-owned deployment record

For requested cloud work, adapt the copied `deployment.md` to the selected profile:

| Decision | Record once |
| --- | --- |
| Target/resources | Tenant/subscription/region, isolated/shared scope, host/API, resource types/SKUs, recipe/source revision and immutable artifacts |
| Security/operator steps | Identity/consent, least-privilege SQL bootstrap, approved connectivity, migrations, secret channels, publication and recovery/cleanup |
| Costs/approvals | Component-specific estimates, assumptions, limits, allowed actions, spend/access approvals and exceptions; preserve unchanged decisions |
| Validation | Actual resource settings and adopted `sqlapps-version`, direct/proxied selected-API denied/allowed controls, browser save/reload, SQL concurrency and restart/persistence |
| Open findings | Known evidence, uncertainty, next safe action/owner and precise approval needed |

Review every component: host runtime/OS/CPU/memory/sleep, authentication, TLS/routing,
SQL eligibility/storage/backups, build/publication, traffic/egress, logs, secrets,
storage, network and DNS. Classify each as **free SKU**, **free offer with enforced
quota stop**, **metered allowance**, or **paid**, using current official limits.
Trials/credits are not guaranteed zero-spend; budget alerts do not stop spending.

Container Apps grants are subscription-shared metered allowances, not hard caps.
Scale-to-zero and one replica reduce exposure but do not prevent overages.
Strict zero-spend blocks unresolved charge exposure. SQL's free offer requires
actual `useFreeLimit: true` and `freeLimitExhaustionBehavior: AutoPause`;
monthly quota-stop is not idle auto-pause. Never fall back to paid Basic,
`BillOverUsage`, supporting paid resources or relaxed access without scoped approval.
An approved hosting exception does not waive an independent SQL-free constraint.

Authentication does not bypass SQL firewalls. Use a separate operator to bootstrap
the selected API identity; DAB uses managed identity, managed SWA Functions an
approved rotated service-principal secret (not managed identity). The default SQL
`allowAzureServices` is off; enabling it admits all Azure services, including other
customers' resources, and needs explicit access approval. A host without approved
connectivity/bootstrap is incomplete.

## Bounded recovery

Distinguish confirmed incompatibility, missing evidence, recoverable tooling failure
and decisions needing approval. Use one hypothesis/evidence target; after one retry
and one supported alternative, report results and the next action. Reconcile actual
state after a timed-out write before retrying. Do not blindly repeat writes, switch
identities, install tools or broaden access.

Reconcile conflicting eligibility/quota evidence by subscription, region, offer,
API/version, timestamps and scope using authorized reads. A separately approved
isolated experiment needs explicit resources, possible costs, free-limit flags,
post-create checks and cleanup scope; strict zero-spend forbids unresolved charge
exposure. Stop unapproved writes, not safe local engineering.

## Recipe evidence and promotion

**No exercised end-to-end cloud recipe is currently bundled.** The
[Container Apps runbook](../templates/starter/deployment.md) has Bicep, images and
operator bootstrap with partial maintainer evidence; complete real-user cloud
acceptance remains unverified. This is a validation gap, not proof of incompatibility
or an exercise every customer must repeat.

At an immutable source revision retain exact versions/artifacts, commands/results,
cost assumptions, actual settings and limitations in ordinary run documentation.
Promotion requires an independently approved isolated deployed workflow, selected
API positive/negative controls, SQL invariants/concurrency, browser sign-in,
restart/persistence and resource/metadata checks. Retest changed pinned components
or topology. Local builds, fixtures or generated templates do not qualify.

Current references: [Container Apps billing](https://learn.microsoft.com/azure/container-apps/billing),
[ingress](https://learn.microsoft.com/azure/container-apps/ingress-overview),
[managed identity](https://learn.microsoft.com/azure/container-apps/managed-identity),
and [SQL free offer](https://learn.microsoft.com/azure/azure-sql/database/free-tier).
