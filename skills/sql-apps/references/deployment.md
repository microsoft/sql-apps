# Cloud deployment

Follow the [approval policy](./constitution.md#approval-policy);
record cloud approvals, steps and results in the app's `deployment.md`.

## Select and prepare

Use the [selected shape](./deployment-shapes.md) and its app-owned runbook.

| Command | Effect |
| --- | --- |
| `deployment:preflight` | Reads local configuration and tools |
| `deployment:plan` | Prints a canonical, digest-linked draft and uncertainties |
| `deployment:prepare` | Validates or stages local files |
| `deployment:status` | Reads the local phase receipt without Azure access |

Preflight does not sign in, contact Azure or establish provisioning eligibility.
Use the separate [cloud preflight](./prerequisites.md#early-cloud-and-identity-preflight).
Discovery failure is a tooling blocker, not deployment failure.
The host-authorized phase API has no Azure adapter or standalone apply command.

## Approval, cost and access

Record tenant identity writes separately from hosting provisioning, with approval
and readback.

- **Free SKU:** no tier charge within its limits.
- **Free offer with enforced quota stop:** verify target eligibility and stop behavior.
- **Metered allowance:** shared grants can incur overage.
- **Paid:** normal charges apply.

Credits and budget alerts do not cap charges. Strict zero-spend blocks unresolved
exposure. SQL's free offer requires `useFreeLimit: true` and
`freeLimitExhaustionBehavior: AutoPause`; monthly quota pause is not idle auto-pause.
Never silently substitute paid SQL, `BillOverUsage`, paid support or relaxed access.

### What never counts as approval or proof

Plans, hashes, receipts, SKU listings and login are not approval;
builds, fixtures and provisioning/health do not prove cloud acceptance.
`allowAzureServices` admits all Azure services, including other tenants;
it requires explicit access approval.

SQL firewall approval is separate from authentication/host access.
Bootstrap through a separate least-privilege operator: managed identity for DAB,
approved service-principal credential reference for managed SWA Functions.
Record secret storage/rotation/retirement, never values.

### Version tags and names

Read `sqlapps-version` from installed [plugin.json](../../../plugin.json) and
record it in `deployment.md`; missing version needs resolution or an approved exception.

Tag each new in-scope tag-capable resource/group; group tags are not inherited.
Preserve adopted versions and customer tags; compare keys case-insensitively.
Resolve conflicts/limits/unsupported tags before writes; record approved exceptions.
Tagging existing/shared resources requires explicit scope.

Verify actual tags during approved readback. Preserve deployed names/provider rules;
never rename/recreate resources for branding. No sensitive metadata, tracking IDs,
telemetry, extra access or spending for attribution.

## Run and recover

1. Confirm service limits and region/offer eligibility, not SKU availability alone.
2. Preview resource, identity, network, publication and cost changes against approval.
3. Execute approved phases in order: `publish`, `foundation`, `bootstrap`,
   `applications`, `verify`. Persist sanitized receipts; reconcile writes before reuse.
4. Follow the [migration procedure](../templates/starter/deployment-migrations.md).
5. After failure/timeout, inspect actual state before retry. Report cause and next
   action after one retry and one approved supported alternative.

Stop recovery for unknown ownership, changed resource/image references, partial
migrations or modified generated files; review scope before continuing.
Never repeat uncertain writes or change scope automatically.

## Evidence gates

Run the app's business [acceptance checks](../templates/starter/README.md#adapting-acceptance-to-the-app)
on the deployed profile with real SQL/provider. Public submissions and enrolled-owner
reads are separate targets; anonymous success never proves owner access.

Also read back actual host/API/runtime settings, ingress/SQL connectivity,
identity/grants, artifact digests, tags and costs.

Record target/profile, source/shape revision (dirty-state digest if applicable),
artifact hashes, build command/time, tool/runtime versions, approved non-secret
configuration, commands/results, blockers/unrun checks and approval scope.
Missing evidence is **unverified**; inapplicable checks need a reason.
Retest changes; one profile never certifies another.

Record sanitized host warnings, affected component, impact and next action:
passing HTTP/SQL checks does not clear a storage warning or prove unused bindings.
Do not suppress warnings or invent configuration for a green badge.
