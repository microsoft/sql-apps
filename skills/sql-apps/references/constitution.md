# SQL Apps project policy

This block is durable project guidance, not a security sandbox or runtime.
The [skill router](../SKILL.md) selects task guidance. Read [app design](./app-design.md)
for UI work and [prerequisites](./prerequisites.md) when setup is missing.

Merge the marked block into the active host instruction file, preserving unrelated
instructions. Do not create competing copies for inactive hosts. The app brief
holds business decisions; the app's `deployment.md` holds cloud targets, approvals
and results.

## Approval policy

The user's request establishes scope for ordinary application edits, including
requested authentication-code changes, tests and documentation. Do not repeatedly
ask for permission for edits within that scope. Changing provider registrations,
credentials or actual access is not merely an authentication-code edit.

| Action | Approval boundary |
| --- | --- |
| Requested UI, business logic or auth-code edit | Within requested application scope; review changed access semantics explicitly |
| App registration, consent, credential access, role/grant or firewall change | Explicit identity/access approval for the target and operation |
| Dependency/tool installation, image acquisition or terms acceptance | Explicit setup approval; an approved named install command covers that command, not unrelated upgrades or terms |
| Machine, assistant-host or host-instruction configuration | Explicit configuration scope; do not treat an app-code request as host approval |
| Cloud write, image publication or spending | Explicit target, operations, access/cost implications and limits |
| Deletion, data reset, destructive recovery or cleanup beyond owned scope | Explicit destructive scope; preserve data and unrelated work |

An approval records the target (app or tenant/subscription/resources as applicable),
operation, identity/access implications, cost exposure, limits and cleanup scope.
Reuse that approval only while those material facts remain unchanged. A different
target, broader grant, new region/tier, identity, publication or charge exposure
requires renewed approval. Profile selection, a plan hash and a successful login
are not deployment approval. Never silently change database, API, profile, region,
tier, identity or access boundary to work around missing prerequisites.

This is assistant operating guidance, not an authorization mechanism. Host tools,
identity providers, SQL and Azure permissions enforce actual access. Keep secrets
out of browser code, source control, logs and transcripts; credential approval
does not authorize disclosure.

With installed tools and authorized cached images, recurring local development
needs no Azure CLI session or cloud deployment. Preview signup, registry/image
acquisition and terms may require separate accounts/permissions. Protected apps
still need external application-user authentication; no offline or fake-identity
protected development mode is supplied. The public variant's anonymous-only phase
does not enable owner reads. See [prerequisites](./prerequisites.md).

## Portable project block

When adopting the following block, also retain the approval policy above in the
app's approved guidance context. The short block is not a separate approval policy.

```markdown
<!-- sql-apps:constitution:start -->
## SQL Apps project policy

- Preserve existing app code, data, decisions and unrelated work. Build with React/TypeScript and the explicitly selected API; add no plugin runtime or duplicate CRUD service.
- Use DAB by default or explicitly selected Static Web Apps/Functions. Follow that profile's prerequisites and tests.
- Use Azure SQL Database locally or in Azure (`EngineEdition = 5`). Use the application database, never `master` or on-premises SQL Server. If the selected SQL/API is unavailable, state that persistence is unverified; do not substitute a mock.
- Validate real user identity on the server. Keep secrets server-side. Enforce ownership and concurrent business rules in SQL with least-privilege permissions and no table-write bypass.
- Preserve databases, credentials and volumes. Use forward-only, checksummed migrations; never edit an applied migration or reset data to pass a check.
- Requested app-code edits stay within scope; identity administration, credential access, host/setup changes, terms, cloud writes, spending, access changes and destructive work require explicit approval. Cached local development needs no Azure CLI session; protected apps still require user sign-in.
- Separate readiness, allowed/denied API checks, real browser save/reload, SQL concurrency, restart and cloud evidence. Record source/artifact identity and unrun checks; no profile or revision certifies another.
- Use anonymous public submissions only when explicitly selected. Require enrolled authenticated readers and approved abuse, privacy, retention, cost and ingress controls before publication.
<!-- sql-apps:constitution:end -->
```
