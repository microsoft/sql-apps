---
name: sql-apps-local
description: "Use when starting SQL Apps locally, launching the browser, restarting local services, or setting up subscription-free Azure SQL, DAB, Azurite and Azure Functions."
---

# Start SQL Apps locally

## A useful local app is the goal

Follow **Describe -> Run locally -> Make it yours -> Share optionally** from `docs/guides/build-your-app.md` in the intended checkout. SQL knowledge is welcome, not required. Ask about users, information and actions one question at a time, not frameworks or Azure services. Check setup/private-preview access early and summarize a small agreed scope before application edits.

After resolving the home and checking its binding below, run `node "<absolute-script-path>" guide` to recover decisions before choosing a startup path. It works before restore/build and does not start/probe services. Treat saved checkpoints as historical reports; recheck the intended runtime and real app action. With agreement, use `guide-save "<absolute-brief.json>"` to save scope, next change and exact verification evidence; never include secrets or actual records.

Do not start the full file/job demonstration for every request. Explicit reference selection uses the smaller selected-app path below. A new domain app uses the application skill and clean boundary, not an implicit example copy. Capability choices in the brief describe scope, not runtime switches; the full foundation command still starts its documented services.

After actual local verification, help the user make one useful change and verify browser validation, SQL save/reload and existing behavior. A working local app is success; Azure sharing is a separate, optional decision.

Introduce only brief cost awareness during local setup: no Azure usage bill, but tool/access/licensing conditions remain. When adding capabilities, explain relevant future costs from `docs/reference/demo-cost.md` without a cloud pricing questionnaire. The guide defaults to zero-spend guidance; saved cost preferences are not spending consent. Lead with free tier for recurring monthly allowances, not trial credits. Detailed free-tier/fixed-charge review belongs to optional sharing, not local startup.

## Beginner onboarding and consent

Do not leave a beginner with a prerequisite list. Guide one step at a time, explain the expected result and stay at the failed step until resolved. Follow `docs/guides/getting-started.md` in the intended checkout for Windows, macOS and Linux. Use the exact distribution/version's official installation page for Linux, not guessed package commands.

If Node is missing, the launcher cannot run. Confirm OS/CPU and the intended checkout using host tools; guide the official Node 22/24 installer first, preserving existing version managers. Do not require Git: the guide includes ZIP download and VS Code terminal instructions. Plugin installation is optional and Copilot still needs its own account/access.

Before EACH tool installation, ask explicit approval with its name, official source, network/disk implications and privileges. Prefer existing package managers/dedicated installation tools. Never replace an existing compatible installation, change global version-manager selection, run unreviewed remote scripts, automatically accept licenses, elevate, reboot, change Docker groups/socket permissions or disable TLS/firewalls.

Pause for human-only GUI/license/restart/credential actions; tell the user how to resume. After installs, reopen the terminal/host as needed and recheck actual versions/PATH rather than repeating installations.

State access/cost facts BEFORE downloads: no Azure subscription or Azure usage charges, but SQL is private preview requiring registry access unless cached or an existing usable container is selected. Docker Desktop license eligibility varies. Never call acquisition universally account-free or free for every organization. Direct the user to official preview signup; credentials are entered in their own terminal, never pasted into chat or repository files.

## Locate the application

Resolve `../../scripts/sql-apps.mjs` relative to **this installed SKILL.md**, not the session working directory. Use the absolute script path in every invocation and quote paths with spaces.

Run `node "<absolute-script-path>" home`. It selects `SQL_APPS_HOME`, then the installer-created binding in `COPILOT_HOME` (default `~/.copilot`), then an application checkout in the current directory or its ancestors. The binding contains only a checkout path, not credentials.

Run `node "<absolute-script-path>" workspace-check` before execution. Compare the active checkout/worktree with the bound home, source fingerprint, runtime contract and build provenance. If they differ, require the user's explicit runtime home via `SQL_APPS_HOME`; never change the global binding or copy uncommitted foundation files implicitly. Equal package versions or commits do not certify equal source. A missing/stale build needs an approved build in that selected checkout.

Do not run the application from a plugin cache or assume the user's active project is SQL Apps. If resolution fails, report the error and ask for the checkout path; instruct the user to run `npm run plugin:install` in that checkout or set `SQL_APPS_HOME`. Never silently select another project.

## Start or reuse

1. Read `README.md`, `docs/guides/getting-started.md` and `docs/reference/local-development.md` **in the resolved checkout**.
2. Run `node "<absolute-script-path>" setup-check` (or `setup-check <selected-existing-sql-container>`) before restore/build. It prints structured prerequisite/action reports using Node alone. Nonzero means action needed, including existing ports whose ownership needs confirmation, not permission to kill anything. Run `node "<absolute-script-path>" status` to assess existing HTTP services; it does not certify worker/storage correctness.
3. If healthy and confirmed to be the intended application, reuse `http://127.0.0.1:18080/`. Do not launch another gateway on the same port.
   Use the app/DAB origins reported by workspace-check for isolated workspaces; the URL above is legacy-only. Confirm `/local/workspace` when the running version exposes it, without treating HTTP health alone as ownership.
4. If startup is needed, resolve missing prerequisites using the guide and approved native installers. Ask separately before `npm ci`/build and explain internet use for first npm/NuGet/image downloads. Install dependencies only if missing or validation identifies them; build in the resolved checkout when compiled code is missing/source changed. A cached SQL image alone is not complete offline readiness.
5. Before `app`, get informed approval for container downloads/builds, SQL EULA acceptance (`ACCEPT_EULA=Y`) and application schema initialization. Explain the local resources/data effects; choose a new owned SQL container unless the user explicitly selected reuse. Run `node "<absolute-script-path>" app` as an attached task using host tools. It publishes a non-destructive schema and starts actual services. Report named startup stages; on failure preserve completed work/data and follow targeted resume guidance. Never silently reset volumes/credentials or substitute another SQL engine.
   Before first startup, run the built launcher's `workspace-plan`; ask explicitly for a new isolated port block or `workspace-init legacy` to preserve an existing stack. Explain that initialization records only the descriptor, does not migrate data, and does not authorize subsequent downloads/schema changes. A copied descriptor is an error, not permission to overwrite it.
6. Open the browser and explain Development Alice/Bob, files, processing, retries and traces. Local identities are simulations, never production authentication. The Todo reference example is isolated outside application delivery; do not copy it into a user's application.

For an already running alternate SQL container, validate the user-selected name and run `verify` before approved `init`, `data`, `services`, then `serve` with that name. These commands execute in the bound checkout. Do not replace, delete or stop unrelated/user-owned containers.

`serve` reuses running services. `stop-services` stops the project worker/storage and preserves data. Stopping the attached gateway process does not erase SQL/Blob volumes.

No Azure subscription or Entra registration is required for local operation. First-time downloads need internet; do not claim everything is offline before prerequisites are cached. Do not deploy cloud resources, install unverified platform packages, or scaffold another runtime.

## Explicitly selected synthetic application

Only when the user explicitly chooses the reference application, read its `examples/todo/README.md` in the bound checkout. Keep the root `selectedExamples: []` and other applications sample-free. Ask for isolated workspace selection and the same download/EULA/schema consent as above; never reuse a legacy descriptor or change the global binding implicitly.

Run `npm run app:build -- todo local-simulation` in that bound home, and retain the exact absolute artifact directory printed by the builder. Use `node "<absolute-script-path>" selected-app "<absolute-artifact-directory>"` as an attached task. This starts only the selected SQL database/login and DAB plus browser/API, not storage or Functions. The gateway checks actual selected procedure readiness before reporting its origin.

Explain anonymous synthetic sessions and the conspicuous data warning; there are no Alice/Bob or signed-in users in this adapter. With separate approval for synthetic writes, `selected-test "<absolute-artifact-directory>"` runs the reference's real SQL/HTTP limits/ownership suite and removes its own synthetic fixtures. It does not prove browser or restart behavior; check those separately when authorized.

Ctrl+C stops only the attached gateway. `selected-serve "<absolute-artifact-directory>"` resumes using verified services and SQL-backed sessions. `selected-stop todo` removes only the selected owned DAB container and preserves SQL data. Do not use foundation `stop`/`stop-services` to clean a selected app or silently replace a mismatched DAB configuration. Public-demo assembly is not authorization or evidence of Azure deployment.

## Verify and explain completion

Verify `/health/ready` and open the browser. With permission, perform a small test-file processing roundtrip and observe completion/results; HTTP liveness alone is not end-to-end acceptance. Offer cleanup of only that fixture. Full `services-test` briefly restarts owned services and needs separate approval when others may be processing. Report exactly what passed and any unverified capability/platform; do not claim fresh-machine macOS/Linux/ARM acceptance from simulated tests.

Show the browser URL, how to choose the local user, Ctrl+C to stop the gateway, `serve` to resume and safe service-stop commands. Explain that SQL/Blob data persist and local sessions must be reselected after gateway restart. Leave the user with a usable app or an explicit next human action, never a success claim while waiting on access/restart/downloads.
