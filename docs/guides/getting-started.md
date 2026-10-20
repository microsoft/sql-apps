# Get started

Prepare your computer, select the SQL Apps foundation and create your own
application project. Container and Express routes do not need an Azure
subscription or Azure CLI login; choosing Azure SQL directly does.

## 1. Check the requirements

Install only what is missing. [Git](https://git-scm.com/downloads) and Node with
npm are required before the project-creation commands below. A .NET SDK is shared
by all routes; check the additional requirements for your chosen database.

| Tool or access | Why you need it |
| --- | --- |
| Git | Each application is created as its own Git repository. Creation stops before changing anything if Git is missing. |
| Node.js 22 or 24 with npm | Create projects, build and run the application and setup check. |
| .NET SDK 8 or later | Build and publish the SQL schema. Choose SDK, not just Runtime. |
| Docker with Linux containers | Preferred container route only; endpoint fallbacks use host DAB without Docker. |
| Azure SQL Database container private-preview access | Preferred first-use route, unless cached. If unavailable, offer Azure SQL directly, then SQL Server 2025 Express on Windows x64. |
| Access to the pinned SQL Apps package | Use the matching release archive, or a configured npm feed that serves `@microsoft/sql-apps@0.2.3`. |

**Check package access before attempting application restore.** Installing the
assistant plugin does not make the runtime package available. If your configured
feed cannot resolve the pinned version, explicitly
[bind a matching release archive](../reference/projects.md#install-from-a-release-archive)
before restore. This is a distribution issue, not a project-directory error.
Archive installation does not require npm publishing rights; other dependencies
still use your configured feed. Do not repeatedly recreate the app or silently
change registries, versions or installation sources.

Initial npm packages, SQL tools and container images require internet and disk space. Docker Desktop has [license conditions](https://docs.docker.com/subscription/desktop-license/) and is not free for every organization. Azure CLI is needed only when choosing Azure SQL directly. Endpoint routes restore pinned host DAB under the services approval; host sqlcmd is not required.

Endpoint routes also require the .NET **and ASP.NET Core 8.0 runtimes**,
even if a newer SDK is installed. The setup check identifies missing runtimes;
review `setup install-plan dotnet` to install SDK 8 side-by-side, preserving
existing SDKs. This is separate from permission to restore the DAB tool.

### Windows

1. [Node.js](https://nodejs.org/en/download), including npm. Keep an existing supported version-manager installation.
2. [.NET SDK](https://dotnet.microsoft.com/download), version 8 or later.
3. For the container route, [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/). Check its hardware, Windows and license requirements, then start it in **Linux containers** mode.

If Docker requires WSL, virtualization or a reboot, follow its linked instructions with your administrator as needed. Review license agreements yourself.

Close and reopen the terminal after installation. Restart your editor if it still sees the old PATH.

### macOS

Check **Apple menu -> About This Mac** for Intel or Apple Silicon. Install the matching [Node.js](https://nodejs.org/en/download), [.NET SDK](https://learn.microsoft.com/dotnet/core/install/macos) and, for the container route, [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/) packages.

The SQL image is x64-only. Apple Silicon uses x64 emulation; having Docker installed does not guarantee that this workload will run. Follow Docker's emulation guidance if startup fails. Open a new terminal after installing tools.

### Linux

Check your distribution and version in `/etc/os-release`. Use [Node.js downloads](https://nodejs.org/en/download), the [.NET Linux distribution selector](https://learn.microsoft.com/dotnet/core/install/linux) and, for the container route, the [Docker Engine distribution selector](https://docs.docker.com/engine/install/).

For Ubuntu or Debian, follow the official instructions for that exact distribution and version; package feeds differ. Verify Node is 22 or 24 instead of assuming the distribution package is current. Keep an existing supported version-manager installation.

If Docker reports socket permission denied, follow its [post-install guidance](https://docs.docker.com/engine/install/linux-postinstall/). Docker group membership grants powerful host access. Do not make the socket world-writable or run the entire app as root to hide the problem.

## 2. Select the foundation and assistant guidance

Install the optional [SQL Apps plugin](../reference/plugins.md) for
Claude Code or GitHub Copilot using that assistant's installation instructions.
The reference covers support on other assistants, loader verification and
cloud companion plugins. The plugin supplies skills and a launcher, not the
application runtime or foundation checkout.

Clone the foundation, or use an existing trusted checkout. If it was shared with
you, confirm which branch to use. In PowerShell on Windows:

```powershell
git clone https://github.com/microsoft/sql-apps.git "C:\git\sql-apps"
Set-Location "C:\git\sql-apps"
$env:SQL_APPS_FOUNDATION_HOME = "C:\git\sql-apps"
$env:SQL_APPS_HOME = $env:SQL_APPS_FOUNDATION_HOME
```

Skip the clone when reusing a checkout and substitute its absolute path.
`SQL_APPS_FOUNDATION_HOME` selects the project factory and pre-restore setup
tooling; `SQL_APPS_HOME` selects the application, or the foundation before one
exists. Set these in the terminal used to launch your assistant. See
[runtime binding](../reference/plugins.md#runtime-binding-and-direct-checks)
for other binding options.

You can ask your AI assistant:

> Help me set up SQL Apps on this computer, one step at a time. Check what is installed and explain downloads and license requirements before changing anything. Do not deploy to Azure or delete existing data.

An AI assistant is optional for running the application. Guided app building can use your preferred LLM provider, subject to its account, access and pricing conditions. Review its data-handling policies before sharing project files. Never paste passwords or registry credentials into chat.

With approval, skills can run commands on your machine and signed-in Azure
accounts, including commands that create or delete resources. AI can make
mistakes: review each plan, keep backups and do not bypass permissions. Setup
tools and services, including Azure CLI, Static Web Apps CLI, Docker or Podman,
Data API builder and npm packages, have their own licenses and telemetry.

## 3. Create an independent project

From the foundation folder:

```powershell
npm run projects -- create-plan "Equipment Checkout"
npm run projects -- create "Equipment Checkout" --approval <printed-id>
```

Replace the example name with your idea. The first command prints the destination,
Git repository, local ports, creation page and approval ID without changing
anything. Review those effects before running the second command with that ID.
Creation does not authorize later setup changes.

Projects default to `%USERPROFILE%\SqlAppsProjects` on Windows and
`~/SqlAppsProjects` elsewhere. Creation refuses an existing destination,
initializes an independent Git repository and records the project as active.
See [Manage projects](../reference/projects.md#create-and-manage-projects) for
custom roots, listing projects and opening an existing project.

The browser opens on a creation page before app restore; the same origin becomes
your application as capabilities are verified. See
[progressive creation](../reference/progressive-creation.md).

Run the printed command that points `SQL_APPS_HOME` at the new project, keep
`SQL_APPS_FOUNDATION_HOME` on the foundation and open the generated folder in
your editor. Launch a fresh assistant session there (`claude` or `copilot` for
those CLIs), giving it access to the app project. The generated folder contains
`package.json`, `src` and `sql`, but no foundation `scripts`. Implement your
application here, not in the foundation/plugin checkout.

## 4. Plan setup and restore tooling

Before the first restore, the project's npm commands are not yet available.
Use the selected foundation's dependency-free launcher with the app selection
above. In PowerShell:

```powershell
node "$env:SQL_APPS_FOUNDATION_HOME\plugins\sql-apps\scripts\sql-apps.mjs" setup plan --json
```

This also works without an assistant or an installed plugin. With the plugin,
you can ask your assistant to run the same plan. It identifies missing
prerequisites and required approval scopes without installing anything. See the
[setup coordinator](../reference/setup.md) for approval and continuation commands
and [runtime binding](../reference/plugins.md#runtime-binding-and-direct-checks)
for launcher details.

Review the plan and approve only the intended operations. Bootstrap setup stops
after restoring dependencies: re-plan through the app's installed pinned
tooling before authorizing build or startup. A missing package in your npm feed
blocks that source until fixed or until you explicitly bind a matching release
archive. Neither permits substituting foundation runtime code.

After restore, check requirements from the generated project folder:

From the generated project folder:

```powershell
npm run setup:check
```

This requires restored tooling, not an application build. Before restore, use
the installed plugin launcher's `setup plan --json` through its explicit
foundation selection; see [setup](../reference/setup.md). The checks do not install
tools, accept licenses, change databases or start services. Read each **Next**
instruction and rerun after resolving missing requirements.

If a command is not found, reopen the terminal before reinstalling. Supported version checks are `node --version`, `npm --version` and `dotnet --list-sdks`. Docker's engine must be running, not just installed.
For endpoint routes, also check `dotnet --list-runtimes` for both
`Microsoft.NETCore.App 8.0.x` and `Microsoft.AspNetCore.App 8.0.x`.

For a container that its owner has agreed you may reuse:

```powershell
npm run setup:check -- --container existing-sql-name
```

Replace the name with the actual container. This inspects safe state; it does not certify the engine or modify its database.

## 5. Choose and approve the database route

The Azure SQL Database container is in **private preview**. [Request access](https://aka.ms/azuresqldb-container-signup) and follow the [container documentation](https://aka.ms/azuresqldb-container) for a first image download. Complete registry sign-in in your own terminal with the provided pull credentials. Do not put them in chat, source files or screenshots.

If a usable image is cached, you do not need to download it again just to refresh it. Startup verifies the actual SQL engine. If preview access is unavailable, do not stop the whole journey: offer **Azure SQL directly**, then **SQL Server 2025 Express on supported Windows x64**. Follow [database selection and separate approvals](../reference/setup.md#choose-a-database-without-blocking-the-journey). Never silently switch an existing database or present mock persistence as working SQL.

Startup passes `ACCEPT_EULA=Y`; there is no chat dialog. Review the [container documentation/access instructions](https://aka.ms/azuresqldb-container) and applicable terms supplied with your preview registry access before approving SQL startup under those terms. If those terms are unavailable, pause rather than assume acceptance. This approval does not cover other licenses or later operations.

You do not need to acknowledge an unchanged reviewed document every session. [Remember local permissions](../reference/local-consent.md) explains the separate persisted terms digest and revocable checkout-scoped operation grants. Plan all upcoming effects together, record only explicit approvals, and ask again only for missing/changed scopes or terms. A local terms copy cannot detect remote changes by itself.

## 6. Build and run your app

Once your app scope is agreed, use the [setup coordinator](../reference/setup.md):

```powershell
npm run setup -- plan --json
```

`role-based-data` is the only profile, so `--profile role-based-data` is
optional. Setup does not generate screens or select an example. The report
separates prerequisites, dependencies, current build, workspace, startup
permissions and application acceptance.
`setup plan` installs nothing. Install missing system tools with separate
`setup install-plan <tool>` reviews. With pinned tooling installed, local stages share one approval:
`setup approval --profile role-based-data --workspace <base-port>` lists
restore, build, workspace, startup and the SQL terms line; after you approve,
`setup approve` records it and `setup run` continues. Licenses, preview
credentials and required restarts remain human steps. See the reference for
platform support and verification limits.

- **Build your own app:** follow [Build your app](build-your-app.md).
- **Try an implemented example:** follow the [Todo reference guide](../../examples/todo/README.md).
- **Start, stop or resume the app:** follow [Run locally](run-locally.md).

For diagnostics and data-preserving recovery, see the [local runtime reference](../reference/local-development.md).
