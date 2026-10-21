# Personal-free Azure deployment

`personal-free` is the existing bundled publisher for a small, private application used by one owner or a small invited team. It deploys Azure Static Web Apps Free with a managed Functions API and an Azure SQL Database configured for the free tier.

For new web deployments, [assess App Service, then Container Apps, then SWA](free-first.md). Use this
publisher for existing deployments or as an explicitly selected fallback only
when the complete required setup fits Free. It does not host DAB or provide SQL
managed identity; do not weaken those requirements to make this route fit.
Existing deployments are not automatically migrated.

This profile has no Static Web Apps SLA. It is **potentially $0**, not guaranteed free: the subscription must be eligible and usage must remain within current allowances.

The resources are fail-closed for cost: Static Web Apps Free has no bandwidth
overage path, and Azure SQL is configured to stop rather than bill by pausing
when its monthly free compute or storage limit is reached. This can interrupt
the application until the allowance resets.

## Security and cost boundary

The profile intentionally creates only a Static Web App and Azure SQL server/database.

Azure SQL uses a public endpoint and the Azure-services firewall rule. The application uses a generated `sql_apps_runtime` login that receives `CONNECT` plus object-scoped `EXECUTE` and `VIEW DEFINITION` only for procedures declared in `personal-free-api.json`. Secrets are stored under `.sql-apps/deployments/`, which generated projects exclude from Git.

Publishing SQL from outside Azure additionally needs the operator's public IPv4
address. Initialize with `--client-ip <public-ipv4>`; existing configs must add
`deploymentClientIp` before planning. The creation card binds that exact address
to approval. Deployment and rotation create a uniquely named, single-address
firewall rule only around their SQL work and remove it on success or failure.
Cleanup errors fail the command and print the exact manual removal command.
A forced process termination can bypass cleanup; inspect and remove any leftover
`sql-apps-deploy-*` rules before retrying. An address change requires a new plan.

The resource group, Static Web App, SQL server and SQL database carry
`project=sql-apps`, `environment=<dev|test|prod>` and
`deployment=personal-free` tags for usage and cost tracking. Resource-group
tagging merges these values without removing unrelated existing tags.

## Configure the API surface

`personal-free-api.json` is an allowlist, not an automatic schema explorer. Declare each HTTP route, stored procedure, and exact parameter type. The supported types are `nvarchar`, `uniqueidentifier`, `bit`, `int`, and `datetime2`.
Requests must provide exactly those parameters. JSON strings map to `nvarchar`,
JSON booleans to `bit`, 32-bit whole numbers to `int`, UUID strings to
`uniqueidentifier`, and valid ISO 8601 date strings (`YYYY-MM-DD`) or date-time
strings to `datetime2`. Date-times may use `Z`, an explicit offset, or no offset;
without an offset, a date-time uses the server's time zone. Calendar dates must
exist, and the resulting UTC date must be within SQL's years 0001-9999.
Locale-specific date formats and impossible dates such as February 30 are
rejected rather than normalized. Invalid
JSON or parameters return HTTP 400; internal SQL errors are logged without
being returned to callers.

Set `authenticationProvider` to `aad` or `github`. The same provider must be used by `invite`.
Google requires custom authentication on Static Web Apps Standard and is not
supported by this Free-only publisher.

Each route is owner-only unless it lists roles. To let invited team members call a route, add `"roles": ["owner", "member"]`:

```json
{ "method": "GET", "path": "/api/ListLoans", "roles": ["owner", "member"],
  "procedure": { "name": "ListLoans", "parameters": {} } }
```

The first GET route with no parameters and a browser-compatible
`/api/<single-segment>` path is the readiness route; the build fails if none
exists. Its procedure must be read-only, check the schema/access the app needs,
and return exactly one row with a SQL `bit` column `ready` set to `1`
(`true` in JSON). The default `AppReady` satisfies that response contract.
Anonymous `/api/health/ready` executes this procedure with a reserved synthetic
identity, never an invited user's identity, and returns HTTP 503 on failure.
It must not depend on one user's records.

When any route admits members, the selected readiness route must admit them
too; the build fails otherwise. Every call sets `SESSION_CONTEXT(N'oid')` to the
caller's opaque ID and `SESSION_CONTEXT(N'role')` to `owner` or `member`. Each
procedure decides whether its rows are shared by the team or scoped to the
caller; the route roles control who may call it, not which rows it returns.

## Plan and deploy

Before `init`, infer proposed values from validated project/account context and
the saved brief, then display them together for review. Ask only for material
ambiguity or consent. The CLI still requires every argument below explicitly;
inference is not permission to reuse resources, move data or write to Azure.

| Question | Flag | Notes |
| --- | --- | --- |
| Which subscription? | `--subscription <id>` | Must match `az account show`; otherwise run `az account set`. |
| Which web region? | `--web-location` | Static Web Apps accepts only `westus2`, `centralus`, `eastus2`, `westeurope` or `eastasia`. |
| Same region for data? | `--data-location <region\|same>` | Azure SQL holds the data, so choose this region for residency. A different region adds cross-region latency to API calls. Confirm the Azure SQL Database free tier is available there. |
| New or existing resource group? | `--resource-group <name> --resource-group-mode new\|existing` | An existing group is never reused silently; it is kept on undo. |
| Environment? | `--environment dev\|test\|prod` | Part of resource names and tags. |
| Personal or team? | `--sharing personal\|team` | Team uses owner and member roles (above). |
| Operator's public IPv4 address? | `--client-ip <public-ipv4>` | Approves temporary, exact-address SQL publishing access; never a wildcard range. |

Sign in with Azure CLI as the person who will administer the database:

```powershell
az login
npm run publish -- init --name my-app --subscription <id> --web-location westeurope --data-location same `
  --resource-group my-app-prod --resource-group-mode new --environment prod --sharing personal --client-ip <public-ipv4>
npm run publish -- plan
```

`init` verifies the subscription and resource group, reads the tenant and signed-in user, writes `sql-apps.personal-free.json` and makes no Azure changes. Older configs with a single `location` are read as the same web and data region only when that region is one of the five Static Web Apps regions. Any other legacy region (for example `eastus`) could never have deployed its web app, so `plan`, `deploy` and `status` stop and print how to rerun `init`: move the old config aside, keep the same `--name`, `--environment` and `--resource-group`, choose a `--web-location`, pass the old region as `--data-location`, and use `--resource-group-mode existing` if the group was created. `plan` builds the exact site/API artifact and prints a creation card: each resource with its name, region, cost posture and undo command, plus the subscription, the region split, sharing mode, security trade-offs, excluded services and an approval code.

Deploy only after reviewing that output:

Planning also builds the SQL database package and compiles the infrastructure
template locally, so .NET and the Azure CLI Bicep compiler must be available.
It bundles the Functions API and its installed runtime dependencies into a
self-contained Node.js entry before approval. The Azure Functions host supplies
its own core API; deployment does not restore packages or rebuild the API.
The site, API, SQL package, infrastructure JSON and SQL procedure allowlist are
stored together under `.sql-apps/deployments/` and fingerprinted as one artifact.
Deployment verifies and uses a private copy of that exact approved artifact.
It does not rebuild or read changed application SQL, API declarations or
infrastructure source. Run `plan` again after edits; do not edit approved output.
Missing, incomplete or modified artifacts are rejected before Azure writes.

Deployment also retains the verified artifact under
`.sql-apps/deployments/<name>-<environment>-<approval>-artifact/` before changing
Azure resources. Planning another release replaces only the `-plan` directory,
not this retained artifact. Keep the artifact for the current or interrupted
deployment alongside its protected state; rotation verifies its integrity and
uses its approved infrastructure and procedure allowlist.

```powershell
npm run publish -- deploy --approve <approval-code>
```

Deployment creates the resource group, applies the approved compiled template
through a temporary protected parameter file, publishes the approved SQL
package, creates the least-privilege runtime user, deploys the Static Web Apps
artifact using its installed Node CLI, and verifies database-backed readiness.
The final check requires a JSON response with `status: ready`, not an HTML page
or merely HTTP 200. The state file records completed stages so a failed
deployment can be run again with the same approved build.

Publishing and rotation share a per-application/environment lock in the project.
A competing command fails with `Operation is locked` before changing credentials
or contacting Azure. Wait for the active command to finish and retry; do not
delete an active lock. The lock is released on success or failure, and a later
command can recover a lock left by a process that has exited.

For deployments without a retained artifact, rotation can retain the existing
plan only if it still matches the current deployment approval and config.
If that older plan is missing or has been replaced, restore the exact approved
artifact or review and deploy a new plan before rotating; the publisher does
not substitute an undeployed release.

Check status without printing secrets:

```powershell
npm run publish -- status
```

For a deployed application, status reads the live Azure resource settings and
must report:

```text
Cost guard: verified
Static Web Apps: Free
Azure SQL: free tier, AutoPause at monthly limit
```

Deployment, secret rotation, and status all fail if the cost guard cannot prove
those settings. The check detects a site or database upgraded manually, paid
SQL overage, a larger database maximum, or nonlocal backup storage. It proves
configuration at that moment; it does not guarantee future Azure terms or
cover unrelated resources, GitHub Actions, domains, or third-party services.

Rotate the runtime SQL secret using the current deployment approval code:

```powershell
npm run publish -- rotate-secret --approve <approval-code>
```

Use the deployed release's approval code even after planning a newer release.
The newer plan's code cannot authorize rotation of the current deployment.
Rotation does not rebuild, replace the pending plan, or require it to exist
once the deployed artifact has been retained.

Rotation saves the pending password and an in-progress stage before changing
SQL. If interrupted, rerun the same command: it reuses that saved password,
updates application settings and verifies readiness before recording `ready`.
Do not delete protected state as a recovery step.

Deployment state uses Windows current-user encryption (DPAPI) on Windows and
owner-only file permissions on Unix. Valid older plaintext receipts are
explicitly logged and rewritten with host protection on first read, without
changing their credentials.

Each application-name/environment receipt is bound to its Azure subscription
and resource group. Deployment, rotation, status and invitations reject a
different target before contacting Azure or changing the saved credentials.
Use a distinct application name or environment for a separate target; changing
the config does not move an existing deployment. Older receipts gain the binding
only when their stored approval matches the verified deployment artifact and
config, or after read-only Azure checks verify their saved resources in the
configured subscription and resource group. Verification failures preserve
the existing credentials and are not treated as a new deployment.

Temporary plaintext infrastructure parameters live
in a private directory restricted to the current Windows user (or Unix mode
`0700`), and are removed after use.

SQL connection pools report errors without logging credentials, discard failed
connections and reconnect on subsequent calls. Resume retries preserve SQL
login error numbers from the driver: temporary database-unavailable errors are
retried with bounded delays, but permanent bad credentials are not.

## Invite people

After deployment, create a seven-day invitation for each person:

```powershell
npm run publish -- invite --role owner --provider aad --user owner@example.com
npm run publish -- invite --role member --provider github --user teammate-handle
```

`invite-owner` remains an alias for `invite --role owner`. Open the returned link with the intended account. Authentication alone is insufficient: the API requires an invited `owner` or `member` role, and SQL identity derives from the provider plus immutable provider user ID rather than email. Static Web Apps Free allows invited roles for up to 25 people per app; beyond that, or for organizational group-based access, plan a separate architecture with maintained Azure skills.

## Validation

Test anonymous, invited-owner, invited-member (when used) and signed-in-uninvited states, including a member call to an owner-only route (HTTP 403). Complete a browser write, confirm the row in SQL, and reload the browser. Record functional and design acceptance separately.

The publisher does not run a live Azure canary automatically. Azure creation, invitations, and any resulting usage require explicit operator approval.
