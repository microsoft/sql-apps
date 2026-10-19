---
name: sql-apps-getting-started
description: "Use when a beginner is starting a SQL Apps project, shaping an app idea, or choosing the next local-first step."
---

# SQL Apps

Resolve and quote `../../scripts/sql-apps.mjs` from this skill, not cwd.
`SQL_APPS_HOME` selects the app; `SQL_APPS_FOUNDATION_HOME` retains bootstrap tooling.
Input `docs/...` belongs to that app, or foundation before creation.
Create via `projects create "<name>"`; use generated commands afterward.
Never edit the foundation/plugin or other plugins.

Follow **Describe -> Run locally -> Make it yours -> Share optionally**.

## Describe

Before restore, use the installed launcher's `guide`; afterward, `npm run guide`.
Review installed-tooling setup approvals after bootstrap restore. Saved decisions
are historical, not readiness or permission. Read only the current stage's guide.
Ask one outcome-focused question about missing users, information or actions at a
time; summarize exclusions. Do not ask beginners to choose frameworks, Azure
services or topology.

## Route the work

- Route every new user-facing app and meaningful UI change through `sql-apps-design`.
  It owns the design pass; no companion skill is required.
- `sql-apps-application`: domain scope, code and access rules.
- `sql-apps-local`: prerequisites, approval and lifecycle.
- `sql-apps-validation`: checks and evidence.
- `sql-apps-diagnostics`: an existing failure or slow read.
- `sql-apps-cloud-preview`: requested publishing, pricing or cloud readiness; owns the bundled publisher.

Load only the needed stage; stop gathering context once its command or blocker is known.

## Finish locally

After authorized startup, use `sql-apps-validation`: verify a real browser action and SQL save/reload, plus required rendered browser review for new apps/meaningful UI changes. Follow its evidence/reporting contract; never claim unobserved checks passed.

Exclude secrets/real records from briefs. Local success does not require Azure.

Missing preview access must not stop 5x5. Let `sql-apps-local` offer container ->
Azure SQL -> Windows x64 SQL Server 2025 Express with host DAB, separate
approvals and sticky targets. Never claim unobserved persistence.
