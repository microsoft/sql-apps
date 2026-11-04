# App brief: <application name>

## Outcome

<Users, first useful workflow, and what is out of scope.>

Acceptance: <Save/reload from SQL and reject an invalid/conflicting action.>

## Data and access rules

<Entities, relationships, SQL invariants, roles/ownership and sensitive-data limits.>

## Accepted decisions

- intent: poc
- costPreference: free-first
- Identity: <approved provider, ownership model and configuration blockers>
- UI direction: <audience, tone, typography, and one distinguishing detail>
- Constraints: <availability, scale, compliance, privacy and cost ceiling
  or explicit zero-azure-spend>
- Runtime profile: `<application-owned deployment.json link>`
- Cloud approvals and operator steps: `<application-owned deployment.md link>`

## Delivery and open checks

- Delivery: <local by default; cloud only when requested and separately approved>
- Acceptance targets: <public-local, if applicable; full authenticated-local;
  deployed, only if requested. Name the workflows required for each.>
- Blockers and next action: <missing decisions, setup or acceptance checks>

Report targets as verified, blocked, unverified or not requested.
A locked staff portal proves denial, not staff workflow acceptance.

Keep local commands/results in the README; cloud approvals/results in `deployment.md`.
