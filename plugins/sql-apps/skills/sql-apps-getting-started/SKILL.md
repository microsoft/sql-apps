---
name: sql-apps-getting-started
description: "Use when a beginner is starting a SQL Apps project, shaping an app idea, or choosing the next local-first step."
---

# SQL Apps

Resolve and quote `../../scripts/sql-apps.mjs` from this skill, not cwd.
`SQL_APPS_HOME` explicitly selects the app; otherwise use the nearest app.
Input `docs/...` belongs to that app, not the plugin cache.
Use `sql-apps-application` as the authoritative project-creation contract.
Never edit foundation/plugin or other plugins.

Follow **Describe -> Run locally -> Make it yours -> Share optionally**.

## Describe

Use the explicitly selected verified archive CLI's `guide` before restore, then `npm run guide`.
Reuse saved product decisions; they are not readiness or permission. Read only this stage's guide.
Ask one outcome-focused question about missing users, information or actions at a
time; summarize exclusions. Never ask beginners to choose frameworks, Azure
services or topology.

## Route the work

- Route every new user-facing app and meaningful UI change through `sql-apps-design`.
  It owns the design pass; no companion skill is required.
- `sql-apps-application`: domain scope, code and access rules.
- `sql-apps-local`: prerequisites, approval and lifecycle.
- `sql-apps-validation`: checks and evidence.
- `sql-apps-diagnostics`: an existing failure or slow read.
- `sql-apps-cloud-preview`: requested publishing, pricing or cloud readiness.

Load only the current stage until its command/blocker is known.

## Finish locally

First value is one persisted domain workflow, not readiness; build it first.
After authorized startup, use `sql-apps-validation`: real browser action,
SQL save/reload, invalid-save error, required rendered review.

Exclude secrets/real records from briefs. Local success needs no Azure.

Missing preview access must not stop 5x5. Let `sql-apps-local` offer container ->
Azure SQL -> Windows x64 SQL Server 2025 Express with host DAB, separate
approvals and sticky targets. Never claim unobserved checks passed.
