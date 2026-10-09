---
name: sql-apps-cloud-preview
description: "Use when preparing SQL Apps for Azure deployment, reviewing cloud prerequisites or billable resources, checking configuration, or planning a what-if without deploying. Uses this project's existing Azure CLI and Bicep orchestration."
---

# Prepare a cloud deployment without deploying

SQL Apps is a standalone project with its own runtime and workflow. Use only SQL Apps skills and project-owned commands for SQL Apps work. Do not disable or modify other installed plugins.
Confirm the intended SQL Apps application directory before edits. Do not infer a directory from another plugin, session title or conversation history. If the active project is unrelated or the target is unclear, ask which directory to use; do not convert or overwrite it.

Sharing is the optional final stage of `docs/guides/build-your-app.md`, not a prerequisite for local success. Do not initiate cloud preparation during beginner onboarding unless the user requests it. Recover the agreed brief with the bound launcher's `guide`; local checkpoints are historical, not deployment consent or cloud readiness.

Read `docs/reference/demo-cost.md`. Lead with free-tier-first: recurring monthly allowances, not time-bound trial credits or a guarantee of zero charges. Use "free offer" only to identify Microsoft's official enrollment/documentation terminology. Before Azure requests, run the offline `npm run azure -- demo-cost <explicit-cost-config>` after the approved build. The zero-spend example intentionally exits 2 because ACR Basic and managed-network infrastructure have fixed charges. Stop at that blocker for a free-only intent; do not provision, weaken SQL access or silently switch to paid resources. A saved `costPreference` is not spending approval.

For a new demo SQL database, require explicit `free-paused` or `paid-reviewed` policy. Free-paused sets `useFreeLimit: true` with `AutoPause`; it must fail on unavailable eligibility/region/slots, never retry as paid. Ordinary paid-reviewed SQL is distinct from irreversible free-tier paid continuation. Never enable `BillOverUsage` or change an existing database from this review.

Explain in everyday terms who can open the app, whether its information is synthetic or real, and which access controls are needed. Before cloud writes, present the exact target, resources, recurring cost assumptions, public exposure and cleanup path. If a price is unavailable, say so and provide the pricing review needed; do not invent an estimate or imply scale-to-zero makes every resource free. Retain target/what-if review and separate approvals. Anonymous demos are synthetic-only; real data requires the authenticated application's separate identity review.

The review does not query actual usage or configure alerts. Review SQL remaining free amount, shared subscription compute grants and actual/forecast costs in both app and managed infrastructure groups after approved deployment. Budgets are delayed alerts, not hard spending caps. Introduce paid capacity for measured exhaustion, latency/availability or data/recovery requirements, not a user-count threshold. Cleanup/export is separately reviewed; do not delete resources/data automatically.

Resolve `../../scripts/sql-apps.mjs` relative to this installed skill and run `node "<absolute-script-path>" home`. Work in the resolved application checkout. Read `docs/reference/deployment.md`, `docs/maintainers/operations.md`, and `README.md` before selecting commands.

Use `npm run azure -- help` and the existing Azure CLI/Bicep orchestration. Do not invent CLI verbs or implement another login/deployment engine. Validate the selected configuration using documented commands. Treat profile/subscription/resource group/image/identity selections as user decisions.

Run the launcher's read-only `workspace-check` before preparing cloud commands. If active and bound checkouts/worktrees differ, require an explicit `SQL_APPS_HOME` selection; do not transfer uncommitted source or silently update the binding. Confirm the selected application and current source/build provenance before building or publishing its artifacts.

**Preparation is not deployment approval.** This skill must not create resources, register Entra apps, assign roles, publish SQL, build/push cloud artifacts, or alter subscription selection without explicit user authorization. A what-if may need Azure access; confirm the target and permission before running it. Keep secrets out of chat, files committed to Git, and client configuration.

The current cloud template includes billed EP1/S0/private-endpoint/always-on resources; it is not a free-tier-only template. Subscription-free local operation does not make Azure deployment free. Report costs and live-acceptance gaps; compiled Bicep, schema validation and mocks do not prove cloud readiness.

For a selected public synthetic-data demo, read `docs/reference/demo-deployment.md` first. Do not require the full-foundation Entra registration, Functions, storage or private-endpoint configuration for its preparation. With explicit target/read-only Azure consent, use `npm run azure -- demo-preflight "<target-configuration>"` in the bound checkout. Its existing CLI tenant-token acquisition and in-memory ARM reads deliberately avoid dependence on default-tenant/cache discovery; it never requests Graph, changes global defaults, refreshes login, registers providers or creates resources. Explain cache, actual ARM, candidate authorization, not-yet-evaluated policy and not-evaluated costs separately. An eligible result is not deployment success. Separate minimal foundation/runtime templates compile and have resource-contract tests (`npm run infra:test-demo`); their new-database SQL billing policy is explicit and never authorizes cloud writes. Image publication, SQL identity probing and the resumable guide are still in development; never substitute the full template or report template compilation as deployment success.
