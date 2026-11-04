---
name: sql-apps
description: "Use when the user requests SQL Apps or the SQL Apps profile to build, change, resume, verify, or deploy React/Vite and TypeScript apps on Azure SQL with DAB (default) or explicit Functions."
---

# SQL Apps

## 1. Define the workflow

Read the [constitution](./references/constitution.md), active instructions and source.
Confirm the app directory. Record outcome, users, rules, first workflow, profile,
target and blockers in the [app brief](./templates/app-brief.md).
Ask only what is needed next.

## 2. Resolve missing setup

Read [prerequisites](./references/prerequisites.md) only for missing setup.

When cloud delivery is requested at intake, start the
[read-only cloud and identity preflight](./references/prerequisites.md#early-cloud-and-identity-preflight)
alongside safe local implementation.
Do not require Azure discovery for local-only work.

## 3. Build one real vertical slice

**New app:** copy the complete
[starter](./templates/starter/README.md), including dotfiles and lockfile, to an
empty directory. Select [alternatives](./templates/alternatives/README.md) before
customization. Preserve nonempty targets; agree on another directory or scoped preparation.

**Existing app:** inspect architecture, dependencies, identity, SQL/migrations and
commands. Edit compatible React/Vite/TypeScript, Azure SQL and DAB/Functions apps
in place; scope unsupported-stack migration separately.

For explicitly requested anonymous submissions with private owner reads, use the
[public-submissions profile](./references/public-submissions.md).

Replace the sample with the SQL-backed business workflow:

- [App design](./references/app-design.md) for UI.
- [DAB customization](./references/dab-customization.md) for changed DAB entities, roles or errors.
- [Migration authoring checks](./templates/starter/deployment-migrations.md#authoring-and-first-run-checks) before custom migrations run.

## 4. Verify and hand over

Follow the copied app's [commands](./templates/starter/README.md).
Adapt acceptance to the actual business contract, not the starter's Items sample;
use the [acceptance checklist](./templates/starter/README.md#adapting-acceptance-to-the-app).
Report build/unit, API/SQL and real-provider browser results separately, with blockers.
Leave runnable source, migrations, tests and instructions.

## 5. Deploy only when requested

Read [deployment policy](./references/deployment.md) and the
[shape catalog](./references/deployment-shapes.md).
Check locked production dependency advisories; record exposure and disposition.
Do not silently upgrade dependencies or accept residual risk.
