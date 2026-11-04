# SQL Apps application starter

Baseline **0.1.0**. Copy all files, including dotfiles/lockfile, into an empty app
directory; never run inside the installed plugin or overlay existing source.

Default: React/Vite -> same-origin proxy -> DAB -> Azure SQL.
Install alternative profiles before customization; they replace these instructions.

## Identity setup

Ask the identity owner to register SPA/API, approve consent and supply these values.
Redirect/logout URI: `${APP_ORIGIN}/`, e.g. `http://127.0.0.1:5180/`.

| Setting | Ask the identity owner for |
| --- | --- |
| `AUTH_AUTHORITY` | Tenant-specific Entra v2 authority |
| `AUTH_ISSUER` | Matching tenant-bound access-token issuer |
| `AUTH_AUDIENCE` | API application ID URI or audience |
| `AUTH_CLIENT_ID` | Public SPA application ID |
| `AUTH_SCOPE` | `openid` and the approved delegated API scope |

Use real API access tokens, not ID tokens; browser PKCE needs no secret.
Missing provider setup blocks authenticated acceptance, not scaffolding.
Local startup needs no `az login`; app sign-in is separate.

DAB validates direct/proxied JWTs and sets SQL session `oid`; `api.Items` filters
ownership, `api.CreateItem` requires identity and SQL enforces uniqueness.
Web has no SQL driver; runtime grants deny base-table access.

## First local run

Prerequisites: [supported Node/npm](./package.json), Docker Linux and authorized
cached [SQL/DAB images](./baseline.json). SQL is Private Preview, not SQL Server.
Approve acquisition/terms separately; no automatic installs or pulls.

For a fresh copy only, create `.env`; never overwrite existing credentials.
Set identity, `ACCEPT_EULA=Y` after terms approval, unused `APP_PORT`/`DAB_PORT`
and matching `APP_ORIGIN`/`DAB_URL`. Use `127.0.0.1`, not `localhost`, for DAB.
SQL stays private unless `SQL_PORT` is opted in.

```powershell
Copy-Item .env.example .env
# Configure .env before proceeding.
npm ci
npm run local:init
npm run local:preflight
npm run build
npm test
npm run local:start
```

Open `APP_ORIGIN`, sign in, save and reload. A duplicate label for one owner must
fail; another owner may use that label. The sample shows the latest 100 records.

## Command contracts

| Build/test command | Compilation and artifact selection |
| --- | --- |
| `npm run build` | Backend compilation, frontend type-check and Vite production build |
| `npm run build:backend` | Backend/config only; not a complete app build |
| `npm test` | Compiled-backend Node tests, then frontend Vitest source tests; no rebuild |
| `npm run acceptance` | Owns startup/shutdown using existing output and real SQL; needs two approved users' tokens |
| `npm run deployment:prepare` | Validates DAB configuration; no rebuild or cloud write |

Start/tests/acceptance reuse output without freshness checks; rebuild changed source.
`serve:web` serves only compiled web output, not the full stack.

## Daily lifecycle and Stop

| Command | Purpose |
| --- | --- |
| `npm run local:preflight` | Check tools/images/config only; no install, pull, sign-in or startup |
| `npm start` / `npm run local:start` | Foreground SQL/DAB/web using existing build |
| `npm run local:status` / `local:ready` | Owned containers, HTTP and actual SQL engine/catalog readiness |
| `npm run local:preview` | Checked preview URL |
| `npm run local:connect` | Native MSSQL connection instructions |
| `npm run local:stop` | Stop owned supervisor/processes/containers; retain volumes |

Init/preflight/inspection/Stop need no compiler/output.
Readiness checks `EngineEdition = 5`/`appdb`, not sign-in.

Each copy gets a random Compose project name; never share `.env` between apps.
Keep explicit `COMPOSE_FILE` selection consistent across lifecycle/acceptance.
Use MSSQL's credential dialog/database node, not credentials in Chat/source.

After supervisor death, Stop still stops containers; inspect leftover processes
before restart. Unexpected child exit stops containers and reports failure.
Never delete volumes to pass checks. Preserve matching credentials/volumes;
credential changes require SQL-login rotation. Protect `.env`/`.local` with host ACLs.

Use [migration/recovery steps](./deployment-migrations.md) for SQL changes.
For intentional dependency updates, retain lockfile integrity without registry URLs:

```powershell
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
```

## Authenticated local acceptance

The bundled acceptance script tests the Items sample, not a customized app.

Stop first. Securely supply two approved users' short-lived real API tokens through
process environment `ACCEPTANCE_TOKEN_A`/`ACCEPTANCE_TOKEN_B`.
Never put tokens in chat/source/arguments/logs/history; remove afterward.

```powershell
npm run build
npm run acceptance
```

Use isolated test data; acceptance retains rows/volume.
The script does not drive browser sign-in.

### Adapting acceptance to the app

Replace sample paths, payloads, guards and configuration/unit/acceptance assertions
together. Map each brief rule to an allowed operation, rejection and expected SQL state.

- Test direct/proxied allowed and denied operations, invalid input and restricted
  SQL grants with distinct approved identities across ownership/staff/member boundaries.
- For reservations, check half-open intervals (back-to-back allowed), overlap,
  independent units, lifecycle limits, own/other cancellation and staff actions
  from the brief. Private details stay private.
- Race on the same resource where every competing request conflicts. Assert exact
  winner count and persisted rows; verify a valid control from the same batch succeeds.
- Check expected status, sanitized errors and SQL state. Do not accept any error as a valid business rejection
  or loosen assertions for unexplained failures.
- Verify exact rows after restart and a new write; separately exercise real browser
  sign-in, the business action and reload. Fixtures/readiness do not prove acceptance.

Record profile, source/dirty-state and artifact identities, build command/time,
build/unit, API/SQL and real-browser results and blockers here. Separate public-local,
full authenticated-local and cloud results. Missing checks remain unverified;
inapplicable checks need a reason. Retest affected behavior after changes.
Local delivery can still require separately approved provider changes.

## Deployment

Use [deployment.md](./deployment.md) for cloud approvals, steps and results.
