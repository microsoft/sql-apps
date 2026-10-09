---
name: sql-apps-cloud-preview
description: "Use when preparing SQL Apps for Azure deployment, reviewing cloud prerequisites or billable resources, checking configuration, or planning a what-if without deploying. Uses this project's existing Azure CLI and Bicep orchestration."
---

# Prepare a cloud deployment without deploying

SQL Apps is a standalone project with its own runtime and workflow. Use only SQL Apps skills and project-owned commands for SQL Apps work. Do not disable or modify other installed plugins.
Confirm the intended SQL Apps application directory before edits. Do not infer a directory from another plugin, session title or conversation history. If the active project is unrelated or the target is unclear, ask which directory to use; do not convert or overwrite it.

Sharing is the optional final stage of `docs/guides/build-your-app.md`, not a prerequisite for local success. Do not initiate cloud preparation during beginner onboarding unless the user requests it. Recover the agreed brief with the bound launcher's `guide`; local checkpoints are historical, not deployment consent or cloud readiness.

Select the approved application profile before choosing a cost command: capabilities, synthetic/real data and anonymous/role-authorized access. Keep preparation tied to the same new application checkout and agreed scope. Read `docs/guides/sharing.md` and state support before proposing a template:

| Approved profile | Current support and gap |
| --- | --- |
| Anonymous synthetic public demo | Demo-only cost/preflight and minimal templates exist; guided publication/deployment is incomplete. |
| Authenticated full foundation | Existing deployment commands include Functions, storage, Key Vault and private networking; review that full stack's paid resources and identity requirements. |
| Role-authorized data-only domain app | Explicit `role-based-data` supports matching cost review, two-image publication, authorized roles/assignments and resumable private SQL deployment. Domain workflows and live acceptance remain required. |

Do not substitute the full foundation or anonymous demo for the last profile. Read `docs/reference/role-based-data.md`; run offline `role-based-cost <explicit-cost-config>` after the approved build. Zero-spend exits 2 for paid S0/private infrastructure; unknown regional prices are not zero. Use a role-based-data configuration for existing `validate`, `artifacts`, `identity`, `plan`, `provision`, `deploy`, `status` and `schema` commands. `role-based-assign` is a separately authorized directory write; `role-based-smoke` verifies real authorized/unauthorized user procedure access, not browser order-save acceptance. No command or cost acknowledgement grants deployment consent.

Lead with free-tier-first: recurring allowances, not trial credits or guaranteed zero charges. For the approved synthetic public-demo profile only, read `docs/reference/demo-cost.md` and run offline `npm run azure -- demo-cost <explicit-cost-config>` after the approved build. Its output is demo-only, never the cost model for a role-authorized app. The zero-spend example exits 2 for ACR Basic/managed-network fixed charges. Stop for free-only intent; never weaken SQL access or switch to paid resources silently. Authenticated profiles need a review of their actual resources/prices; unavailable estimates remain unknown. A saved `costPreference` is not spending approval.

For a new demo SQL database, require explicit `free-paused` or `paid-reviewed` policy. Free-paused sets `useFreeLimit: true` with `AutoPause`; it must fail on unavailable eligibility/region/slots, never retry as paid. Ordinary paid-reviewed SQL is distinct from irreversible free-tier paid continuation. Never enable `BillOverUsage` or change an existing database from this review.

Explain in everyday terms who can open the app, whether its information is synthetic or real, and which access controls are needed. Before cloud writes, present the exact target, resources, recurring cost assumptions, public exposure and cleanup path. If a price is unavailable, say so and provide the pricing review needed; do not invent an estimate or imply scale-to-zero makes every resource free. Retain target/what-if review and separate approvals. Anonymous demos are synthetic-only; real data requires the authenticated application's separate identity review.

The review does not query actual usage or configure alerts. Review SQL remaining free amount, shared subscription compute grants and actual/forecast costs in both app and managed infrastructure groups after approved deployment. Budgets are delayed alerts, not hard spending caps. Introduce paid capacity for measured exhaustion, latency/availability or data/recovery requirements, not a user-count threshold. Cleanup/export is separately reviewed; do not delete resources/data automatically.

Identify the loaded skill source, installed launcher and application checkout separately. Resolve `../../scripts/sql-apps.mjs` relative to this installed skill and run `node "<absolute-script-path>" home`. Confirm this is the requested new application, not merely the foundation binding; select explicit `SQL_APPS_HOME` when needed. Exported skill-copy edits do not update installed instructions. Read `docs/reference/deployment.md`, `docs/maintainers/operations.md`, and `README.md` in the confirmed checkout before selecting commands.

Use `npm run azure -- help` and the existing Azure CLI/Bicep orchestration. Do not invent CLI verbs or implement another login/deployment engine. Validate the selected configuration using documented commands. Treat profile/subscription/resource group/image/identity selections as user decisions.

Run the launcher's read-only `workspace-check` before preparing cloud commands. If active and bound checkouts/worktrees differ, require an explicit `SQL_APPS_HOME` selection; do not transfer uncommitted source or silently update the binding. Confirm the selected application and current source/build provenance before building or publishing its artifacts.

**Existing-resource discovery must not change the deployment subject.** With approved read-only Azure access, classify older matching resources as potential collisions and leave them untouched. Keep the new checkout/configuration/artifacts as the source unless reuse is explicitly requested, then separately review compatibility, migration, cost and writes. Discovery is not permission to reuse, price the old stack as the new app, rename/delete resources or pivot deployment away from the agreed application.

Distinguish account email from tenant ID: an email address is not a tenant identifier. If one is supplied instead, explain that difference and the smallest authorized next step (confirm the intended directory's tenant ID or retrieve it with an approved read-only account query). Do not loop through generic login steps or change subscription defaults.

For application-role authorization, follow the application skill's end-to-end checklist: role definition, application role assignment, token claims, trusted gateway-selected DAB role and procedure permissions. `identity` creates the configured human role for `role-based-data`; the foundation retains `Function.Invoke`. Require explicit registration/assignment approval and verify real cloud sign-in/custom-role forwarding separately from local simulation.

**Preparation is not deployment approval.** This skill must not create resources, register Entra apps, assign roles, publish SQL, build/push cloud artifacts, or alter subscription selection without explicit user authorization. A what-if may need Azure access; confirm the target and permission before running it. Keep secrets out of chat, files committed to Git, and client configuration.

The default full template includes billed EP1/S0/private-endpoint/always-on resources. Explicit `role-based-data` excludes Functions/storage/Key Vault but retains paid S0, private SQL/networking, registry and minimum-one-replica gateway/DAB. Neither is guaranteed free. Report the same application's preparation, reviewed costs and remaining live acceptance separately; compiled Bicep, schema validation and mocks do not prove cloud readiness or deployment completion.

For a selected public synthetic-data demo, read `docs/reference/demo-deployment.md` first. Do not require the full-foundation Entra registration, Functions, storage or private-endpoint configuration for its preparation. With explicit target/read-only Azure consent, use `npm run azure -- demo-preflight "<target-configuration>"` in the bound checkout. Its existing CLI tenant-token acquisition and in-memory ARM reads deliberately avoid dependence on default-tenant/cache discovery; it never requests Graph, changes global defaults, refreshes login, registers providers or creates resources. Explain cache, actual ARM, candidate authorization, not-yet-evaluated policy and not-evaluated costs separately. An eligible result is not deployment success. Separate minimal foundation/runtime templates compile and have resource-contract tests (`npm run infra:test-demo`); their new-database SQL billing policy is explicit and never authorizes cloud writes. Image publication, SQL identity probing and the resumable guide are still in development; never substitute the full template or report template compilation as deployment success.
