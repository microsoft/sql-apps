---
name: sql-apps
description: "Use when the user requests SQL Apps or the SQL Apps profile to build, change, resume, verify, or deploy TypeScript applications on Azure SQL. Build one useful React/Vite workflow with the selected API (DAB by default, explicit Functions); load setup, identity, alternative architecture, and deployment guidance only when needed."
---

# SQL Apps

This skill provides guidance; generated apps run independently of it.

## 1. Understand the first useful workflow

Read the [constitution](./references/constitution.md), active project instructions
and existing source. Confirm the application directory and preserve unrelated work.
Resolve outcome, users, data/access rules and the first workflow in one concise
[app brief](./templates/app-brief.md). On intake/resume, establish new versus existing
app, selected profile, local/cloud target, missing prerequisites and authorized
scope; ask only about unresolved choices needed next. Host-instruction changes
follow the [approval policy](./references/constitution.md#approval-policy);
merge the marked block only within approved scope, preserving other instructions.

## 2. Discover only what the next step requires

Reuse recorded setup and target decisions. Inspect available tools first; group
only unknown routing choices (local/cloud and supported SQL target).
Read [prerequisites](./references/prerequisites.md) for missing setup. Discover DAB
tools only for a selected DAB profile; Functions needs its own approved toolchain.
Resolve identity through its owner before claiming sign-in works.

## 3. Build one real vertical slice

**New app:** establish an empty target, select the supported bundle, then copy the
[starter](./templates/starter/README.md), including
dotfiles and lockfile, into the app directory; never overlay an existing app.
Use [alternative templates](./templates/alternatives/README.md) only when explicitly
selecting F1 with DAB or Static Web Apps with Functions. Apply the overlay before
adapting the sample; Functions removes unchanged DAB files and retains shared SQL.
If the target contains unrelated files, preserve them and agree on another empty
directory or scoped preparation; do not treat it as a fresh starter.

**Existing app:** inspect architecture, customized source, dependencies, identity,
SQL/migration state and commands. Support is React/Vite/TypeScript with Azure SQL
and a compatible selected DAB or Functions contract, not any TypeScript app.
Establish compatibility, then edit in place without starter/profile installers.
For unsupported stacks, explain the mismatch and propose migration separately;
never implicitly convert the app or replace customized work.

For explicitly requested anonymous submissions with private owner reads, use the
[public-submissions profile](./references/public-submissions.md).

Read [app design](./references/app-design.md) before UI work. Replace the sample
with the first useful save/reload workflow through the selected API and real SQL.
Invoke installed SQL guidance for the actual task, such as
`azuresql-db-container`, `design-azure-sql-schema`, or `schema-migrations-safely`;
invoke `azuresql-db-dab` / `dab-rest-and-graphql` only for DAB. Reconcile conflicting
specialist defaults with the constitution and app decisions, not another policy copy.

## 4. Verify and hand over

Follow the copied app's [build, lifecycle and acceptance commands](./templates/starter/README.md).
Disclose builds, prerequisites, artifact selection and cleanup. The bundled Start
and acceptance require existing output and do not detect stale builds; rebuild
changed source before compiled-code tests. Test the copied
app and selected toolchain, not just this checkout or command-name mocks.
Use the [evidence gates](./references/deployment.md#evidence-gates); report observed
results and remaining checks in the app's run documentation, separately for host,
profile functionality, real-provider authentication and cloud verification.
Leave editable source, migrations, tests, the brief and usable operator instructions.
On resume inspect actual state and rerun checks affected by changes.

## 5. Deploy only when requested

Read [deployment policy](./references/deployment.md), the
[shape catalog](./references/deployment-shapes.md), and
[attribution](./references/deployment-attribution.md).
Use one app-owned `deployment.md` for target, cost and access approvals, operator steps,
adopted guidance version and results; the brief only links it and retains business
constraints. Preserve accepted decisions on handoff/resume rather than copying
reviews or opening a second deployment record.

Read [Rayfin migration guidance](./references/rayfin-alignment.md) only for an
explicitly requested migration using released tooling.
