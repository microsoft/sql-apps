# Missing setup

Reuse installed tools/recorded decisions. Default to local.

| Situation | Next step |
| --- | --- |
| Local SQL container unavailable | Offer preview signup or explicitly chosen Azure SQL cloud; do not switch automatically |
| Selected API unavailable | Give setup for that API; Functions does not require DAB |
| Neither supported SQL target is ready | Continue safe UI/schema work and mark persistence unverified |
| Existing on-premises SQL Server | Explain it is unsupported here; do not install, fall back or migrate without scope |

Setup/admin actions follow the [approval policy](./constitution.md#approval-policy).

## SQL and API tools

The local Azure SQL Database container is **Private Preview** and requires [access
signup](https://aka.ms/sqldbcontainerpreview-signup) and the [official
quickstart](https://microsoft.github.io/azure-sql-database-container/getting-started.html).

Install [Microsoft SQL plugins](https://github.com/microsoft/microsoft-sql#choose-a-plugin)
as needed: `microsoft-sql` for coding hosts, `microsoft-sql-vscode` for the
[MSSQL extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql).
The VS Code bundle needs `microsoft-azuresqldb-container` for container guidance;
the broad SQL bundle includes it.
For DAB, use `dab-rest-and-graphql`, `azuresql-db-dab` or host tools such as `mssql_dab`.
Functions needs Core Tools 4/SWA CLI 2, not DAB.
Version probes allow 60 seconds; timeout means unknown availability, not missing
tools. Inspect the reported command/error before proposing setup changes.

Get real registration, redirect URI and consent from the identity owner.
Missing SQL/identity permits scaffolding, not fake users or acceptance claims.

## Azure CLI

Cached startup needs no Azure CLI session; image acquisition and app sign-in are separate.

Container Apps needs Azure CLI/Bicep, Docker Linux and an approved registry.

Approved Windows installation, subject to device policy:

```powershell
winget install --exact --id Microsoft.AzureCLI
```

Run user-controlled `az login` only for cloud work.

### Early cloud and identity preflight

For requested cloud delivery, discover unknowns alongside local work; record in
`deployment.md`. `deployment:preflight` checks local tools/config, not Azure eligibility.

1. Run `az version`
   and then `az account show --query "{tenantId:tenantId,subscriptionId:id}" --output json`.
   Check each exit status; returned IDs establish context, not approval.
2. Resolve tenant/subscription/region with the owner; record access, cost and
   eligibility gaps. No target means unknown context, not an expired login
   or empty subscription.
3. Identify provider owner, registration, redirects, consent/enrollment and test
   users. App sign-in, CLI, SQL runtime/operator and network access are separate.
4. On CLI/metadata/permission failure, record command, sanitized error and next action.
   Stop dependent discovery; no repeated retry, reinstall, extension removal or
   login/permission changes as generic repairs. Resume discovery after an approved repair.

Discovery authorizes no provisioning, publication, registration or access changes.
Never read token caches or save auth dumps.

## Adopt a cached SQL image

Inspect Docker `RepoDigests` and platform for the exact pinned repository/digest;
matching tags are insufficient. No silent pin changes or `latest` pulls.

With approval and stopped containers, an initialized app can adopt a cached
`linux/amd64` digest from the same repository:

```powershell
npm run local:adopt-sql -- --image <same-approved-repository@sha256:digest> --reason "<non-secret reason>"
```

Updates both pins without login, pull or start.
Verify EngineEdition 5, app database, migrations, permissions and API/end-to-end
behavior before claiming compatibility.
