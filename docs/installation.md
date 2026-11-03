# Install SQL Apps

[Back to SQL Apps](../README.md)

Choose your assistant below, install SQL Apps, then start a fresh session and
confirm skill discovery. Installation adds guidance only; it does not install
application dependencies, configure identity, create a database or deploy an app.

## Before you install

The marketplace is `sql-apps-skills`, and the plugin is `sql-apps`. The source repository is [microsoft/sql-apps](https://github.com/microsoft/sql-apps). This checkout is the **0.3.0 release candidate**, not evidence of publication. Remote commands install the published version. For an existing installation refresh/update through your host, then check its reported version and skill discovery in a fresh session.

Local examples use `C:\git\sql-apps-v3`; replace that with your downloaded checkout. Installation/registration changes host configuration, so review its prompts. Registration alone does not install a plugin.

If another SQL Apps plugin or skill is enabled, disable the other copy while testing to avoid ambiguous discovery. Do not delete an existing installation just to test.

## GitHub Copilot and VS Code

For Copilot CLI:

```powershell
copilot plugin marketplace add microsoft/sql-apps
copilot plugin install sql-apps@sql-apps-skills
```

For a local marketplace, replace the first command with:

```powershell
copilot plugin marketplace add C:\git\sql-apps-v3
```

After an authorized release is published, update an existing CLI installation with:

```powershell
copilot plugin marketplace update sql-apps-skills
copilot plugin update sql-apps@sql-apps-skills
copilot plugin list --json
```

Start a fresh session, check `/plugin list` for the version, and invoke SQL Apps from skill discovery. VS Code versions with marketplace chat commands use `/plugin marketplace add microsoft/sql-apps` followed by `/plugin install sql-apps@sql-apps-skills`; use that host's refresh/update actions for an existing installation. CLI and VS Code installations are separate. See the [VS Code plugin guide](https://code.visualstudio.com/docs/agent-customization/agent-plugins).

### Local VS Code development

Enable `chat.plugins.enabled` if necessary, then add the directory to user settings:

```json
{
  "chat.pluginLocations": {
    "C:\\git\\sql-apps-v3": true
  }
}
```

Reload if discovery has not refreshed. Find `sql-apps` in **Configure Skills** or the slash-command picker. Do not also install the same copy through another route.

For session-only CLI discovery without marketplace registration:

```powershell
copilot --plugin-dir C:\git\sql-apps-v3 plugin list --json
```

These are development loaders, not copied-install verification. Some CLI versions also register a local marketplace plugin as `source: live`, with `installedFrom` pointing to the checkout; this still does not test an independently packaged installation.

## Claude Code

```powershell
claude plugin marketplace add microsoft/sql-apps
claude plugin install sql-apps@sql-apps-skills
```

For local testing without installation:

```powershell
claude --plugin-dir C:\git\sql-apps-v3
```

Start a fresh session after installation. Find the skill in the command picker (typically `/sql-apps:sql-apps`) or ask Claude to use SQL Apps. See [Claude plugin installation](https://code.claude.com/docs/en/discover-plugins).

## OpenAI Codex

```powershell
codex plugin marketplace add microsoft/sql-apps
```

For a local checkout, use `codex plugin marketplace add C:\git\sql-apps-v3`. Then open the Plugins Directory in a supported Codex surface, select **SQL Apps Skills**, and install **SQL Apps**. Restart or start a new session.

The catalog uses `.agents/plugins/marketplace.json`; `.codex-plugin/plugin.json` provides compatibility metadata. Availability varies by surface; the Codex IDE extension does not currently support plugins. This package targets coding-capable Codex surfaces, not every ChatGPT surface. See [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins).

## Gemini CLI

Gemini uses an extension:

```powershell
gemini extensions install https://github.com/microsoft/sql-apps
```

For local development:

```powershell
gemini extensions link C:\git\sql-apps-v3
```

Restart, then check `/extensions list` and `/skills list`. Installation copies the extension; linking uses the development directory. Update an installed copy with `gemini extensions update sql-apps`.

The extension discovers the shared root `skills` directory without globally injecting the constitution. Review activation consent. See [Gemini extensions](https://geminicli.com/docs/extensions/reference/) and [skill discovery](https://geminicli.com/docs/cli/skills/).

## Cursor

For a team marketplace:

1. Open **Dashboard -> Plugins & MCPs -> Team Marketplaces -> Add Marketplace**.
2. Choose **Import from Repo** and enter `https://github.com/microsoft/sql-apps`.
3. Review **SQL Apps**, make it available to the team, then install from **Customize**.

This requires an eligible Teams/Enterprise plan and applicable permissions. Public Cursor Marketplace listing is a separate submission/review process; this repository is not automatically listed. Cursor supports the portable root manifest as well as the included native compatibility metadata. See [Cursor marketplaces](https://cursor.com/docs/plugins) and [plugin formats](https://cursor.com/docs/reference/plugins).

## Application prerequisites

Read this section only when building or running an app. The supported database is
the local Azure SQL Database container or Azure SQL Database in Azure; neither
preview access nor an existing subscription silently selects cloud deployment.
If the local container is unavailable, ask before choosing cloud, and keep
persistence unverified until real SQL and the selected API work.

The local SQL container is in **Private Preview**. Access requires [preview
signup](https://aka.ms/sqldbcontainerpreview-signup) and the [official
quickstart](https://microsoft.github.io/azure-sql-database-container/getting-started.html).
For tool setup and profile-specific identity, read the
[prerequisite guide](../skills/sql-apps/references/prerequisites.md).

Install companions separately using their supported host setup. SQL Apps does not bundle or auto-install them.

| Capability | Setup |
| --- | --- |
| SQL expertise and local engine | [Microsoft SQL plugins](https://github.com/microsoft/microsoft-sql#choose-a-plugin): `microsoft-sql` for general coding hosts, or `microsoft-sql-vscode` for the MSSQL extension |
| Selected application API | For DAB only, discover Microsoft SQL DAB guidance (`dab-rest-and-graphql` or `azuresql-db-dab`) or the MSSQL extension's DAB tool (for example, `mssql_dab`). The VS Code SQL bundle omits overlapping DAB skills because the extension supplies tools. Explicit Functions needs Core Tools 4 and SWA CLI 2 for local work, not DAB |
| Container guidance with the VS Code SQL bundle | Add `microsoft-azuresqldb-container` when needed; it is already included in the broad `microsoft-sql` bundle |
| Azure deployment | Azure CLI with Bicep, Docker, and an approved registry for the [bundled Container Apps recipe](../skills/sql-apps/templates/starter/deployment.md); no extra cloud skills plugin |
| Build and verification | Node.js/npm supported by the app tooling, specialist-documented SQL container prerequisites, and host browser/SQL tools |

For SQL/selected-API setup and private-preview local-engine access, use the [bundled prerequisite guide](../skills/sql-apps/references/prerequisites.md). The listed skill/tool names are discovery examples, not a guarantee of installation.

If the selected API or Azure SQL target is unavailable, give its supported setup path. Useful UI, schema, and scaffolding work can continue, but mark persistence and end-to-end checks incomplete. Do not substitute another database, mocked persistence, or direct Express-to-SQL CRUD.

Local-only work needs no Azure CLI or subscription. Cloud work has separate
[resource, cost and access gates](../skills/sql-apps/references/deployment.md).

## Project instructions and troubleshooting

Open the application directory, not the installed plugin directory. Ask the assistant explicitly to use SQL Apps. If discovery fails, check plugin enablement, refresh/restart the host, and check for duplicate skill names.

Normal installation ends with the host-reported version, skill discovery and a
fresh session. Suspected stale/corrupt packages and maintainer install/update
testing use [installed-root byte verification](./reference/releasing.md#verify-the-actual-installed-root);
cache enumeration and payload fingerprints are not routine onboarding.

The generated project retains a policy block in the active host's instruction file:

| Host | Default project instructions |
| --- | --- |
| Copilot | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` |
| Codex / Cursor | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |

Existing deliberately configured locations are respected. Only the active host's policy is written; changing hosts requires reconciling existing policy copies, not creating five competing constitutions. Installation alone does not make an on-demand skill always-on.
