# Cloud deployment

The [constitution](./constitution.md) owns lasting policy. This reference covers
shared cloud review and recovery. The copied app's `deployment.md` records its
target, approvals, commands and results. Local-only work needs no Azure sign-in.

## Select and prepare a profile

The [starter](../templates/starter/README.md) defaults to Container Apps and DAB.
Fresh copies can select [F1/DAB, Static Web Apps/Functions, or the public inbox
profile](../templates/alternatives/README.md). Preserve existing apps. Apply only
the selected API's checks: DAB and Functions have different identity and SQL
paths. See the [hosting guide](../templates/starter/hosting.md) for profile
details.

Build and test the compiled app and production dependencies. Record pinned
versions, images, OS/architecture, startup, ports, routing, environment names,
health, shutdown/restart and migrations. Do not put secret values in docs.
Successful builds do not prove hosting, identity, network, quota or ingress work.
Check current first-party service limits and installed SQL guidance.

## Keep one deployment record

For cloud work, adapt the copied `deployment.md` and record:

| Record | Include |
| --- | --- |
| Target | Tenant/subscription/region, host/API, resources/SKUs, recipe revision and immutable artifacts |
| Access and operation | Identity/consent, least-privilege SQL bootstrap, connectivity, migrations, secret channels, publication and recovery |
| Costs and approvals | Per-component estimates, assumptions, limits, allowed actions, spend/access approvals and exceptions |
| Evidence | Actual settings and `sqlapps-version`; selected-API allow/deny checks, browser save/reload, SQL concurrency, restart and persistence |
| Open items | Known evidence, uncertainty, owner and next safe action or exact approval needed |

Review host runtime, authentication, TLS/routing, SQL eligibility/storage/backups,
build/publication, traffic/egress, logs, secrets, network and DNS. Classify each
cost as **free SKU**, **free offer with enforced quota stop**, **metered allowance**
or **paid**, using current official limits. Credits and budget alerts do not
guarantee zero spend or stop overages.

Container Apps grants are shared metered allowances, not hard caps. Scale-to-zero
and one replica reduce exposure but do not prevent overages. A strict zero-spend
requirement blocks unresolved charge exposure. The SQL free offer requires
`useFreeLimit: true` and `freeLimitExhaustionBehavior: AutoPause`; monthly quota
stop is not idle auto-pause. Do not use paid SQL, `BillOverUsage`, paid support
resources or relaxed access without scoped approval. Hosting approval does not
approve a separate SQL exception.

Authentication does not bypass SQL firewalls. Bootstrap the selected API identity
with a separate operator. DAB uses managed identity; managed Static Web Apps
Functions use an approved, rotated service-principal secret. SQL
`allowAzureServices` is off by default; enabling it admits all Azure services,
including other customers' resources, and requires explicit access approval.
Without approved connectivity and bootstrap, deployment is incomplete.

## Recover safely

Separate confirmed incompatibility, missing evidence, tooling failure and decisions
that need approval. Test one hypothesis at a time; allow one retry and one
supported alternative, then report evidence and the next action. After a timed-out
write, inspect actual state before retrying. Do not switch identities, install
tools, broaden access or repeat writes without approval.

Resolve conflicting eligibility or quota results by subscription, region, offer,
API/version, timestamp and scope. An isolated experiment needs approval for its
resources, possible costs, free-limit settings, post-create checks and cleanup
scope. Strict zero-spend forbids unresolved charge exposure. Stop unapproved cloud
writes, not safe local engineering.

## Evidence and promotion

**No bundled cloud recipe has been verified end to end by an independent user.**
The [Container Apps runbook](../templates/starter/deployment.md) has Bicep, images
and operator bootstrap, but full real-user cloud acceptance remains unverified.
This is a validation gap, not proof of incompatibility or a test each customer
must repeat.

At an immutable source revision, retain exact versions/artifacts, commands,
results, cost assumptions, actual settings and limitations. Promotion requires an
approved isolated deployment; selected-API positive and negative checks; SQL
invariants and concurrency; browser sign-in; restart/persistence; and resource
and metadata checks. Retest when pinned components or topology change. Local
builds, fixtures and generated templates are not cloud evidence.

Current references: [Container Apps billing](https://learn.microsoft.com/azure/container-apps/billing),
[ingress](https://learn.microsoft.com/azure/container-apps/ingress-overview),
[managed identity](https://learn.microsoft.com/azure/container-apps/managed-identity),
and [SQL free offer](https://learn.microsoft.com/azure/azure-sql/database/free-tier).
