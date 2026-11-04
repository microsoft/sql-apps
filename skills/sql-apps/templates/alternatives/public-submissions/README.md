# Public submissions starter

This profile accepts anonymous one-label submissions into one private inbox.
Visitors cannot read, choose owners or edit submissions. An operator must enroll a
verified owner before anyone can read the inbox. Public cloud publication is blocked
until its abuse, privacy, retention, cost and ingress review is complete.

## Run locally

Copy the complete default starter to an empty app folder, then install the public
access-mode variant before customization. Never overlay an existing application:

```powershell
node C:\path\to\plugin\skills\sql-apps\templates\alternatives\install.mjs static-web-apps-public C:\apps\my-inbox
Set-Location C:\apps\my-inbox
Copy-Item .env.example .env
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
setting absent for anonymous-only local use. Open `APP_ORIGIN` and submit a label.
Stop the foreground stack before running `npm run acceptance`; acceptance starts
and stops its own stack and retains its test data.

Use Node satisfying the copied `package.json` engine floor, npm, Docker with the
authorized cached preview SQL image, Functions Core Tools 4 and SWA CLI 2.
Acquisition/terms may need separate permission or sign-in; recurring cached local
runs need no Azure CLI session or deployment. Anonymous-only submissions need no
identity provider. This is not an unauthenticated owner mode: `/api/Submissions`
returns 503 without owner configuration, denies missing/invalid identity when
configured and denies valid but unenrolled readers. Legacy Items/CreateItem
routes remain disabled.

The browser POST goes through SWA to the Functions handler and restricted SQL
submission procedure. Owner GET validates a real bearer token and SQL checks the
tenant/owner enrollment. Direct Functions calls have the same enforcement; fake
SWA principal headers and anonymous submission success cannot bypass owner reads.

## Command and evidence boundaries

`npm run build` compiles root backend/config and selected workspaces.
`npm test` uses compiled backend/Functions modules plus frontend Vitest source
tests; it does not rebuild production output. `npm start` / `local:start` and
`npm run acceptance` reuse existing build output. Missing entry files fail with
Build guidance, but stale output is not detected; rebuild changed source and
record source/dirty-state and artifact identities.

`local:preflight` checks tools/images/config without installing or starting.
`local:status` (`local:ready` alias), `local:preview` and `local:connect` inspect
readiness/URL/loopback SQL, not sign-in. Ctrl+C or `npm run local:stop` stops owned
processes and containers, retaining volumes, without needing a successful build.
Stop still needs the app's local project configuration and Docker.
`deployment:prepare` stages existing Functions/frontend output, not a rebuild.

Default `npm run acceptance` is the public phase: anonymous SQL submission,
generic acknowledgement, denied reads and restricted grants. It does not certify
owner access. For the separate owner phase, set `ACCEPTANCE_PHASE=owner` and
supply real `ACCEPTANCE_OWNER_TOKEN` and `ACCEPTANCE_UNENROLLED_TOKEN` through a
secure process environment after approved provider setup and operator enrollment.
That phase checks enrolled reads, unenrolled denial and restart persistence.
Remove tokens afterward; never put them in chat, files, arguments or logs.
Real-provider browser sign-in/inbox reload, concurrent budget enforcement and
cloud publication need separately recorded checks; the script alone does not
prove them. Follow the copied SQL migration guide; it supplies no automatic
existing-schema baseline or database restore.

Read [public-submissions.md](./public-submissions.md) before configuring owner
access. It explains verified Entra setup, SQL enrollment/revocation and the
separate publication gates. Use [deployment.md](./deployment.md) for this profile's
cloud operator sequence.
