# Deployment recipe candidate: starter 0.1.0

**Unverified. Not permission to provision.** Use the owning Azure/SQL/identity
workflow to resolve this candidate against current runtime/service guidance.
Local API acceptance or a successful build does not promote this recipe.

## Portable artifact contract

| Component | Build/publication | Runtime configuration and lifecycle |
| --- | --- | --- |
| Web | `npm ci` then `npm run build`; publish `packages/frontend/dist`, `packages/server`, and `scripts/config.mjs` together, preserving paths | Node >=22.22.2; run `node packages/server/server.mjs` with environment-injected config; TLS ingress forwards to `APP_HOST`/`APP_PORT`; `/health` is web liveness, not whole-stack readiness |
| DAB | Pinned runtime/config in `baseline.json` and `packages/data/dab-config.json`; container or version-matched code artifact | TLS/internal ingress reachable from web; `SQL_CONNECTION_STRING`, `AUTH_ISSUER`, `AUTH_AUDIENCE`; start only after migrations/permissions; supervise and probe `/` |
| SQL | Reviewed numbered forward migrations and narrowly scoped grants; no automatic cloud execution by `local.mjs` | Azure SQL Database, managed identity or approved secret-based API identity; migration identity separate from runtime; backup/recovery and schema rollback strategy reviewed |
| Identity | External SPA authorization-code + PKCE and delegated API scope | Exact public `/` redirect/logout URI; tenant-bound issuer/audience and GUID `oid`; no browser client secret; verify tokens, ownership, expiration and negative controls |

Prefer environment injection: `.env` is optional and required settings are validated
before listening. Never publish local `.env`,
test issuer files, SQL administrator credentials, `node_modules` from another OS,
or the local `TrustServerCertificate=True` connection to the cloud.

The web server and DAB are independent processes. A single-process/static host does
not supply both. A code-based App Service DAB recipe is a candidate for the data
process; build its compatible runtime artifact before publication. Do not assume
F1, B1, a separate host, or a paid fallback is approved. Record exact hosting tier,
OS/architecture, process supervision, ingress/path routing, private/public DAB
access, timeouts, sleep behavior and TLS for every required process.

## Decisions required before writes

Keep one review in the app brief or owning deployment plan:

- `intent: poc`, `costPreference: free-first` unless explicitly overridden; preserve
  strict `zero-azure-spend` and component-specific approved exceptions.
- Subscription/region and each resource/SKU, SQL offer eligibility and quota stop/
  overage settings, recurring/usage costs, build/publication, logs, storage, network,
  secrets and every implicitly created resource.
- Identity registration/consent, redirect URLs, SQL principal/grants and network
  access changes. Choose the trust boundary before adding business workflows.
- Configured public app origin, internal DAB origin, issuer and audience; no fixed
  loopback dependencies in deployed source.
- Explicit approvals for resource/access/spend changes, migration execution and
  destructive cleanup; adopted `sqlapps-version` and final `sqlapps` naming suffix.

Planning and local packaging do not require Azure provisioning or login.

## Promotion gate

At an immutable source revision record actual pinned versions, commands, resource
settings, sanitized results, failures, timestamps and limitations. In an approved
isolated deployment verify browser sign-in/save/reload through DAB, direct allowed
and denied API controls, cross-owner isolation, concurrent duplicate rejection,
full restart persistence and post-restart write. Read back actual SKUs, free-limit
flags, network/access settings, tags and names. Retest changes to dependencies,
image digests, identity contract or topology. Keep local acceptance and deployed
acceptance distinct; do not estimate time savings from this first skeleton.
