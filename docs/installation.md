# Install SQL Apps

[Back to SQL Apps](../README.md)

Choose your host below. Packaging and verification are different: consult the [verification matrix](./reference/releasing.md#verification-status) before relying on a host-specific workflow.

## Before you install

The marketplace is `sql-apps-skills`, and the plugin is `sql-apps`. The source repository is [microsoft/sql-apps](https://github.com/microsoft/sql-apps). Remote examples below install from this repository. If you previously installed SQL Apps, refresh the marketplace and update the plugin to get this implementation.

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

Start a fresh session and check `/plugin list`. VS Code versions with marketplace chat commands use `/plugin marketplace add microsoft/sql-apps` followed by `/plugin install sql-apps@sql-apps-skills`. See the [VS Code plugin guide](https://code.visualstudio.com/docs/agent-customization/agent-plugins).

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

## Prerequisites

Install companions separately using their supported host setup. SQL Apps does not bundle or auto-install them.

| Capability | Setup |
| --- | --- |
| SQL expertise and local engine | [Microsoft SQL plugins](https://github.com/microsoft/microsoft-sql#choose-a-plugin): `microsoft-sql` for general coding hosts, or `microsoft-sql-vscode` for the MSSQL extension |
| Container guidance with the VS Code SQL bundle | Add `microsoft-azuresqldb-container` when needed; it is already included in the broad `microsoft-sql` bundle |
| Azure work | [Azure Skills](https://github.com/microsoft/azure-skills), following your host's setup and authentication guidance |
| Build and verification | Node.js/npm supported by the app tooling, specialist-documented SQL container prerequisites, and host browser/SQL tools |

Do not install overlapping SQL bundles unnecessarily. The assistant checks actual capabilities and reports missing prerequisites rather than substituting mocked persistence. Local-only builds do not enter cloud onboarding or require an Azure subscription. Requested cloud work still requires the specialist's prerequisites and approvals.

## Project instructions and troubleshooting

Open the application directory, not the installed plugin directory. Ask the assistant explicitly to use SQL Apps. If discovery fails, check plugin enablement, refresh/restart the host, and check for duplicate skill names.

The generated project retains a policy block in the active host's instruction file:

| Host | Default project instructions |
| --- | --- |
| Copilot | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` |
| Codex / Cursor | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |

Existing deliberately configured locations are respected. Only the active host's policy is written; changing hosts requires reconciling existing policy copies, not creating five competing constitutions. Installation alone does not make an on-demand skill always-on.
