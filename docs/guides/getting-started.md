# Get started

Build locally first: **Describe -> Run locally -> Make it yours -> Share optionally**.
Each app has its own repository and exact SQL Apps tooling. An assistant plugin
is optional; it supplies guidance, not a runtime or permission to change your machine.

## 1. Check the requirements

Install only missing tools, after reviewing their official source and effects.

| Tool or access | Why you need it |
| --- | --- |
| [Git](https://git-scm.com/downloads) | Creation initializes an independent app repository. |
| [Node.js 22 or 24 with npm](https://nodejs.org/en/download) | Install the CLI, create, build and run apps. Preserve supported version-manager installations. |
| [.NET SDK 8 or later](https://dotnet.microsoft.com/download) | Build and publish SQL schemas. Endpoint routes also require both .NET and ASP.NET Core 8.0 runtimes. |
| Docker with Linux containers | Preferred Azure SQL Database container route only. |
| Azure SQL Database container private-preview access | Needed for the first image download unless a usable image is cached. |
| Verified SQL Apps release archive | The v0.1 distribution path; other npm dependencies still use your configured feed. |

On Windows, use [Docker Desktop installation guidance](https://docs.docker.com/desktop/setup/install/windows-install/).
Review WSL, virtualization, reboot and license requirements with your administrator.
On macOS, select tools for your CPU; the SQL image is x64-only, so Apple Silicon
requires working emulation. On Linux, use the official
[.NET distribution guidance](https://learn.microsoft.com/dotnet/core/install/linux)
and [Docker Engine guidance](https://docs.docker.com/engine/install/).
Do not make Docker sockets world-writable or run the whole app as root.

Reopen the terminal after installations; restart the editor if its PATH is stale.
Check `node --version`, `npm --version`, `git --version`, `dotnet --list-sdks`
and, for endpoint routes, `dotnet --list-runtimes`.
Native `tar` is needed for archive metadata inspection.
Downloads require network access and disk space. Tools have their own licenses
and telemetry; Docker Desktop is not free for every organization.

## 2. Select the CLI and optional assistant guidance

This checkout prepares the **initial 0.1.0 release candidate**. It does not
publish an archive or npm package. Use an actual matching release when available,
or a locally built candidate following the
[runtime release checks](../../CONTRIBUTING.md#releasing-the-runtime-package).
Earlier demo archives and projects are not compatibility targets.

Download `microsoft-sql-apps-0.1.0.tgz` and `SHA256SUMS` from the same
[GitHub release](https://github.com/microsoft/sql-apps/releases).
Confirm the release source and compare the exact filename's checksum:

```powershell
$archive = "C:\Downloads\microsoft-sql-apps-0.1.0.tgz"
Get-FileHash $archive -Algorithm SHA256
Get-Content "C:\Downloads\SHA256SUMS"
```

Stop if the checksum is missing or different. After explicitly approving the
verified archive's installation and dependency downloads:

```powershell
$tools = "C:\SqlAppsTools\0.1.0"
npm install --prefix $tools --no-save --package-lock=false --ignore-scripts $archive
$cli = Join-Path $tools "node_modules\@microsoft\sql-apps\bin\sql-apps.mjs"
node $cli --help
```

This is not a global install. It does not change PATH, select an app, start a
service, accept SQL terms or authorize cloud work. Lifecycle scripts are disabled.
Use equivalent absolute paths on other platforms.

Install the optional [assistant plugin](../reference/plugins.md) separately.
It is not needed to run these commands. With an assistant, ask:

> Help me build an equipment checkout app with SQL Apps. Start by asking who will use it and what it should do. Help me run it locally, then make one useful change. Do not deploy it yet.

Replace the idea with yours. Never share passwords, registry credentials or real
records in chat. Review your assistant provider's access, pricing and data policies.

## 3. Create an independent project

From any directory:

```powershell
node $cli projects create-plan "Equipment Checkout" --archive $archive
node $cli projects create "Equipment Checkout" --archive $archive --approval <printed-id>
```

Review the absolute destination, Git repository, archive path/checksum and file
changes. Planning rejects an existing destination. Creation checks again for races.
A changed scaffold, tooling manifest or archive requires a fresh approval.

Creation copies the reviewed archive into `tooling/`, binds the lockfile to its
relative path and integrity, and includes it in the initial Git commit. It never
restores packages, reserves ports, opens a browser or starts a background helper.
It registers the app for listing only, not ambient execution selection.

Projects default to `%USERPROFILE%\SqlAppsProjects` on Windows and
`~/SqlAppsProjects` elsewhere. See [Manage projects](../reference/projects.md)
for custom roots and explicit selection. Open the generated app in your editor;
implement it there, not in the foundation or plugin checkout.

## 4. Plan setup and restore tooling

Before restore, use the explicitly selected archive CLI from the app:

```powershell
Set-Location "C:\Users\you\SqlAppsProjects\equipment-checkout"
node $cli setup plan --json
# Only after approving the displayed restore effects:
node $cli setup run --approval <printed-id> --json
```

Keep the copied archive and lockfile in the app repository. A separate binding
step is not required. `bind-archive` remains an explicitly reviewed repair tool.
An E404 from another dependency's feed needs diagnosis; never silently change
registries, package versions or installation sources.

Bootstrap approval covers **restore only**. Tool installations have separate
reviews. Bootstrap execution stops after restore; then use app-local tooling:

```powershell
npm run setup -- plan --json
```

No foundation clone or persistent assistant binding is needed. The plugin resolves
the nearest app, or an explicitly supplied `SQL_APPS_HOME`. Outside an app, it
requires selection rather than adopting a globally active project.

## 5. Choose and approve the database route

Prefer **Azure SQL Database container -> Azure SQL Database directly ->
SQL Server 2025 Express on Windows x64**. Missing preview access, Docker or
emulation need not stop app authoring. Choose alternatives explicitly using the
[database setup reference](../reference/setup.md#choose-a-database-without-blocking-the-journey).
Never silently switch targets, migrate data or claim mock persistence is real SQL.

For the container route, [request access](https://aka.ms/azuresqldb-container-signup)
and review the [container documentation](https://aka.ms/azuresqldb-container)
and applicable preview terms. Enter pull credentials only in your own terminal.
Startup passes `ACCEPT_EULA=Y`; approve those terms explicitly, not by enabling
the plugin. Unchanged grants and terms are remembered per project and revocable.
Azure subscription/login is required only for the Azure SQL route or optional
sharing, not for container or Express local development.

## 6. Build and run your app

Implement one useful domain slice using [Build your app](build-your-app.md).
Setup does not generate screens or select an example.

```powershell
npm run setup -- plan --json
# Only after approving the current app-local effects and any SQL terms:
npm run setup -- run --approval <printed-id> --json
```

The only profile is `role-based-data`. One reviewed local plan covers the missing
build, isolated workspace and startup scopes. `setup plan` and `setup status` are
read-only; rerun the same plan/run flow after correcting a blocker. Tool installs,
administrator changes, recovery, destructive cleanup and cloud work remain separate.

Use the returned launch URL only after intended ownership/readiness verification.
Health and compilation do not prove a working app: save a record, reload a new
browser document, and verify a visible invalid-save error. Render and review the
desktop and narrow layouts. Keep unobserved acceptance explicitly blocked.

See [Run locally](run-locally.md), [remembered permissions](../reference/local-consent.md)
and [setup](../reference/setup.md) for lifecycle and data-preserving recovery.
Try the separately selected [Todo reference app](../../examples/todo/README.md)
only when you want an implemented example. Sharing is optional.
