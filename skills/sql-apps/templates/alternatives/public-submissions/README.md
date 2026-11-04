# Public submissions starter

This inbox accepts anonymous one-label submissions, not reads or edits.
Reads require verified owner enrollment; public launch requires publication review.

## Run locally

Copy the starter to an empty folder; install the public variant before customization:

```powershell
node C:\path\to\plugin\skills\sql-apps\templates\alternatives\install.mjs static-web-apps-public C:\apps\my-inbox
Set-Location C:\apps\my-inbox
Copy-Item .env.example .env
# Configure unused ports and approved SQL terms; omit all AUTH_* keys.
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
npm ci
npm run local:init
npm run local:preflight
npm run build
npm test
npm run local:start
```

Set unused `APP_PORT`, `FUNCTIONS_PORT` and `SQL_PORT` in `.env`; approve and set
`ACCEPT_EULA=Y` before starting the private-preview SQL engine. Keep every `AUTH_*`
setting absent for anonymous-only local use.
Open `APP_ORIGIN` and submit a label.

Expose SQL only on `127.0.0.1`; runtime uses local `app_api`, never cloud credentials.
If set, `FUNCTIONS_URL` must equal `http://127.0.0.1:FUNCTIONS_PORT`.

Use the root `package.json`'s Node floor, npm, Docker/cached preview SQL, Core Tools 4
and SWA CLI 2. Acquisition/terms need approval; cached startup needs no Azure CLI
session or identity provider.

## Command and evidence boundaries

`npm run build` compiles backend/config, frontend and Functions.
`npm test` uses compiled-backend/Functions and frontend Vitest source; no rebuild.
Start/acceptance reuse output without freshness checks; rebuild changes and record
source/dirty-state, build command/time and artifacts.

`local:preflight` checks tools/images/config without installing or starting.
`local:status` (`local:ready` alias), `local:preview` and `local:connect` inspect
readiness/URL/loopback SQL, not sign-in.
Ctrl+C/`npm run local:stop` stops owned processes/containers and retains volumes;
needs local config/Docker, not a successful build.
`deployment:prepare` stages existing Functions/frontend output, not a rebuild.

Default `npm run acceptance` tests anonymous SQL submission/acknowledgement,
denied reads and grants; it owns startup/shutdown and retains data/budget usage.
For owners, set `ACCEPTANCE_PHASE=owner` and
supply real `ACCEPTANCE_OWNER_TOKEN` and `ACCEPTANCE_UNENROLLED_TOKEN` through a
secure process environment after approved provider setup and operator enrollment.
It checks enrolled reads, unenrolled denial and restart persistence.
Remove tokens afterward; never put them in chat/files/arguments/logs.
Separately verify browser sign-in/inbox reload, concurrent budgets and cloud publication.

Use [public-submissions.md](./public-submissions.md) for identity,
enrollment/revocation and publication gates; [deployment.md](./deployment.md) for cloud steps.
