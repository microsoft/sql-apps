---
name: sql-apps
description: "Use when the user requests SQL Apps, asks to build a TypeScript application on Azure SQL Database with the SQL Apps profile, or wants to change, resume, verify, or deploy an existing SQL Apps project. Routes SQL and Azure work to installed specialists."
---

# SQL Apps

Configure the existing assistant; do not start an orchestration runtime.

## Establish the boundary

1. Read the [constitution](./references/constitution.md) before planning or changing an app.
2. Confirm the intended application directory. The installed plugin directory is guidance, never the destination for a generated application. Inspect an existing project before creating files or scaffolding.
3. Read existing project instructions, the app brief, source, and relevant specialist artifacts. Preserve unrelated work. An existing incompatible stack is not permission to rewrite it: explain the conflict and obtain a scoped decision.
4. Identify the actual installed skills and tools. Use host discovery; do not assume availability from a remembered name. If a required capability is missing, report the prerequisite and the installation guidance in this plugin's README. Do not install it silently or substitute another database.

## New application

- Resolve only consequential gaps: primary outcome, users/roles, workflows, data rules, and first-release scope. Recommend technical choices from the constitution rather than asking the user to choose them again.
- Use the [brief template](./templates/app-brief.md) for one concise `app-brief.md` in the application. Resolve material contradictions and confirm the brief before implementation. Explicitly delegated assumptions may be recorded; they do not authorize cloud spend or destructive actions.
- Read [Rayfin alignment](./references/rayfin-alignment.md) for package boundaries. Copy the [service template](./templates/rayfin.yml) to `rayfin/rayfin.yml` in each new app, preserving `dialect: mssql`. SQL Apps does not execute it or guarantee released Rayfin support. Document that boundary in the app README and project instructions; the filename alone does not authorize tooling or transfer workflow ownership. Keep optional services disabled unless actually required and implemented.
- Read [app design](./references/app-design.md) before UI work. Apply its technology/token conventions and record the app's visual direction in the brief.
- Integrate the constitution's project-policy block into the active host's project instruction file using the table below. Preserve existing content; update an existing SQL Apps block rather than appending duplicates. If instructions conflict, surface the conflict before proceeding. Do not merely link to the installed plugin: future conversations must retain the app policy without it.
- Check local-engine prerequisites through the SQL specialist before building around them. No suitable permitted engine means a specific blocker, not mocked or substituted persistence.
- Implement complete vertical workflows with ordinary coding tools. Scaffolding is only an intermediate step. Route specialist work using the table below.

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

| Work | Owner and boundary |
| --- | --- |
| UI, server, business rules, integration, ordinary changes | Existing assistant; stay within the constitution |
| Schema and invariants | Microsoft SQL guidance, such as `design-azure-sql-schema` |
| Driver, pooling, retries, SQL identity | Microsoft SQL guidance, such as `connect-from-typescript-and-node`; keep credentials server-side |
| Migrations | Microsoft SQL guidance, such as `schema-migrations-safely`; destructive work needs applicable approval |
| Local database | Microsoft SQL's `azuresql-db-container` guidance and its current availability/limitations |
| SQL failure | Installed SQL diagnostic guidance matched to the actual error |
| Azure deployment with explicitly selected azd or an existing `azure.yaml` | `azure-prepare` -> `azure-validate` -> `azure-deploy`, following their current prerequisites and approvals |
| Non-azd Azure onboarding | `azure-app-onboard`, which owns its complete pipeline and deployment gates |
| Azure failure, files, sign-in configuration, telemetry, secrets | Relevant installed Azure guidance, such as `azure-diagnostics`, `azure-storage`, or `entra-app-registration` |
| Missing specialist or unsupported service/stack | State the specific gap; propose an explicit exception or another product, without claiming support |

Skill names are discovery examples, not an API contract. Follow installed, version-matched guidance. Do not copy specialist instructions into SQL Apps.

**Local-only requests must not enter cloud onboarding.** Do not require Azure login, provisioning, or a deployment plan for a local finish. For requested deployment, pass the existing verified app and service boundary to one appropriate Azure workflow. Do not mix onboarding state with azd state, skip mandatory upstream steps, or treat a plan as permission to execute it.

SQL Apps is Rayfin-aligned for future migrations when supported, not a Rayfin runtime implementation. Follow the alignment reference; the supplied `mssql` intent does not prove released SQL support. Adopt Rayfin only through an explicitly requested migration using its current guidance and tooling.

## Resume or change

Read the current app brief, project instructions, code, tests, future service intent if present, and relevant specialist-owned artifacts. Inspect actual environment state rather than trusting previous completion labels. Update the brief and service intent when product/capability intent changes, implement across affected layers, and rerun affected checks. Read app-design guidance for UI changes; do not restructure existing projects just for alignment without a scoped decision. Do not introduce a SQL Apps state file or duplicate specialist state.

## Verify and hand over

Use existing project tooling and available browser/SQL tools:

1. Type-check/build and run relevant tests.
2. Exercise the primary UI workflow against the real SQL backend. Save, reload, and verify a fresh read persists the change.
3. Check invalid input and applicable role/ownership restrictions, including a denied operation with an allowed operation as a positive control.
4. Inspect essential desktop and narrow-screen states, including errors and empty results.
5. Test the documented start/restart path. Say whether the app is currently running or only verified runnable.
6. For a deployment, repeat the critical workflow at the deployed origin and report actual resources and access boundaries.
7. Check future service intent: `mssql` dialect, real enabled package paths/build commands and frontend output, no secrets or unsupported enabled capabilities. Do not run a Rayfin CLI to "validate" this proposal.

Repair in-scope failures and rerun checks. If blocked, say what failed, what remains unverified, and the next concrete action. A scaffold, a screenshot, a specialist's success message, or a successful deployment command is not application acceptance.

Leave ordinary source, migrations, configuration, tests, a concise brief, and run instructions. Report commands/checks and results without secrets. Respect host permissions; never infer permission for charges, destructive changes, or real-data movement from app approval. No custom evidence engine or SQL Apps runtime is required.
