# Public-demo deployment preparation reference

Use this reference to verify a selected local reference app and review its Azure target before provisioning. Image publication, managed-identity SQL setup and the resumable public-demo deployment workflow remain unfinished. Artifact assembly, template compilation and diagnostics do not deploy an application.

## Choose the profile first

- **Local simulation:** subscription-free, loopback-only anonymous synthetic sessions for this selected reference. This is separate from the default foundation's Development Alice/Bob file/job experience.
- **Public synthetic-data demo:** intended anonymous HTTPS browser/API, internal DAB and Azure SQL. It must require synthetic-data acknowledgement and omit visitor sign-in, app-registration creation and Graph prerequisites. Cloud resources are separately authorized and can incur charges.
- **Authenticated application:** use the existing [full-foundation deployment](deployment.md), with its explicit Entra and service requirements. It is not the minimal public-demo path.

Never infer an authenticated production profile from the word "deploy."

## Free-tier-first cost review

Start with [costs and paid growth](../guides/costs.md), then run `npm run azure -- demo-cost azure-demo-cost.example.json` after building. This is offline and makes no Azure requests. The zero-spend example exits 2 with `blocked-by-fixed-charges`: SQL/compute free allowances do not remove ACR Basic or custom-network managed infrastructure charges. See [the cost command reference](demo-cost.md) for configuration and output details.

The review reports known charge sources, SQL policy, shared grants, theoretical compute headroom and usage-monitoring next actions; it does not invent prices, query actual usage or configure budgets. A paid-cost review requires an explicit fixed-charge acknowledgement, but never authorizes deployment. Do not silently change hosting/network security or use paid resources when a free-only intent is blocked.

Public visitor sessions are not admission-throttled or capped. Follow the [usage and paid-growth policy](demo-cost.md#visibility-before-growth): popularity prompts owner-approved capacity review, not automatic visitor blocking or billing changes. Per-session limits and SQL free-tier exhaustion pause still apply.

## Verify the actual selected app locally

Follow [the reference guide](../../examples/todo/README.md) and [local development](local-development.md). Select the runtime home/workspace explicitly, build the selected artifact, run `selected-app`, open its reported browser origin, and approve `selected-test` separately. The default application remains sample-free.

Local SQL/DAB/browser acceptance does not verify Azure managed-identity authentication, Azure policy, quotas, public HTTPS ingress or deployment readiness.

## Read-only tenant-scoped Azure diagnostics

This step requires an Azure subscription and a CLI user or service-principal sign-in. It is unnecessary for local development. Confirm the exact target and approve these read-only Azure requests first; do not log in, refresh caches or change global subscription selection automatically.

Copy [the diagnostic target example](../../azure-demo-target.example.json) to a local configuration and replace every placeholder with the chosen tenant, subscription, resource group and region. This is a separate strict diagnostic contract, not the full-foundation configuration. No app-registration IDs, service images or secrets belong in it.

```powershell
npm run build
npm run azure -- demo-preflight "<target-configuration.json>"
```

The command distinguishes:

1. **CLI subscription cache:** missing, stale or unavailable discovery is reported independently. A default-tenant discovery/Graph error is not proof of revoked ARM access.
2. **Tenant token:** the existing CLI acquires an ARM token for the explicitly chosen tenant. The supported sign-in methods for `--tenant` are user/service principal, not Cloud Shell or managed-identity accounts. The command uses UTC `expires_on` metadata (CLI 2.54.0 or later) instead of ambiguous local-time expiration.
3. **Actual ARM access:** in-memory, bounded HTTPS reads target the selected subscription/group using that token. Nothing changes the CLI's global defaults. Tokens are never printed or persisted; pagination cannot leave the exact ARM endpoint/scope.
4. **Providers and region:** required minimal-service providers must already be registered and advertise the chosen region. Registration, alternate-region selection and resource-group creation are not automatic repairs.
5. **Candidate write authorization:** effective permission pages are inspected, including action exclusions. Missing grants, policy/deny responses, forbidden ARM access and transient failures have distinct diagnostic codes.
6. **Policy/quotas:** an eligible diagnostic result still explicitly reports policy as not yet evaluated. Approved target-specific what-if/deployment must evaluate conditional access, deny assignments, policy, quotas and the chosen SQL configuration. Read access is not deployment proof.

This command makes no Graph requests, registrations, image publication, schema changes, resource writes or firewall changes. A missing resource group is reported as requiring separately approved creation, not silently created. Provider registration failures need deliberate target review rather than a generic login reset.

The existing full-foundation commands remain separate. Before future demo provisioning, review all selected billable dependencies, explicit SQL settings, network changes, source publication and a precise teardown path. No cloud write is authorized by saving this diagnostic configuration.

## Minimal template preparation

The foundation's default deployment prefix is `sqlapps`. The runtime requires an explicit `applicationName`, which determines the browser hostname prefix; use a reviewed `sqlapps`-prefixed name for the starter. Existing resource names and URLs are not changed automatically.

The separate [foundation template](../../infra/demo.bicep) prepares a Container Apps Consumption environment, one runtime managed identity, Basic Azure Container Registry, a selected VNet/subnet with a SQL service endpoint, Azure SQL server/database and narrow subnet rule. The [runtime template](../../infra/demo-runtime.bicep) subsequently deploys only the selected gateway and internal DAB sidecar. This split allows infrastructure, source publication and SQL preparation to remain separately approved stages.

- **SQL billing is explicit:** require `sqlBillingMode` with `free-paused` or `paid-reviewed`. Free-paused enrolls a new serverless database in the free tier with `AutoPause`, fixed 2-vCore maximum/0.5 minimum, 32 GiB size, local backup redundancy and 60-minute idle auto-pause. Paid-reviewed uses the required reviewed SKU/size/backup parameters. Both retain those parameter fields; use the matching cost report fragment. No paid continuation, existing-database conversion or paid fallback is authorized. Verify free eligibility/region/slots; unsupported configurations must fail rather than change tiers.
- **Networking is restricted, not private:** SQL's public endpoint is enabled but accepts the chosen subnet rule; no broad Azure-services exception or runner firewall rule is created by these templates. Any temporary runner rule belongs to the separately approved SQL setup workflow.
- **Runtime is bounded:** HTTPS gateway ingress only, one active revision, zero-to-one replicas and loopback-only DAB. Scale-to-zero is not a claim that SQL, registry, networking or other platform charges disappear.
- **Usage visibility is separate:** review actual subscription-wide compute grants, SQL remaining free amount, and app/managed-group costs after approved deployment. Budgets are alerts, not hard spending caps; these preparation commands configure none.
- **Logging is deliberately limited:** no Log Analytics workspace, Application Insights, storage, Functions, Key Vault, private endpoints or NAT gateway is provisioned. Persistent centralized application-log collection is disabled; this small demo profile is not an operational production baseline.
- **Images remain selected:** build outputs contain separate gateway and pinned-base DAB Dockerfiles, OCI source/selection/route labels and an allowlist Docker build context. SQL setup files, the local-path manifest, unrelated examples and tests are not included in that context. Published images still require immutable digests and separate source-publication approval.

With Azure CLI/Bicep already installed, the following compiles both templates into temporary files, checks the generated resource/SQL/network/ingress contracts and removes the temporary output. It does not require a subscription sign-in or provision resources:

```powershell
npm run build
npm run infra:test-demo
```

These are preparation components, not a supported manual substitute for the unfinished guide. SQL identity/procedure probing, image publication, ownership/resume reconciliation and live HTTPS acceptance must be completed before reporting a successful demo deployment.

References: [CLI token acquisition](https://learn.microsoft.com/cli/azure/account#az-account-get-access-token), [CLI authentication and UTC expiration](https://learn.microsoft.com/cli/azure/authenticate-azure-cli), and [effective resource-group permissions](https://learn.microsoft.com/rest/api/authorization/permissions/list-for-resource-group).
