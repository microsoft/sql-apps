# App brief: <application name>

## Outcome and first workflow

<Who uses this app, what useful task do they complete, and what is out of scope?>

| Workflow | Acceptance check |
| --- | --- |
| <First useful action> | <Save, reload from SQL, and reject an invalid/conflicting action> |

## Data and access rules

<Entities, relationships, SQL-enforced business invariants, roles/ownership,
and sensitive-data limits. Resolve consequential ambiguities before implementation.>

## Accepted decisions

- intent: poc
- costPreference: free-first
- Identity: <approved provider and ownership model; unresolved configuration is a blocker>
- UI direction: <audience, tone, typography, and one distinguishing detail>
- Business constraints and exceptions: <availability, scale, compliance, privacy,
  cost ceiling or explicit zero-azure-spend, and accepted scope>
- Runtime profile: `<application-owned deployment.json link>`
- Cloud target, approvals and operator instructions: `<application-owned deployment.md link>`
  <not requested / review pending / approved scope; no credentials>

After copying this brief into the application, replace those placeholders with
relative Markdown links to its actual `deployment.json` and `deployment.md`.
Resolve paths from the copied brief and verify the files exist; these are app
links, not links into the installed plugin/template directory.

## Delivery and open checks

- Delivery: <local by default; cloud only when requested and separately approved>
- Blockers and next useful action: <missing capabilities or decisions; no fake persistence>
- Acceptance remaining: <readiness, authenticated API, browser, SQL concurrency, restart>

Keep local commands/results in the app README and cloud decisions/results in
`deployment.md`. The active host instructions own durable policy; this brief owns
only app decisions, not deployment mechanics, approval records or repeated logs.
