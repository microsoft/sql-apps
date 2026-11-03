# Missing setup

Check the selected app, host and installed tools before asking questions. Reuse
recorded decisions. If the target is unknown, ask local or cloud; local is the
default. Ask only for decisions that affect the next step.

| Situation | Next step |
| --- | --- |
| SQL/API and target already work | Keep using them |
| Target unknown | Offer local or cloud; choose local if no preference is given |
| Local SQL container unavailable | Offer preview signup or explicitly chosen Azure SQL cloud; do not switch automatically |
| Selected API unavailable | Give setup for that API; Functions does not require DAB |
| Neither supported SQL target is ready | Continue safe UI/schema work and mark persistence unverified |
| Existing on-premises SQL Server | Explain it is unsupported here; do not install, fall back or migrate without scope |

Ask before changing host/system settings, signing in, accepting terms, provisioning
resources, changing access or deleting data. Do not turn routine local builds or
tests into a new onboarding questionnaire.

## SQL and API tools

The supported databases are the local Azure SQL Database container and Azure SQL
Database in Azure. The container is in **Private Preview** and requires [access
signup](https://aka.ms/sqldbcontainerpreview-signup) and the [official
quickstart](https://microsoft.github.io/azure-sql-database-container/getting-started.html).
SQL Apps does not install the engine or handle registry credentials.

For general SQL guidance, use the
[Microsoft SQL plugin](https://github.com/microsoft/microsoft-sql#installation);
in VS Code, use the [MSSQL extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql).
For DAB apps, also enable one DAB capability (`dab-rest-and-graphql`,
`azuresql-db-dab` or the host's DAB tool). Functions apps instead need installed
Functions Core Tools 4 and SWA CLI 2. Follow the copied app's README for its ports,
identity and lifecycle.

The protected profile needs a real external identity registration, redirect URI,
and consent. Ask the identity owner for the exact values listed in the copied
README. Continue safe scaffolding if identity or SQL is unavailable; do not invent
users, use fake sign-in as acceptance, or claim persistence.

## Azure CLI

Local-only work needs no Azure CLI, Azure sign-in or subscription. The bundled
Container Apps recipe uses Azure CLI, Bicep, Docker Linux containers and an approved
registry. Check whether these tools exist before proposing installation. Installing
or changing host tools needs approval.

On Windows, install Azure CLI only with user approval and subject to device policy:

```powershell
winget install --exact --id Microsoft.AzureCLI
```

`az login` is interactive and user-controlled. Run it only for a selected cloud
task; verify context with `az account show`. Never request, read or print secrets.
Do not install `azd` unless the selected workflow needs it.

## Adopt a cached SQL image

A matching tag is not proof of the required image. Inspect local Docker
`RepoDigests` and platform; require the exact pinned repository and immutable
digest. Do not silently change the pin or pull `latest`.

With explicit approval, an initialized copied app whose containers are stopped can
adopt a cached `linux/amd64` digest from the same repository:

```powershell
npm run local:adopt-sql -- --image <same-approved-repository@sha256:digest> --reason "<non-secret reason>"
```

The command records the original and new pins, updates both references together,
and leaves integration checks pending. It does not log in, pull or start SQL.
Verify EngineEdition 5, the app database, migrations, permissions, selected API and
end-to-end behavior before claiming compatibility.
