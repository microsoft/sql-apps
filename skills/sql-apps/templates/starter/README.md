# SQL Apps application starter

Baseline **0.1.0**. Copy this directory, including dotfiles and lockfile, into an
empty application directory. Never execute it inside the installed plugin or
overlay existing source. It is editable app-owned source, not a plugin runtime.

The default is React/Vite → same-origin web routing → DAB → Azure SQL.
Select an explicit F1/DAB or Static Web Apps/Functions overlay before adapting
the sample; see [profile differences](./hosting.md). Unused Functions/Rayfin
integrations are not generated. Selection is not migration or deployment.

The sample signs in, creates an owned uniquely labelled item and reloads from SQL;
a unique constraint rejects concurrent duplicates. Replace it with the first useful
business workflow. DAB's static web server has no SQL driver or CRUD authority.
Both selected APIs enforce validated ownership and expose the protected read/create
contract rather than unrestricted table writes.

## Identity decision comes first

Confirm the tenant-bound issuer, API audience, public SPA client, delegated scope,
consent, exact redirect/logout URI and immutable GUID `oid` access-token claim
through the identity owner. Entra v2 access tokens are the initial contract; an
ID token is not an API access token. Browser OIDC authorization-code/PKCE uses no
client secret. Never substitute fake sign-in.

Common/multitenant issuers do not fit this single-tenant ownership model.
Changing tenant/issuer needs an identity/data migration decision; other providers
need reviewed claim mapping and renewed authorization checks.

## First local run

Prerequisites: Node 22.22.2+, npm 10, Docker Linux containers and authorized cached
images matching [baseline.json](./baseline.json): SQL/DAB for DAB; SQL only for
Functions. The SQL engine is Private Preview, not SQL Server. Preview access,
registry login/pulls, software terms and identity changes need their permissions;
the starter never installs tools, pulls images or registers accounts automatically.

Copy `.env.example` to `.env` only for a fresh copy; preserve existing credentials.
Configure public identity and explicitly accept SQL terms, then select unused ports:

- **DAB:** `APP_PORT` / `DAB_PORT`, matching `APP_ORIGIN` / `DAB_URL`. Local DAB
  uses `127.0.0.1`, not `localhost`. SQL is private unless `SQL_PORT` is opted in.
- **Functions:** installed Core Tools 4 and SWA CLI 2, `APP_PORT`,
  `FUNCTIONS_PORT` (7071 default) and required `SQL_PORT` (14330 sample).
  Host-running Functions requires SQL bound only to `127.0.0.1`.
  Optional `FUNCTIONS_URL` must match `http://127.0.0.1:FUNCTIONS_PORT`;
  `DAB_URL` / `SQL_CONNECTION_STRING` are unused. It uses restricted local
  `app_api`, rejecting cloud SQL credentials; SWA fake identities do not pass
  this API's bearer validation.

Register the exact origin's `/` redirect URI. From the copied application:

```powershell
Copy-Item .env.example .env
# Configure identity, selected-profile ports and SQL terms before proceeding.
npm ci
npm run local:init
npm run local:preflight
npm run build
npm test
npm run local:start
```

**Build → Start is explicit.** `npm start` aliases `local:start`; both start the
selected SQL/API/web stack. Start, Test and acceptance never compile implicitly:
Build first, and rebuild changed source before compiled-code checks.
`serve:web` is internal compiled DAB web hosting, not the public Start path.
Generated output stays out of source control.

Open `APP_ORIGIN`, sign in, save and reload. The same label must fail for the same
owner but succeed for another. The sample shows the latest 100 records; add
pagination for larger workflows. Rejected/expired sessions return to Sign in;
callback errors allow retry, not silent token renewal.

## Daily lifecycle and Stop

| Command | Purpose |
| --- | --- |
| `npm run local:preflight` | Check tools, cached images/config; never install/pull/sign in/start |
| `npm start` / `npm run local:start` | After Build, foreground selected SQL/API/web startup |
| `npm run local:status` | Owned containers, HTTP and actual SQL engine/catalog readiness |
| `npm run local:preview` | Checked preview URL |
| `npm run local:connect` | Native MSSQL instructions for opted-in loopback SQL |
| `npm run local:ready` | Compatibility alias for Status |
| `npm run local:stop` | Stop owned supervisor/processes/containers; retain volumes |

Build changed source, Start, Status/Preview, then Ctrl+C or separate Stop.
Init/preflight/inspection/Stop need no compiler or compiled output, so broken builds
cannot prevent cleanup. Missing Start/acceptance output produces Build guidance.
Readiness must confirm `EngineEdition = 5` and `appdb`, not `master`;
it is not authenticated acceptance.

Each copy gets a random Compose project name; never share `.env` between apps.
Keep explicit `COMPOSE_FILE` selection consistent across lifecycle/acceptance.
The loopback SQL overlay is appended when `SQL_PORT` is set.
Use MSSQL's credential dialog/database node, not credentials in Chat/source.

Ctrl+C/Stop preserve SQL data. After abrupt supervisor death, Stop still stops
owned containers; inspect leftover host processes before restarting.
Unexpected supervised-child exit stops containers and reports failure.
Never delete volumes to pass checks. Preserve ignored credentials with their
volume; secret replacement requires SQL-login rotation. Protect `.env` / `.local`
with host-appropriate ACLs; POSIX modes alone do not secure Windows files.

Startup rejects changed applied migration checksums. Add forward migrations:
`XACT_ABORT`, a transaction spanning batches, and version/checksum insertion before
commit, as in [001-initial.sql](./packages/data/migrations/001-initial.sql).
The lockfile preserves pinned integrity without maintainer-registry tarball URLs.
For intentional dependency updates retain that convention:

```powershell
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
```

Repeat Build and affected checks afterward.

## Authenticated local acceptance

Stop the stack first. Supply short-lived real-provider API tokens for two distinct
approved test users as process environment `ACCEPTANCE_TOKEN_A` /
`ACCEPTANCE_TOKEN_B`, through secure prompts/secret channels; never chat, source,
arguments, logs or shell history. Remove them afterward.

```powershell
npm run build
npm run acceptance
```

Acceptance owns startup/shutdown and retains test rows/volume. Require direct and
proxied denied/allowed controls, ownership, table-write-bypass denial, invalid
input, one concurrent duplicate winner, exact-row restart persistence and a new
write. Do not run against real user data. Unit mocks, synthetic issuers and
readiness do not prove real-provider SQL integration.

Record Build/unit results, selected-API/SQL acceptance and browser
sign-in/save/reload (narrow/desktop, keyboard, themes/error states) separately.
DAB-specific inspection applies only to DAB. Historical preview shutdown/recovery
observations do not certify current commands or cloud recovery.

## Deployment

[deployment.md](./deployment.md) alone owns cloud target/cost/access approvals,
operator commands, SQL bootstrap, publication, acceptance and recovery.
The brief only links it. Local success is not cloud acceptance.
