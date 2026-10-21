# Install and use the SQL Apps plugin

One package, [plugins/sql-apps](../../plugins/sql-apps), contains all seven
skills and the dependency-free launcher. The repository root contains catalogs,
not another plugin. Installing skills does not install the application runtime,
publish npm tooling, grant setup permissions, or deploy resources.

## Optional guidance over the CLI workflow

The [CLI-first getting-started guide](../guides/getting-started.md) installs an
explicitly verified archive into a dedicated directory. Its bundled factory can
create an independent app without a foundation clone or a plugin. This bootstrap
flow targets the unreleased v0.1.0 candidate.

Before app restore, an assistant can run that explicitly selected archive CLI by
absolute path from the app directory. Plugin `projects` commands use the
explicit tooling selection documented below; the plugin does not download, bind or
register an archive CLI automatically. With no restored pin and no foundation,
its launcher reports an explicit blocker and points to the archive CLI route.
After restoring the app's exact local pin, restart the assistant in the app
directory: normal project detection selects that package without a foundation
binding. A contributor checkout can also be explicitly selected for development.

## Assistant support

| Surface | Packaging and evidence |
| --- | --- |
| Claude Code | Native manifest in the canonical bundle; strict validation and isolated seven-skill discovery gated with CLI `2.1.296`. |
| GitHub Copilot CLI | Portable manifest; isolated marketplace install and seven-skill discovery gated with CLI `1.0.98`. App discovery additionally needs verification in the user's actual profile. |
| Codex (OpenAI) and Cursor | Their documentation supports the portable Agent Plugins package. Codex presentation metadata lives under `extensions["com.openai"]` in [plugin.json](../../plugins/sql-apps/plugin.json), and [.agents/plugins/marketplace.json](../../.agents/plugins/marketplace.json) is the repo marketplace. Native loaders have not been verified here. |
| Gemini CLI | Native extension manifest inside the same bundle; documented local-directory installation, but loader behavior has not been verified here. |
| Other assistants | Use the provider-neutral project guides. This is not a claim of native plugin integration. |

The release checks below validate loaders, not model behavior or live application
acceptance. A missing or incompatible CLI is a blocker, not a passing check.

## Progress in chat and native previews

Creation only scaffolds the archive-bound app and its Git repository. It does
not start a helper, listener, service or browser. Browser flags are not accepted.

Progress stays in chat through structured `setup plan`/`setup status` output. For actual
app interaction and rendered review, prefer the host's available, authorized
in-app browser/preview tools at the verified application origin. Reuse only the
matching session; a browser tool that controls external Chrome is not
necessarily an embedded preview. Native tools, permissions and localhost
reachability vary by host and session.

Discover the supported open/list operation and the handle required by
inspection/actions before relying on automation. Opening a preview alone does
not establish that it is controllable; never substitute an instance ID for a
missing page handle.

If no suitable tool is available, continue authorized headless work and name
the unobserved workflow/design evidence. Never silently open an external browser
or install tools/change settings. An explicit external-opening request is a
separate browser action, only at the verified running app origin.

These are portable workflow preferences, not a guarantee that every host
provides embedded UI or follows every instruction. [VS Code browser tools](https://code.visualstudio.com/docs/agents/run/browser-tools)
and [Claude Cowork's built-in browser](https://support.claude.com/en/articles/16607400-use-the-built-in-browser-in-claude-cowork)
document host capabilities, not this plugin's tested integration.
[GitHub Copilot app canvases](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions)
and [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps) are separate
extension mechanisms; SQL Apps does not add one here. The loader evidence above
does not establish Copilot-app or Claude-Desktop browser behavior.

## Install in Claude Code

```powershell
claude plugin marketplace add microsoft/sql-apps
claude plugin install sql-apps@sql-apps-skills
claude plugin list --json
claude plugin details sql-apps
```

Start a fresh Claude session and invoke `/sql-apps:sql-apps-getting-started`,
or describe the SQL Apps task naturally. The other commands use the same
`/sql-apps:<skill-name>` namespace. No hooks or MCP servers are required.

For plugin-driven creation or pre-restore checks, explicitly select the verified
archive package directory before launching Claude:

```powershell
$env:SQL_APPS_TOOLING_HOME = "C:\tools\sql-apps-0.1.0\package"
claude
```

Use the [project guide](projects.md) to create an independent application.
`projects` commands use `SQL_APPS_TOOLING_HOME`; a generated application is not
a project factory.
Once created, set `SQL_APPS_HOME` to that app's
absolute path and open it; retain `SQL_APPS_TOOLING_HOME` for pre-restore
`guide` and `setup plan` from any directory. This independent selection never
changes the runtime home. After restore, the app's pinned installed tooling wins.
Do not run the Copilot-specific installer merely to configure Claude.

For local plugin development, load only the canonical directory:

```powershell
claude --plugin-dir "C:\git\sql-apps\plugins\sql-apps"
```

After edits, use `/reload-plugins` or restart. Local directory sources load in
place; remotely installed packages use cached versions. Release a changed plugin
version to update remote copies, then run `claude plugin update sql-apps@sql-apps-skills`
and reload/restart. The native manifest supplies Claude's version; its catalog
entry deliberately does not duplicate it. The portable manifest must match.

To remove Claude's plugin, run `claude plugin uninstall sql-apps@sql-apps-skills`.
This does not delete the separate foundation, generated apps, or SQL data.

## Verify the package and loaders

From the foundation checkout:

```powershell
npm run plugin:check
npm run plugin:check:claude
npm run plugin:check:copilot
```

The native checks require the pinned CLIs above, provisioned explicitly on PATH.
An npm shell shim is not a native executable on Windows. Pass the absolute
package `bin` entrypoint as an optional argument: native binaries run directly;
JavaScript entrypoints run through the current Node executable, without a shell.
For an npm-installed Copilot CLI:

```powershell
$packagePath = Join-Path (npm root --global) '@github' 'copilot'
$manifest = Get-Content -Raw (Join-Path $packagePath 'package.json') | ConvertFrom-Json
npm run plugin:check:copilot -- (Join-Path $packagePath $manifest.bin.copilot)
```

For Claude, select the `@anthropic-ai` / `claude-code` package and
`$manifest.bin.claude` instead. CI resolves these entrypoints from the pinned
packages on both operating systems rather than relying on npm shims.

If PATH contains different CLI versions, keep the strict version gates and
install the pinned tools in a separate directory instead of upgrading or
downgrading your everyday CLIs. On Windows, explicitly provision and run them
from the foundation checkout:

```powershell
$loaderTools = Join-Path $env:LOCALAPPDATA 'sql-apps\plugin-loader-clis'
npm install --prefix "$loaderTools" --no-save --package-lock=false --no-audit --no-fund @anthropic-ai/claude-code@2.1.296 @github/copilot@1.0.98
if ($LASTEXITCODE -ne 0) { throw 'Pinned loader CLI installation failed.' }

$packages = @{
  claude = '@anthropic-ai\claude-code'
  copilot = '@github\copilot'
}
foreach ($loader in @('claude', 'copilot')) {
  $packagePath = Join-Path $loaderTools "node_modules\$($packages[$loader])"
  $manifest = Get-Content -Raw (Join-Path $packagePath 'package.json') | ConvertFrom-Json
  $entrypoint = (Resolve-Path -LiteralPath (Join-Path $packagePath $manifest.bin.$loader)).Path
  npm run "plugin:check:$loader" -- "$entrypoint"
  if ($LASTEXITCODE -ne 0) { throw "$loader native loader check failed." }
}
```

The tools persist at that dedicated location for subsequent runs; rerun just the
loop to verify again. This does not change PATH or global installations.
Without an explicit entrypoint, the checks still use PATH and intentionally
reject mismatched versions. Keep these pins aligned with `loaderVersions` in
[check-plugin-loaders.mjs](../../scripts/check-plugin-loaders.mjs).

They use disposable profiles and copied bundles, remove their fixtures, and make
no model calls. They do not upgrade tools, use the real profile's credentials,
create a runtime binding, or start services. Their stdout records source,
version, inventory and (for Claude) projected token cost; CI retains that output.
CI is configured to run the same checks on Windows and Linux. A copied bundle is
not proof of a remote GitHub-install canary.

The observed Windows Claude `2.1.296` baseline is seven skills and **~267
always-on tokens**, with individual on-invoke estimates of ~370 tokens to ~1.1k.
These are loader estimates, not billed usage or measured behavioral improvement.
Existing source-word budgets remain unchanged. The
[evaluation playbook](../maintainers/agent-evaluations.md) records discovery
boundaries and a separately approved, local-only model-evaluation follow-on;
normal installation, tests and CI never initiate that spend.

Skill-relative launcher paths are resolved from the loaded `SKILL.md`, not cwd.
Use quoted absolute launcher paths; its `home` command identifies the app.
Input `docs/...` belongs to that selected app, or to the explicitly selected
foundation before creation, not the plugin cache.

## Copilot installation and use

The SQL Apps plugin adds project-specific skills to GitHub Copilot. Installing its skills and launcher does not require npm publication, an Azure subscription, or another platform plugin. Copilot itself still requires its normal account/access and network connectivity; the local application does not call cloud APIs after prerequisite downloads.

## Install from GitHub

Register the repository marketplace and install the dedicated plugin:

```powershell
copilot plugin marketplace add microsoft/sql-apps
copilot plugin install sql-apps@sql-apps-skills
```

This installs the manifests, seven skills and launcher, not the application runtime or project factory. A listing in the default Copilot marketplace requires separate upstream review; registering this repository does not create that listing.

For plugin-driven creation, explicitly select the verified archive package in
the terminal used to launch Copilot. Do not replace a remote marketplace
registration with the local installer merely to select tooling:

```powershell
$env:SQL_APPS_TOOLING_HOME = "C:\tools\sql-apps-0.1.0\package"
copilot
```

`SQL_APPS_TOOLING_HOME` retains explicit bootstrap/project-factory selection
while `SQL_APPS_HOME` selects the generated app. A contributor checkout is also
valid tooling for development. The local installer below installs guidance
only; it does not create a persistent runtime binding.

New applications in this branch pin exactly `@microsoft/sql-apps@0.1.0` (unreleased). Plugin installation does not distribute that package. Use an explicitly [bound release archive](projects.md#install-from-a-release-archive), or a configured npm feed that serves the pin. A missing feed package blocks the registry route; never silently change sources. A verified archive release requires no npm publishing rights but is not evidence of npm publication. See the [release prerequisites](progressive-creation.md).

## Install from your checkout

Prerequisites: Node 22/24 and the GitHub Copilot CLI, using the same Copilot profile as your App. A native CLI can be on PATH; for an npm-installed CLI on Windows, pass its absolute JavaScript entrypoint instead of a shell shim. Start with [first-time setup](../guides/getting-started.md) if tools are missing. Plugin installation does not require npm dependency restore or runtime compilation; its launcher can diagnose setup before the application is built.

```powershell
Set-Location "C:\git\sql-apps"
npm run plugin:check
npm run plugin:install
```

For an npm-installed Copilot CLI, resolve the package entrypoint explicitly:

```powershell
$packagePath = Join-Path (npm root --global) '@github' 'copilot'
$manifest = Get-Content -Raw (Join-Path $packagePath 'package.json') | ConvertFrom-Json
npm run plugin:install -- (Join-Path $packagePath $manifest.bin.copilot)
```

The optional argument also accepts an absolute native CLI path. JavaScript
entrypoints run through the current Node executable without a shell. Relative
paths and `.cmd`, `.bat` or `.ps1` shims are rejected before registration.
The entrypoint argument does not select a different Copilot profile.

The installer:

1. Validates the dedicated plugin bundle and marketplace paths.
2. Registers this checkout as the local `sql-apps-skills` marketplace.
3. Installs/enables `sql-apps@sql-apps-skills` and verifies actual discovery of all seven skills.
4. Prints explicit project/tooling selection guidance; it writes no runtime binding.

Rerunning the installer is safe for the same checkout/profile. It refuses to replace a conflicting marketplace or differently sourced plugin. Unrelated existing plugins are not disabled or modified.

Only [plugins/sql-apps](../../plugins/sql-apps) is the installed package: manifests, seven focused skills, an MIT license and a Node launcher. Runtime code, `.sql-apps` credentials, dependencies and SQL volumes stay outside the package. The repository root contains marketplace catalogs, not a second plugin package.

## Install companion plugins for cloud work

The SQL Apps plugin is enough for local setup, application work and validation.
It does not install or update other plugins. The official
[Azure Skills plugin](https://github.com/microsoft/azure-skills#azure-skills-plugin)
owns Azure workflows; SQL Apps routes to it rather than copying its skills or
implementing another general-purpose deployer. Install the relevant companions
for requested Azure capabilities or cloud work:

| Plugin | Why SQL Apps uses it |
| --- | --- |
| `microsoft-sql@microsoft-sql` | Azure SQL provisioning, identity, schema, Data API builder, connection and database diagnostics skills such as `build-app-on-azure-sql`, `entra-id-auth` and `dab-rest-and-graphql`. |
| `azure@azure-skills` | Azure onboarding, preparation, validation, deployment, storage, messaging, AI, telemetry and production diagnostics. |
| `azure-cost@azure-skills` | Account-aware estimates, actual cost analysis, optimization and governance. |

Run these slash commands in GitHub Copilot CLI or the Copilot App:

```text
/plugin marketplace add microsoft/microsoft-sql
/plugin install microsoft-sql@microsoft-sql
/plugin marketplace add microsoft/azure-skills
/plugin install azure@azure-skills
/plugin install azure-cost@azure-skills
```

Marketplace registration is safe to repeat when it already points to the same source. Restart the App or begin a fresh session after installation, then use `/plugin list` to verify that all four plugins, including `sql-apps@sql-apps-skills`, are enabled. See the current [Azure plugin catalog](https://learn.microsoft.com/azure/developer/azure-skills/plugins/) because specialized Azure plugins can change independently.

These companion plugins are not prerequisites for local-only development. Install them when you choose to share, estimate, deploy or diagnose the app in Azure.

For VS Code, upstream recommends installing the
[Azure MCP extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azure-mcp-server),
which also installs the Azure skills companion extension and configures MCP.
For Claude Code, Codex, Cursor or Gemini CLI, follow the
[host-specific Azure Skills instructions](https://github.com/microsoft/azure-skills#install-in-60-seconds);
do not assume Copilot's installation commands work in every host.
Installation of a plugin, extension or MCP server alone is not evidence that a
particular skill is available in the current session. Verify its discovery
after restarting; do not claim an unavailable handoff completed.

## Azure workflow routing

SQL Apps owns the local-first application, design, access contract and acceptance
checks. Load Azure companions only for the requested Azure boundary, including
capabilities added while building an app. Preserve the existing project, SQL/DAB
contracts and [free-first constraints](free-first.md); do not let onboarding
replace the application or silently introduce cloud requirements.

| Requested work | Maintained skill or plugin |
| --- | --- |
| Assess code readiness only, without infrastructure work or deployment | `azure-app-onboard-prereq` from `azure@azure-skills` |
| Plan and onboard an existing SQL Apps app to Azure without choosing azd | `azure-app-onboard` from `azure@azure-skills`; use its reviewed plan, cost and pre-deploy approval workflow |
| Prepare an explicitly requested azd deployment, or a project with `azure.yaml` | `azure-prepare` -> `azure-validate` -> `azure-deploy` from `azure@azure-skills`; retain their required approved plan and successful validation before execution |
| Resume an already prepared azd deployment | `azure-deploy` only after its plan and validation prerequisites pass; re-plan changed inputs |
| Add uploads or object/file storage outside the SQL Apps runtime | `azure-storage` from `azure@azure-skills` |
| Add messaging or event-driven work outside the SQL Apps runtime | Discover the applicable current Azure skill with `discover-azure-skills`; `azure-messaging` diagnoses Event Hubs/Service Bus SDK issues, while the selected onboarding workflow owns new infrastructure |
| Add AI search, speech or document processing | `azure-ai` from `azure@azure-skills`; use `microsoft-foundry` for Foundry model/agent workflows |
| Add application telemetry or diagnose a deployed app | `appinsights-instrumentation` or `azure-diagnostics` from `azure@azure-skills` |
| Inspect subscriptions/resources or verify capacity before provisioning | `azure-resource-lookup` and `azure-quotas` from `azure@azure-skills` |
| Estimate, analyze or govern Azure costs | `azure-cost@azure-skills`; discover its current estimation, analysis, optimization or governance skill |
| Provision SQL, configure Entra/managed identity, schema or DAB | `microsoft-sql@microsoft-sql`; keep runtime permissions least-privilege and preserve application access rules |

For other Azure boundaries, use `discover-azure-skills` rather than inventing a
workflow or copying a service cookbook. Skill names and availability can change;
read the selected skill's current scope and prerequisites before executing it.
`azure-prepare` is not a universal starting point for non-azd apps.

Assessment or pricing requests are read-only scope, not approval to run an
end-to-end deployment pipeline. Confirm the current plan, exact target,
resource inventory, costs and access changes before writes. Missing skills
are explicit blockers: name the skill and companion, preserve the evidence
handoff and provide the host's installation instructions. Never auto-install,
silently substitute another publisher or infer spending permission from plugin
availability. The existing `personal-free` publisher remains a separately
approved qualifying fallback, not a replacement for Azure Skills.

## Use the GitHub Copilot App

Restart the App or create a **fresh session** after installation. In **Customize -> Plugins**, look for **sql-apps**, marketplace **sql-apps-skills**, version **0.1.0** for this candidate, enabled. Its skills should appear under **Skills**:

| Skill | Example prompt |
| --- | --- |
| `sql-apps-getting-started` | Shape a SQL Apps idea and choose the next local-first step. |
| `sql-apps-local` | Start SQL Apps locally; reuse it if it is already running. |
| `sql-apps-diagnostics` | Diagnose a failed SQL Apps workflow or slow read without changing services. |
| `sql-apps-validation` | Run SQL Apps unit tests and typecheck; do not restart services. |
| `sql-apps-cloud-preview` | Assess App Service first, Container Apps second and SWA last as a qualifying complete-free-setup fallback, with explicit cost/access acceptance and maintained Azure infrastructure ownership. |
| `sql-apps-application` | Build a domain-specific application without copying the Todo example; verify source, build, API and database boundaries. |
| `sql-apps-design` | Apply intentional visual direction to every new user-facing app and meaningful UI change, then review its rendered desktop and narrow-width experience. |

The `sql-apps-design` skill owns design direction and rendered review in the app's
existing stack; no companion skill is required. For a new identity it compares
two distinct visual directions using concrete references or domain cues, then
renders a representative screen before broad coverage. Brief prose replaces
exact-heading document gates. Agent usability review and explicit user
visual-direction approval are separate; neither a matrix nor `sql-apps check`
can approve aesthetics. It
retains SQL Apps requirements for real account/access states and truthful loading,
empty, error, saving, success, and disabled states. SQL, identity, and runtime
decisions remain in `sql-apps-application`.

`sql-apps-local` owns lifecycle and approval. `sql-apps-validation` selects checks
from the actual target package, distinguishing generated apps from foundation
maintenance, and owns evidence collection and the four-verdict report.
Application and cloud skills hand off to that contract rather than duplicating it.

For relevant read changes and slow reads, use [Application read performance](read-performance.md).
SQL Apps owns bounded results, redundant requests and user-action measurements;
the maintained `microsoft-sql` skills own query, plan, blocking and resource tuning.
Application-side investigation does not require a companion installation. If an
isolated database question needs an unavailable specialist, report the missing
capability and hand over its evidence rather than installing automatically or
duplicating SQL diagnostics. These additions do not introduce a cache or change
runtime behavior.

Invoke a skill explicitly from the App's skill picker/slash completion if natural-language discovery picks another plugin instead. Ask for **SQL Apps** and confirm the **sql-apps-skills** marketplace. The plugin does not embed the browser UI; use only the verified startup-reported origin for the actual application.

### Keep SQL Apps work scoped to its project

SQL Apps is a standalone project with its own runtime and workflow. Other plugins can remain installed and enabled.

For SQL Apps work, explicitly select `sql-apps-application` or the matching `sql-apps-*` skill and confirm the intended application directory. Use project-owned commands and do not choose a directory from another plugin or old conversation. An unrelated project is not an invitation to convert it into SQL Apps.

Plugin availability is shared within the Copilot profile; these instructions clarify routing, but do not provide host-enforced skill isolation. If a conversation mixes unrelated workflows, start a fresh SQL Apps session with a prompt such as: **"Use sql-apps-application to build a standalone SQL Apps app in my confirmed project folder. Keep unrelated projects and plugins unchanged."** Existing conversations can retain old instructions and names even after a plugin changes.

For beginners: **"Guide me through SQL Apps setup one step at a time. Ask before installing tools, downloading dependencies or changing my system. Do not deploy to Azure."** The local skill reads the OS-specific guide, runs setup checks, offers native approved installs and pauses for human-only license/restart/credential steps. No blanket installation or license approval is implied by enabling the plugin.

For building an app: **"Help me describe, run and change a useful SQL Apps app locally. Ask about its users, information and actions, not cloud architecture. Sharing is optional."** Follow the [build walkthrough](../guides/build-your-app.md). Use `guide` to recover saved decisions and `guide-save <absolute-brief-path>` to save an agreed brief. Historical evidence never replaces live acceptance or authorizes installations/cloud writes.

For repeated local use, see [remembered permissions](local-consent.md). `setup plan --profile role-based-data --workspace <base-port>` shows the single local approval (restore, build, workspace, startup, SQL terms) and `setup run ... --approval <id>` records it after explicit human approval. The launcher's pre-build `consent-plan|consent-status <operation> [selection]`, `consent-grant|consent-grant-once <absolute-plan.json>`, `consent-terms <absolute-reviewed-document>`, `consent-revoke [scope|terms]` and `consent-run <operation> [selection]` remain for individual scopes and target the selected application checkout. Consult matching grants before asking again.

The local marketplace loads from disk (`source: live` in CLI output). Edit the bundled skills or launcher, run `npm run plugin:check`, then start a fresh session/restart to load changes. No Git push or plugin update is needed for this directory-backed source. After TypeScript runtime changes, separately build/restart the application as documented.

Keep three paths distinct: **loaded skill source** (the actual marketplace/skill location), **installed launcher** (resolved relative to that skill), and **application checkout** (selected by `home`/`SQL_APPS_HOME`). Exported skill copies in another application are not automatically active. Editing them does not change the installed plugin; confirm the loader source with discovery output before editing and reload a fresh session afterward. Changing the runtime home does not change loaded instructions.

If the App does not show the plugin, check the profile used to launch it. `COPILOT_HOME` can select a different configuration directory. Register the local checkout through the App's marketplace controls if available, or launch the App from the same configured CLI/profile (`copilot app`). Do not copy or overwrite the App's settings. Verify discovery with:

```powershell
copilot plugin list --json
copilot skill list --json
copilot plugin marketplace browse sql-apps-skills
```

The installer verifies the CLI loader when you run it. Check the visible App session/skill picker in your actual profile too; an already-open session may retain old capabilities.

## Project selection and direct checks

The clone-free bootstrap uses `node $cli setup plan --json` from the app
directory, where `$cli` is the selected archive executable. No bootstrap
environment variable or profile-wide registration is needed. The plugin's
foundation-backed route below is an alternative, not a clone-free prerequisite.

For a connected first-run or return journey, the same launcher exposes
`setup plan|status|run` before dependency restore or build. For example:

```powershell
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" setup plan --json
```

`role-based-data` is the only profile, so `--profile role-based-data` is
optional. See [Setup coordinator](setup.md) for
workspace selection, approvals, installation plans and continuation. `setup`
forwards arguments literally to the selected tooling coordinator and retains
project/source checks. It does not change loaded skills, grant permissions,
install another assistant, generate domain screens or deploy.

The launcher resolves the application runtime in this order:

1. Explicit `SQL_APPS_HOME` environment variable.
2. Current directory or an ancestor that is a validated SQL Apps project.
There is no active-project or assistant-profile fallback. From a scratch
directory, explicitly select the application before running project commands.

The foundation that supplies the project factory and pre-restore bootstrap
tooling is resolved separately:

1. Explicit `SQL_APPS_TOOLING_HOME` (the verified archive package or contributor checkout, not an app).
2. A contributor checkout selected by `SQL_APPS_HOME` or the current directory.

Invalid explicit paths fail; they never silently fall back. The
foundation selection does not change the runtime home or require applications
to live beside that checkout.

Once a project's exact pinned `@microsoft/sql-apps` package is restored in its
own `node_modules`, that package owns command dispatch and build provenance,
even when the external archive executable is invoked or a foundation
remains selected. A missing package permits read-only/bootstrap commands,
not foundation-owned application builds or runtime execution. Bootstrap setup
stops after restore; plan again through the installed package and explicitly
review changed approval scopes before continuing.

Create and switch projects through the plugin:

```powershell
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" projects root
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" projects create-plan "Equipment Checkout" --archive "C:\downloads\microsoft-sql-apps-0.1.0.tgz"
# After approving the displayed effects:
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" projects create "Equipment Checkout" --archive "C:\downloads\microsoft-sql-apps-0.1.0.tgz" --approval <printed-id>
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" projects list
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" projects open "C:\path\to\project"
```

`projects create` writes under `%USERPROFILE%\SqlAppsProjects` by default,
creates an independent Git repository, excludes plugin/example implementation
files and refuses an existing destination. See [Manage projects](projects.md).

```powershell
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" home
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" workspace-check
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" guide
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" status
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" setup-check
```

`workspace-check` is dependency-free and read-only. It reports the selected checkout and selection source, runtime contract, selected application, source-content fingerprint, Git evidence when available, and build provenance. Equal package versions or Git commits do not prove that two worktrees contain the same uncommitted source. ZIP downloads work without Git; the report explicitly marks Git evidence unavailable.

`guide` is also dependency-free and available before the runtime is built. It returns JSON with the four stages, saved brief, suggested next action and explicitly historical progress; it does not probe live services. `guide-save "<absolute-brief.json>"` validates and saves the agreed brief in `.sql-apps/guide.json` in the bound checkout. Both enforce the same runtime-home mismatch checks. Source changes flag saved progress for local re-verification. See [the brief contract](guide.md); do not include credentials or actual data.

The guide also introduces cost awareness progressively; optional saved `costPreference` is not spending approval. The cloud-preview skill confirms the `role-based-data` application first and uses the [App Service-first, free-first contract](free-first.md): App Service, then Container Apps, then qualifying SWA Free. Required DAB stays on ACA with SQL managed identity. Infer proposed settings, but obtain acceptance of the exact inventory and risks before writes. The personal-free publisher remains available for qualifying SWA Free fallbacks, not as the default integration. Azure estimates and spend analysis route to the Azure Cost plugin. The launcher exposes the [role-based-data](role-based-data.md) `app`/`serve` commands. Budgets are alerts, not spending caps. See [costs and paid growth](../guides/costs.md).

To select a different application, choose its checkout for this terminal/session:

```powershell
$env:SQL_APPS_HOME = "C:\git\your-intended-checkout"
node "C:\git\sql-apps\plugins\sql-apps\scripts\sql-apps.mjs" workspace-check
```

This does not transfer source or authorize copying files between worktrees. `home` and `workspace-check` remain available to diagnose selection. Runtime commands also require matching build provenance: `npm run build` records the source and compiled-artifact fingerprints and refuses to certify a build if source changes during compilation. Missing, stale, copied or tampered artifacts require a rebuild in the selected checkout. Source/build provenance is not live service ownership or cloud acceptance.

`status` probes only loopback gateway liveness/data readiness and DAB HTTP health, with bounded timeouts and a nonzero exit on failure. It is read-only and does not create a development session or expose credentials. It does not certify SQL authorization or the application's required role. The launcher delegates local commands directly to the existing compiled CLI with the checkout as cwd, without shell interpolation; it never installs a second runtime.

`setup-check` instead runs the dependency-free diagnostic in the bound checkout and prints JSON before runtime compilation. An optional second argument selects an existing SQL container; it does not initialize it. Action-needed reports exit nonzero, including a healthy gateway whose ownership must still be confirmed. Do not mistake that for permission to restart it.
It reports selected workspace mode/ports/origins and requires matching workspace labels for occupied Docker ports. For a new checkout, use `setup plan`, review the proposed isolated block, then use `setup run --approval <id>`. The plugin passes omitted SQL arguments through to the workspace's derived default. Fixed-port and helper-front-door workspace formats are unsupported and are never silently migrated.

When needed:

```powershell
Set-Location "C:\git\sql-apps"
npm run build
node plugins\sql-apps\scripts\sql-apps.mjs app
```

The `app` command remains running until stopped. If healthy services are already running, reuse the browser instead of launching another gateway. Alternate SQL containers can be supplied as the second argument to applicable local commands.

`recover-sql` is an explicitly approved isolated-SQL repair, not an automatic startup fallback. It preserves the stopped container's image version, credentials and scoped data; it rejects running/external/legacy or mismatched resources. If interrupted, resume it rather than deleting its sensitive recovery state. See [local-development.md](local-development.md) before use.

## Safety and boundaries

- This plugin adds skills, not MCP tools, custom UI, or another authentication layer.
- No automatic startup hooks or cloud deployment commands are added.
- Agents still use normal host approval/task controls; installing a plugin does not grant blanket tool permissions.
- Writing records through the app or running SQL acceptance against shared data mutates or reads that data; confirm the target workspace first.
- `app-test` starts its own approved stack and checks that Development Alice is admitted and Development Bob receives 403. Do not run it against a workspace another user is relying on.
- Preserve owner checks, production authentication and unrelated/user-owned containers.
- Cloud preparation requires separate authorization for mutations. The existing Azure template contains billed resources.

## Uninstall from Copilot

For Claude, see [Install in Claude Code](#install-in-claude-code).

```powershell
copilot plugin uninstall sql-apps@sql-apps-skills
copilot plugin marketplace remove sql-apps-skills
```

These operations remove only this plugin/marketplace registration, not the application checkout or SQL data. The installer creates no runtime binding. Do not remove the Copilot profile directory or unrelated plugins.
