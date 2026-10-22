# SQL Apps

<img src="content/icons/sql-apps.png" alt="SQL Apps icon: a blue database with a purple application ribbon" width="160">

**Your idea. Your assistant. Your app.**

Build SQL-backed web applications with the coding assistant you already use. Describe your idea, shape the important rules, and build a working application you own. Start locally. Deploy to Azure when you're ready.

SQL Apps is a lightweight assistant plugin, not another application platform. It brings an opinionated TypeScript stack and connects your assistant with existing Microsoft SQL and Azure expertise. No SQL Apps account, hosted service, or application runtime.

[Get started](#get-started) · [Install for your assistant](./docs/installation.md) · [Reference](#learn-more)

> **Preview · 0.1.0** — Packaging is available for five assistant families. Application-generation and deployment validation is still in progress; see [verification status](./docs/reference/releasing.md#verification-status).

## What will you build?

Track shared equipment, manage inventory, collect event registrations, or give your team a better approval workflow.

> "Build an equipment reservation app. Staff manage equipment, members reserve it, and overlapping reservations aren't allowed."

These are your applications, not prebuilt demo templates. Your assistant builds the screens, data rules, and workflows around your requirements.

## What you get

- **A stack chosen for you.** TypeScript, React, Express, and Azure SQL Database—less setup debate, more time building.
- **A considered interface.** Shared design conventions for accessible, responsive screens with light and dark themes.
- **Real SQL workflows.** Guidance to verify saves, reloads, validation, and access rules against a real database—not just an empty scaffold.
- **An independent project.** Source, migrations, tests, configuration, and run instructions that remain yours without the plugin.
- **A path to Azure.** Optional deployment with reviewed resources, access settings, and costs.

## Get started

### 1. Install for your assistant

| Assistant | Setup |
| --- | --- |
| GitHub Copilot / VS Code | [Plugin marketplace or local setup](./docs/installation.md#github-copilot-and-vs-code) |
| Claude Code | [Plugin marketplace](./docs/installation.md#claude-code) |
| OpenAI Codex | [Codex marketplace](./docs/installation.md#openai-codex) |
| Gemini CLI | [Gemini extension](./docs/installation.md#gemini-cli) |
| Cursor | [Team marketplace](./docs/installation.md#cursor) |

The marketplace install coordinate is **`sql-apps@sql-apps-skills`**. Use the [installation guide](./docs/installation.md) for the appropriate host; Gemini uses an extension instead.

### 2. Connect the specialists

Install the [Microsoft SQL guidance](https://github.com/microsoft/microsoft-sql#choose-a-plugin) appropriate to your host and check the local database prerequisites. Add [Azure Skills](https://github.com/microsoft/azure-skills) when you need Azure capabilities.

SQL Apps does not install these companions or the database automatically. See [prerequisites](./docs/installation.md#prerequisites) for bundle choices and tooling. Local-only development does not require cloud onboarding.

### 3. Describe your app

Open the directory where you want the application—not the plugin directory—and ask:

> Use SQL Apps to build an equipment reservation application. Staff manage equipment; members reserve it; overlapping reservations must be rejected. Ask about important missing rules, then build and verify one complete workflow. Finish locally; do not deploy yet.

Your assistant clarifies the consequential rules, confirms a short brief, and builds across the interface, server, and SQL database.

**A useful first result:** save a reservation, reload it from SQL, and reject a conflicting reservation. The assistant should tell you what it checked and what remains blocked.

### 4. Make it yours. Share when ready.

Continue with a change:

> Add staff approval before a reservation is confirmed. Preserve the overlap rule and rerun the affected checks.

When you're ready for Azure:

> Help me deploy this app. Show me the proposed resources, access settings, and estimated costs before making cloud changes.

Deployment is optional and requires its own approvals. Cloud charges may apply.

## Built on a familiar stack

| Layer | Default |
| --- | --- |
| Interface | React, Vite, TypeScript |
| Design | Tailwind CSS v4, Radix primitives, Lucide icons |
| Application | Node.js and Express |
| Data | Azure SQL Database, with server-side `mssql` access |
| Azure hosting | App Service and Azure SQL Database |

Start with one application and one database. Add storage, identity, telemetry, or secret management only when needed. See the [stack and service profile](./skills/sql-apps/references/constitution.md) for the full boundary.

## Your app stays yours

SQL Apps leaves ordinary project files, a concise application brief, and project instructions your assistant can use in a new conversation. The generated application does not depend on SQL Apps to run.

We also align package boundaries and design conventions with [Rayfin](https://github.com/microsoft/rayfin), including a `rayfin.yml` configuration using `dialect: mssql`. This prepares for future migration without adopting Rayfin's runtime or claiming released SQL compatibility. See [Rayfin alignment](./skills/sql-apps/references/rayfin-alignment.md).

## Learn more

| I want to... | Read |
| --- | --- |
| Install or troubleshoot assistant discovery | [Installation and prerequisites](./docs/installation.md) |
| Understand the supported stack | [Project constitution](./skills/sql-apps/references/constitution.md) |
| Understand the UI conventions | [App design](./skills/sql-apps/references/app-design.md) |
| Plan for a future Rayfin migration | [Rayfin alignment](./skills/sql-apps/references/rayfin-alignment.md) |
| Inspect the service configuration | [rayfin.yml template](./skills/sql-apps/templates/rayfin.yml) |
| Validate or distribute the plugin | [Packaging, verification, and releases](./docs/reference/releasing.md) |
| Report a problem or find support limits | [Support](./SUPPORT.md) |

## Important limits

SQL Apps is preview guidance, not a security sandbox or production certification. Review generated code, access controls, migrations, and recovery before using real or regulated data. Tools, AI providers, the local SQL container, and Azure services have their own availability, licensing, and pricing conditions.

Review plans and permissions, keep backups, and never commit credentials. You are responsible for Azure charges; free allowances do not guarantee a zero bill, and budget alerts do not stop spending. No service-level agreement or Microsoft support commitment is provided; Azure support remains governed by your Azure agreement. See [Support](./SUPPORT.md).

## Security and community

**Do not report vulnerabilities in public issues.** Follow [Security](./SECURITY.md) for private reporting. Never include secrets or private user data in public reports.

This project follows the [Microsoft Open Source Code of Conduct](./CODE_OF_CONDUCT.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services.
Authorized use of Microsoft trademarks or logos must follow the [Microsoft Trademark and Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos is subject to those third parties' policies.

## License

Licensed under the [MIT License](./LICENSE).
SQL Apps is provided "as is," without warranty of any kind, subject to the full terms and liability limitations in the license.
