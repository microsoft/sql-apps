# SQL Apps application starter

Baseline **0.1.0**. Copy this directory into an empty application directory, including
dotfiles and the lockfile. Do not execute it inside the installed plugin. This is
ordinary app-owned source, not a SQL Apps runtime or a complete business application.

The default remains Container Apps/DAB. [Hosting profiles](./hosting.md) add explicit
App Service F1/DAB and Static Web Apps Free/managed Functions integrations, selected
in `deployment.json`. DAB is optional only for the Functions profile. Host selection
does not deploy, migrate data, or grant access; live evidence is tracked separately.

The sample is deliberately small: sign in, create your own uniquely labelled item,
and reload it from SQL. A SQL unique constraint rejects concurrent duplicates.
Replace this sample with the first real vertical workflow before expanding scope.

## What is already assembled

- React/Vite/TypeScript workspaces, accessible UI states and theme tokens.
- A production static server with same-origin DAB routing and runtime public configuration.
- External OIDC authorization-code + PKCE sign-in; no client secret or custom issuer.
- Pinned DAB and Azure SQL Database preview images, migration checksums, explicit
  catalog collation, a separate least-privilege API login, and a persisted volume.
- One foreground startup command with SQL/DAB/web readiness and supervised shutdown.
- Unit checks and a real-API acceptance command, including a full stack restart.
- Separate web/DAB container build recipes and [Container Apps/SQL Bicep](./infra/main.bicep) with an explicit operator bootstrap; cloud acceptance remains unverified.

In DAB profiles, the server is only static hosting/routing: it has no SQL driver, CRUD implementation,
or authority to grant roles. DAB validates tokens; SQL derives ownership from the
validated `oid` session context. Only the read view and create procedure are exposed.

## Identity decision comes first

Use the identity owner to confirm a tenant-bound issuer, API audience, public SPA
client, API scope, exact redirect/logout URI, and an immutable GUID `oid` access-token
claim. Microsoft Entra with v2 access tokens is the intended initial contract, not
an automatic account/app registration. Configure delegated API permission and consent
through approved identity guidance. An ID token is not an API access token.

Do not use a common/multitenant issuer with this single-tenant `oid` ownership model.
Changing the issuer/tenant requires an explicit identity/data migration decision.
Other providers require a reviewed claim mapping and renewed authorization tests.
There is no synthetic login fallback. Local real-provider sign-in and cloud sign-in
require separate validation; a test issuer does not certify either.

## First local run

Prerequisites: Node 22.22.2 or newer, npm 10, Docker with Linux containers, and
authorized cached images matching [baseline.json](./baseline.json). The SQL image is
Private Preview, not SQL Server. Preview signup, registry sign-in, pulls, software
terms and identity/access changes require their own permissions. The starter never
pulls images or registers accounts automatically.

The lockfile pins dependency versions and integrity hashes but omits registry
tarball URLs, so it uses the developer's configured npm registry rather than a
maintainer-specific feed. Preserve this with
`npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved`
when intentionally updating dependencies, then repeat build and acceptance.

The frontend, web server, and Functions API are TypeScript. `npm run build`
checks types and compiles runnable JavaScript; `npm start` serves that compiled
web app. The web server and shared configuration build into `dist/`, while
Functions builds into `packages/functions/dist/`. Keep these generated files
out of source control. Setup scripts and Node tests remain JavaScript.

In PowerShell, from the copied app directory:

```powershell
Copy-Item .env.example .env
# Configure public identity values, ports, and explicitly accept SQL terms in .env.
npm ci
npm run local:init
npm run build
npm test
npm run local:start
```

Open the configured `APP_ORIGIN`. Sign in, save an item, and reload. The same label
must be rejected for the same owner but allowed for another owner. The UI shows the
latest 100 records; extend pagination when the real workflow requires it.
Expired or API-rejected sessions return to Sign in rather than retrying stale
tokens. A denied sign-in callback reports the error and leaves Sign in available
for another attempt. The starter does not silently renew tokens.

Choose unused `APP_PORT`/`DAB_PORT` and matching `APP_ORIGIN`/`DAB_URL` before startup.
Register the exact origin's `/` redirect URI. SQL has no host-published port. Each
copy receives a random Compose project name; never share its `.env` with another app.

Ctrl+C stops the web process and containers, preserving data. If a terminal is
abruptly killed, run `npm run local:stop` to stop this copy's containers. Restart with
`npm run local:start`. Initialization preserves existing credentials and startup
rejects changed applied migrations. Add forward migrations; do not edit migration
001 after applying it. Each migration must use `XACT_ABORT`, a transaction spanning
all batches, and insert its version/checksum before committing, as in
[001-initial.sql](./packages/data/migrations/001-initial.sql).

Never run volume-deleting commands to pass acceptance. Preserve ignored `.env`
credentials with the volume; replacing secrets without rotating SQL logins breaks
access. Protect local secret files with host-appropriate permissions/ACLs; portable
POSIX file modes alone do not secure Windows files. Do not commit `.env` or `.local`.

Observed limitation of the pinned SQL preview: Docker stop ended the engine with
exit 137 and `OOMKilled=false`. Full restart recovery and persisted row identity
passed, but this is not proof of a clean engine shutdown. Do not infer cloud
recovery guarantees from this local preview result.

## Repeatable acceptance

With the stack stopped, supply short-lived API tokens for two distinct synthetic
users through `ACCEPTANCE_TOKEN_A` and `ACCEPTANCE_TOKEN_B` in the invoking process
environment (not source, command-line arguments, logs, or the committed example).

```powershell
npm run acceptance
```

This command owns startup/shutdown. It checks direct and proxied anonymous/forged
identity/signature denials, authenticated controls, ownership, direct-write bypass
denial, invalid input, one winner in a concurrent duplicate race, exact persisted
row identity across full SQL/DAB/web stop/start, and a new post-restart write. It
retains synthetic evidence rows and the volume. It does not automate browser login
or claim deployed acceptance. Do not run against real user data.

`npm test` uses mocks for frontend behavior and an HTTP stub for proxy tests; those
checks do not prove DAB/SQL integration. Record separately:

1. Build and unit checks.
2. Real DAB/SQL API acceptance.
3. Browser sign-in/save/reload, desktop/narrow states, keyboard and error checks.
4. Local app accepted after restart.
5. Deployed app accepted, only after approved cloud validation.

Record phase start/end timestamps and observed waits separately from active work.
Do not call phase wall time a labor measurement or claim speed gains without a
second comparable measured build.

## Cloud boundary

Read [deployment.md](./deployment.md) before deployment. The concrete default is
public web and internal HTTPS DAB on Container Apps Consumption plus Azure SQL
free-offer AutoPause. Container Apps monthly grants are not a hard spending cap.
No extra cloud skills plugin is needed. The local Compose path is not the cloud
recipe. A public deployment requires explicit resource/spend/access approval,
published immutable images, external identity configuration, SQL connectivity and
operator bootstrap, and separate acceptance. No exercised cloud recipe is bundled.
