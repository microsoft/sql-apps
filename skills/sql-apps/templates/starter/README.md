# SQL Apps application starter

Baseline **0.1.0**. Copy this directory, including dotfiles and lockfile, into an
empty application directory. Never execute it inside the installed plugin or
overlay existing source. It is editable app-owned source, not a plugin runtime.

The default is React/Vite → same-origin web routing → DAB → Azure SQL.
Select an explicit F1/DAB or Static Web Apps/Functions overlay before adapting
the sample; see [profile differences](./hosting.md). Unused Functions/Rayfin
integrations are not generated. Selection is not migration or deployment.

An expressly selected public-submission/private-owner alternative uses
`static-web-apps-public` before customization. Read the installed SQL Apps
public-submissions reference before selection; that installer includes an app-owned
`public-submissions.md` guide. Anonymous visitors submit to
one bounded inbox; no reads are possible without real owner authentication and
operator SQL enrollment. Its public local phase needs no identity. The protected
default and identity-first workflow below are unchanged; public cloud publication
requires a separate approved abuse/privacy/cost/retention and ingress review.

The sample signs in, creates an owned uniquely labelled item and reloads from SQL;
a unique constraint rejects concurrent duplicates. Replace it with the first useful
business workflow. DAB's static web server has no SQL driver or CRUD authority.
Both selected APIs enforce validated ownership and expose the protected read/create
contract rather than unrestricted table writes.

## Identity setup

The protected app needs an identity administrator to register the SPA and API,
approve consent, and return these values. Send them the exact local redirect and
logout URI:
`${APP_ORIGIN}/` (for example, `http://127.0.0.1:5180/`).

| Setting | Ask the identity owner for |
| --- | --- |
| `AUTH_AUTHORITY` | Tenant-specific Entra v2 authority |
| `AUTH_ISSUER` | Matching tenant-bound access-token issuer |
| `AUTH_AUDIENCE` | API application ID URI or audience |
| `AUTH_CLIENT_ID` | Public SPA application ID |
| `AUTH_SCOPE` | `openid` and the approved delegated API scope |

Use the real API access token, not an ID token. The app uses browser
authorization-code/PKCE and needs no browser secret. Do not replace real sign-in
with a test identity for acceptance.

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

Open `APP_ORIGIN`, sign in, save and reload. A duplicate label for one owner must
fail; another owner may use that label. The sample shows the latest 100 records.

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

Record build/unit, selected API/SQL and browser sign-in/save/reload results
separately. DAB-specific checks apply only to DAB.

## Deployment

[deployment.md](./deployment.md) alone owns cloud target/cost/access approvals,
operator commands, SQL bootstrap, publication, acceptance and recovery.
The brief only links it. Local success is not cloud acceptance.
