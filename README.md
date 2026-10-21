# SQL Apps

<img src="content/icons/sql-apps.png" alt="SQL Apps icon: a blue database with a purple application ribbon" width="160">

**Build locally. Make it yours. Share when ready.**

SQL Apps is a local-first foundation for building SQL-backed web applications
with the AI assistant of your choice. Start with an idea rather than a framework
choice, then let the AI assistant implement the screens, data and workflows.

## What you get

- **An application foundation:** TypeScript, a SQL database and a local runtime
  with sign-in and role-based access.
- **Local development:** use the Azure SQL Database container or SQL Express on
  Windows. Get the idea working before choosing cloud hosting.
- **Your own project:** each application lives in an independent Git repository,
  separate from the SQL Apps tooling.
- **A guided workflow:** provider-neutral guides and an optional
  [assistant plugin](docs/reference/plugins.md) with packaging for Claude Code,
  GitHub Copilot, Codex, Cursor and Gemini CLI, plus
  [Azure Skills integration](#optional-azure-deployment-plugins) for Azure work.
- **Free-tier-first planning:** explore hosting for POCs and quick ideas with
  eligibility, quotas and cost trade-offs reviewed before deployment.

The foundation is not a finished domain app. You and your assistant build and
test the behavior your application needs. File storage and background jobs are
outside SQL Apps; add them separately with maintained Azure skills if needed.

## What will you build?

Track equipment loans, manage inventory, collect registrations or give a small
team a shared review workflow. These are ideas, not prebuilt templates.

To try an already implemented example, use the separate
[Todo reference app](examples/todo/README.md). New projects do not include its
screens or sample data.

## Get started

**Start with [Get started](docs/guides/getting-started.md)** to verify a release
archive, install its CLI in a dedicated directory and create an independent
project. No foundation clone, global install or assistant plugin is required.

This branch prepares the **initial 0.1.0 release candidate**, not a published
runtime. Maintainers can exercise the archive flow with a locally built candidate.
Earlier demos have no compatibility or migration guarantee.

After explicitly approving installation of your verified archive:

```powershell
npm install --prefix "C:\SqlAppsTools\0.1.0" --no-save --package-lock=false --ignore-scripts "C:\Downloads\microsoft-sql-apps-0.1.0.tgz"
$cli = "C:\SqlAppsTools\0.1.0\node_modules\@microsoft\sql-apps\bin\sql-apps.mjs"
node $cli projects create-plan "Equipment Checkout" --archive "C:\Downloads\microsoft-sql-apps-0.1.0.tgz"
node $cli projects create "Equipment Checkout" --archive "C:\Downloads\microsoft-sql-apps-0.1.0.tgz" --approval <printed-id>
```

Review the destination, Git repository and archive checksum before creation.
Creation binds the reviewed archive immediately and starts no helper or browser.
The guide continues with a restore-only bootstrap approval, then a fresh local
setup plan through the app's exact installed tooling.

Open the generated application in your editor, give your assistant access to
that project and ask:

> Help me build an equipment checkout app with SQL Apps. Start by asking who will use it and what it should do. Help me run it locally, then make one useful change. Do not deploy it yet.

Replace equipment checkout with your idea. The journey is
**Describe -> Run locally -> Make it yours -> Share optionally**.

A useful first result is a real workflow: save a record to SQL, reload and see
it again, and get a clear message when a save is invalid. A readiness check or
launch URL alone does not prove your app works.

## Install assistant guidance

The plugin packages seven SQL Apps skills and a launcher to guide project setup,
local development, application changes and validation. Installing it does **not**
install the application runtime or database, select a foundation checkout, grant
setup permissions or deploy resources. Follow [Get started](docs/guides/getting-started.md)
for those separate steps.

Claude Code and GitHub Copilot native loaders are tested in CI. Codex, Cursor and
Gemini packaging is included, but their SQL Apps loaders have not been verified
here. Other assistants can use the provider-neutral guides.

### Claude Code

Run in Bash or PowerShell 7:

```sh
claude plugin marketplace add microsoft/sql-apps && claude plugin install sql-apps@sql-apps-skills
```

### GitHub Copilot

Run in Bash or PowerShell 7:

```sh
copilot plugin marketplace add microsoft/sql-apps && copilot plugin install sql-apps@sql-apps-skills
```

### Codex

Register the repository marketplace:

```sh
codex plugin marketplace add microsoft/sql-apps
```

Then restart the desktop app, open its Plugins directory, select **SQL Apps
Skills** and install **sql-apps**. Registration alone does not install the plugin.
See [Codex marketplace setup](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli).

### Cursor

The bundle uses the portable Agent Plugins format. Cursor's documented
team-marketplace route requires a Teams or Enterprise plan: open **Dashboard ->
Plugins & MCPs -> Team Marketplaces -> Add Marketplace -> Import from Repo** and
use `https://github.com/microsoft/sql-apps`. Review the imported plugin, then find
it in **Customize**. This SQL Apps import path has not been verified here.
See [Cursor team marketplaces](https://cursor.com/docs/plugins#add-a-team-marketplace).

### Gemini CLI

Install from the canonical plugin directory in an existing foundation checkout;
replace the example path with your checkout:

```powershell
gemini extensions install "C:\git\sql-apps\plugins\sql-apps"
```

The extension manifest lives in that subdirectory, not the repository root.
See [Gemini extension installation](https://geminicli.com/docs/extensions/reference/#install-an-extension).

After installing, start a fresh assistant session. See the
[plugin reference](docs/reference/plugins.md) for loader verification, foundation
selection, updates and troubleshooting.

## Optional Azure deployment plugins

SQL Apps guides the application workflow; the official
[Azure Skills plugin](https://github.com/microsoft/azure-skills#azure-skills-plugin)
owns Azure onboarding, infrastructure preparation, validation, deployment and
diagnostics. Use it for requested Azure capabilities during development too,
such as storage, messaging, AI and telemetry, without adding them to the SQL Apps
runtime. The [workflow routing table](docs/reference/plugins.md#azure-workflow-routing)
defines the handoffs. These are companion plugins, not bundled dependencies or
prerequisites for local-only development:

| Plugin | Role |
| --- | --- |
| `microsoft-sql@microsoft-sql` | Azure SQL provisioning, identity, schema, Data API Builder and database diagnostics |
| `azure@azure-skills` | Azure onboarding, preparation, validation, deployment and production diagnostics |
| `azure-cost@azure-skills` | Account-aware estimates, cost analysis, optimization and governance |

For **VS Code**, follow the upstream
[Azure MCP extension setup](https://github.com/microsoft/azure-skills#vs-code),
which supplies the Azure skills companion and MCP integration. Host installation
and skill availability are separate from installing the SQL Apps plugin.

In GitHub Copilot CLI or the Copilot App, run:

```text
/plugin marketplace add microsoft/microsoft-sql
/plugin install microsoft-sql@microsoft-sql
/plugin marketplace add microsoft/azure-skills
/plugin install azure@azure-skills
/plugin install azure-cost@azure-skills
```

Start a fresh session and use `/plugin list` to verify the plugins are enabled.
SQL Apps does not install or update companions automatically. Cloud work still
requires a reviewed plan and explicit approval; free allowances do not guarantee
a zero bill. See [companion plugin details](docs/reference/plugins.md#install-companion-plugins-for-cloud-work)
and [sharing your app](docs/guides/sharing.md), including the existing bundled
`personal-free` fallback.

## Learn more

| I want to... | Start here |
| --- | --- |
| Turn an idea into an app | [Build your app](docs/guides/build-your-app.md) |
| Start, stop or resume locally | [Run locally](docs/guides/run-locally.md) |
| Install or verify assistant support | [SQL Apps plugin](docs/reference/plugins.md) |
| Share with other people | [Sharing your app](docs/guides/sharing.md) |
| Understand costs and free-tier limits | [Costs and growth](docs/guides/costs.md) |
| Find commands, configuration or contributor docs | [Documentation index](docs/README.md) |

## Important limits

- **Local first, not access-free.** The preferred SQL container is in private
  preview; other database routes are available. Tools and AI providers have
  their own access, licensing and pricing conditions. See [setup requirements](docs/guides/getting-started.md).
- **Sharing is optional, and charges may apply.** You are responsible for your
  Azure bill. Free allowances and cost guards are not a guarantee of no charges;
  budgets alert rather than stop spending. See [costs and safeguards](docs/guides/costs.md).
- **App Service, then containers, then SWA.** Assess compatible App Service Free
  first, then Container Apps with explicit acceptance of possible charges.
  Keep DAB on ACA with managed identity; SWA is only a fallback when the complete
  required setup fits Free. See [cloud planning](docs/reference/free-first.md).
- **Your assistant acts with real permissions.** Review plans and approvals,
  keep backups and do not bypass permissions. See [setup safety](docs/guides/getting-started.md#2-select-the-cli-and-optional-assistant-guidance).
- **Not production-ready as-is.** A working local app is not production
  certification. The personal cloud option has availability and networking
  trade-offs; review them before storing real or regulated data. See [sharing limits](docs/guides/sharing.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services.
Authorized use of Microsoft trademarks or logos must follow the [Microsoft Trademark and Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos is subject to those third parties' policies.

## License

[MIT](LICENSE). SQL Apps is provided "as is," without warranty of any kind.

For contributions and help, see [Contributing](CONTRIBUTING.md), [Support](SUPPORT.md) and [Security](SECURITY.md).
