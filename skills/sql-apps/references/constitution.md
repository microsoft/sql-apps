# SQL Apps constitution

The first-release profile is deliberately narrow. These are instruction-level policies, not a security sandbox or a promise that every prerequisite is available.

| Area | Policy |
| --- | --- |
| Application language | TypeScript; T-SQL for database work |
| UI | React with Vite |
| UI conventions | Tailwind CSS v4 tokens, Radix for complex controls, Lucide icons, `clsx`/`tailwind-merge`; Vitest/React Testing Library |
| Default intent and cost | Small, useful PoC: `intent: poc`, `costPreference: free-first`; explicit `zero-azure-spend` is strict; "deploy" is not production intent or spend approval |
| Package layout | npm workspaces: `packages/frontend`, `packages/data`, `packages/shared`; `packages/server` only for necessary custom behavior |
| Future platform intent | `rayfin/rayfin.yml` with `services.data.dialect: mssql`; not executed by SQL Apps or guaranteed supported by released Rayfin |
| Application data APIs | Data API builder (DAB), with version-matched SQL specialist guidance; REST/GraphQL over permitted tables, views, and procedures |
| Custom server | Node.js/Express only for necessary authentication, orchestration, or domain behavior; not an automatic CRUD replacement for DAB |
| Database access and rules | Least-privilege DAB SQL identity; SQL constraints and transaction-safe procedures enforce business invariants, including concurrency |
| Relational store | Azure SQL Database |
| Local store | Azure SQL Database container, subject to current specialist-documented availability and host prerequisites |
| Cloud host | Evaluate free-first across the full topology; App Service is a candidate, not a preselected paid plan |
| Optional services | Blob Storage for files, Microsoft Entra ID for sign-in, Application Insights for telemetry, Key Vault when secret storage is necessary |
| Delivery | Local is a deployment-ready outcome; Azure provisioning is optional and separately approved |
| Deployment attribution | One `sqlapps-version` tag and a final `sqlapps` suffix on new resource names by default; customer-editable metadata, not runtime telemetry |
| Project ownership | Ordinary editable files, no SQL Apps runtime dependency |

Use one application and one database first. DAB is a required runtime, even when no custom server is necessary. Optional services are a support boundary, not a provisioning checklist. Add them only for an actual requirement.

Do not silently select another framework, ORM, data API platform, or database. Azure specialists may assess alternative hosting topologies for the required DAB app, but must disclose support boundaries and verify compatibility rather than claiming an untested platform is supported. Requests needing messaging, AI services, AKS, Fabric, or another application stack exceed this profile. Explain the conflict; an explicitly accepted exception is not a newly supported profile. Do not rewrite an existing app to force it into this profile.

Microsoft SQL owns database expertise and local-engine setup. Azure Skills owns cloud workflows and service configuration. The assistant owns ordinary implementation, integration, and verification. Use installed guidance and host permissions, not duplicate SQL Apps lifecycle machinery.

Align UI and source boundaries with Rayfin without adding its runtime. Keep SQL migrations, procedures, and DAB configuration in the data package, shared contracts browser-safe, and frontend DAB API calls separate from components. Do not generate a direct-SQL repository/CRUD layer merely to fill a package. Adopt these defaults for new apps; do not reorganize existing apps without scope approval. The router's app-design and Rayfin-alignment references define the conventions and migration boundary.

## DAB and SQL boundary

Application data requests must traverse DAB, directly from the app-owned API client or through necessary custom orchestration. Keep database credentials out of the browser and configuration source; use specialist-owned secret/identity guidance. Pin a compatible DAB runtime and document configuration, launch, and restart commands.

Use SQL constraints for declarative rules and transaction-safe stored procedures for multi-step or concurrent business invariants. Expose those procedures through DAB where a mutation requires them. Restrict the DAB identity and entity/action permissions so ordinary table writes cannot bypass the invariant. Do not duplicate data CRUD in Express, or leave generic write entities enabled alongside a protected procedure. Custom authentication or domain code does not replace DAB authorization or SQL enforcement.

Enforce role/ownership permissions in DAB with validated identity, and SQL policies where required. A hidden UI action or custom-server-only check is insufficient because DAB is an API boundary. Do not treat caller-supplied roles/identity headers as authenticated claims; validate the deployed authentication/proxy trust boundary through installed guidance. Test DAB directly, not just the UI.

## Deployment-shaped local delivery

Follow [deployment guidance](./deployment.md) from the first workflow. Local completion is deployment-ready: pinned DAB and compatible runtime, portable configuration, supported authentication, reproducible packaging of UI/custom server/DAB/SQL migrations and permissions, and a documented cloud hosting recipe with evidence status. Test packaged startup/routing/restart locally without Azure access. Assess precompiled runtime artifacts and dependencies separately from build tooling; TypeScript alone is not grounds to reject F1. No exercised core recipe is currently bundled; document the gap and promotion checks instead of claiming verified hosting.

## Complete topology and cost review

For greenfield work, persist `intent: poc` and `costPreference: free-first` in the brief and durable project policy. This preference seeks low-cost qualifying free options first; it neither guarantees free operation nor authorizes spending. Users may explicitly choose `costPreference: zero-azure-spend` as a strict zero-spend requirement. Preserve existing strict choices. Production availability, scale, or compliance must be explicitly requested; "deploy" alone keeps PoC intent and does not authorize charges. Keep provisioning optional.

Before any cloud resource selection or provisioning, use installed Azure/SQL specialists to assess the entire required topology. Record a concise assessment in the brief or existing specialist-owned plan:

| Component | Required assessment |
| --- | --- |
| Frontend and any custom server | Exact SKU, OS/runtime, CPU/time/storage/traffic quotas, sleep behavior, TLS, process lifecycle and ingress/routing |
| DAB runtime | Where it runs, compatible .NET/runtime packaging, ports and restart supervision; a static host alone does not host DAB |
| SQL | Free-offer eligibility for the actual subscription/region, capacity/storage/backup limits, network access and quota-exhaustion behavior |
| Authentication/authorization | Required provider, registrations, roles/ownership, token/header trust, and whether those features require a paid hosting tier |
| Build/publication | Local builds or qualifying build minutes, artifact/package storage, publication/deployment path; avoid paid registries/agents by default |
| Supporting resources | Logs/telemetry, storage, secrets, network/egress, backups, DNS/domains, and all implicitly created dependencies; omit unnecessary resources |

For every included component, identify the service/SKU, current official eligibility/limits, cost class, quota-stop/overage behavior, and compatibility evidence. Use these cost classes: **free SKU**, **free offer with enforced quota stop**, **metered allowance**, or **paid**. Trials, subscription credits, and consumption grants are not guarantees of zero spend; budget alerts are not spending caps. Do not describe a metered service as free merely because forecast usage is inside its allowance. Under strict zero-spend, unresolved charge exposure prevents provisioning, not safe investigation. Under free-first, disclose uncertainty and present the safest compatible option for approval; never silently enable a paid fallback.

Prefer quota-stop behavior and accept reduced PoC availability instead of automatic upgrades. For qualifying Azure SQL free-offer databases, require actual `useFreeLimit: true` and `freeLimitExhaustionBehavior: AutoPause`, not `BillOverUsage`. Monthly free-limit AutoPause is distinct from idle auto-pause/delay; the latter alone does not cap charges. Explain that quota exhaustion can leave SQL unavailable until the allowance resets. Azure SQL Basic is paid, not the default just because it is the cheapest paid SKU.

Do not assume individually free components form a compatible free application. Verify DAB plus any Node server can run on the selected host with required authentication and publication. A tutorial using B1/Always On or a container image is not proof that an F1 plan supports the same topology. Do not depend on retired Static Web Apps database connections or assume static hosting includes a DAB runtime.

Classify findings as confirmed incompatibility, missing evidence, or recoverable tooling failure, then follow the deployment reference's bounded investigation and concrete resolution path. Stop unapproved cloud writes, preserve the local DAB app, and continue safe engineering or authorized read-only reconciliation. Offer paid options with complete costs/tradeoffs and explicit approval. Do not weaken DAB, authorization, or SQL invariants to make a free plan appear feasible. An approved hosting exception does not relax SQL-free or unrelated constraints.

Carry the current intent, cost preference, component-specific accepted decisions, DAB/SQL requirements, approved topology, and acceptance checks explicitly into every specialist handoff. Use one concise review covering target/resources, costs, security, uncertainties and approvals. Routine non-destructive local build/test and packaging are covered by implementation approval under host permissions; explicit gates remain for cloud writes, spend changes, access changes, and destructive actions. Reassess changed facts without reopening unchanged approvals.

Current service references (recheck during planning, not a free-topology certification):

- [Azure SQL free offer and quota exhaustion](https://learn.microsoft.com/azure/azure-sql/database/free-offer)
- [DAB deployment to App Service](https://learn.microsoft.com/azure/data-api-builder/deployment/azure-app-service) uses a paid example; do not copy its tier automatically.
- [Static Web Apps plans](https://learn.microsoft.com/azure/static-web-apps/plans) have different identity/API features.
- [Static Web Apps database connections retirement](https://learn.microsoft.com/azure/static-web-apps/database-overview) rules out the retired managed-DAB shortcut.

## Deployment attribution

Follow the [deployment attribution contract](./deployment-attribution.md). Record the adopted SQL Apps plugin version as `sqlapps-version` in the brief, not the app/DAB version. Preserve it across resume and redeployment; loading newer guidance alone does not change infrastructure provenance.

Use the selected Azure workflow's infrastructure artifacts to merge the sole attribution tag on each new tag-capable resource and new resource group; group tags are not inherited. Default new resource names to end with the `sqlapps` suffix, placing environment and uniqueness tokens before it and following actual provider constraints and stable uniqueness helpers. Preserve customer tags and resolve conflicting values/tag limits explicitly. Record approved naming overrides and tagging exceptions. Never rename or replace existing resources for attribution; do not reattribute existing/shared resources without explicit scope approval.

Attribution adds no runtime instrumentation, data access, or monitoring resources. Local-only work needs no Azure checks. It can indicate resource footprint, not active usage or unique applications, and does not grant Microsoft visibility. Customer metadata remains editable; actual tags/names and exceptions must be checked during an approved deployment.

## Architecture and cost acceptance

Require observable UI-to-DAB-to-SQL save/reload evidence, direct DAB authorization denials with allowed controls, and invariant-breaking/concurrent writes rejected atomically by SQL. A configuration file, idle DAB process, or passing UI-only validation is not acceptance. Document the request path and sanitized runtime evidence using ordinary tests/run documentation.

For cloud delivery, repeat those checks at the deployed origin and read back actual resource settings, including each SKU, SQL free-limit flags, and every supporting meter. Compare them against the approved complete topology and cost preference. A zero estimate, IaC declaration, or successful deploy command is not proof. Treat mismatches as failed acceptance and report them without silently enabling paid fixes. Local delivery remains complete when cloud compatibility is blocked.

Also read back actual resource tags and names against the brief's adopted attribution version and naming pattern. Report missing/conflicting metadata and approved overrides/exceptions distinctly; do not rename resources or overwrite customer policy to make validation pass.

## Durable project policy

Merge the block below into the application's active host instruction file, preserving existing instructions: `.github/copilot-instructions.md` for Copilot, `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex or Cursor, and `GEMINI.md` for Gemini CLI. Respect an existing deliberately configured host-supported location. Do not write copies for inactive hosts.

The block intentionally contains the durable stack and routing constraints, not plugin installation paths or a second workflow. Replace the existing marked block on an intentional policy update; do not accumulate copies. When switching hosts, reconcile any existing policy copies. Keep product-specific requirements in `app-brief.md`.

```markdown
<!-- sql-apps:constitution:start -->
## SQL Apps project policy

- Preserve `app-brief.md`, existing behavior, and accepted decisions; carry current cost, topology, security, and acceptance choices into specialist handoffs. Do not silently change the app's stack or intent.
- Use TypeScript and React/Vite with Azure SQL through DAB. Use a Node.js/Express server only for necessary authentication, orchestration, or domain behavior; never replace DAB with direct SQL.
- Enforce identity and role/ownership permissions at DAB. Enforce transactional business rules in SQL constraints or procedures exposed through DAB, with no permission path that bypasses them. Never trust caller-supplied roles or expose credentials in browser code.
- If SQL or DAB is unavailable, give the user its supported setup path and continue useful UI, schema, or scaffolding work. Mark persistence and end-to-end checks incomplete; never substitute mocks or another database.
- For new apps, record `intent: poc` and `costPreference: free-first`. Preserve explicit `zero-azure-spend` and other accepted choices; neither "deploy" nor free-first authorizes spend.
- Local work needs no Azure sign-in or provisioning. Use the installed SQL/Azure specialist for requested cloud work; obtain explicit approval for resource writes, spend or access changes, and destructive actions. Follow host permissions.
- For Azure work, preserve recorded `sqlapps-version`, the final `sqlapps` naming suffix, approved exceptions, and existing resource names/tags. Never relabel or rename existing resources for attribution.
- Treat `rayfin/rayfin.yml` and its `mssql` dialect as migration intent only; do not claim released Rayfin runtime support.
- Preserve existing project instructions and normal source/run files; do not emulate a platform runtime.
<!-- sql-apps:constitution:end -->
```
