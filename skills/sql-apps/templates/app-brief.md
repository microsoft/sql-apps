# App brief: <application name>

## Outcome and users

<What useful task does this app complete, and for whom?>

## Essential workflows and checks

| Workflow | Observable acceptance check |
| --- | --- |
| <Primary user action> | <What should happen, including a fresh read/reload?> |

## Data and access rules

<Key entities, relationships, invariants, roles/ownership, and sensitive data constraints. Resolve rules such as conflicting reservations explicitly.>

## First delivery

- intent: poc
- costPreference: free-first
- Includes: <small but complete useful scope>
- Excludes: <deferred features>
- Assumptions: <consequential assumptions explicitly confirmed or delegated>
- Delivery: <local; Azure only if requested, subject to its own approvals>

PoC/free-first are the defaults, not a guarantee of free operation or permission to spend. Explicit costPreference: zero-azure-spend is strict; preserve existing choices. Only explicit production availability, scale, or compliance requirements change intent; "deploy" does not. Carry current values, scoped accepted decisions and acceptance checks into every specialist handoff. Routine non-destructive local checks are within implementation approval/host permissions; cloud writes, spend/access changes and destructive actions need explicit approval.

## Technical boundary

SQL Apps profile: TypeScript, React/Vite, DAB application data APIs, Azure SQL Database. Use Node.js/Express only for necessary authentication, orchestration, or domain behavior, not a default direct-SQL CRUD layer. SQL constraints and transaction-safe procedures enforce transactional/concurrent business invariants; DAB permissions must not expose a bypass. Optional services only when required.

- Application request path: <UI/API client -> DAB -> SQL; any necessary custom-server hop and its purpose>
- DAB authorization: <identity validation, role/ownership rules, direct-endpoint and proxy trust boundaries>
- SQL invariants: <constraints/procedures, transaction/concurrency behavior, restricted write paths>
- Local deployment-ready delivery: <pinned DAB/runtime; portable configuration; supported authentication; reproducible packaging/startup/routing/restart for UI, custom server, DAB and SQL migrations/permissions; cloud recipe revision and evidence gaps>

## Deployment attribution

- sqlapps-version: <verified SQL Apps guidance version adopted for generated infrastructure; preserve on resume>
- Resource naming: <final sqlapps suffix and approved naming pattern for new resources; environment/stable uniqueness tokens before the suffix>
- Exceptions: <none, or approved naming/tagging exceptions and existing/shared resource boundaries>

Resolve the version from the actual SQL Apps plugin manifest, not the app/DAB version. Preserve customer tags and existing names; group tags are not inherited. Metadata only: no runtime telemetry, data access, or added monitoring resources. Local-only delivery needs no Azure attribution checks.

## Complete topology and cost boundary

Before cloud work, assess the required topology together; no preselected paid SKU. Record the current official evidence and actual subscription/region eligibility in this brief or the linked specialist-owned plan.

| Component | Service/SKU and compatibility evidence | Cost class, limits, and quota-stop/overage behavior |
| --- | --- | --- |
| Frontend / necessary custom server | <runtime, routing, sleep/restart, TLS> | <free SKU / free offer with enforced quota stop / metered allowance / paid> |
| DAB | <runtime host, packaged version, process/port support> | <limits and behavior> |
| SQL | <free-offer eligibility, storage/backup/network compatibility> | <useFreeLimit: true; freeLimitExhaustionBehavior: AutoPause for zero-spend SQL> |
| Authentication | <provider, roles, trusted identity path, tier requirements> | <limits and behavior> |
| Build/publication | <build and artifact/publication path> | <limits and behavior> |
| Supporting resources | <required resources, or explicitly none> | <logs, storage, secrets, network/egress, backups, domains> |

- Approved topology / plan: <local-only by default; one concise cloud review of target/resources, costs, security changes and uncertainty when requested>
- Accepted decisions: <component-specific approval scope/limits; B1 hosting approval must preserve SQL-free requirements>
- Findings and next action: <confirmed incompatibility / missing evidence / recoverable tooling failure; bounded investigation, next safe engineering action and precise approval needed>
- Paid alternatives: <separate options and complete costs only if needed; no implicit authorization>

Trials, credits, consumption grants, and budget alerts do not guarantee zero spend. Idle SQL auto-pause alone is not monthly free-limit AutoPause. Stop unapproved cloud writes, not safe engineering or authorized read-only investigation; preserve the local DAB app. Present paid alternatives separately for explicit user approval; do not upgrade or weaken the architecture automatically.

## Architecture and cost acceptance

- Real workflow: <UI-to-DAB-to-SQL save/reload and sanitized request/runtime evidence>
- Authorization: <denied direct DAB operations, allowed positive controls, unauthenticated/forged-role checks>
- SQL rules: <invariant-breaking and concurrent requests rejected atomically, no bypass or partial writes>
- Local usability: <documented start/restart for UI, DAB, SQL, and any necessary custom server>
- If deployed: <repeat at deployed origin; read back actual SKUs, SQL free-limit flags, supporting meters and overage settings against the approved topology; verify actual resource tags and names against the recorded attribution choices and exceptions>

## Design and migration intent

- Visual direction: <audience, tone, typography, distinguishing detail>
- UI: Tailwind v4 semantic tokens, Radix, Lucide; accessible light/dark and responsive states.
- Layout: npm workspaces for frontend, data (SQL and DAB configuration), shared contracts, and a custom server only when needed.
- Service configuration: `rayfin/rayfin.yml`, `dialect: mssql`; not executed by SQL Apps or proof of a running Rayfin runtime.
- Optional capabilities and migration gaps: <what is actually implemented, explicitly deferred, or unaligned>

<Record any explicitly accepted deviation and its support implications. Do not store secrets, execution status, or approval tokens here.>
