---
name: sql-apps
description: "Use when the user requests SQL Apps, asks to build a TypeScript application on Azure SQL Database with the SQL Apps profile, or wants to change, resume, verify, or deploy an existing SQL Apps project. Defaults to a free-first proof of concept with Data API builder (DAB); routes SQL and Azure work to installed specialists."
---

# SQL Apps

Configure the existing assistant; do not start an orchestration runtime.

## Establish the boundary

1. Read the [constitution](./references/constitution.md) before planning or changing an app.
2. Confirm the intended application directory. The installed plugin directory is guidance, never the destination for a generated application. Inspect an existing project before creating files or scaffolding.
3. Read existing project instructions, the app brief, source, and relevant specialist artifacts. Preserve unrelated work. An existing incompatible stack is not permission to rewrite it: explain the conflict and obtain a scoped decision.
4. Identify the actual installed skills and tools, including Data API builder (DAB) guidance and runtime prerequisites. Use host discovery; do not assume availability from a remembered name. If a capability is missing, follow [quick setup guidance](../../docs/installation.md#quick-setup-when-a-capability-is-missing): offer the host-specific install/enable steps and obtain approval before changing host or system configuration. Local-only work needs no Azure CLI, sign-in, or subscription. Never handle credentials; do not substitute another database or replace DAB with direct Express-to-SQL APIs.

## New application

- Resolve only consequential gaps: primary outcome, users/roles, workflows, data rules, and first-release scope. Recommend technical choices from the constitution rather than asking the user to choose them again.
- Default greenfield requests to a small, useful proof of concept: `intent: poc` and `costPreference: free-first`. Free-first is a preference, not spend approval or a guarantee of free operation; `costPreference: zero-azure-spend` is an explicitly selected strict requirement. Change intent only for explicit production availability, scale, or compliance requirements; "deploy" alone is not such a requirement. Production intent does not authorize paid resources.
- Make local delivery deployment-ready from the first workflow: pinned DAB, portable configuration, supported authentication, reproducible packaging for UI/custom server/DAB/SQL, and a documented cloud hosting recipe with evidence status. Follow [deployment guidance](./references/deployment.md); validate packaged runtime artifacts locally without cloud onboarding.
- Use the [brief template](./templates/app-brief.md) for one concise `app-brief.md` in the application, including those intent and cost fields. Resolve material contradictions and confirm the brief before implementation. Explicitly delegated assumptions may be recorded; they do not authorize cloud spend or destructive actions.
- Record the [deployment attribution](./references/deployment-attribution.md) choices in the brief: `sqlapps-version` from the actual SQL Apps plugin manifest when adopting its guidance, the final `sqlapps` naming suffix for new resources, and approved overrides/exceptions. Place environment and uniqueness tokens before the suffix. These are customer-editable infrastructure metadata, not runtime telemetry. Do not require Azure access for local-only delivery.
- Read [Rayfin alignment](./references/rayfin-alignment.md) for package boundaries. Copy the [service template](./templates/rayfin.yml) to `rayfin/rayfin.yml` in each new app, preserving `dialect: mssql`. SQL Apps does not execute it or guarantee released Rayfin support. Document that boundary in the app README and project instructions; the filename alone does not authorize tooling or transfer workflow ownership. Keep optional services disabled unless actually required and implemented.
- Read [app design](./references/app-design.md) before UI work. Apply its technology/token conventions and record the app's visual direction in the brief.
- Integrate the constitution's project-policy block into the active host's project instruction file using the table below. Preserve existing content; update an existing SQL Apps block rather than appending duplicates. If instructions conflict, surface the conflict before proceeding. Do not merely link to the installed plugin: future conversations must retain the app policy without it.
- Check local-engine and DAB prerequisites through the SQL specialist before building around them. No suitable permitted engine or DAB runtime means a specific blocker, not mocked persistence or custom CRUD as a fallback.
- Implement complete vertical workflows through DAB application data APIs. Put transactional business invariants in SQL constraints or transaction-safe procedures exposed through DAB; do not rely on UI or Express validation alone. Custom server code is only for necessary authentication, orchestration, or domain behavior, not a default CRUD layer. Scaffolding is only an intermediate step.

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

**Every specialist handoff**, including SQL, DAB, Azure planning, validation, deployment, and diagnostics, must carry the current brief's `intent` and `costPreference` values (by default `intent: poc`, `costPreference: free-first`), DAB requirement, SQL invariants, approved topology/cost boundary, component-specific accepted decisions, and applicable acceptance checks. For Azure work, also carry the recorded `sqlapps-version`, final `sqlapps` suffix naming pattern, and approved overrides/exceptions. Include these constraints explicitly with the brief location; a link alone is insufficient. If a specialist proposes a conflicting default, stop and reconcile it before execution rather than accepting paid SKUs or removing DAB.

| Work | Owner and boundary |
| --- | --- |
| UI, necessary custom server behavior, integration, ordinary changes | Existing assistant; data requests traverse DAB |
| Application data APIs and DAB authorization/configuration | Microsoft SQL DAB guidance, such as `dab-rest-and-graphql` or `azuresql-db-dab`, and discovered DAB tools |
| Schema and transactional invariants | Microsoft SQL guidance, such as `design-azure-sql-schema`; enforce rules in SQL behind DAB |
| SQL identity and any necessary driver/pooling/retry work | Microsoft SQL guidance; least-privilege DAB access, no automatic Express data API |
| Migrations | Microsoft SQL guidance, such as `schema-migrations-safely`; destructive work needs applicable approval |
| Local database | Microsoft SQL's `azuresql-db-container` guidance and its current availability/limitations |
| SQL failure | Installed SQL diagnostic guidance matched to the actual error |
| Azure deployment with explicitly selected azd or an existing `azure.yaml` | `azure-prepare` -> `azure-validate` -> `azure-deploy`, following their current prerequisites and approvals |
| Non-azd Azure onboarding | `azure-app-onboard`, which owns its complete pipeline and deployment gates |
| Azure failure, files, sign-in configuration, telemetry, secrets | Relevant installed Azure guidance, such as `azure-diagnostics`, `azure-storage`, or `entra-app-registration` |
| Missing specialist or unsupported service/stack | State the specific gap; propose an explicit exception or another product, without claiming support |

Skill names are discovery examples, not an API contract. Follow installed, version-matched guidance. Do not copy specialist instructions into SQL Apps.

**Local-only requests must not enter cloud onboarding.** Do not require Azure login, provisioning, or a cloud deployment plan for a local finish; local packaging and architectural readiness still apply. For requested deployment, use one appropriate Azure workflow and the constitution's complete topology/cost review. Evaluate hosting, DAB, SQL, authentication, build/publication, and supporting resources together. Do not mix onboarding state with azd state, skip mandatory upstream steps, or treat a plan as permission to execute it.

**Guide safe progress.** Classify confirmed incompatibility, missing evidence, and recoverable tooling failure using the deployment reference's bounded recovery. Stop unapproved cloud writes, not local investigation or authorized read-only reconciliation; preserve the local DAB app. Present paid alternatives with complete costs; explicit approval is required for changed spend, access or destructive scope. Do not silently remove authorization, SQL invariants, or DAB to fit a free tier. Retain accepted decisions, such as B1 hosting with SQL still free, without reopening unchanged choices.

Maintain one concise deployment review of target/resources, costs, security changes, accepted decisions, uncertainties, next safe action and exact approvals. Implementation approval covers routine non-destructive local build/test and packaging under host permissions; keep explicit gates for cloud writes, spend changes, access changes, and destructive actions. No exercised core recipe is yet bundled: disclose the validation gap, not unsupported architecture or false certification.

SQL Apps is Rayfin-aligned for future migrations when supported, not a Rayfin runtime implementation. Follow the alignment reference; the supplied `mssql` intent does not prove released SQL support. Adopt Rayfin only through an explicitly requested migration using its current guidance and tooling.

## Resume or change

Read the current app brief, project instructions, code, tests, future service intent if present, and relevant specialist-owned artifacts. Inspect actual environment state rather than trusting previous completion labels. Preserve explicit intent, strict-zero requirements and component-specific accepted decisions; backfill missing fields with PoC/free-first only if they do not contradict requirements. Do not migrate an existing zero-spend choice silently. Surface conflicts before cloud writes. Update the brief when intent changes and rerun affected checks. An existing direct-SQL app needs an explicitly scoped DAB migration, not a silent rewrite. Do not restructure projects merely for alignment or introduce SQL Apps execution state.

Preserve the recorded `sqlapps-version`, suffix naming pattern, and approved overrides/exceptions. A newer installed plugin must not relabel old infrastructure. Change the version only through intentional guidance/infrastructure adoption; do not infer missing provenance from the currently installed version or reattribute existing/shared resources without explicit scope approval. Resolve missing provenance or record an approved exception before claiming attribution validation.

## Verify and hand over

Use existing project tooling and available browser/SQL tools:

1. Type-check/build and run relevant tests.
2. Exercise the primary UI workflow through DAB against real SQL. Save, reload, and verify a fresh read persists the change. Record the actual request route and corresponding DAB runtime request/log evidence without secrets. A DAB config file or unused process is not proof that the app uses DAB.
3. Check invalid input and role/ownership restrictions at DAB directly as well as through the UI/custom server, with a denied operation and an allowed positive control. Test unauthenticated and forged-role attempts where applicable; do not trust client-supplied identity headers.
4. Attempt invariant-breaking writes through DAB, including concurrent conflicts where relevant. Verify SQL rejects them atomically with no partial change; ensure other exposed table/procedure permissions cannot bypass the rule.
5. Inspect essential desktop and narrow-screen states, including errors, empty results, and explicit quota/sleep/unavailable states rather than success-shaped fallbacks.
6. Test reproducible packaging and the documented start/restart path for UI, pinned DAB, SQL migrations/permissions, and any necessary server; inspect portable configuration and supported cloud authentication/routing. Document the hosting recipe/version and unverified gaps. Say whether the app is currently running or only verified runnable; deployment-ready does not mean deployed.
7. For a deployment, repeat the DAB, authorization, and SQL-invariant checks at the deployed origin. Read actual resource settings back from Azure and compare them with the approved topology and cost posture, including SQL `useFreeLimit: true` and `freeLimitExhaustionBehavior: AutoPause` for zero-spend free-offer SQL. Verify every hosting/supporting SKU and overage setting, not just a portal estimate or deployment template. Report any mismatch as failed acceptance; do not authorize a paid fix.
   Read back actual resource tags and names for each in-scope resource against the brief's `sqlapps-version`, final `sqlapps` suffix naming pattern, and approved overrides/exceptions. Report attribution mismatches as failed attribution validation and approved exceptions as exceptions; do not rename/replace resources, overwrite customer metadata, or add telemetry to pass.
8. Check future service intent: `mssql` dialect, real enabled package paths/build commands and frontend output, no secrets or unsupported enabled capabilities. Do not run a Rayfin CLI to "validate" this proposal.

Repair in-scope failures and rerun checks. If blocked, say what failed, what remains unverified, and the next concrete action. A scaffold, a screenshot, a specialist's success message, or a successful deployment command is not application acceptance.

Leave ordinary source, migrations, configuration, tests, a concise brief, and run instructions. Report commands/checks and results without secrets. Respect host permissions; never infer permission for charges, destructive changes, or real-data movement from app approval. No custom evidence engine or SQL Apps runtime is required.
