---
name: sql-apps-getting-started
description: "Use when a beginner is starting a SQL Apps project, shaping an app idea, or choosing the next local-first step."
---

# SQL Apps

Resolve and quote `../../scripts/sql-apps.mjs` from this skill, not cwd.
`SQL_APPS_HOME` selects the app; otherwise use the nearest app.
Input `docs/...` belongs to it, not the plugin cache.
`sql-apps-application` is the authoritative project-creation workflow.
Never edit plugins/foundation.

Follow **Describe -> Run locally -> Make it yours -> Share optionally**.

## Describe

Use the explicitly selected verified archive CLI's `guide` before restore, then `npm run guide`.
Reuse saved decisions, not as readiness/permission. Read only this stage's guide.
Ask about missing users, information or actions one question at a time; summarize
exclusions. Never ask beginners for frameworks or Azure topology.

## Route the work

- Route every new user-facing app and meaningful UI change through `sql-apps-design`.
  It owns the design pass; no companion skill is required.
- `sql-apps-application`: domain scope, code and access rules.
- `sql-apps-local`: prerequisites, approval and lifecycle.
- `sql-apps-validation`: checks and evidence.
- `sql-apps-diagnostics`: an existing failure or slow read.
- `sql-apps-cloud-preview`: requested publishing, pricing or cloud readiness;
  it hands Azure work to the Azure Skills plugin, not another SQL Apps deployer.

## Finish locally

Build one persisted domain workflow first. After authorized startup, use
`sql-apps-validation`: a real browser action, SQL save/reload, invalid-save error
and required rendered browser review.

Exclude secrets/real records from briefs. No Azure needed locally.

Missing preview access never blocks 5x5. `sql-apps-local` offers container ->
Azure SQL -> Windows x64 SQL Server 2025 Express with host DAB, separate approvals
and sticky targets. Never claim unobserved checks passed.
