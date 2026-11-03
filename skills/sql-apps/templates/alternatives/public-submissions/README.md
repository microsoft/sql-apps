# Public submissions starter

This profile accepts anonymous one-label submissions into one private inbox.
Visitors cannot read, choose owners or edit submissions. An operator must enroll a
verified owner before anyone can read the inbox. Public cloud publication is blocked
until its abuse, privacy, retention, cost and ingress review is complete.

## Run locally

Copy this starter to an empty app folder, then install the public profile:

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

Read [public-submissions.md](./public-submissions.md) before configuring owner
access. It explains verified Entra setup, SQL enrollment/revocation and the
separate publication gates. Use [deployment.md](./deployment.md) for this profile's
cloud operator sequence.
