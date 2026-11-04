# Static Web Apps / Functions starter

This starter runs a static React app and managed Functions API against Azure SQL.
It does not deploy DAB, application container images or a plugin runtime.
Local SQL still runs in Docker and requires an authorized cached preview image.

## Run locally

Copy the default starter to an empty application folder, then select Functions
before changing source:

```powershell
node C:\path\to\plugin\skills\sql-apps\templates\alternatives\install.mjs static-web-apps C:\apps\my-app
Set-Location C:\apps\my-app
Copy-Item .env.example .env
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
npm ci
npm run local:init
npm run local:preflight
npm run build
npm test
npm run local:start
```

Configure the real tenant-bound identity values in `.env`, register the exact
`APP_ORIGIN/` redirect URI, choose unused `APP_PORT`, `FUNCTIONS_PORT` and
`SQL_PORT` values, and accept SQL terms before starting the private-preview
database. Do not copy DAB settings or use SWA's fake identity as proof of sign-in.
Open `APP_ORIGIN`, sign in, save an item, and reload it.

## Local prerequisites and request boundary

Use Node satisfying the copied root `package.json` engine floor and npm, Docker
Linux containers with the pinned SQL image, installed Functions Core Tools 4 and
SWA CLI 2. Acquire tools/images and accept SQL terms only within approved setup
scope. Once available, recurring local work needs no Azure CLI session or cloud
deployment. It still needs application-user OIDC/PKCE sign-in, provider
connectivity and consent. No protected fake-user/unauthenticated mode is supplied.
Without identity setup, protected end-to-end acceptance remains unverified.

Browser access tokens pass through SWA's `/api` route to Functions. Functions
validates signature, issuer, audience, tenant, expiry, user identity and delegated
scope, then uses restricted SQL views/procedures with transaction-leased owner
session context. SQL enforces ownership and uniqueness. Direct local Functions
requests traverse the same handlers; SWA fake identity/principal headers do not
bypass bearer validation. Runtime credentials cannot write base tables.

## Build, lifecycle and evidence

| Command | Contract |
| --- | --- |
| `npm run build` | Root backend/config and workspace builds; produces frontend and Functions `dist` output |
| `npm test` | Existing compiled backend/Functions Node tests, then frontend Vitest source tests; no production rebuild |
| `npm start` / `npm run local:start` | Foreground SQL, Functions and SWA using existing builds; missing entry files fail with Build guidance |
| `npm run local:preflight` | Tools, cached SQL image and config checks only; no install, pull, sign-in or startup |
| `npm run local:status` / `local:ready` | Owned services and actual SQL engine/catalog readiness, not authenticated acceptance |
| `npm run local:preview` / `local:connect` | Checked browser URL / native loopback SQL connection instructions |
| `npm run acceptance` | Existing-build two-user API/SQL checks, owned restart and cleanup; provide `ACCEPTANCE_TOKEN_A` and `ACCEPTANCE_TOKEN_B` securely in process environment |
| `npm run local:stop` | Owned processes/containers only, retains volumes; no compilation or build output required |
| `npm run deployment:prepare` | Stages existing frontend and Functions output; does not compile or publish |

Rebuild after source changes: Start guards existence, not freshness. Record source
revision/dirty-state digest, build command/time and tested artifact hashes; stale
output cannot certify changed source. Ctrl+C or Stop retains data; failed builds
do not block Stop, which still needs the app's local project configuration and
Docker. Never reset data to pass a check.

Stop the stack before acceptance; it owns startup/shutdown and retains test rows.
Supply real-provider tokens for two approved users via a secret channel, never
chat, source, arguments or logs; remove them afterward. API/SQL success is separate
from real-provider browser sign-in/save/reload, and from cloud verification.
Synthetic fixtures and readiness do not establish those claims.

See [deployment.md](./deployment.md) for cloud operator steps and
[deployment-migrations.md](./deployment-migrations.md) for SQL setup.
