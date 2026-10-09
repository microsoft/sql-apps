---
name: sql-apps-local
description: "Use when starting standalone SQL Apps locally, launching the browser, restarting local services, or setting up subscription-free Azure SQL, DAB, Azurite and Azure Functions."
---

# Start SQL Apps locally

SQL Apps is a standalone project with its own runtime and workflow. Use only SQL Apps skills and project-owned commands for SQL Apps work. Do not disable or modify other installed plugins.
Confirm the intended SQL Apps application directory before edits. Do not infer a directory from another plugin, session title or conversation history. If the active project is unrelated or the target is unclear, ask which directory to use; do not convert or overwrite it.

## A useful local app is the goal

Follow **Describe -> Run locally -> Make it yours -> Share optionally** from `docs/guides/build-your-app.md`. Ask about users, information and actions, not frameworks or Azure services. Check preview access and agree on scope before edits.

Run the resolved launcher's `guide` before selecting startup; it works before build and does not probe services. Checkpoints are historical. With agreement, use `guide-save "<absolute-brief.json>"` for scope, next change and evidence; exclude secrets/actual records.

Select startup from approved capabilities, not the foundation demonstration. Role-authorized data apps use `docs/reference/role-based-data.md`: configure the role/procedure contract, then approved `role-based-app` and `role-based-serve`. They start SQL/DAB/browser only, probe actual procedure readiness and label Alice with/Bob without the required role simulations. `serve-sql` remains an advanced SQL-only path. Never run `app`/`services` or demonstrate excluded files/jobs. The brief is not a runtime switch; the selected reference is synthetic-only.

After local acceptance, make one agreed useful change and repeat browser validation, SQL save/reload and regression checks. Azure sharing is separately approved and optional.

Keep cost awareness brief locally: no Azure usage bill, but tool/access/licensing conditions remain. Saved cost preferences are not spending consent. Profile-specific cost review belongs to optional sharing, not startup.

## Beginner onboarding and consent

Guide one step at a time; stay at a failed step until resolved. Follow `docs/guides/getting-started.md` for Windows, macOS and Linux; use official OS/version-specific installers.

If Node is missing, confirm OS/CPU and checkout; guide the official Node 22/24 installer, preserving version managers. Git is optional (ZIP works); Copilot has separate access requirements.

Before EACH tool installation, ask explicit approval with its name, official source, downloads/disk effects and privileges. Prefer native installers. Never replace compatible tools, change global version managers, run unreviewed scripts, accept licenses automatically, elevate, reboot, change Docker permissions or disable TLS/firewalls.

Pause for human-only GUI/license/restart/credential actions; tell the user how to resume. After installs, reopen the terminal/host as needed and recheck actual versions/PATH rather than repeating installations.

State access/cost facts BEFORE downloads: SQL is private preview requiring registry access unless cached or an existing usable container is selected. Docker Desktop licensing varies; acquisition is not universally account-free. Use official preview signup; credentials are entered in their own terminal, never in chat or repository files.

Explain stages before the first approval prompt: needed installs, restore, build, workspace initialization, downloads/builds and SQL terms/schema/startup, then acceptance writes. Name each scope, target/effects and remaining stages. Track approved operations; repeat only if scope changes. `npm ci` approval excludes build; workspace approval excludes launch. Bare "I approve" covers only the preceding explicit scope.

After the first approval-tool response "user unavailable" (or invisible controls), stop retrying. Explain that no approval was captured. Offer one precise ordinary chat statement with actual values: "I approve <operations> in <checkout>, including <effects>; this excludes <remaining operations>." Wait for explicit consent; tool failure is not approval. Ask one scoped question at a time.

Before SQL acceptance, say: "Startup passes `ACCEPT_EULA=Y`; there is no chat dialog." Link the [container documentation and preview access instructions](https://aka.ms/azuresqldb-container) and the applicable terms supplied with the user's preview access; if unavailable, pause for them. Explain that explicit approval to start SQL under those terms authorizes the launcher to pass that value, not blanket acceptance of other licenses.

## Locate the application

Resolve `../../scripts/sql-apps.mjs` relative to **this installed SKILL.md**, not the session working directory. Use the absolute script path in every invocation and quote paths with spaces.

Record three separate paths: loaded skill source, installed launcher resolved from it, and application checkout selected by `home`. `SQL_APPS_HOME` changes the runtime checkout, not the loaded skills. Exported skill-copy edits do not update the installed plugin; follow `docs/reference/copilot-plugin.md` and reload a fresh session from the verified source.

Run `node "<absolute-script-path>" home`: `SQL_APPS_HOME`, then `COPILOT_HOME` binding (default `~/.copilot`), then cwd/ancestors. The binding stores only a path.

Run `node "<absolute-script-path>" workspace-check` before execution. Compare checkout, binding, fingerprint, runtime contract and build provenance. Differences require explicit `SQL_APPS_HOME`; never silently rebind or copy uncommitted source. Equal commits/versions do not certify source. Missing/stale builds need approval in that checkout.

Do not run from a plugin cache. On resolution failure, report it and ask for the checkout path; use approved `plugin:install` or `SQL_APPS_HOME`, never another project silently.

## Start or reuse

1. Read `README.md`, `docs/guides/getting-started.md` and `docs/reference/local-development.md` **in the resolved checkout**.
2. Run `setup-check [selected-existing-sql-container]` before restore/build. Nonzero means action needed, not permission to kill occupied ports. `status` checks HTTP services, not worker/storage correctness.
3. Reuse only a responding service confirmed as the intended application. Use its workspace-reported origin; port 18080 is legacy-only. Confirm `/local/workspace` when available; HTTP health alone is not ownership. Proposed ports/URLs are unavailable until startup and probes succeed.
4. Resolve prerequisites with approved installers. Ask separately before `npm ci`/build; explain first npm/NuGet/image downloads. Restore only for missing dependencies; build missing/stale code in the selected checkout. Cached SQL alone is not offline readiness.
5. Before `app`, get informed approval for container downloads/builds, SQL EULA acceptance (`ACCEPT_EULA=Y`) and application schema initialization. Explain the local resources/data effects; choose a new owned SQL container unless the user explicitly selected reuse. Run `node "<absolute-script-path>" app` as an attached task using host tools. It publishes a non-destructive schema and starts actual services. Report named startup stages; on failure preserve completed work/data and follow targeted resume guidance. Never silently reset volumes/credentials or substitute another SQL engine.
   Before first startup, run the built launcher's `workspace-plan`; ask explicitly for a new isolated port block or `workspace-init legacy` to preserve an existing stack. Explain that initialization records only the descriptor, does not migrate data, and does not authorize subsequent downloads/schema changes. A copied descriptor is an error, not permission to overwrite it.
6. Open only the verified origin and explain the approved app's users/actions. Demonstrate files/jobs only when selected. Local identities are simulations, never production authentication. Do not copy the Todo reference into application delivery.

For an existing alternate SQL container, validate its selected name and run `verify` before approved `init`/`data` with that name. Use `serve-sql` for data-only scope; `services`/`serve` are for approved file/job scope. Do not replace, delete or stop unrelated/user-owned containers.

`serve` reuses running services. `stop-services` stops the project worker/storage and preserves data. Stopping the attached gateway process does not erase SQL/Blob volumes.

No Azure subscription or Entra registration is required locally. First downloads need internet. Do not deploy cloud resources, install unverified platform packages, or scaffold another runtime.

## Explicitly selected synthetic application

Only with explicit reference selection, read `examples/todo/README.md`. Keep root `selectedExamples: []`. Require isolated workspace selection and download/EULA/schema consent; never overwrite legacy state or rebind implicitly.

Run approved `npm run app:build -- todo local-simulation`; retain its exact absolute artifact directory. Run `selected-app "<absolute-artifact-directory>"` attached via the resolved launcher. It starts SQL/login, DAB and browser/API only, probes procedure readiness, and excludes storage/Functions.

Explain anonymous synthetic sessions/data warning, not Alice/Bob sign-in. With synthetic-write approval, `selected-test "<absolute-artifact-directory>"` checks SQL/HTTP limits/ownership and cleans its fixtures; browser/restart acceptance remains separate.

Ctrl+C stops the gateway. `selected-serve "<absolute-artifact-directory>"` resumes verified services/SQL sessions. `selected-stop todo` removes only owned selected DAB, preserving SQL. Never use foundation stop commands or replace mismatched DAB silently. Assembly is not Azure deployment.

## Verify and explain completion

Report four separate states: **implemented** (source), **built** (successful commands), **running** (intended server responds), and **workflow verified** (agreed browser action plus SQL persistence/reload). Publish a launch URL only after the intended server responds at that origin and `/health/ready` passes. A proposed URL is unavailable; a build/test count is not a launch. If launch or requested acceptance is blocked, report blocked, not complete; completion tooling cannot bypass these gates.

Verify only selected capabilities with approved synthetic fixtures. HTTP liveness alone is not end-to-end acceptance. For file/job scope, perform a small processing roundtrip and offer cleanup of only that fixture. `services-test` restarts owned services and needs separate approval when others may be processing. Report exact commands/results, agent-verified browser actions and remaining gaps; "I tested it" is user-reported evidence, not agent verification. Do not claim fresh-machine macOS/Linux/ARM acceptance from simulations.

Save launch evidence under the actual `run-locally` stage, and changed-workflow evidence under `make-it-yours`, not `describe`. Update completed `nextChange` with the agreed outstanding change (or explicit no-change status). Guide suggestions are historical, not live readiness: distinguish completed setup, running services and outstanding acceptance.

Show the verified URL, approved local-user flow, Ctrl+C and matching resume/stop commands (`role-based-serve` for role-based-data, `serve-sql` for advanced SQL-only, selected commands for the reference). SQL/Blob data persist; foundation sessions must be reselected after restart. Leave a usable app or a precise next action, never a success claim while startup is blocked.
