# Personal-free Azure deployment

`personal-free` is the primary SQL Apps cloud profile for a small, private application used by one owner or a small invited team. It deploys Azure Static Web Apps Free with a managed Functions API and an Azure SQL Database configured for the free tier.

This profile has no Static Web Apps SLA. It is **potentially $0**, not guaranteed free: the subscription must be eligible and usage must remain within current allowances.

The resources are fail-closed for cost: Static Web Apps Free has no bandwidth
overage path, and Azure SQL is configured to stop rather than bill by pausing
when its monthly free compute or storage limit is reached. This can interrupt
the application until the allowance resets.

## Security and cost boundary

The profile intentionally creates only a Static Web App and Azure SQL server/database.

Azure SQL uses a public endpoint and the Azure-services firewall rule. The application uses a generated `sql_apps_runtime` login that receives `CONNECT` plus object-scoped `EXECUTE` and `VIEW DEFINITION` only for procedures declared in `personal-free-api.json`. Secrets are stored under `.sql-apps/deployments/`, which generated projects exclude from Git.

The resource group, Static Web App, SQL server and SQL database carry
`project=sql-apps`, `environment=<dev|test|prod>` and
`deployment=personal-free` tags for usage and cost tracking. Resource-group
tagging merges these values without removing unrelated existing tags.

## Configure the API surface

`personal-free-api.json` is an allowlist, not an automatic schema explorer. Declare each HTTP route, stored procedure, and exact parameter type. The supported types are `nvarchar`, `uniqueidentifier`, `bit`, `int`, and `datetime2`.
Requests must provide exactly those parameters. JSON strings map to `nvarchar`,
JSON booleans to `bit`, 32-bit whole numbers to `int`, UUID strings to
`uniqueidentifier`, and parseable date-time strings to `datetime2`. Invalid
JSON or parameters return HTTP 400; internal SQL errors are logged without
being returned to callers.

Set `authenticationProvider` to `aad`, `github`, or `google`. The same provider must be used by `invite`.

Each route is owner-only unless it lists roles. To let invited team members call a route, add `"roles": ["owner", "member"]`:

```json
{ "method": "GET", "path": "/api/ListLoans", "roles": ["owner", "member"],
  "procedure": { "name": "ListLoans", "parameters": {} } }
```

When any route admits members, the first GET route (the browser readiness check) must admit them too; the build fails otherwise. Every call sets `SESSION_CONTEXT(N'oid')` to the caller's opaque ID and `SESSION_CONTEXT(N'role')` to `owner` or `member`. Each procedure decides whether its rows are shared by the team or scoped to the caller; the route roles control who may call it, not which rows it returns.

## Plan and deploy

Before `init`, decide each of these; none has a silent default:

| Question | Flag | Notes |
| --- | --- | --- |
| Which subscription? | `--subscription <id>` | Must match `az account show`; otherwise run `az account set`. |
| Which web region? | `--web-location` | Static Web Apps accepts only `westus2`, `centralus`, `eastus2`, `westeurope` or `eastasia`. |
| Same region for data? | `--data-location <region\|same>` | Azure SQL holds the data, so choose this region for residency. A different region adds cross-region latency to API calls. Confirm the Azure SQL Database free tier is available there. |
| New or existing resource group? | `--resource-group <name> --resource-group-mode new\|existing` | An existing group is never reused silently; it is kept on undo. |
| Environment? | `--environment dev\|test\|prod` | Part of resource names and tags. |
| Personal or team? | `--sharing personal\|team` | Team uses owner and member roles (above). |

Sign in with Azure CLI as the person who will administer the database:

```powershell
az login
npm run publish -- init --name my-app --subscription <id> --web-location westeurope --data-location same `
  --resource-group my-app-prod --resource-group-mode new --environment prod --sharing personal
npm run publish -- plan
```

`init` verifies the subscription and resource group, reads the tenant and signed-in user, writes `sql-apps.personal-free.json` and makes no Azure changes. Older configs with a single `location` are read as the same web and data region only when that region is one of the five Static Web Apps regions. Any other legacy region (for example `eastus`) could never have deployed its web app, so `plan`, `deploy` and `status` stop and print how to rerun `init`: move the old config aside, keep the same `--name`, `--environment` and `--resource-group`, choose a `--web-location`, pass the old region as `--data-location`, and use `--resource-group-mode existing` if the group was created. `plan` builds the exact site/API artifact and prints a creation card: each resource with its name, region, cost posture and undo command, plus the subscription, the region split, sharing mode, security trade-offs, excluded services and an approval code.

Deploy only after reviewing that output:

```powershell
npm run publish -- deploy --approve <approval-code>
```

Deployment creates the resource group, applies Bicep through a temporary protected parameter file, publishes `sql/personal-free.sqlproj`, creates the least-privilege runtime user, deploys the Static Web Apps artifact, and verifies database-backed readiness. The state file records completed stages so a failed deployment can be run again with the same approved build.

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
