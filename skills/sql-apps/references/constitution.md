# SQL Apps project policy

## Approval policy

Merge this block into the active host's approved project instructions, preserving
unrelated content. Guidance is not an access-control boundary.

```markdown
<!-- sql-apps:constitution:start -->
## SQL Apps project policy

- Preserve existing code, data, credentials, volumes, decisions and unrelated work.
- Use React/Vite/TypeScript, DAB by default or explicit Static Web Apps/Functions; no plugin runtime or duplicate CRUD service.
- Use the Azure SQL application database (`EngineEdition = 5`), never `master` or on-premises SQL Server. Missing SQL/API means unverified persistence, not mocks.
- Validate real identity server-side; keep secrets out of browser code, source, logs and chat. Enforce SQL ownership/concurrency with restricted grants and no table-write bypass.
- Use forward-only, checksummed migrations; never edit applied files or reset data to pass.
- In-scope edits/tests need no repeated permission; disclose changed access semantics. Registration, consent, credentials, grants/firewalls, host/instruction configuration, setup/terms, publication, spending and destructive work need explicit approval.
- Record approved target, operation, identity/access, cost/limits and cleanup. Renew approval for material changes, not each step. A named install does not approve unrelated upgrades/terms; profile selection, hashes and login are not approval.
- Never change database, API, profile, region, tier, identity or access to bypass blockers.
- Cached local startup needs no Azure CLI session; protected apps still need real sign-in.
- Verify API denials, browser save/reload, SQL concurrency and restart separately from readiness/cloud. Record source/artifacts and unrun checks; no cross-profile/revision certification.
- Public submissions require explicit selection, authenticated enrolled readers and approved abuse/privacy/retention/cost/ingress controls before publication.
<!-- sql-apps:constitution:end -->
```
