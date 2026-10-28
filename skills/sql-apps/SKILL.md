---
name: sql-apps
description: "Use when the user requests SQL Apps or the SQL Apps profile to build, change, resume, verify, or deploy TypeScript applications on Azure SQL. Defaults to free-first DAB; explicit App Service F1/DAB and Static Web Apps/Functions deployment integrations are available."
---

# SQL Apps

Configure the existing assistant; do not start an orchestration runtime.

## Establish the boundary

1. Read the [constitution](./references/constitution.md) before planning or changing an app.
2. Confirm the intended application directory. The installed plugin directory is guidance, never the destination for a generated application. Inspect an existing project before creating files or scaffolding.
3. Read project instructions, the brief, source, and specialist artifacts. Preserve unrelated work. An incompatible stack requires a scoped migration decision, not a rewrite.
4. Discover the host/OS, actual installed SQL/DAB capabilities, and existing project decisions before asking setup questions; do not read secrets or authenticate to discover them. Follow [prerequisite routing](./references/prerequisites.md). Ask one grouped routing question only for unknown choices: local or cloud, and the applicable database option. Subscription ownership alone does not select cloud. Reuse known answers; defer detailed questions until needed. Get scoped approval before installation, configuration, or sign-in. Continue useful UI, schema, and scaffolding work while setup is pending; mark persistence and end-to-end checks incomplete. Local-only work needs no Azure CLI, sign-in, or subscription.

## New application

- Resolve only consequential gaps: primary outcome, users/roles, workflows, data rules, and first-release scope. Recommend technical choices from the constitution rather than asking the user to choose them again.
- Default greenfield requests to a small, useful proof of concept: `intent: poc` and `costPreference: free-first`. Free-first is a preference, not spend approval or a guarantee of free operation; `costPreference: zero-azure-spend` is an explicitly selected strict requirement. Change intent only for explicit production availability, scale, or compliance requirements; "deploy" alone is not such a requirement. Production intent does not authorize paid resources.
- Start empty apps from the copyable [starter](./templates/starter/README.md), including dotfiles and lockfile, after confirming identity/routing and local setup permissions. Never execute it in the plugin or overwrite an existing app. It supplies pinned DAB, portable configuration, external authentication, packaging, and acceptance commands; adapt the sample into one real UI-to-DAB-to-SQL save/reload plus denial/concurrency slice before expanding workflows. Follow [deployment guidance](./references/deployment.md) for deployment-ready delivery; cloud acceptance remains separate.
- Use the [brief template](./templates/app-brief.md) for one concise `app-brief.md` in the application, including those intent and cost fields. Resolve material contradictions and confirm the brief before implementation. Explicitly delegated assumptions may be recorded; they do not authorize cloud spend or destructive actions.
- Record the [deployment attribution](./references/deployment-attribution.md) choices in the brief: `sqlapps-version` from the actual SQL Apps plugin manifest when adopting its guidance, the final `sqlapps` naming suffix for new resources, and approved overrides/exceptions. Place environment and uniqueness tokens before the suffix. These are customer-editable infrastructure metadata, not runtime telemetry. Do not require Azure access for local-only delivery.
- Select `deployment.json` using [hosting profiles](./templates/starter/hosting.md): `container-apps/dab` default, `app-service-f1/dab`, or `static-web-apps/functions`. Preserve approved choices; live acceptance is separate.
- Read [Rayfin alignment](./references/rayfin-alignment.md) for package boundaries. Copy the [service template](./templates/rayfin.yml), or [Functions service template](./templates/rayfin.functions.yml) for Functions, to `rayfin/rayfin.yml`, preserving `dialect: mssql`. SQL Apps does not execute it or guarantee released Rayfin support. Document that boundary in the app README and project instructions; the filename alone does not authorize tooling or transfer workflow ownership. Keep optional services disabled unless actually required and implemented.
- Read [app design](./references/app-design.md) before UI work. Apply its technology/token conventions and record the app's visual direction in the brief.
- Integrate the constitution's project-policy block into the active host's project instruction file using the table below. Preserve existing content; update an existing SQL Apps block rather than appending duplicates. If instructions conflict, surface the conflict before proceeding. Do not merely link to the installed plugin: future conversations must retain the app policy without it.
- Check prerequisites for the selected API and database: local Azure SQL Database container or Azure SQL Database cloud only. If unavailable, offer preview signup or explicit cloud selection without authorizing cloud changes. Record topology/gaps; continue useful UI, schema, or scaffolding work with persistence incomplete. Never substitute SQL Server Express, on-premises databases, mock persistence, or unapproved direct-SQL CRUD.
- Implement complete vertical workflows through DAB application data APIs by default, or explicit managed Functions. Put transactional business invariants in SQL constraints or transaction-safe procedures; do not rely on UI or API validation alone. Custom Express code is not a default CRUD layer. Scaffolding is only an intermediate step.

### Durable instructions by host

| Active host | Application instruction file |
| --- | --- |
| Copilot in VS Code or Copilot CLI | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` |
| OpenAI Codex | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `AGENTS.md` |

Use the existing host-supported location when the project has deliberately configured one. Write only for the active host, not five competing copies. When changing hosts, preserve the same brief and policy; reconcile any existing copies rather than creating conflicting constitutions. Do not edit host user settings to force loading.

## Route to the owner

Invoke an installed skill/tool directly when possible. A skill is guidance, not necessarily another agent. Delegate only a bounded task that benefits from context isolation, with the project location, desired result, applicable constraints, and checks.

**Every specialist handoff**, including SQL, DAB, Azure planning, validation, deployment, and diagnostics, must carry the current brief's `intent` and `costPreference` values (by default `intent: poc`, `costPreference: free-first`), selected Azure SQL target and compatibility gaps, selected API (DAB or Functions), SQL invariants, approved topology/cost boundary, component-specific accepted decisions, and applicable acceptance checks. For Azure work, also carry the recorded `sqlapps-version`, final `sqlapps` suffix naming pattern, and approved overrides/exceptions. Include these constraints explicitly with the brief location; a link alone is insufficient. If a specialist proposes a conflicting default, stop and reconcile it before execution rather than accepting paid SKUs or silently changing the API.

| Work | Owner and boundary |
| --- | --- |
| UI, necessary custom server behavior, integration, ordinary changes | Existing assistant; data requests traverse the selected API |
| Static Web Apps managed Functions | Existing assistant and SQL guidance; validate bearer tokens, parameterize SQL, isolate ownership context per request and preserve SQL invariants; no DAB required |
| Application data APIs and DAB authorization/configuration | Microsoft SQL DAB guidance, such as `dab-rest-and-graphql` or `azuresql-db-dab`, and discovered DAB tools |
| Schema and transactional invariants | Microsoft SQL guidance, such as `design-azure-sql-schema`; enforce rules in SQL behind the selected API |
| SQL identity and any necessary driver/pooling/retry work | Microsoft SQL guidance; least-privilege DAB access, no automatic Express data API |
| Migrations | Microsoft SQL guidance, such as `schema-migrations-safely`; destructive work needs applicable approval |
| Local database | Microsoft SQL's `azuresql-db-container` guidance; preview signup or explicit Azure SQL Database cloud selection if unavailable, never an on-premises fallback |
| SQL failure | Installed SQL diagnostic guidance matched to the actual error |
| Standard PoC Azure deployment | Existing assistant using the bundled [Container Apps recipe](./templates/starter/deployment.md), Bicep, and Azure CLI; no separate onboarding workflow |
| Azure failure, sign-in, files, telemetry, secrets | Existing assistant, current first-party documentation, available CLI/API tools; preserve access/spend gates |
| Existing deployment artifacts or approved host | Preserve them; never silently migrate to the default recipe |
| Missing specialist or unsupported service/stack | State the specific gap; propose an explicit exception or another product, without claiming support |

Skill names are discovery examples, not an API contract. Follow installed, version-matched guidance. Do not copy specialist instructions into SQL Apps.

**Local-only requests must not enter cloud onboarding.** No Azure login, provisioning, or cloud plan is required; local packaging/readiness still apply. For deployment, use the bundled recipe and complete topology/cost review: public web/internal HTTPS DAB in Container Apps Consumption plus Azure SQL's free offer. Include authentication, publication, and supporting resources. Do not introduce onboarding state machinery or treat a plan as execution permission. Container Apps grants are not a spending cap; preserve strict-zero constraints.

**Guide safe progress.** Classify confirmed incompatibility, missing evidence, and recoverable tooling failure using the deployment reference's bounded recovery. Stop unapproved cloud writes, not local investigation or authorized read-only reconciliation; preserve the local app. Present paid alternatives with complete costs; explicit approval is required for changed spend, access or destructive scope. Do not silently remove authorization, SQL invariants, or the selected API to fit a free tier. DAB is optional only through the explicit Functions profile. Retain accepted decisions, such as B1 hosting with SQL still free, without reopening unchanged choices.

Maintain one deployment review of resources, costs, security, decisions, uncertainties, next action and approvals. Implementation approval covers routine non-destructive local build/test and packaging under host permissions; cloud writes, spend, access and destructive actions need explicit approval. Cloud acceptance remains unverified: disclose gaps, not unsupported architecture or false certification.

SQL Apps is Rayfin-aligned for future migrations when supported, not a Rayfin runtime implementation. Follow the alignment reference; the supplied `mssql` intent does not prove released SQL support. Adopt Rayfin only through an explicitly requested migration using its current guidance and tooling.

## Resume or change

Read the brief, instructions, code, tests, service intent and specialist artifacts. Inspect actual state, not completion labels. Preserve intent, strict-zero requirements and accepted decisions; backfill PoC/free-first only without contradictions. Do not migrate an existing zero-spend choice silently. Surface conflicts before cloud writes. Update changed decisions and rerun affected checks. Existing direct-SQL apps need scoped migration, not silent rewriting, alignment-only restructuring or SQL Apps execution state.

Preserve supported Azure SQL target and setup decisions; do not repeat onboarding or switch local/cloud silently. If an older project records an on-premises fallback, explain the profile conflict and obtain migration scope before changing it; never install or extend that fallback. Before moving from the container to cloud, check feature compatibility and rerun migrations, DAB authorization, SQL invariants/concurrency, persistence, and restart against the actual cloud target.

Preserve the recorded `sqlapps-version`, suffix naming pattern, and approved overrides/exceptions. A newer installed plugin must not relabel old infrastructure. Change the version only through intentional guidance/infrastructure adoption; do not infer missing provenance from the currently installed version or reattribute existing/shared resources without explicit scope approval. Resolve missing provenance or record an approved exception before claiming attribution validation.

## Verify and hand over

Use existing project tooling and available browser/SQL tools:

1. Type-check/build and run relevant tests.
2. Exercise the primary UI workflow through the selected API against real SQL. Save, reload, and verify a fresh read persists the change. Record the actual request route and corresponding API runtime request/log evidence without secrets. A config file or unused process is not proof that the app uses the API.
3. Check invalid input and role/ownership restrictions at DAB directly as well as through the UI/custom server for DAB profiles, or directly at Functions for that profile, with a denied operation and an allowed positive control. Test unauthenticated and forged-role attempts where applicable; do not trust client-supplied identity headers.
4. Attempt invariant-breaking writes through the selected API, including concurrent conflicts. Verify SQL rejects them atomically with no partial change; check all write permissions for bypasses.
5. Inspect essential desktop and narrow-screen states, including errors, empty results, and explicit quota/sleep/unavailable states rather than success-shaped fallbacks.
6. Test reproducible packaging and start/restart for UI, selected API (pinned DAB where used), SQL migrations/permissions, and necessary server; inspect portable configuration and cloud authentication/routing. Document recipe/version and gaps. Say whether the app is running or only runnable; deployment-ready does not mean deployed.
7. For a deployment, repeat the selected API, authorization, and SQL-invariant checks at the deployed origin. Read actual resource settings back from Azure and compare them with approved topology/costs, including SQL `useFreeLimit: true` and `freeLimitExhaustionBehavior: AutoPause`. Verify every hosting/supporting SKU and overage setting, not just a portal estimate or deployment template. Report any mismatch as failed acceptance; do not authorize a paid fix.
   Read back actual resource tags and names for each in-scope resource against the brief's `sqlapps-version`, final `sqlapps` suffix naming pattern, and approved overrides/exceptions. Report attribution mismatches as failed attribution validation and approved exceptions as exceptions; do not rename/replace resources, overwrite customer metadata, or add telemetry to pass.
8. Check future service intent against `deployment.json`: `mssql` dialect, real enabled package paths/build commands and frontend output, no secrets or unsupported enabled capabilities. Functions disables the Rayfin data runtime, not the SQL migration package. Do not run a Rayfin CLI to "validate" this proposal.

Repair in-scope failures and rerun checks. If blocked, say what failed, what remains unverified, and the next concrete action. A scaffold, a screenshot, a specialist's success message, or a successful deployment command is not application acceptance.

Leave ordinary source, migrations, configuration, tests, a concise brief, and run instructions. Report commands/checks and results without secrets. Respect host permissions; never infer permission for charges, destructive changes, or real-data movement from app approval. No custom evidence engine or SQL Apps runtime is required.
