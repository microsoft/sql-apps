# SQL Apps

<img src="content/icons/sql-apps.png" alt="SQL Apps icon: a blue database with a purple application ribbon" width="160">

**Your idea. Your assistant. Your app.**

Build SQL-backed web applications with the coding assistant you already use. Describe your idea, shape the important rules, and build a working application you own. Start with a small, useful proof of concept (PoC), using Data API builder (DAB) and deployment-shaped local packaging. Provisioning is optional; architectural readiness is not. Prefer free services, disclose uncertainty, and approve any spending explicitly.

SQL Apps is a lightweight assistant plugin, not another application platform. It brings an opinionated TypeScript stack and connects your assistant with existing Microsoft SQL and Azure expertise. No SQL Apps account, hosted service, or application runtime.

[Get started](#get-started) · [Install for your assistant](./docs/installation.md) · [Reference](#learn-more)

> **Preview · 0.2.1 release candidate** — Free-first, deployment-shaped DAB-based PoC guidance. Packaging is available for five assistant families. Application-generation and deployment validation is still in progress; see [verification status](./docs/reference/releasing.md#verification-status). Check the installed package version and payload, not just this checkout.

## What will you build?

Track shared equipment, manage inventory, collect event registrations, or give your team a better approval workflow.

> "Build an equipment reservation app. Staff manage equipment, members reserve it, and overlapping reservations aren't allowed."

These are your applications, not prebuilt demo templates. Your assistant builds the screens, data rules, and workflows around your requirements.

## What you get

- **A stack chosen for you.** TypeScript, React, DAB, and Azure SQL Database; custom Node.js/Express code only when needed.
- **A considered interface.** Shared design conventions for accessible, responsive screens with light and dark themes.
- **Real SQL workflows.** Application requests traverse DAB, with authorization at the API boundary and transactional business invariants enforced in SQL—not just an empty scaffold.
- **An independent project.** Source, migrations, tests, configuration, and run instructions that remain yours without the plugin.
- **A free-first path to Azure.** The brief records `intent: poc` and `costPreference: free-first`; explicitly choose `costPreference: zero-azure-spend` for strict zero spend. Neither mode promises guaranteed free operation. Specialists preserve accepted component-specific decisions, investigate uncertainty, and request precise approvals rather than silently upgrading.
- **Deployment-ready local delivery.** Pinned DAB, portable configuration, supported authentication, reproducible UI/server/DAB/SQL packaging and documented hosting requirements, without mandatory Azure provisioning.

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

Install the [Microsoft SQL guidance](https://github.com/microsoft/microsoft-sql#choose-a-plugin) appropriate to your host, including DAB guidance, and check the local database and DAB runtime prerequisites. Add [Azure Skills](https://github.com/microsoft/azure-skills) when you need Azure capabilities. If a companion or Azure CLI is missing, follow [quick setup when a capability is missing](./docs/installation.md#quick-setup-when-a-capability-is-missing) for host-specific, approval-gated steps.

SQL Apps does not install these companions or the database automatically. See [prerequisites](./docs/installation.md#prerequisites) for bundle choices and tooling. Local-only development does not require Azure CLI, Azure sign-in, or a subscription.

### 3. Describe your app

Open the directory where you want the application—not the plugin directory—and ask:

> Use SQL Apps to build an equipment reservation application. Staff manage equipment; members reserve it; overlapping reservations must be rejected. Ask about important missing rules, then build and verify one complete workflow. Finish locally; do not deploy yet.

Your assistant clarifies consequential rules, confirms a short brief with PoC/free-first defaults, and builds across the interface, DAB, and SQL database. SQL—not just the UI—rejects conflicting reservations. Local completion includes packaged startup/restart checks and documented deployment-readiness gaps, not only a development server.

**A useful first result:** save a reservation, reload it from SQL, and reject a conflicting reservation. The assistant should tell you what it checked and what remains blocked.

### 4. Make it yours. Share when ready.

Continue with a change:

> Add staff approval before a reservation is confirmed. Preserve the overlap rule and rerun the affected checks.

When you're ready for Azure:

> Help me deploy this app. Keep PoC/free-first intent. Review the complete topology, artifacts, costs, security changes and remaining uncertainties together. Investigate safely, preserve accepted decisions, and ask for precise approval before cloud writes or spend/access changes. If paid hosting is needed, show the scoped option without relaxing SQL-free requirements.

Deployment is optional and requires its own approvals. "Deploy" does not mean production-grade or authorize charges. Availability, scale, and compliance requirements must be explicit; they still do not authorize spend.

## Built on a familiar stack

| Layer | Default |
| --- | --- |
| Interface | React, Vite, TypeScript |
| Design | Tailwind CSS v4, Radix primitives, Lucide icons |
| Application data APIs | Data API builder (DAB), with role/ownership authorization |
| Business invariants | SQL constraints and transaction-safe procedures exposed through DAB |
| Custom server | Node.js/Express only for necessary authentication, orchestration, or domain behavior |
| Data | Azure SQL Database, accessed by a least-privilege DAB identity |
| Azure hosting | Complete free-first topology review; no automatic paid SKU |

Start with one application and one database. Add storage, identity, telemetry, or secret management only when needed. See the [stack and service profile](./skills/sql-apps/references/constitution.md) for the full boundary.

Free SKUs and offers with enforced quota stops differ from metered allowances. Trials, credits, and consumption grants do not guarantee zero spend. Qualifying Azure SQL free-offer databases must use monthly free-limit `AutoPause`, not overage billing; idle auto-pause alone is insufficient. Azure SQL Basic is paid. Free hosting must also support the actual DAB runtime, authorization, and publication path—free static hosting alone is not a complete topology.

Acceptance includes real UI-to-DAB-to-SQL requests, direct API authorization denials with allowed controls, SQL invariant/concurrency checks, and, if deployed, actual resource settings read back against the approved cost posture. A zero estimate or unused DAB configuration is not proof.

Missing evidence is not confirmed incompatibility. Tool failures get bounded recovery and every blocker gets a next safe action. Routine non-destructive local build/test is covered by implementation approval and host permissions; cloud writes, spend/access changes and destructive actions keep explicit gates. No exercised core cloud recipe is bundled yet; see [deployment guidance and recipe acceptance](./skills/sql-apps/references/deployment.md). Static tests do not establish cloud readiness or a successful deployment.

## Deployment metadata

New Azure deployments default to one attribution tag, **`sqlapps-version=<adopted guidance version>`**, and a final **`sqlapps`** suffix on newly generated resource names, such as `app-demo-dev-a1b2c3-sqlapps` or `stdemodeva1b2c3sqlapps`. Environment and uniqueness tokens come before the suffix. The brief records the version and naming choices; the Azure workflow applies and verifies them. Resource-group tags do not automatically propagate to resources.

These are customer-editable defaults with documented overrides. Preserve customer tags and existing resources; never rename or replace resources for attribution. No runtime instrumentation, new monitoring resources, or direct data access is added for attribution. Local-only apps require no Azure checks.

This identifies resource footprint, not active usage or unique applications, and does not grant Microsoft additional visibility or send SQL Apps a usage report. See [deployment attribution](./skills/sql-apps/references/deployment-attribution.md) for provenance, naming constraints, exceptions, and measurement limits.

## Your app stays yours

SQL Apps leaves ordinary project files, a concise application brief, and project instructions your assistant can use in a new conversation. The generated application does not depend on SQL Apps to run.

We also align package boundaries and design conventions with [Rayfin](https://github.com/microsoft/rayfin), including a `rayfin.yml` configuration using `dialect: mssql`. This prepares for future migration without adopting Rayfin's runtime or claiming released SQL compatibility. See [Rayfin alignment](./skills/sql-apps/references/rayfin-alignment.md).

## Learn more

| I want to... | Read |
| --- | --- |
| Install or troubleshoot assistant discovery | [Installation and prerequisites](./docs/installation.md) |
| Understand the supported stack | [Project constitution](./skills/sql-apps/references/constitution.md) |
| Understand deployment tags and naming | [Deployment attribution](./skills/sql-apps/references/deployment-attribution.md) |
| Understand the UI conventions | [App design](./skills/sql-apps/references/app-design.md) |
| Plan for a future Fabric migration | [Rayfin alignment](./skills/sql-apps/references/rayfin-alignment.md) |
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
