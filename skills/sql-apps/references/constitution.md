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

- Default greenfield work to intent: poc and costPreference: free-first in app-brief.md; explicit costPreference: zero-azure-spend is strict and existing choices must not be relaxed silently. Free-first is not guaranteed free operation or spend consent. Only explicit production availability, scale, or compliance changes intent; "deploy" is not production or spend approval. Preserve accepted decisions on resume.
- Use TypeScript and React/Vite with Data API builder (DAB) for application data APIs. Node.js/Express is only for necessary authentication, orchestration, or domain behavior, never an automatic direct-SQL CRUD layer.
- For new apps use npm workspaces with packages/frontend, packages/data, packages/shared, and packages/server only if custom code is necessary. Keep SQL migrations/procedures and DAB config in data, shared contracts browser-safe, and SQL access server-side; views call an app-owned DAB API client, not database or Rayfin SDK code.
- Prefer relative same-origin app API URLs with a development/deployed proxy to DAB and any necessary custom server. Verify routing and auth trust; do not bypass DAB. Reserve /.rayfin and descendants, /rayfin.config.json, and /.well-known/rayfin-control-plane for future Rayfin ownership; do not emulate its protocols. Use an app-owned health route such as /healthz.
- Use Tailwind CSS v4 semantic tokens in packages/frontend/src/global.css, Radix for complex controls, Lucide icons, and clsx/tailwind-merge. Record the visual direction; check keyboard access, light/dark themes, responsive layouts, and truthful data/mutation states. Use Vitest/React Testing Library for relevant UI tests.
- Use Azure SQL Database behind least-privilege DAB APIs. Enforce transactional/concurrent business invariants in SQL constraints or transaction-safe procedures exposed via DAB; no generic write permission may bypass them. Validate identity and enforce DAB role/ownership authorization; do not trust spoofable headers or UI-only checks. Never expose credentials in browser code.
- Use Microsoft SQL guidance for DAB, schema, migrations, authentication, connection resiliency, diagnostics, and the local Azure SQL Database container. Check actual prerequisites; never substitute SQLite, mocked persistence, a different database, or Express CRUD for missing DAB.
- Cloud deployment is optional. Evaluate hosting, DAB, SQL, authentication, build/publication, and all supporting resources together before selecting resources. Verify actual subscription/region eligibility, runtime compatibility, quotas, and overage behavior. Omit optional resources without a requirement.
- Make local delivery deployment-ready: pinned DAB, portable configuration, supported authentication, reproducible packaging for UI/custom server/DAB/SQL migrations and permissions, documented cloud hosting recipe and evidence status. Run packaged artifacts locally and verify startup/routing/restart. Assess deployed runtime artifacts and local/CI precompilation, not source-language labels; TypeScript alone does not reject F1. Local-only work needs no Azure sign-in/provisioning.
- Record the adopted SQL Apps guidance version from the actual SQL Apps plugin manifest as sqlapps-version in app-brief.md; it is not the app/DAB version. Preserve it on resume/redeployment; newer installed guidance alone must not relabel infrastructure. Default new resource names to end with sqlapps as the final suffix; place environment and stable uniqueness tokens before it. Use -sqlapps when hyphens are allowed, otherwise append sqlapps directly; follow provider constraints. Record approved naming overrides and tagging exceptions.
- Merge the sole attribution tag sqlapps-version onto each newly created tag-capable resource and new resource group; group tags are not inherited. Preserve customer tags; compare keys case-insensitively and surface conflicting values/tag limits instead of overwriting. Never rename or replace existing resources for attribution or reattribute existing/shared resources without explicit scope approval. Resolve missing version provenance or record an approved exception. No runtime telemetry or data access for attribution, and no added monitoring resources. Local-only delivery needs no Azure attribution checks.
- Keep names and tags free of personal, sensitive, or confidential information; they are visible metadata. Attribution indicates resource footprint, not active usage or unique applications, and does not grant Microsoft additional visibility or send SQL Apps a usage report.
- Distinguish free SKUs and free offers with quota stops from metered allowances, trials, and credits. For zero-spend free-offer SQL require useFreeLimit: true and freeLimitExhaustionBehavior: AutoPause, not BillOverUsage or merely idle auto-pause. Budget alerts do not cap spending. Azure SQL Basic is paid.
- Classify confirmed incompatibility, missing evidence, and recoverable tooling failure separately; allow at most one safe retry and one supported alternative per hypothesis, then state findings and the next action/approval. Stop unapproved cloud writes, not safe engineering or authorized read-only reconciliation; preserve the local DAB app. Present paid alternatives with complete costs for explicit approval. Strict zero-spend forbids unresolved charge exposure. Never drop DAB, SQL rules, or authorization to fit free hosting.
- Maintain one concise deployment review of target/resources, costs, security/access changes, accepted decisions, uncertainties and acceptance checks. Routine non-destructive local build/test and packaging are within implementation approval and host permissions; retain explicit gates for cloud writes, spend changes, access changes, and destructive actions. Carry scoped accepted decisions forward: approved B1 hosting does not relax SQL-free requirements or authorize SQL overages. Check whether timed-out writes took effect before retrying; no blind write retries. Every blocker names a concrete next safe action and precise approval if needed.
- Route Azure work to installed Azure Skills. For azd use its prepare/validate/deploy workflow; for non-azd onboarding use its own complete pipeline. Do not mix their state or bypass approvals. Local-only work must not enter cloud onboarding. Every specialist handoff must explicitly carry current intent, costPreference, DAB/SQL requirements, approved topology/cost boundary, and acceptance checks. Every Azure handoff must explicitly carry recorded sqlapps-version, final sqlapps suffix naming pattern, and approved overrides/exceptions.
- Do not silently introduce another framework, ORM, API platform, service, or Rayfin/Fabric. Surface out-of-profile requirements before proceeding.
- Preserve rayfin/rayfin.yml with services.data.dialect: mssql. Keep enabled paths/build commands aligned with real packages; unused auth/realtime/storage/functions stay disabled. It is not proof of released Rayfin SQL support. SQL Apps does not execute it; its presence alone does not transfer workflow ownership or authorize Rayfin tooling. Require an explicit, version-validated migration before adopting the runtime.
- Read and maintain app-brief.md. Use normal project files and host task facilities, not a SQL Apps runtime or execution-state system. Preserve existing work.
- Verify build/tests, real UI-to-DAB-to-SQL save/reload with request/runtime evidence, direct DAB authorization denials and allowed controls, SQL invariant/concurrency enforcement without partial writes, responsive/error states, and documented restart. Recheck at the deployed origin and read back actual SKUs, SQL free-limit flags, and supporting resource settings against the approved cost posture; also read back actual resource tags and names against the recorded attribution choices, reporting mismatches and approved exceptions distinctly. Configuration or estimates alone are not proof. Report unrun checks and blockers explicitly.
- Follow host permissions and specialist approval gates. Product approval is not permission for cloud spend, destructive operations, or real-data transfer. Use synthetic development data unless otherwise authorized.
<!-- sql-apps:constitution:end -->
```
