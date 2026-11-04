# SQL Apps: high-level project specification

## 1. Purpose and supported scope

SQL Apps is a multi-host coding-assistant guidance plugin for creating or changing
editable SQL-backed web applications. Deliver one useful, tested vertical slice:
user action, selected API, real SQL persistence and reload. Generated applications
are app-owned and run independently of the plugin. SQL Apps is not a runtime,
hosting service, generic SQL administration tool or deployment authorization system.

The supported application scope is React/Vite and TypeScript with Azure SQL
Database (local container or cloud) and a supported API bundle below. On-premises
SQL Server and arbitrary API/framework replacements are outside this scope.
Existing applications must be inspected for compatible architecture, identity,
SQL ownership/invariants and lifecycle; a similar language alone is not proof of
compatibility. Unsupported stacks require an explanation and separately scoped
migration proposal, never implicit conversion or a template overlay.

Exact runtime compatibility, release status, preview constraints and dated
observations belong to the [release and compatibility record](./reference/releasing.md),
not this specification. Neither release identity nor a template certifies an app.

## 2. User workflow

1. Inspect the application directory, instructions and existing work. Resolve the
   requested outcome, users, access rules, first workflow and authorized scope.
2. **New app:** establish an empty target, select a supported bundle, copy the
   complete starter (including dotfiles and lockfile), install any selected
   alternative into that fresh copy, then customize. A nonempty directory with
   unrelated files is not an empty target; preserve it and agree on another empty
   directory or explicitly scoped preparation.
3. **Existing app:** inspect architecture, dependencies, customized work, identity,
   SQL/migration state and commands. Establish compatibility, then edit supported
   applications in place. Do not run starter/profile installers over existing
   applications. Explain mismatches and propose migration separately.
4. Discover only missing prerequisites for the selected workflow. Preserve
   database, API, profile and identity choices; do not switch to cloud or mocks
   because local setup is missing. Safe UI/schema work can continue with
   persistence explicitly unverified.
5. Implement and verify one real vertical slice. Disclose command builds,
   prerequisites and artifact selection. Rebuild changed source before tests that
   consume compiled output; report exactly what ran and what did not.
6. Deploy only when requested and approved for the exact target and operation.
   Keep business decisions in the app brief and deployment approvals, operator
   actions and evidence in one app-owned deployment record.

## 3. Supported profile matrix

Profile selection fixes a host/API bundle; it is not migration or deployment
approval. The public identifier remains compatible but selects an access-mode
variant, not a fourth hosting topology.

| Profile name / selection | Hosting topology | API | Access model | SQL prerequisite | Local tooling | Identity prerequisite | Evidence/status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Default `container-apps` | Separate Container Apps web and DAB apps | DAB | Protected owner records | Local preview engine; cloud recipe provisions Azure SQL after approval | Node/npm, Docker, cached SQL and DAB images | Real SPA/API registration and consent; cloud DAB managed identity | [Recorded evidence](./reference/releasing.md#profile-status) |
| `app-service-f1` | Separate web and DAB sites on F1 | DAB | Protected owner records | Local preview engine; existing approved cloud Azure SQL | Same local tooling as default | Real SPA/API registration and consent; cloud DAB managed identity | [Recorded evidence](./reference/releasing.md#profile-status) |
| `static-web-apps` | Static frontend and managed Functions | Functions | Protected owner records | Local preview engine; existing approved cloud Azure SQL | Node/npm, Docker with cached SQL, Functions Core Tools and SWA CLI | Real SPA/API registration and consent; cloud SQL service-principal credential | [Recorded evidence](./reference/releasing.md#profile-status) |
| `static-web-apps-public` | Same Static Web Apps bundle | Functions | Anonymous bounded submissions; protected enrolled-owner reads | Same SQL prerequisite, plus public-inbox migration and grants | Same local tooling as Functions | None for anonymous-only local submissions; real provider and operator SQL enrollment for owner reads | [Recorded evidence](./reference/releasing.md#profile-status) |

The [shape catalog](../skills/sql-apps/references/deployment-shapes.md) owns
topology-specific request paths, access boundaries and checks. The
[profile installer guide](../skills/sql-apps/templates/alternatives/README.md)
owns fresh-copy selection.

## 4. Invariants and approvals

- Preserve existing app code, credentials, data, decisions and unrelated work.
  Never overlay a template onto an existing application.
- Keep secrets out of browser code, source control, logs and transcripts. Validate
  identity in the enforcing API and ownership/invariants in SQL with restricted
  grants; no alternate direct route may bypass that enforcement.
- Use forward-only, checksummed migrations. Never reset data or edit applied
  migrations to make a check pass. There is no automatic baseline/adoption of
  an existing database without migration history; inspect and plan separately.
- Recurring local development with tools and cached images already available
  needs no Azure CLI session or cloud deployment. This does not eliminate preview
  acquisition/terms, external application-user sign-in, provider connectivity or
  owner enrollment. It is not a promise of offline or unauthenticated protected
  use. See [installation prerequisites](./installation.md#application-prerequisites).
- The [constitution's approval policy](../skills/sql-apps/references/constitution.md#approval-policy)
  is authoritative: a requested application edit establishes scope, not blanket
  permission for identity administration, host configuration, installation,
  image acquisition, cloud writes, spending, access changes or destructive work.
  Never silently change database, API, profile, region, tier, identity or access
  boundary to work around missing prerequisites.
- Commands must disclose compilation, prerequisites, output selection and cleanup
  behavior. The bundled local Start and acceptance commands require existing
  builds; missing outputs fail, but stale outputs are not automatically detected.
  Cleanup remains independent of successful compilation. See the
  [starter command contract](../skills/sql-apps/templates/starter/README.md#command-contracts).
- Recovery is a reviewed forward fix, a compatible application rollback or a
  separately planned database restore, not promised down-migrations or automatic
  restore. Follow the [migration limits](../skills/sql-apps/templates/starter/deployment-migrations.md#existing-databases-and-recovery).

## 5. Acceptance gates

Claims are independent and bounded by profile, environment, source revision and
artifact identity. The [shared evidence contract](../skills/sql-apps/references/deployment.md#evidence-gates)
defines checks and required record fields.

| Gate | Required outcome | Permitted claim |
| --- | --- | --- |
| Host installation/discovery | Actual installed payload and fresh-session discovery for named host/version | That host loaded that payload; static manifests alone prove packaging only |
| Starter/profile functionality | Build/unit checks plus actual selected API/SQL authorization, denied paths, ownership/invariants, concurrency and restart persistence | Only the exercised functionality/profile; build-only or mock results remain partial |
| Real-provider authenticated acceptance | Real browser sign-in, save/reload and two-user allowed/denied API/SQL checks | Authenticated acceptance only for the tested profile/revision |
| Deployed-profile verification | Approved live target, actual resources/settings/artifacts/access/cost checks and runtime/browser/SQL acceptance | Verified only for that deployed profile and immutable revision |

For the public variant, anonymous submission and denied reads form a separate
phase from real-provider enrolled-owner reads and restart persistence. Anonymous
submission success never certifies owner access. Mark missing checks unverified,
not inapplicable; genuinely inapplicable checks require a reason. Historical cloud
success, compilation, health checks and one passing profile do not certify another
revision, environment, provider or profile.

## 6. References

- [Product summary](../README.md) and [host installation](./installation.md)
- [Assistant workflow](../skills/sql-apps/SKILL.md) and
  [durable policy](../skills/sql-apps/references/constitution.md)
- [Starter guide](../skills/sql-apps/templates/starter/README.md),
  [alternatives](../skills/sql-apps/templates/alternatives/README.md) and
  [prerequisites](../skills/sql-apps/references/prerequisites.md)
- [Shape catalog](../skills/sql-apps/references/deployment-shapes.md) and
  [deployment policy](../skills/sql-apps/references/deployment.md)
- [Release, compatibility and evidence records](./reference/releasing.md)
