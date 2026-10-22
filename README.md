# SQL Apps

<img src="content/icons/sql-apps.png" alt="SQL Apps icon: a blue database with a purple application ribbon" width="160">

**Your idea. Your assistant. Your app.**

Build SQL-backed web applications with the coding assistant you already use. Describe your idea, shape the important rules, and build a working application you own.

SQL Apps is a lightweight assistant plugin—not an application platform. It guides your assistant to build an independent app with TypeScript, React, Data API builder (DAB), and Azure SQL Database. No SQL Apps account, hosted service, or runtime is required.

## What you get

- **A complete app, not a mockup.** Build useful screens and workflows backed by real SQL data and business rules.
- **A clear path from local to cloud.** Start with local development; Azure provisioning is optional.
- **An app you own.** Keep the source, migrations, tests, configuration, and run instructions.

## Get started

### 1. Install SQL Apps

| Assistant | Setup |
| --- | --- |
| GitHub Copilot / VS Code | [Plugin marketplace or local setup](./docs/installation.md#github-copilot-and-vs-code) |
| Claude Code | [Plugin marketplace](./docs/installation.md#claude-code) |
| OpenAI Codex | [Codex marketplace](./docs/installation.md#openai-codex) |
| Gemini CLI | [Gemini extension](./docs/installation.md#gemini-cli) |
| Cursor | [Team marketplace](./docs/installation.md#cursor) |

The marketplace install coordinate is **`sql-apps@sql-apps-skills`**. See the [installation guide](./docs/installation.md) for host setup and required companion tools.

### 2. Build your first workflow

Open the directory where you want the application and ask:

> Use SQL Apps to build an equipment reservation app. Staff manage equipment; members reserve it; overlapping reservations must be rejected. Ask about important missing rules, then build and verify one complete workflow locally.

The assistant helps shape the requirements, then builds and tests the app. Try saving a reservation, reloading it from SQL, and rejecting a conflicting reservation.

## Learn more

| Topic | Guide |
| --- | --- |
| Missing plugins and local setup options | [Quick setup](./docs/installation.md#quick-setup-when-a-capability-is-missing) |
| Supported architecture and project rules | [Project constitution](./skills/sql-apps/references/constitution.md) |
| Cloud readiness, deployment approvals, and validation | [Deployment guidance](./skills/sql-apps/references/deployment.md) |
| Resource naming and attribution tags | [Deployment attribution](./skills/sql-apps/references/deployment-attribution.md) |
| UI conventions | [App design](./skills/sql-apps/references/app-design.md) |
| Future Fabric migration boundaries | [Rayfin alignment](./skills/sql-apps/references/rayfin-alignment.md) |
| Plugin packaging, validation, and release status | [Release and verification guide](./docs/reference/releasing.md) |
| Support limits | [Support](./SUPPORT.md) |

## Preview and important limits

SQL Apps is **preview guidance**, currently at version **0.2.1**. Packaging exists for five assistant families; end-to-end application-generation and Azure deployment validation remain in progress. Check the [verification status](./docs/reference/releasing.md#verification-status) before relying on a host or deployment path.

Review generated code, access controls, migrations, and recovery before using real or regulated data. Azure deployment requires its own review and approval; free allowances do not guarantee zero cost, and budget alerts do not stop spending. You are responsible for charges. Tools, AI providers, local database containers, and Azure services have separate availability, licensing, and pricing terms. No service-level agreement or Microsoft support commitment is provided; Azure support follows your Azure agreement. See [Support](./SUPPORT.md).

Never commit credentials or private user data. Do not report vulnerabilities in public issues; follow [Security](./SECURITY.md) for private reporting.

This project follows the [Microsoft Open Source Code of Conduct](./CODE_OF_CONDUCT.md). Use of Microsoft and third-party trademarks or logos must follow their respective policies.

## License

Licensed under the [MIT License](./LICENSE). SQL Apps is provided "as is," without warranty, subject to the license terms.
