# Install SQL Apps

[Back to SQL Apps](../README.md)

Choose your host below. Packaging and verification are different: consult the [verification matrix](./reference/releasing.md#verification-status) before relying on a host-specific workflow.

## Before you install

The marketplace is `sql-apps-skills`, and the plugin is `sql-apps`. The source repository is [microsoft/sql-apps](https://github.com/microsoft/sql-apps). The version in this checkout is the **0.2.1 patch release candidate**, not evidence that 0.2.1 has been published. Remote examples below install what is actually published in that repository. Existing 0.1.0 or 0.2.0 installations do not become 0.2.1 when a checkout changes: refresh the marketplace, update the plugin, and verify the installed bytes.

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

Start a fresh session and check `/plugin list`, then [verify the actual installed root](#verify-the-actual-installed-root). VS Code versions with marketplace chat commands use `/plugin marketplace add microsoft/sql-apps` followed by `/plugin install sql-apps@sql-apps-skills`; use that host's marketplace refresh and plugin update actions for an existing installation. CLI and VS Code installations/caches are separate: updating one does not prove the other changed. See the [VS Code plugin guide](https://code.visualstudio.com/docs/agent-customization/agent-plugins).

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

## Prerequisites

Install companions separately using their supported host setup. SQL Apps does not bundle or auto-install them.

| Capability | Setup |
| --- | --- |
| SQL expertise and local engine | [Microsoft SQL plugins](https://github.com/microsoft/microsoft-sql#choose-a-plugin): `microsoft-sql` for general coding hosts, or `microsoft-sql-vscode` for the MSSQL extension |
| Application data APIs (**mandatory**) | Discover installed Microsoft SQL DAB guidance (`dab-rest-and-graphql` or `azuresql-db-dab`) or the MSSQL extension's DAB tool (for example, `mssql_dab`). The VS Code SQL bundle intentionally omits overlapping DAB skills because the extension supplies tools; verify that the tool is actually available |
| Container guidance with the VS Code SQL bundle | Add `microsoft-azuresqldb-container` when needed; it is already included in the broad `microsoft-sql` bundle |
| Azure work | [Azure Skills](https://github.com/microsoft/azure-skills), following your host's setup and authentication guidance |
| Build and verification | Node.js/npm supported by the app tooling, specialist-documented SQL container prerequisites, and host browser/SQL tools |

For a general coding host, the Microsoft SQL marketplace's broad bundle includes DAB guidance. For example, in Copilot CLI:

```powershell
copilot plugin marketplace add microsoft/microsoft-sql
copilot plugin install microsoft-sql@microsoft-sql
```

Use the [Microsoft SQL host-specific installation instructions](https://github.com/microsoft/microsoft-sql#installation) for other hosts. In VS Code, enable the Microsoft MSSQL extension's DAB capability and verify host tool discovery, rather than installing overlapping broad SQL bundles just to get the same tool. Skill/tool names above are discovery examples, not a guarantee of installation. Follow the installed specialist to check/install the DAB runtime and its prerequisites; SQL Apps does not auto-install them.

If no Microsoft SQL DAB skill/tool is available, stop application data-API work with a specific prerequisite blocker and installation guidance. **Do not silently substitute direct Express-to-SQL CRUD for DAB.** Express is conditional for authentication, orchestration, or domain work, not a replacement data API; SQL invariants still belong in SQL. The assistant also checks real engine capabilities rather than substituting mocked persistence.

The default `poc` outcome is free-first, not a guarantee of zero Azure spend. Local-only has no Azure CLI or subscription requirement and does not enter cloud onboarding. A requested free Azure topology must be checked end-to-end using current specialist guidance; a missing free capability is not permission for a paid fallback. Requested cloud work still requires the specialist's prerequisites and approvals. Installing the plugin proves none of those runtime outcomes.

## Quick setup when a capability is missing

First identify the actual coding host and discover the skills/tools it loaded. Choose the SQL option matching that host; install Azure Skills and Azure CLI only when Azure work is requested. These companions are separate from SQL Apps.

### Microsoft SQL and DAB

- **General coding hosts:** install the broad [`microsoft-sql@microsoft-sql` plugin](https://github.com/microsoft/microsoft-sql#installation) using that host's official setup. For Copilot CLI, run:

  ```text
  copilot plugin marketplace add microsoft/microsoft-sql
  copilot plugin install microsoft-sql@microsoft-sql
  ```

- **VS Code:** install/enable the [Microsoft SQL Server (MSSQL) extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql), enable its DAB capability, then verify its DAB tool is actually discovered. The `microsoft-sql-vscode` plugin is tailored to that extension and normally should not be installed alongside the overlapping broad SQL plugin.
- **Other hosts:** follow the current [Microsoft SQL host-specific instructions](https://github.com/microsoft/microsoft-sql#installation); do not copy commands from a different host.

Refresh or restart the host and verify DAB guidance/tool discovery before app data-API work. Follow the specialist's instructions for the local SQL engine and DAB runtime. If DAB is still unavailable, explain the precise prerequisite and pause that work; do not replace it with direct Express-to-SQL CRUD or mocked persistence.

### Azure Skills

Azure Skills are needed for Azure planning/deployment workflows, not for local-only app work. Choose the host's supported setup from the [official Azure Skills installation guide](https://github.com/microsoft/azure-skills#install-in-60-seconds). For example:

- **VS Code:** install the [Azure MCP extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azure-mcp-server), which installs its companion skills extension. Git CLI is required for that skills extension.
- **Copilot CLI:** add the marketplace, then install the plugin:

  ```text
  /plugin marketplace add microsoft/azure-skills
  /plugin install azure@azure-skills
  ```

- **Other hosts:** use the official guide's host-specific instructions. The guide lists Node.js 18+ and Azure CLI authentication for Azure workflows; Azure Developer CLI is only needed when the selected workflow uses `azd`.

After setup, start a fresh session and confirm the skills/tools are available. An installed plugin alone does not authenticate the user, validate a deployment, or authorize cloud changes.

### Azure CLI on Windows

For local Azure workflows that need `az`, install it from an elevated or standard PowerShell terminal, subject to your organization's device policy:

```powershell
winget install --exact --id Microsoft.AzureCLI
```

Close and reopen the terminal, then verify:

```powershell
az version
```

See Microsoft's [Azure CLI Windows installation guide](https://learn.microsoft.com/cli/azure/install-azure-cli-windows) for MSI and other installation methods. If local installation is unavailable, [Azure Cloud Shell](https://portal.azure.com/#cloudshell/) provides Azure CLI in a browser after the user signs in. A local assistant cannot assume it can operate that browser shell; the user can run approved commands there and share non-sensitive output.

`az login` is an interactive user-controlled sign-in, not an install step. Run it only when the user has chosen an Azure task and the required authentication method; let the user complete the browser/device flow. Never ask for, read, store, or echo credentials, tokens, or secrets. Use `az account show` to confirm the signed-in context and have the user select the intended subscription where applicable. Do not install `azd` unless the chosen deployment path requires it.

### For an assistant: discover, offer, and proceed with approval

Copy this request into the coding assistant:

> Use SQL Apps. First inspect this host's available skills/tools and tell me what is missing. Distinguish local work from Azure work: local-only work needs no Azure CLI, Azure sign-in, or subscription. For each missing prerequisite, name the exact host-specific install/enable action and its effect. Do not install, enable, authenticate, or change host/system configuration until I approve that specific action. After approval, perform only the approved setup, then restart/refresh and verify actual capability discovery. Let me complete any interactive sign-in; never request or handle secrets. If DAB remains unavailable, state the blocker and next setup step—do not substitute Express CRUD or mocked persistence. Before any Azure write, present one concise review of target resources, cost posture, security/access changes, and uncertainties, and wait for explicit approval. Do not silently choose a paid fallback.

An approval to install or enable a plugin/extension does not approve Azure sign-in, subscription changes, resource creation, spend, access changes, or destructive actions. If a tool or setup step fails, report the observed result and offer one bounded alternative from the official host guidance rather than repeating discovery indefinitely.

## Verify the actual installed root

Use Node.js 22 or later and the [release verifier](../scripts/verify-release.mjs) from the approved release checkout. Find the root the host **actually loaded**, containing `plugin.json` and `skills`, using its plugin diagnostics/listing or the loaded skill's path. Do not supply the repository, `--plugin-dir`, Gemini's development link, or merely the marketplace registration path.

For VS Code, enumerate cache candidates without modifying them:

```powershell
Get-ChildItem "$env:APPDATA\Code\agentPlugins" -Directory -Filter '*sql-apps*' |
  ForEach-Object { Get-ChildItem $_.FullName -Directory } |
  Select-Object -ExpandProperty FullName
```

There may be several hash-named copies. Match the one used by the current host session; the newest-looking directory alone is not proof of the active install. With that actual path:

```powershell
$installedRoot = Read-Host 'Actual installed SQL Apps package root'
node C:\git\sql-apps-v3\scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root "$installedRoot"
```

Success reports `PASS sql-apps 0.2.1`, the compared roots, skill file count, and a SHA-256 payload fingerprint. The verifier checks every manifest/catalog, release identity/version, and all shipped skill/reference/template bytes, including missing or extra files. It rejects the source itself and linked skill payloads. A stale version, same-version edited guidance, missing file, or wrong root exits nonzero with the failing paths.

After install/update, restart or open a fresh session, confirm the reported plugin version and loaded path, and rerun this command on that path. Then explicitly invoke SQL Apps and check actual Microsoft SQL DAB discovery before app work. A verified unpacked package or `source: live` listing does not prove the host loaded a copied install, and byte verification does not prove app execution. See the [release checks](./reference/releasing.md#package-and-installed-copy-verification) for packaging and isolated testing.

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
