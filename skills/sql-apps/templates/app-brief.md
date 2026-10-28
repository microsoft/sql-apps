# App brief: <application name>

## Outcome and users

<What useful task does this app complete, and for whom?>

## Workflows, data, and access

| Workflow | Observable acceptance check |
| --- | --- |
| <User action> | <Expected result, including persisted reload when data is available> |

<Key entities, relationships, business rules, roles/ownership, and sensitive-data limits. Resolve material ambiguities.>

## Scope and decisions

- intent: poc
- costPreference: free-first
- Includes / excludes: <first useful scope and deferred work>
- Confirmed decisions and assumptions: <material choices and their source>
- Accepted exceptions: <specific stack, cost, or security boundaries; none unless approved>
- Database: <local Azure SQL container or Azure SQL Database cloud; connection topology, runtime/version evidence, and compatibility gaps>
- Starter/identity/routing: <baseline; issuer, audience, owner claim, sign-in flow, origins, host boundary and unknowns>
- Cloud recipe, if requested: <image digests, SQL connectivity/bootstrap, overage exposure, exceptions>
- Hosting/API: <deployment.json profile; evidence and identity/secret limits>

PoC/free-first does not promise free use or authorize spending. Preserve `costPreference: zero-azure-spend`. Only explicit production availability, scale, or compliance changes intent; "deploy" does not.

## Technical notes

Use TypeScript, React/Vite, Azure SQL Database, and DAB by default or explicit managed Functions, either the local container or cloud service. No SQL Server Express or other on-premises fallback. A custom Express server is only for necessary custom behavior. The selected API enforces access; SQL enforces transactional rules without a bypass.

Application changes can start while prerequisites are missing. Offer preview signup or explicitly selected Azure SQL cloud setup; label integration and end-to-end checks incomplete until verified. Never substitute mocks, another database, or unapproved direct-SQL CRUD.

## Delivery and open checks

- Delivery: <local by default; Azure only if requested and separately approved>
- Decisions or gaps that must persist: <application-specific constraints and next safe action>
- UI direction: <audience, tone, typography, distinguishing detail>
- Verification: <what ran, what passed, and what remains unverified; never store secrets>

For requested Azure work, record the approved target, complete topology/cost boundary, access changes, and exceptions in this brief or the app's deployment plan. Record the adopted `sqlapps-version` and naming exceptions when creating infrastructure. Use the bundled deployment recipe, current service documentation, and SQL guidance; local-only work needs no Azure login or attribution checks.

<Record explicit deviations and useful run instructions in the app's README. Do not store credentials, tokens, or approval artifacts here.>
