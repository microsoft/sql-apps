# SQL Apps project policy

This block is durable project guidance, not a security sandbox or runtime.
The [skill router](../SKILL.md) selects task guidance. Read [app design](./app-design.md)
for UI work and [prerequisites](./prerequisites.md) when setup is missing.

Merge the marked block into the active host instruction file, preserving unrelated
instructions. Do not create competing copies for inactive hosts. The app brief
holds business decisions; the app's `deployment.md` holds cloud targets, approvals
and results.

```markdown
<!-- sql-apps:constitution:start -->
## SQL Apps project policy

- Preserve existing app code, data, decisions and unrelated work. Build with React/TypeScript and the explicitly selected API; add no plugin runtime or duplicate CRUD service.
- Use DAB by default or explicitly selected Static Web Apps/Functions. Follow that profile's prerequisites and tests.
- Use Azure SQL Database locally or in Azure (`EngineEdition = 5`). Use the application database, never `master` or on-premises SQL Server. If the selected SQL/API is unavailable, state that persistence is unverified; do not substitute a mock.
- Validate real user identity on the server. Keep secrets server-side. Enforce ownership and concurrent business rules in SQL with least-privilege permissions and no table-write bypass.
- Preserve databases, credentials and volumes. Use forward-only, checksummed migrations; never edit an applied migration or reset data to pass a check.
- Obtain approval for identity, host changes, software terms, cloud writes, spending, access changes and destructive work. Local development needs no Azure sign-in.
- Separate readiness, allowed/denied API checks, browser save/reload, SQL concurrency, restart and cloud evidence. State which checks did not run; a build or deployment is not acceptance or proof of zero cost.
- Use anonymous public submissions only when explicitly selected. Require enrolled authenticated readers and approved abuse, privacy, retention, cost and ingress controls before publication.
<!-- sql-apps:constitution:end -->
```
