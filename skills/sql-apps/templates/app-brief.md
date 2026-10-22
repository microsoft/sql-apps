# App brief: <application name>

## Outcome and users

<What useful task does this app complete, and for whom?>

## Essential workflows and checks

| Workflow | Observable acceptance check |
| --- | --- |
| <Primary user action> | <What should happen, including a fresh read/reload?> |

## Data and access rules

<Key entities, relationships, invariants, roles/ownership, and sensitive data constraints. Resolve rules such as conflicting reservations explicitly.>

## First delivery

- Includes: <small but complete useful scope>
- Excludes: <deferred features>
- Assumptions: <consequential assumptions explicitly confirmed or delegated>
- Delivery: <local; Azure only if requested, subject to its own approvals>

## Technical boundary

SQL Apps profile: TypeScript, React/Vite, Express, server-side `mssql`, Azure SQL Database; Azure App Service if deployed. Optional services only when required.

## Design and migration intent

- Visual direction: <audience, tone, typography, distinguishing detail>
- UI: Tailwind v4 semantic tokens, Radix, Lucide; accessible light/dark and responsive states.
- Layout: npm workspaces for frontend, data, shared contracts, and Express server; one deployment.
- Service configuration: `rayfin/rayfin.yml`, `dialect: mssql`; not executed by SQL Apps or proof of a running Rayfin runtime.
- Optional capabilities and migration gaps: <what is actually implemented, explicitly deferred, or unaligned>

<Record any explicitly accepted deviation and its support implications. Do not store secrets, execution status, or approval tokens here.>
