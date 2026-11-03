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

## Generate a read-only deployment plan

The starter exposes `npm run deployment:preflight` and
`npm run deployment:plan`. Preflight checks the selected local profile, required
files and installed CLI tools, and reads only the configured npm registry URL.
Credential fields and query values are removed; non-HTTPS registries are rejected.
It does not sign in, request consent, contact Azure, write resources, publish
artifacts, or establish
subscription/region provisioning eligibility.

The plan command emits a canonical, digest-linked draft with per-component cost
classes and explicit publication, identity and network actions. Missing owner or
target inputs, artifact digests, unknown cost exposure and unverified shape
evidence remain uncertainties; they are not success-shaped defaults. A configured
registry is observed configuration, not publication approval. Review the
generated plan and its hash in the copied app's single `deployment.md` record.
`compareApprovedScope` reports whether a proposed plan still matches an approved
scope; matching hashes and receipts do not authorize any operation.

## Execute through an authorized host

The starter exposes `deployment:apply` and `deployment:status`. The standalone
`deployment:apply` command deliberately refuses to run: the VS Code host must
provide a live authorization callback and phase adapter, and the starter does not
bundle an Azure write adapter. A phase receipt/hash is state, never authorization.
The host runs `publish`, `foundation`, `bootstrap`, `applications`, and `verify`
in order, reconciles completed phases before reuse/continuation, and persists the
sanitized receipt in the copied app's ignored `.deployment/receipt.json`.
Uncertain writes must be reconciled before retry. Bootstrap requires consecutive
forward-migration checksums; use the copied app's existing
`deployment-migrations.md` procedure and never alter an applied migration.

`deployment:status` validates and reports that receipt without Azure access.
`deployment:prepare` remains local validation/staging only. No local command
establishes live cloud acceptance or performs Azure writes.

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

The starter's `reconcileDeployment` compares resource-specific observations with
generic inventory and recorded phase state. Failed name reservations remain
visible even when inventory omits them. Unknown ownership, changed SQL/image
references, partial migrations or altered generated output stop continuation.
Recovery proposals carry explicit scope deltas and never delete/recreate resources
or switch region/tier automatically. Reuse the Bicep region-sensitive SQL naming
rule only for a separately reviewed plan; preserve existing SQL/data/image
references until the owner approves a scoped change.

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

The starter's `recordBenchmarkEvent` keeps the first idea-start, local-verified
and deployed-verified milestones immutable. Resumed phases append events; approval
and sign-in waits are measured as separate intervals and are never subtracted from
wall-clock totals. Require real SQL browser save/reload evidence for customer
verification. Record owner acceptance separately after deployment verification;
pending owner review is not full customer acceptance. Public submission/private
owner remains a separately reviewed policy, never a fake-login bypass.

Correction feedback is a redacted single-line reproduction/expected/actual/impact/
correction summary. Preserve it locally first; post only to an explicitly
authorized issue destination and do not retry under another identity if that
destination is unavailable. No historical timing baseline was available in the
checked-out repository, so do not claim a comparative improvement.

Current references: [Container Apps billing](https://learn.microsoft.com/azure/container-apps/billing),
[ingress](https://learn.microsoft.com/azure/container-apps/ingress-overview),
[managed identity](https://learn.microsoft.com/azure/container-apps/managed-identity),
and [SQL free offer](https://learn.microsoft.com/azure/azure-sql/database/free-tier).
