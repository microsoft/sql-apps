# Packaging, verification, and releases

[Back to SQL Apps](../../README.md) | [Installation](../installation.md)

## Package and release identity

This checkout is the **0.3.0 release candidate**, with starter baseline 0.1.0,
not a published release or updated installation. The coordinate remains
`sql-apps@sql-apps-skills`. All hosts share [one skill payload](../../skills/sql-apps/SKILL.md);
the starter and optional overlays are inert source to copy into applications.
There are no plugin hooks, MCP servers, runtime dependencies or plugin build step.

[plugin.json](../../plugin.json) owns the version. Keep Claude, Codex, Cursor and
Gemini manifests and the shared/Cursor catalog versions aligned; the Codex catalog
reads the plugin version. Published versions are **immutable**: changed shipped
bytes need a new version, not a replaced package or retagged release. Record the
reviewed revision and skill-payload fingerprint; it is not an archive signature.

## Verification status

The current candidate separates the default DAB starter from explicit F1/DAB and
Static Web Apps/Functions overlays. No default Rayfin manifest or private CLI is
required. SQL is private unless an unused loopback `SQL_PORT` is selected.
Both APIs use the same local commands. Functions runs installed Core Tools/SWA CLI
against loopback SQL, without DAB. Build/unit results do not prove sign-in,
persistence or hosting.
Inspection/cleanup commands need no compiled output or compiler. Build is explicit
before Start, compiled-code tests and acceptance; none hides a compiler hook.
`npm start` aliases `local:start` for the selected profile; internal DAB web hosting
uses `serve:web`. Status checks SQL engine/catalog; Ready aliases Status.

The following observations predate the latest Start/Test/staging consolidation;
they identify historical revisions, **not verification of the current commands**.
Rerun affected copied-app and repository checks before claiming current results.

| Historical evidence | Result and boundary |
| --- | --- |
| Offline repository suite after local-workflow changes | 229 passed; one opt-in live SQL bootstrap test skipped |
| Independent DAB copy | Build, 19 Node tests and 10 frontend tests passed |
| Explicit Functions copy | Build, 35 Node tests, 10 frontend tests, artifact staging and standalone production-dependency loading passed |
| Historical operational-command regression | Inspection/cleanup paths passed without build output despite a deliberately failing build; external Docker/HTTP boundaries stubbed. Start now requires a separate Build; rerun current checks before release |
| Functions orchestration | Actual owned HTTP child processes; normal/separate Stop, duplicate Start, occupied ports, partial failure, child exit and malformed/idle control callers covered; Docker/CLI boundaries stubbed |
| Actual Functions/SWA hosts | Core Tools 4.16.0/SWA CLI 2.0.10 passed static/public config, direct/proxied denial controls, restricted SQL configuration and owned listener cleanup; no SQL connection or real-user sign-in tested |
| Prior actual Compose merges | Certificate overlay retained; SQL private by default, loopback-only when opted in; no services started |
| Package fidelity | Independent copied skill payload matched; not native install/update evidence |
| Authenticated local SQL journey | Not rerun: required cached image unavailable; no pull, sign-in or terms acceptance performed |

The HTTP-only host smoke logged an unconfigured Storage health warning; Storage
connectivity was not tested. Core Tools sets a local `WEBSITE_HOSTNAME`; SQL password
configuration permits only Development/loopback there, never a cloud instance.

The recorded Functions dependency review found three moderate npm advisories through
`@azure/identity` -> `@azure/msal-node` -> `uuid`
([advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq)).
A previous bounded update check found no safe fix; do not force an upgrade or
promote Functions without resolving the dependency chain and rerunning its tests.

| Host | Recorded native evidence |
| --- | --- |
| Copilot CLI | 0.2.0 local registration/install/list on CLI 1.0.102 reported `source: live`; nothing copied. Current loading unverified. |
| VS Code | 1.143.0 loaded a 0.2.1 candidate and exercised one local workflow. Current loading/copied update unverified. |
| Claude Code | Manifest/catalog validation only; interactive loading unverified. |
| Codex, Gemini CLI, Cursor | Static packaging only; native hosts unavailable during validation. |

### Recorded local candidate proof

Historical supervised VS Code/0.2.1 reservation-app checks passed SQL overlap and
member-limit enforcement, owner isolation, direct/proxied authorization controls,
concurrent races, browser save/reload and packaged restart. Six frontend tests and
18 live/browser results passed. DAB moved from failing 2.0.12 Custom-JWT setup to
2.1.5; HTTP handling and test observers needed repairs. This was not one-shot.
Two Express/body-parser advisories remained in that generated app.

Retained SHA-256 identities: historical skill payload
`db13865f8111581b4bcde23b40eba5733686f88155db74b19eb92c2bc3891c29`,
source archive `6cb44e7d2e7eb9ed30291450b4464d12d0ab74d965c6a8b3e8fe9fa9e3c372d4`,
compiled package `194919ab0f4b942ab03bb37e02dd9edd8c63d82c4cd9e0dcc3cd72e9dd1bf277`.
These identify historical artifacts, not current source. Broader onboarding,
matched-baseline and copied-install/cloud evaluation were stopped or incomplete;
transcript coverage was incomplete. No speed, cost or unattended-quality claim.

### Starter baseline 0.1.0

On 2026-10-27, an independent starter on Node 22.22.2/npm 10.9.7 with pinned DAB
2.1.5/SQL images passed real local SQL/API ownership, denials, concurrent duplicate
conflict, restricted-login checks, exact-row restart persistence and a new write.
Browser checks used synthetic OIDC/PKCE: save/reload, duplicate/input retention,
themes, narrow layout and keyboard focus passed. Simulated outage UI was not a
cloud quota event. SQL stopped with exit 137, `OOMKilled=false`; recovery passed,
but clean engine shutdown is not established.

Later local image checks used 0.25 CPU/512 MiB without observed OOM. F1/SWA
infrastructure compiled; actual Functions Core Tools 4.16.0 and SWA CLI 2.0.10
passed public-config/routing and denial smoke checks. Compiled web/Functions
artifacts loaded without a compiler. No positive Functions-to-SQL workflow or
real-provider sign-in was established by those checks.

### Cloud evidence and remaining gates

The separately approved 2026-10-27 West US 3 Container Apps review provisioned
resources, verified actual scale/ingress/free-limit settings, bootstrapped the
least-privilege managed identity and passed denial smoke checks. SQL SID binding
was corrected from object ID to application client ID; a separately authorized
live regression later passed. The temporary operator firewall rule was removed.
Registry pulls used an approved repository-scoped token after `AcrPull` assignment
failed; this is not managed-identity pull evidence. That exception had seven-day
credential expiry and registry standing charges, not guaranteed-zero cost.

Real-user two-owner API/restart and browser acceptance remain **unverified**:
tenant consent initially blocked sign-in; later operator-reported normal-browser
sign-in did not complete those gates. Warm denial timings were not authenticated
latency, cold-start or load tests. F1 and SWA have no live cloud acceptance;
Functions also lacks real SQL ownership/pooling/bootstrap acceptance.

## Validation procedure

Use Node 22.22.2+, Git and a local Bicep compiler (`BICEP_CLI_PATH` if needed).
Offline checks need no Azure sign-in. Never install dependencies in the plugin
payload: copy the starter to a disposable app, then use its documented build/test
commands. Install an overlay only for its separate validation.

```powershell
node --test tests\*.test.mjs
```

Tests check discovery/metadata, links, packaging, lockfiles, compiled infrastructure
and executable behavior. Wording checks are not assistant acceptance. Run
[starter tests](../../skills/sql-apps/templates/starter/README.md) and
[overlay tests/staging](../../skills/sql-apps/templates/alternatives/README.md)
from independent copies. Record commands, versions, failures and skipped checks.

### Package and installed-copy verification

Run the [verifier](../../scripts/verify-release.mjs) against both an independent
unpacked package and the actual installed root reported by the host:

```powershell
node scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root C:\approved\unpacked-package
node scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root C:\actual\installed-plugin
```

It compares manifests/catalogs and the exact skill file set with byte-exact
content, rejects extra host components, links and hard links, and reports version,
file count and SHA-256 fingerprint. Exit codes: 0 match, 1 mismatch, 2 usage error.
Package canonical LF bytes under [Git attributes](../../.gitattributes); do not
normalize verifier differences away or discard dirty files to repair an old copy.

An unpacked package proves fidelity, not host activation. `--plugin-dir`, a
checkout, marketplace root or `source: live` is not a copied installation.
Use [installed-path discovery](#verify-the-actual-installed-root),
open a fresh session, confirm the loaded path/version and verify that root again.
Test initial installation and update from the previous release using isolated
host configuration; never modify live caches to make verification pass.

### Verify the actual installed root

This is maintainer/troubleshooting work, not normal installation. Use Node 22 or
later and the [release verifier](../../scripts/verify-release.mjs) from an approved
release checkout. Find the root the host **actually loaded**, containing
`plugin.json` and `skills`, through plugin diagnostics or the loaded skill path.
Do not substitute a repository, `--plugin-dir`, development link or marketplace
registration root.

For VS Code, enumerate candidates without modifying caches:

```powershell
Get-ChildItem "$env:APPDATA\Code\agentPlugins" -Directory -Filter '*sql-apps*' |
  ForEach-Object { Get-ChildItem $_.FullName -Directory } |
  Select-Object -ExpandProperty FullName
$installedRoot = Read-Host 'Actual installed SQL Apps package root'
node C:\git\sql-apps-v3\scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root "$installedRoot"
```

Match the current session's loaded path, not merely the newest hash directory.
Success reports `PASS sql-apps 0.3.0`, compared roots, file count and a SHA-256
fingerprint. A stale version, same-version changed payload, missing/extra file,
linked payload or unexpected host component fails with paths. Canonical LF comes
from Git attributes; never erase dirty work or normalize a package mismatch away.
Open a fresh session after install/update and verify the actual loaded root again.
Byte fidelity and a `source: live` listing do not prove copied-host activation or
application execution. Discover the selected API tools before runtime validation.

### Runtime and cloud acceptance

Use an approved disposable workspace and the [reservation scenario](../../README.md#2-build-your-first-workflow).
Verify UI/API/SQL save/reload, denied and allowed direct requests, ownership, SQL
concurrency, exact-row persistence/restart and a post-restart write. Change a rule
in a fresh conversation and confirm existing policy/behavior survives. Exercise
missing prerequisites and out-of-profile requests: useful scaffolding may proceed,
but no mock persistence, automatic cloud switch or silent migration.

Default local delivery needs no cloud login. Check themes, keyboard behavior and
packaged assets. Do not generate speculative Rayfin configuration; migrations
require explicit scope and released/version-matched tooling. Preserve existing
app manifests. Compare equivalent measured runs before claiming productivity gains.

The maintainer-only synthetic [runtime fixture](../../scripts/test-starter-runtime.mjs)
and [browser checker](../../scripts/test-starter-browser.mjs) require approval for
cached images, terms, ports, synthetic users/data and cleanup. They are not shipped
with apps. Trust/certificate bypass is test-scoped, never OS-wide or deployed.
The fixture stops owned containers and retains its volume/ignored credentials:

```powershell
node scripts\test-starter-runtime.mjs C:\approved\starter-copy "C:\Program Files\Git\usr\bin\openssl.exe"
```

Use `--resume` only with its existing fixture-owned copy; `--browser-check` takes
an already installed Playwright module. `--image-check` requires locally built
`sqlapps-recipe-web:validation` and `sqlapps-recipe-dab:validation` images.

For an approved review deployment only, follow the [deployment runbook](../../skills/sql-apps/templates/starter/deployment.md)
and [attribution contract](../../skills/sql-apps/references/deployment-attribution.md).
Check actual SKUs, free-limit AutoPause, networking, every supporting meter,
identity, tags/names and approved exceptions. Preserve shared resources and customer
metadata. Local compilation or a successful deploy does not satisfy this gate.

The opt-in [live bootstrap test](../../tests/cloud-bootstrap.test.mjs) uses
`SQLAPPS_CLOUD_BOOTSTRAP_TEST=1` plus `CLOUD_SUBSCRIPTION`, `CLOUD_SQL_SERVER`,
`CLOUD_SQL_DATABASE` and `CLOUD_IDENTITY_ID`; it needs approved operator connectivity
and pyodbc/ODBC 18. It verifies repeated bootstrap, client-ID SID binding and refusal
of a mismatched principal; it does not create firewall rules or migrate schemas.

The [cloud API gate](../../scripts/test-cloud-acceptance.mjs) needs real-provider
delegated tokens for two approved users, never synthetic tokens. Enter them using
masked prompts in the operator shell, not chat, files, arguments or shell history:

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

`--approve-restart` requires approval for both named apps. This CLI restart adapter
is Container Apps-specific; other hosts need an approved callback. Direct internal
DAB and browser save/reload need separate checks; Functions needs direct handler
and real SQL evidence. Never point maintainer gates at customer data.

## Publish a release

1. Review license/notices, payload, immutable version and all recorded boundaries.
2. Run the full repository suite, copied-app builds/tests and independent verifier.
   Record source revision, exact results and fingerprint; keep secrets out of evidence.
3. With maintainer authorization, publish reviewed commits and the matching immutable
   version tag/release to [microsoft/sql-apps](https://github.com/microsoft/sql-apps).
4. Verify each advertised install/update route and fresh-session payload. Check host
   pinning syntax instead of inventing tag parameters. Marketplace listing can need
   separate submission/permissions.
5. Keep untested host and app/cloud scenarios explicit. A manifest edit, package
   match or publication does not certify application acceptance.

The [constitution](../../skills/sql-apps/references/constitution.md) owns stack
policy; the [router](../../skills/sql-apps/SKILL.md) selects focused guidance.
Do not add another specification, workflow engine or provider runtime.
