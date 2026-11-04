# Static Web Apps / Functions starter

React -> managed Functions -> Azure SQL; no DAB or app images.

## Run locally

Copy the starter to an empty folder; select Functions before customization:

```powershell
node C:\path\to\plugin\skills\sql-apps\templates\alternatives\install.mjs static-web-apps C:\apps\my-app
Set-Location C:\apps\my-app
Copy-Item .env.example .env
# Configure identity, ports and approved SQL terms before Init.
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
npm ci
npm run local:init
npm run local:preflight
npm run build
npm test
npm run local:start
```

Before Init, set real tenant-bound identity in `.env`, register `APP_ORIGIN/`,
select unused `APP_PORT`/`FUNCTIONS_PORT`/`SQL_PORT` and approve preview SQL terms.
Open `APP_ORIGIN`, sign in, save an item, and reload it.

Expose SQL only on `127.0.0.1`; runtime uses local `app_api`, never cloud credentials.
If set, `FUNCTIONS_URL` must equal `http://127.0.0.1:FUNCTIONS_PORT`.

Use supported Node/npm (`package.json`), Docker Linux/cached pinned SQL, Core Tools 4
and SWA CLI 2. Cached startup needs no Azure CLI session; real OIDC sign-in,
consent and provider connectivity remain required.

## Build, lifecycle and evidence

| Command | Contract |
| --- | --- |
| `npm run build` | Backend/config, frontend and Functions `dist` builds |
| `npm test` | Compiled-backend/Functions Node tests, then frontend Vitest source tests; no rebuild |
| `npm start` / `npm run local:start` | Foreground SQL/Functions/SWA using existing build |
| `npm run local:preflight` | Tools, cached SQL image and config checks only; no install, pull, sign-in or startup |
| `npm run local:status` / `local:ready` | Owned services and actual SQL engine/catalog readiness, not authenticated acceptance |
| `npm run local:preview` / `local:connect` | Checked browser URL / native loopback SQL connection instructions |
| `npm run acceptance` | Real-token direct/SWA API denials, SQL ownership/uniqueness, no table writes, restart; fake SWA identity cannot bypass validation |
| `npm run local:stop` | Stop owned processes/containers; retain volumes; no build required |
| `npm run deployment:prepare` | Stages existing frontend and Functions output; does not compile or publish |

Rebuild changes: Start checks existence, not freshness. Record source/dirty-state,
build command/time, artifacts, results and blockers. Stop needs local config/Docker,
not compilation. Never reset data to pass.

Stop before acceptance; it owns startup/shutdown and retains rows. Supply
`ACCEPTANCE_TOKEN_A` and `ACCEPTANCE_TOKEN_B` securely in process environment,
never chat/source/arguments/logs; remove afterward.
Record build/unit, API/SQL, real browser sign-in/save/reload and cloud results separately.

See [deployment.md](./deployment.md) for cloud operator steps and
[deployment-migrations.md](./deployment-migrations.md) for SQL setup.
