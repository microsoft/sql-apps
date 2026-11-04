# Cloud deployment

The [constitution](./constitution.md) defines lasting policy. This reference
covers deployment review and recovery. Each copied app keeps one `deployment.md`
with its target, approvals, operator actions and evidence. With prerequisites and
cached images available, recurring local work needs no Azure CLI session; real
application-user sign-in and image acquisition are separate prerequisites.

## Select and prepare

Choose the existing profile or install an alternative into a fresh copy using the
[profile guide](../templates/alternatives/README.md). Check its topology and gates
in the [shape catalog](./deployment-shapes.md). Build and test the compiled app
with locked production dependencies. Record source and artifact digests, runtime
versions, startup settings, network path and migration versions. Use the selected
profile's operator runbook; DAB and Functions have different identity and SQL
steps.

The starter provides:

| Command | Effect |
| --- | --- |
| `deployment:preflight` | Reads local configuration and tools. |
| `deployment:plan` | Prints a canonical, digest-linked draft and uncertainties. |
| `deployment:prepare` | Validates or stages local files. |
| `deployment:status` | Reads the local phase receipt without Azure access. |

Preflight does not sign in, contact Azure or establish provisioning eligibility.
The host-authorized phase API has no bundled Azure adapter or standalone apply
command. A plan hash and receipt record scope and state; they do not authorize
operations.

## Approval, cost and access

Follow the [authoritative approval policy](./constitution.md#approval-policy).
The app deployment record supplies its cloud-specific target tenant, subscription,
region, resources, identity/network changes, publication, migration operator,
cost limits, allowed actions and cleanup scope. Review generated plans against
that record; renew approval for material changes, not each already approved step.

Use these cost classes consistently:

- **Free SKU:** the resource's listed tier has no charge, subject to its limits.
- **Free offer with enforced quota stop:** usage is free only within the configured
  offer; verify eligibility and stop behavior for the target subscription.
- **Metered allowance:** usage may draw from shared grants and incur overage.
- **Paid:** normal service charges apply.

Credits and budget alerts do not cap charges. A strict zero-spend requirement
blocks unresolved exposure. The SQL free offer requires `useFreeLimit: true` and
`freeLimitExhaustionBehavior: AutoPause`; monthly quota pause is not idle
auto-pause. Do not silently substitute paid SQL, `BillOverUsage`, paid support,
or relaxed access.

### What never counts as approval or proof

- A plan, hash, receipt, listed SKU or configured registry is not approval.
- Local builds, mocks, fixtures and templates are not cloud acceptance evidence.
- A free SKU or metered allowance is not a spending cap for the topology.
- `allowAzureServices` admits connections from all Azure services, including
  resources in other customers' tenants. It requires explicit access approval.
- A successful deployment or health check does not prove authenticated SQL
  save/reload, authorization or persistence after restart.

Authentication does not bypass SQL firewalls. Bootstrap the selected API identity
with a separate least-privilege operator. DAB uses managed identity. Managed
Static Web Apps Functions uses an approved service-principal credential reference.
Record credential storage, rotation and retirement without writing secret values
to plans, commands or logs. Review SQL network access separately from host access.

## Run and recover

1. Compare the draft plan with the app's approved record. Confirm current service
   limits and region/offer provisioning eligibility; a SKU listing alone may not
   establish eligibility.
2. Preview exact resource, identity, network, image and cost changes. Keep
   publication and access approvals explicit.
3. Execute only the approved scope. Keep phase order: `publish`, `foundation`,
   `bootstrap`, `applications`, `verify`. Persist the sanitized receipt. The host
   must reconcile completed or uncertain writes before reuse or retry.
4. Apply migrations forward in order and verify each checksum. Follow the copied
   app's [migration procedure](../templates/starter/deployment-migrations.md).
   Never edit an applied migration or reset data to pass a checksum check.
5. If a write times out, inspect actual state before retrying. Record whether the
   problem is a service incompatibility, missing evidence, tooling failure or a
   new approval decision. Allow one retry and one supported alternative, then
   report the evidence and next safe action.

Recovery stops when ownership is unknown, resource or image references changed,
migrations are partial, or generated files were modified. Review scope deltas
before continuing. Never automatically delete or recreate resources, switch
regions or tiers, broaden access, change identity, or repeat a write. Preserve
existing SQL, data and image references.

## Evidence gates

These are independent claim gates, not a single pass/fail badge. Record partial
results explicitly; static packaging and compilation are useful evidence but
do not establish host activation, actual SQL, sign-in or deployment acceptance.

| Gate | Required checks | Permitted claim |
| --- | --- | --- |
| Host installation/discovery | Metadata/link/payload checks, actual install or update root, byte fidelity and fresh-session skill discovery on the named host/version | Static checks prove packaging only; native discovery proves that host loaded that payload, not application acceptance |
| Starter/profile functionality | Build/unit checks; selected API with actual SQL, direct/proxied allowed and denied requests, ownership, restricted grants/table-write-bypass denial, input handling, SQL invariants/concurrency, exact-row restart persistence and post-restart write | Only the named profile/environment and exercised functionality; readiness, mocks or compilation alone are partial evidence |
| Real-provider authenticated acceptance | Real browser sign-in and save/reload plus API/SQL allowed/denied checks for two approved users; no synthetic issuer or fake host identity | Authenticated acceptance for that provider/profile/revision only; token-based API tests alone do not prove browser sign-in |
| Deployed-profile verification | Approved isolated target; actual host/API/runtime settings, ingress and SQL connectivity, identity/grants, image/package identity, metadata and cost assumptions; real-provider API/browser/SQL acceptance including restart | Verified only for the immutable source/shape/artifact revision and environment tested; successful provisioning/health alone is insufficient |

For `static-web-apps-public`, record anonymous submission/acknowledgement,
forged/missing identity denial, disabled legacy routes, SQL budgets/concurrency
and restricted grants separately from enrolled-owner real-provider reads,
unenrolled denial, browser inbox reload and restart persistence. The owner
journey reads anonymously submitted data rather than creating owned Items.
No provider in the public-only phase is a limitation on owner acceptance, not
proof that owner authentication is unnecessary.

Every evidence record includes:

- Date/time, operator, gate, selected profile/access mode and local/cloud target.
- Immutable source revision and shape revision; dirty-state/payload digest if
  uncommitted changes were tested. A commit ID alone does not identify a dirty tree.
- Relevant artifact identity: image digest, package/payload hash or built-file
  hashes, plus build command/time and artifact selection. Existing output is not
  automatically proof of current source.
- Environment and tool/host/runtime versions, approved non-secret configuration
  and real versus synthetic provider category.
- Exact commands/checks, expected/observed results, failures, skipped checks,
  unresolved limitations and sanitized evidence location.
- For deployment, actual resource/settings/access and cost observations plus the
  approval scope reference; never secret values, tokens or authentication dumps.

Mark genuinely inapplicable checks with a reason and profile-specific replacement
where needed (for example no DAB/image checks for a deployed Functions package).
Missing setup/evidence is **unverified**, not inapplicable. Historical results
remain tied to their recorded revision; missing identities cannot be reconstructed
from today's files. Retest after source, runtime, artifact, provider, access or
topology changes. One profile passing never certifies another.

## Evidence and promotion

Keep bounded results in the app record. Repository-wide release/profile status
belongs to the
[release record](https://github.com/microsoft/sql-apps/blob/main/docs/reference/releasing.md#profile-status),
not duplicate mutable status in each guide. Promotion requires the applicable
gates above for the exact revision; documentation changes alone cannot promote it.

Acceptance logs keep the first idea-start, local-verified and deployed-verified
milestones unchanged. Resumed phases append events. Report approval and sign-in
waits separately from wall-clock times. Owner acceptance is a later, separate
milestone; pending review is not accepted delivery.

Correction feedback is a redacted single-line reproduction, expected/actual,
impact and correction summary. Save it locally first. Post only to an authorized
issue destination; if unavailable, keep the local record and do not retry as
another identity. Public submissions with private owner access require explicit
review; never use fake login to bypass it.

Current references: [Container Apps billing](https://learn.microsoft.com/azure/container-apps/billing),
[ingress](https://learn.microsoft.com/azure/container-apps/ingress-overview),
[managed identity](https://learn.microsoft.com/azure/container-apps/managed-identity),
and [SQL free offer](https://learn.microsoft.com/azure/azure-sql/database/free-tier).

## Stop and ask

Pause before a new region or tier, broader firewall rule, extra identity grant,
destructive recovery, unapproved publication, unresolved charge exposure or
cleanup outside the recorded scope.
