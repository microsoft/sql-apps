# Prerequisites and missing capabilities

SQL Apps does not bundle SQL companion plugins, the local database engine, DAB, or Azure CLI. Discover what the active host actually provides before relying on it. Use the supported setup for that host, and ask before changing host or system configuration.

## Choose the shortest setup path

Inspect the host/OS, installed tools, and existing project decisions first, without reading credentials or signing in. Reuse known answers. Ask one grouped routing question only for unknown choices; defer installation details and app/deployment questions until they affect the next action.

| Situation | Next action |
| --- | --- |
| Working Azure SQL/selected API and a recorded target | Reuse them; do not repeat onboarding or change the target |
| Target unknown | Offer local or cloud; default to local when no preference is stated |
| Cloud selected | Ask whether an Azure subscription exists only if unknown, then use the bundled deployment recipe; if none, explain account options without creating or signing into one |
| Azure subscription exists, target undecided | Still offer local or cloud; ownership is not cloud intent or provisioning approval |
| Local selected, Azure SQL container unavailable | Offer [Private Preview signup](https://aka.ms/sqldbcontainerpreview-signup) or explicitly selected Azure SQL Database cloud access; never switch to cloud automatically |
| Neither Azure SQL target is ready, or the selected API is missing | Give the selected profile's supported setup step; continue useful UI/schema/scaffolding and mark integration incomplete; Functions does not require DAB |
| Existing on-premises database | Explain that it is outside this profile; do not reuse it as a fallback, install another engine, or migrate it without explicit scope |

Explain needed installation/configuration actions together where their effects are known, then obtain scoped approval. Do not turn every discovery or ordinary local build/test into another product questionnaire. Host permissions, interactive sign-in, license acceptance, and cloud/access/destructive approvals still apply.

## SQL, selected API, and local database

For general coding hosts, install the broad [Microsoft SQL plugin](https://github.com/microsoft/microsoft-sql#installation). For Copilot CLI:

```text
copilot plugin marketplace add microsoft/microsoft-sql
copilot plugin install microsoft-sql@microsoft-sql
```

In VS Code, install or enable the [Microsoft SQL Server extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql). For DAB profiles, enable its DAB capability and confirm the tool is discovered. It normally replaces the overlapping `microsoft-sql-vscode` bundle. On other hosts, use Microsoft's [host-specific instructions](https://github.com/microsoft/microsoft-sql#installation).

After setup, refresh or restart the host and check the selected capabilities. The preferred Azure SQL Database container is currently in **Private Preview**. Using it requires [preview access](https://aka.ms/sqldbcontainerpreview-signup) and the [official quickstart](https://microsoft.github.io/azure-sql-database-container/getting-started.html). Installing SQL guidance does not grant registry access. The user must complete any interactive registry login; never handle or paste credentials. Do not enroll, accept terms, or authenticate without explicit approval.

If the container is unavailable, offer signup or explicit Azure SQL Database cloud
selection; follow the [deployment gates](./deployment.md) before cloud actions.
Reuse the recorded target/topology. Missing Azure SQL or selected API leaves
persistence/end-to-end checks incomplete, but safe UI/schema/scaffolding can
continue. The [constitution](./constitution.md) forbids engine/mock/Express CRUD
fallbacks; explicitly selected Functions is a supported API, not a fallback.

For explicitly selected Static Web Apps/Functions, DAB discovery is unnecessary.
Local development needs approved, installed Functions Core Tools 4 and SWA CLI 2,
plus the same SQL preview image. The copied app checks tools without installing
them and requires an explicit loopback SQL port. Follow the
[local Functions workflow](../templates/starter/hosting.md#local-development);
SWA's fake authentication identities are not real-provider acceptance.

## Azure tools

The [bundled Container Apps recipe](../templates/starter/deployment.md) uses Azure CLI with Bicep for cloud deployment and Docker for image builds. No separate cloud skills plugin, MCP extension, or Azure Developer CLI is required. Existing CLI/API tools may assist inspection but are not an additional mandatory dependency.

Local-only development needs no Azure CLI, sign-in, or subscription. Local Bicep compilation requires the Bicep compiler but not authentication. Check `az bicep version`; installing it with `az bicep install` changes the host and requires approval. Use [Bicep installation guidance](https://learn.microsoft.com/azure/azure-resource-manager/bicep/install) if it is missing. Docker images must be built and published to an approved registry before Azure can pull them; registry publication/access changes require separate approval. The recipe creates no registry automatically.

On Windows, when the requested Azure workflow needs `az`, install it only with the user's approval and subject to device policy:

```powershell
winget install --exact --id Microsoft.AzureCLI
```

Restart the terminal and check `az version`. See Microsoft's [Azure CLI Windows installation guide](https://learn.microsoft.com/cli/azure/install-azure-cli-windows). Azure Cloud Shell is another option after the user signs in; the assistant must not assume it can operate that browser session or that local Docker builds are available there.

`az login` is interactive user-controlled sign-in, not an install step. Run it only for a chosen Azure task and let the user complete the sign-in flow. Never ask for, read, store, or echo credentials, tokens, or secrets. Confirm the intended context with `az account show`. Do not install `azd` unless the selected workflow requires it.

## Ask the assistant to check capabilities

> Use SQL Apps to check my existing setup first. Reuse known decisions, ask only for missing routing choices, and recommend the next useful step. If the Azure SQL container is unavailable, offer preview signup or an explicitly selected Azure SQL Database cloud path. Keep setup changes and sign-in under my control; continue safe scaffolding while integration is incomplete.

Approval to install or enable a plugin/extension is not approval to sign in to Azure, create resources, spend money, change access, or perform destructive work. If setup fails, report the result and offer one supported alternative; do not repeat discovery indefinitely.
