---
name: sql-apps
description: "Use when the user requests SQL Apps or the SQL Apps profile to build, change, resume, verify, or deploy TypeScript applications on Azure SQL. Build one useful React/Vite workflow with the selected API (DAB by default, explicit Functions); load setup, identity, alternative architecture, and deployment guidance only when needed."
---

# SQL Apps

Guide the existing assistant, not an orchestration runtime. Applications run
independently of this plugin.

## 1. Understand the first useful workflow

Read the [constitution](./references/constitution.md), active project instructions
and existing source. Confirm the application directory and preserve unrelated work.
Resolve outcome, users, data/access rules and the first workflow in one concise
[app brief](./templates/app-brief.md). Merge the constitution's marked block into
the active host instructions, preserving other instructions.

## 2. Discover only what the next step requires

Reuse recorded setup and target decisions. Inspect available tools first; group
only unknown routing choices (local/cloud and supported SQL target).
Read [prerequisites](./references/prerequisites.md) for missing setup. Discover DAB
tools only for a selected DAB profile; Functions needs its own approved toolchain.
Resolve identity through its owner before claiming sign-in works.

## 3. Build one real vertical slice

For an empty app, copy the [starter](./templates/starter/README.md), including
dotfiles and lockfile, into the app directory; never overlay an existing app.
Use [alternative templates](./templates/alternatives/README.md) only for explicitly
selected F1/DAB or Static Web Apps/Functions. Apply the overlay before adapting the
sample; Functions removes verified-unmodified DAB-only files and retains shared SQL.
Existing out-of-profile apps need a scoped migration decision.

Read [app design](./references/app-design.md) before UI work. Replace the sample
with the first useful save/reload workflow through the selected API and real SQL.
Invoke installed SQL guidance for the actual task, such as
`azuresql-db-container`, `design-azure-sql-schema`, or `schema-migrations-safely`;
invoke `azuresql-db-dab` / `dab-rest-and-graphql` only for DAB. Reconcile conflicting
specialist defaults with the constitution and app decisions, not another policy copy.

## 4. Verify and hand over

Follow the copied app's [build, lifecycle and acceptance commands](./templates/starter/README.md).
Build explicitly before Start, compiled-code tests and acceptance. Test the copied
app and selected toolchain, not just this checkout or command-name mocks.
Report observed results and remaining checks in the app's run documentation.
Leave editable source, migrations, tests, the brief and usable operator instructions.
On resume inspect actual state and rerun checks affected by changes.

## 5. Deploy only when requested

Read [deployment policy](./references/deployment.md), the selected
[hosting recipe](./templates/starter/hosting.md), and
[attribution](./references/deployment-attribution.md).
Use one app-owned `deployment.md` for target/cost/access approvals, operator steps,
adopted guidance version and results; the brief only links it and retains business
constraints. Preserve accepted decisions on handoff/resume rather than copying
reviews or opening a second deployment record.

Read [Rayfin migration guidance](./references/rayfin-alignment.md) only for an
explicitly requested migration using released tooling.
