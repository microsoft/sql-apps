# Packaging, verification and releases

## Package and release identity

**0.3.0 candidate**, starter baseline 0.1.0; publication/update unverified.

[plugin.json](../../plugin.json) owns version; align host manifests/shared/Cursor
catalogs (Codex reads plugin version). Changed published bytes require a new version,
never replacement/retagging.

## Compatibility and preview boundaries

Minimum: **Node.js 22.22.2 and npm**. See app manifests/[image pins](../../skills/sql-apps/templates/starter/baseline.json);
newer combinations need testing.

For SQL preview access and API tools, see [prerequisites](../../skills/sql-apps/references/prerequisites.md).

## Profile status

All profiles remain **Experimental** pending revision-matched live acceptance:

| Profile/access mode | Remaining live gates |
| --- | --- |
| Container Apps / DAB protected | Matched immutable revision and complete real-provider two-owner API/browser/restart acceptance |
| App Service F1 / DAB protected | Independent F1 settings/headroom, provider/SQL/browser/restart acceptance |
| Static Web Apps / Functions protected | Actual SQL ownership/pooling/bootstrap, real-provider browser and deployed acceptance |
| Static Web Apps / Functions public submissions | Anonymous SQL/budget checks, real-provider enrolled/unenrolled owner/browser/restart and publication controls |

## Release blockers

- Fresh-session copied install/update discovery remains unverified for the current
  payload on advertised hosts; manifests alone do not prove activation.
- A prior Functions dependency review found three moderate advisories through
  `@azure/identity` -> `@azure/msal-node` -> `uuid`
  ([advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)).
  Recheck the locked tree and resolve/document exposure before promotion;
  do not force upgrades or treat a passing build as clearance.

## Validation procedure

Use supported Node, Git and local Bicep (`BICEP_CLI_PATH` if needed); no Azure login.
Install dependencies in disposable app/profile copies, never the plugin payload.

```powershell
node --test tests\*.test.mjs
```

Build/test independent [starter](../../skills/sql-apps/templates/starter/README.md)
and selected [profile](../../skills/sql-apps/templates/alternatives/README.md) copies.

### Package and installed-copy verification

Run the [verifier](../../scripts/verify-release.mjs) against the unpacked package
and loaded installation:

```powershell
node scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root C:\approved\unpacked-package
node scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root C:\actual\installed-plugin
```

Compares manifests/catalogs/skill bytes; rejects extra host components, links and
installed build/cache/secrets. Reports version/count/SHA-256;
exits 0 match, 1 mismatch, 2 usage error.
Package LF via [Git attributes](../../.gitattributes); do not hide mismatches.

Test install/update from the previous release in isolated host configuration;
development loaders and `source: live` do not prove copied installation/activation.

### Verify the actual installed root

Find the **loaded** root (`plugin.json`/`skills`) via diagnostics/skill path.
For VS Code, enumerate without modifying caches:

```powershell
Get-ChildItem "$env:APPDATA\Code\agentPlugins" -Directory -Filter '*sql-apps*' |
  ForEach-Object { Get-ChildItem $_.FullName -Directory } |
  Select-Object -ExpandProperty FullName
$installedRoot = Read-Host 'Actual installed SQL Apps package root'
node C:\git\sql-apps-v3\scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root "$installedRoot"
```

Use the loaded path, not newest directory; confirm version/discovery in a fresh
session and verify again. Never modify caches to pass.

### Runtime and cloud acceptance

Use an approved disposable workspace and the [reservation scenario](../../README.md#2-build-your-first-workflow).
Verify UI/API/SQL, then change a rule in a fresh conversation and retest.
Check missing-prerequisite/unsupported-stack handling: no mock fallback, cloud
switch or implicit migration.

The synthetic [runtime fixture](../../scripts/test-starter-runtime.mjs)/
[browser checker](../../scripts/test-starter-browser.mjs) need approved images,
terms, ports, data and cleanup; they do not prove real-provider behavior or authorize
weakened TLS/system trust. Containers stop; volumes/credentials remain:

```powershell
node scripts\test-starter-runtime.mjs C:\approved\starter-copy "C:\Program Files\Git\usr\bin\openssl.exe"
```

Use `--resume` only with its existing fixture-owned copy; `--browser-check` takes
an installed Playwright module. `--image-check` requires locally built
`sqlapps-recipe-web:validation` and `sqlapps-recipe-dab:validation` images.

For cloud review, follow the [operator runbook](../../skills/sql-apps/templates/starter/deployment.md)
and [evidence gates](../../skills/sql-apps/references/deployment.md#evidence-gates).

The opt-in [live bootstrap test](../../tests/cloud-bootstrap.test.mjs) uses
`SQLAPPS_CLOUD_BOOTSTRAP_TEST=1` plus `CLOUD_SUBSCRIPTION`, `CLOUD_SQL_SERVER`,
`CLOUD_SQL_DATABASE` and `CLOUD_IDENTITY_ID`; it needs approved operator connectivity
and pyodbc/ODBC 18. Checks repeat bootstrap/client-ID SID/mismatched principal;
no firewall writes or schema migration.

The [cloud API gate](../../scripts/test-cloud-acceptance.mjs) needs real-provider
delegated tokens for two approved users. Enter via masked operator-shell prompts,
never chat, files, arguments or history:

```powershell
$env:ACCEPTANCE_TOKEN_A = [System.Net.NetworkCredential]::new('', (Read-Host 'User A token' -AsSecureString)).Password
$env:ACCEPTANCE_TOKEN_B = [System.Net.NetworkCredential]::new('', (Read-Host 'User B token' -AsSecureString)).Password
try {
  node scripts\test-cloud-acceptance.mjs --origin https://<approved-web-host> --subscription <approved-subscription> --resource-group <approved-group> --web-app <approved-web-app> --dab-app <approved-dab-app> --approve-restart
  if ($LASTEXITCODE -ne 0) { throw 'Cloud acceptance failed.' }
} finally {
  Remove-Item Env:\ACCEPTANCE_TOKEN_A, Env:\ACCEPTANCE_TOKEN_B
}
```

`--approve-restart` requires approval for both apps; this CLI restart adapter is
Container Apps-specific. Other hosts need an approved callback. Direct internal
DAB/Functions and browser workflows require separate checks.
Never point maintainer gates at customer data.

## Publish a release

1. Review license/notices, version and blockers; validate exact released bytes above.
   Record source revision, host/profile results, fingerprint and unrun gates.
2. With authorization, publish reviewed commits and the matching immutable version
   tag/release to [microsoft/sql-apps](https://github.com/microsoft/sql-apps).
3. Verify advertised install/update routes and fresh-session discovery; check supported
   pinning syntax. Marketplace listing needs its own permissions/submission.
