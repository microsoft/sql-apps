# SQL Apps constitution

The first-release profile is deliberately narrow. These are instruction-level policies, not a security sandbox or a promise that every prerequisite is available.

| Area | Policy |
| --- | --- |
| Application language | TypeScript; T-SQL for database work |
| UI | React with Vite |
| UI conventions | Tailwind CSS v4 tokens, Radix for complex controls, Lucide icons; `clsx`/`tailwind-merge` only when class merging is needed; Vitest/React Testing Library |
| Default intent and cost | Small, useful PoC: `intent: poc`, `costPreference: free-first`; explicit `zero-azure-spend` is strict; "deploy" is not production intent or spend approval |
| Package layout | npm workspaces: `packages/frontend`, `packages/data`, `packages/shared`; `packages/server` only for necessary custom behavior |
| Future platform intent | `rayfin/rayfin.yml` with `services.data.dialect: mssql`; not executed by SQL Apps or guaranteed supported by released Rayfin |
| Application data APIs | DAB by default; explicit Static Web Apps Free profile uses managed Functions directly against SQL, with the same identity, ownership and SQL-invariant checks |
| Custom server | Node.js/Express only for necessary authentication, orchestration, or domain behavior; not an automatic CRUD replacement for DAB |
| Database access and rules | Least-privilege API SQL identity; SQL constraints and transaction-safe procedures enforce business invariants, including concurrency |
| Relational store | Azure SQL Database |
| Local store | Azure SQL Database container (Private Preview); no SQL Server Express or other on-premises fallback |
| Cloud host | Container Apps/DAB default; explicit App Service F1/DAB or Static Web Apps Free/Functions profiles; Azure SQL free offer with quota-stop; no guaranteed-zero-cost claim |
| Optional services | Blob Storage for files, Microsoft Entra ID for sign-in, Application Insights for telemetry, Key Vault when secret storage is necessary |
| Delivery | Local is a deployment-ready outcome; Azure provisioning is optional and separately approved |
| Deployment attribution | One `sqlapps-version` tag and a final `sqlapps` suffix on new resource names by default; customer-editable metadata, not runtime telemetry |
| Project ownership | Ordinary editable files, no SQL Apps runtime dependency |

Use one application and one database first. DAB is the default runtime, not a requirement for the explicit Functions profile. Optional services are a support boundary, not a provisioning checklist. Add them only for an actual requirement.

Do not silently select another framework, ORM, data API platform, or database. Select hosting and API together in `deployment.json` using the [hosting profiles](../templates/starter/hosting.md). Disclose evidence boundaries rather than claiming an untested platform is supported. Requests needing messaging, AI services, AKS, Fabric, or another application stack exceed this profile. Do not rewrite an existing app to force it into this profile.

Discover capabilities and reuse supported target decisions before asking one grouped routing question for missing choices. Subscription ownership does not select cloud or authorize provisioning. The only database targets are the local Azure SQL Database container and Azure SQL Database cloud. If the container is unavailable, offer preview signup or explicit cloud selection; record the target, connection topology, and compatibility gaps. Do not install or extend an on-premises fallback. Existing out-of-profile projects need an explicit migration decision, not a silent rewrite. Before moving to cloud, check feature compatibility and rerun migrations, DAB authorization, SQL-invariant/concurrency, persistence, and restart on the actual cloud target.

Microsoft SQL owns database expertise and local-engine setup. The existing assistant owns implementation, integration, cloud deployment, and verification using the bundled Bicep recipe, available CLI/API tools, and current first-party documentation. No additional cloud skills plugin or onboarding runtime is required.

Align UI and source boundaries with Rayfin without adding its runtime. Keep SQL migrations, procedures, and DAB configuration in the data package, shared contracts browser-safe, and frontend DAB API calls separate from components. Do not generate a direct-SQL repository/CRUD layer merely to fill a package. Adopt these defaults for new apps; do not reorganize existing apps without scope approval. The router's app-design and Rayfin-alignment references define the conventions and migration boundary.

## DAB and SQL boundary

Application data requests traverse DAB by default, directly from the app-owned API client or through necessary custom orchestration. The explicit `static-web-apps/functions` profile instead validates bearer tokens in Functions and executes parameterized SQL with request-scoped ownership context. Keep database credentials out of the browser and configuration source; use specialist-owned secret/identity guidance. Pin a compatible DAB runtime where selected and document configuration, launch, and restart commands.

Use SQL constraints for declarative rules and transaction-safe stored procedures for multi-step or concurrent business invariants. Expose those procedures through DAB where a mutation requires them. Restrict the DAB identity and entity/action permissions so ordinary table writes cannot bypass the invariant. Do not duplicate data CRUD in Express, or leave generic write entities enabled alongside a protected procedure. Custom authentication or domain code does not replace DAB authorization or SQL enforcement.

Enforce role/ownership permissions at the selected API with validated identity, and SQL policies where required. A hidden UI action is insufficient. Do not treat caller-supplied roles/identity headers as authenticated claims; validate the deployed authentication/proxy trust boundary through installed guidance. Test DAB directly for DAB profiles and Functions directly for the Functions profile, not just the UI. Managed Functions lack managed identity: use an approved, restricted Entra service principal secret in server-side application settings, with rotation, rather than weakening Entra-only SQL.

## Deployment-shaped local delivery

Follow [deployment guidance](./deployment.md) from the first workflow. Local completion is deployment-ready: pinned DAB and compatible runtime, portable configuration, supported authentication, reproducible packaging of UI/custom server/DAB/SQL migrations and permissions, and a documented cloud hosting recipe with evidence status. Test packaged startup/routing/restart locally without Azure access. Assess precompiled runtime artifacts and dependencies separately from build tooling; TypeScript alone is not grounds to reject F1 in an existing approved topology. The bundled Container Apps recipe has partial cloud evidence but no completed application acceptance; F1 and Static Web Apps have no live evidence. Document gaps instead of claiming verified hosting.

For empty apps, reuse the [versioned application starter](../templates/starter/README.md); copy, do not run it in the plugin. Confirm external identity and routing before expanding the first verified vertical slice. Keep its sample domain replaceable, its lifecycle app-owned, and real-provider/browser/local/cloud evidence distinct. Never overlay an existing app or treat a test issuer as deployed authentication.

## Complete topology and cost review

For greenfield work, persist `intent: poc` and `costPreference: free-first` in the brief and durable project policy. This preference seeks low-cost qualifying free options first; it neither guarantees free operation nor authorizes spending. Users may explicitly choose `costPreference: zero-azure-spend` as a strict zero-spend requirement. Preserve existing strict choices. Production availability, scale, or compliance must be explicitly requested; "deploy" alone keeps PoC intent and does not authorize charges. Keep provisioning optional.

Before any cloud resource selection or provisioning, assess the entire required topology using the bundled recipe, current service documentation, available tools, and SQL specialist guidance. Record a concise assessment in the brief or existing deployment plan:

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

The standard PoC recipe uses two Container Apps on the Consumption profile with zero minimum replicas, one maximum replica each, and 0.25 vCPU/0.5 GiB per replica. Container Apps monthly grants are shared per subscription and do not enforce a free-limit stop: disclose potential overages and obtain spend approval before deployment. Strict zero-spend blocks this recipe unless a genuine no-charge boundary is independently established. Do not create a registry, logging workspace, NAT gateway, or private endpoint by default. SQL managed identity does not bypass its firewall: the recipe defaults broad Azure-services access off, requiring an explicit approved connectivity choice. Broad access allows all Azure services, not just this application.

Do not assume individually free components form a compatible free application. Verify DAB plus any Node server can run on the selected host with required authentication and publication. A tutorial using B1/Always On or a container image is not proof that an F1 plan supports the same topology. Do not depend on retired Static Web Apps database connections or assume static hosting includes a DAB runtime.

Classify findings as confirmed incompatibility, missing evidence, or recoverable tooling failure, then follow the deployment reference's bounded investigation and concrete resolution path. Stop unapproved cloud writes, preserve the local DAB app, and continue safe engineering or authorized read-only reconciliation. Offer paid options with complete costs/tradeoffs and explicit approval. Do not weaken authorization or SQL invariants to make a free plan appear feasible. DAB may be replaced only by the explicit Functions profile, not silently removed. An approved hosting exception does not relax SQL-free or unrelated constraints.

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

Require observable UI-to-API-to-SQL save/reload evidence, direct DAB authorization denials with allowed controls for DAB profiles (equivalent direct Functions controls for Functions), and invariant-breaking/concurrent writes rejected atomically by SQL. A configuration file, idle DAB process, or passing UI-only validation is not acceptance. Document the request path and sanitized runtime evidence using ordinary tests/run documentation.

For cloud delivery, repeat those checks at the deployed origin and read back actual resource settings, including each SKU, SQL free-limit flags, and every supporting meter. Compare them against the approved complete topology and cost preference. A zero estimate, IaC declaration, or successful deploy command is not proof. Treat mismatches as failed acceptance and report them without silently enabling paid fixes. Local delivery remains complete when cloud compatibility is blocked.

Also read back actual resource tags and names against the brief's adopted attribution version and naming pattern. Report missing/conflicting metadata and approved overrides/exceptions distinctly; do not rename resources or overwrite customer policy to make validation pass.

## Durable project policy

Merge the block below into the application's active host instruction file, preserving existing instructions: `.github/copilot-instructions.md` for Copilot, `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex or Cursor, and `GEMINI.md` for Gemini CLI. Respect an existing deliberately configured host-supported location. Do not write copies for inactive hosts.

The block intentionally contains the durable stack and routing constraints, not plugin installation paths or a second workflow. Replace the existing marked block on an intentional policy update; do not accumulate copies. When switching hosts, reconcile any existing policy copies. Keep product-specific requirements in `app-brief.md`.

```markdown
<!-- sql-apps:constitution:start -->
## SQL Apps project policy

- Preserve `app-brief.md`, existing behavior, and accepted decisions; carry current cost, topology, security, and acceptance choices into specialist handoffs. Do not silently change the app's stack or intent.
- Use TypeScript and React/Vite with Azure SQL through DAB by default, or explicit Static Web Apps/Functions: local Azure SQL Database container or Azure SQL Database cloud only. No SQL Server Express or other on-premises fallback. Express is only for necessary custom behavior.
- Enforce identity/ownership at the API and SQL rules in constraints/procedures, with no permission path that bypasses them. Never trust caller roles or expose browser credentials.
- Reuse setup decisions. Missing SQL/DAB: offer preview signup or explicit cloud selection; persistence stays incomplete. Never substitute mocks or another database. Scope migrations explicitly.
- Before moving to cloud, check compatibility and rerun migrations, selected API authorization, SQL invariants/concurrency, persistence, and restart on the actual cloud target.
- For new apps, record `intent: poc` and `costPreference: free-first`. Preserve explicit `zero-azure-spend` and other accepted choices; neither "deploy" nor free-first authorizes spend.
- Local work needs no Azure sign-in or provisioning. Use app-owned Bicep, CLI/API tools and SQL guidance for cloud; obtain explicit approval for resource writes, spend or access changes, and destructive actions. Follow host permissions.
- Record `deployment.json` hosting/API selection: Container Apps/DAB default, F1/DAB, or Static Web Apps/Functions. Keep SQL free-limit AutoPause. Allowances are not spending caps. Preserve approved hosts; broad SQL firewall access requires approval.
- For Azure work, preserve recorded `sqlapps-version`, the final `sqlapps` naming suffix, approved exceptions, and existing resource names/tags. Never relabel or rename existing resources for attribution.
- Treat `rayfin/rayfin.yml` and its `mssql` dialect as migration intent only; do not claim released Rayfin runtime support.
- Preserve project instructions and source/run files; no platform runtime.
<!-- sql-apps:constitution:end -->
```
