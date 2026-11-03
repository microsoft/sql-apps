# Static Web Apps / Functions starter

This starter runs a static React app and managed Functions API against Azure SQL.
It does not use DAB, Docker images or a plugin runtime.

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

See [hosting.md](./hosting.md#static-web-apps-free--functions) for local ports and
profile behavior, [deployment.md](./deployment.md) for cloud operator steps, and
[deployment-migrations.md](./deployment-migrations.md) for SQL setup.
