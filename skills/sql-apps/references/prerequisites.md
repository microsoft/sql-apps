# Prerequisites and missing capabilities

SQL Apps does not bundle companion plugins, the local database engine, DAB, Azure CLI, or Azure Skills. Discover what the active host actually provides before relying on it. Use the supported setup for that host, and ask before changing host or system configuration.

## SQL, DAB, and local database

For general coding hosts, install the broad [Microsoft SQL plugin](https://github.com/microsoft/microsoft-sql#installation). For Copilot CLI:

```text
copilot plugin marketplace add microsoft/microsoft-sql
copilot plugin install microsoft-sql@microsoft-sql
```

In VS Code, install or enable the [Microsoft SQL Server extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql), enable its DAB capability, and confirm the DAB tool is discovered. It normally replaces the overlapping `microsoft-sql-vscode` bundle. On other hosts, use Microsoft's [host-specific instructions](https://github.com/microsoft/microsoft-sql#installation).

After setup, refresh or restart the host and check DAB skill/tool discovery. For local database setup, follow the installed SQL specialist's instructions; the Azure SQL Database container is currently in **Private Preview**. Local startup requires [preview access](https://aka.ms/sqldbcontainerpreview-signup) and the [official quickstart](https://microsoft.github.io/azure-sql-database-container/getting-started.html). Installing SQL guidance does not grant registry access. The user must complete any interactive registry login; never handle or paste credentials. Do not enroll, accept terms, or authenticate without explicit approval.

If DAB or an allowed local engine is missing, explain the host-specific setup and let the user decide. Useful UI, schema, and scaffolding work may continue, but database persistence and end-to-end checks stay incomplete until real DAB and SQL are available. Do not substitute mock persistence, a different database, or direct Express-to-SQL CRUD. Express is only for necessary authentication, orchestration, or domain behavior.

## Azure tools

Azure Skills and Azure CLI are needed only for Azure work, not local-only development. Choose the host setup from the [Azure Skills installation guide](https://github.com/microsoft/azure-skills#install-in-60-seconds).

- **VS Code:** Install the [Azure MCP extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azure-mcp-server); Git CLI is required by its companion skills extension.
- **Copilot CLI:**

  ```text
  /plugin marketplace add microsoft/azure-skills
  /plugin install azure@azure-skills
  ```

- **Other hosts:** Follow the installation guide for the active host. Azure CLI authentication is for Azure workflows; install Azure Developer CLI only if the chosen workflow uses `azd`.

Start a fresh session and confirm the skills/tools are available. Installation does not authenticate the user, validate deployment, or authorize changes.

On Windows, when the requested Azure workflow needs `az`, install it only with the user's approval and subject to device policy:

```powershell
winget install --exact --id Microsoft.AzureCLI
```

Restart the terminal and check `az version`. See Microsoft's [Azure CLI Windows installation guide](https://learn.microsoft.com/cli/azure/install-azure-cli-windows). Azure Cloud Shell is another option after the user signs in; the assistant must not assume it can operate that browser session.

`az login` is interactive user-controlled sign-in, not an install step. Run it only for a chosen Azure task and let the user complete the sign-in flow. Never ask for, read, store, or echo credentials, tokens, or secrets. Confirm the intended context with `az account show`. Do not install `azd` unless the selected workflow requires it.

## Ask the assistant to check capabilities

> Use SQL Apps. Inspect this host's available skills/tools and tell me what is missing. Local-only work needs no Azure CLI, sign-in, or subscription. For each missing prerequisite, give me the supported host-specific install/enable step and explain its effect. Do not install, enable, authenticate, or change host/system configuration until I approve that action. While I decide, continue useful UI, schema, and scaffolding work if possible; clearly mark persistence and end-to-end checks incomplete. Never substitute mocked persistence or direct Express-to-SQL CRUD. Let me complete interactive sign-in; never ask for or handle secrets. Before any Azure write, present one concise review of resources, cost, security/access changes, and uncertainties, then wait for explicit approval.

Approval to install or enable a plugin/extension is not approval to sign in to Azure, create resources, spend money, change access, or perform destructive work. If setup fails, report the result and offer one supported alternative; do not repeat discovery indefinitely.
