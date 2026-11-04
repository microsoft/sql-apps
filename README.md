# SQL Apps

<img src="content/icons/sql-apps.png" alt="SQL Apps icon: a blue database with a purple application ribbon" width="160">

**Idea -> tested local app -> approved deployment.**
SQL Apps guides your coding assistant; you own the source, migrations and tests.

**Stack:** React/Vite, TypeScript, Azure SQL and DAB by default; Functions is an
explicit alternative. Start new apps in an empty directory; edit compatible
existing apps in place.

## Get started

### 1. Install SQL Apps

| Assistant | Setup |
| --- | --- |
| GitHub Copilot / VS Code | [Marketplace or local setup](./docs/installation.md#github-copilot-and-vs-code) |
| Claude Code | [Marketplace](./docs/installation.md#claude-code) |
| OpenAI Codex | [Codex marketplace](./docs/installation.md#openai-codex) |
| Gemini CLI | [Gemini extension](./docs/installation.md#gemini-cli) |
| Cursor | [Team marketplace](./docs/installation.md#cursor) |

Install **`sql-apps@sql-apps-skills`**.

### 2. Build your first workflow

Open the application directory and ask:

> Use SQL Apps to build an equipment reservation app. Staff manage equipment;
> members reserve it; overlapping reservations must be rejected. Ask about
> important missing rules, then build and verify one complete workflow locally.

Follow the [local guide](./skills/sql-apps/templates/starter/README.md).

## Guides

| Need | Guide |
| --- | --- |
| Missing tools, SQL or identity | [Prerequisites](./skills/sql-apps/references/prerequisites.md) |
| Project rules | [Constitution](./skills/sql-apps/references/constitution.md) |
| UI | [App design](./skills/sql-apps/references/app-design.md) |
| Choose a cloud host | [Deployment shapes](./skills/sql-apps/references/deployment-shapes.md) |
| Deploy | [Approval policy](./skills/sql-apps/references/deployment.md) / [operator runbook](./skills/sql-apps/templates/starter/deployment.md) |
| Compatibility and tested limits | [Release record](./docs/reference/releasing.md) |

## Preview limits

Local Azure SQL requires [Private Preview access](./docs/installation.md#application-prerequisites);
on-premises SQL Server is unsupported. Missing setup means unverified persistence,
not automatic cloud deployment.

Review generated code before using real data. Cloud writes require
[target, cost and access approval](./skills/sql-apps/references/deployment.md#what-never-counts-as-approval-or-proof);
you are responsible for charges and provider terms.

See [Support](./SUPPORT.md), [Security](./SECURITY.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).
[MIT License](./LICENSE).
