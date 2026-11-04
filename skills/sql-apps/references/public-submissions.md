# Opt-in public submission, private owner inbox

This is **not the default protected starter**. Choose it explicitly for anonymous
submission to **one application inbox**, not customer CRUD or multiple owners'
separate collections. Visitors submit one `Label` (1–120 characters). They cannot
choose an owner, sign up, list, retrieve, update or delete submissions. Successful
submission returns only HTTP **202** and `{"accepted":true}`—no row, identifier,
secret or read URL. Never claim an anonymous acknowledgement establishes ownership.

## Generate, build and test

Copy the starter, including dotfiles, to an empty application directory, excluding
generated `node_modules`, `dist` and local credentials if copying a working checkout.
Before adapting any source, run the explicit installer from the plugin:

```powershell
node C:\path\to\plugin\skills\sql-apps\templates\alternatives\install.mjs static-web-apps-public C:\apps\my-inbox
Set-Location C:\apps\my-inbox
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
npm ci
npm run build
npm test
```

`deployment.json` selects `static-web-apps` / `functions` with
`"access":"public-submissions"`. No other host/API combination accepts that access
mode. Application-owned `packages/functions/src/profile.ts` and frontend
`src/profile.ts` are compiled into their respective outputs; mutable browser
configuration or missing auth settings never selects the profile. Rebuild after
source changes. Ordinary SWA/Functions and the default DAB profile remain protected.
Do not switch an existing app by editing JSON or overlaying files: review a scoped
application/data migration instead.

The profile reuses Functions, SWA CLI, React and the normal isolated SQL lifecycle;
there is no new CRUD server, dependency or silently added paid service.

## Public local milestone: no identity needed

Copy the installed `.env.example` to `.env`; keep **all** `AUTH_*` keys absent
initially. Set unused ports, confirm approved cached SQL preview access/tools,
and explicitly accept the SQL terms with `ACCEPT_EULA=Y` when authorized:

```powershell
npm run local:init
npm run local:preflight
npm run build
npm test
npm run local:start
```

Visit `APP_ORIGIN` and submit. Owner sign-in remains disabled and there is no
customer list. Stop normally to preserve data. Public local acceptance (after
stopping the foreground stack) owns startup/shutdown:

```powershell
npm run acceptance
```

It verifies real anonymous SQL writes, generic acknowledgements, direct/proxied
private denial, legacy route removal and least-privilege permissions. It consumes
and retains a small amount of budget and data. It does not enroll anyone, fake an
identity, or certify owner sign-in/browser/cloud operation. Time this milestone
separately from owner identity setup. Submitted data is boundedly preserved and
unreadable until an operator enrolls a verified owner.

## Owner access is a separate, explicit operator milestone

Through the identity owner, configure **all five** real settings together:
`AUTH_AUTHORITY`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_CLIENT_ID`, `AUTH_SCOPE`.
Use an exact nonzero tenant GUID in the authority
`https://login.microsoftonline.com/<tenant>/v2.0` and a matching tenant-bound issuer,
the real API audience, approved public SPA client and `openid` plus a delegated API
scope. Register the exact `APP_ORIGIN/` redirect/logout URI and approved consent.
An ID token, SWA fake identity, unsigned principal header or cookie is insufficient.
Any partial/invalid configuration is an explicit error, never a fallback.

Private `GET /api/Submissions` requires a signature-verified RS256 access token:
matching issuer/audience/tenant, valid lifetime, nonzero GUID `oid` and delegated
scope. **Login is not membership.** A valid but unenrolled identity receives **403**.
SQL independently checks the trusted tenant and oid against its allowlist and
returns the latest at most 100 records from the single inbox. Legacy
`/api/Items` and `/api/CreateItem` do not expose this profile or enroll callers.

1. Independently verify the exact tenant GUID and user object GUID in the real
   directory with the identity owner. Do not use email/display name, a browser
   field, a token merely decoded without validation, or the first API caller.
2. Obtain explicit operator approval. Use a privileged SQL connection to **appdb**,
   never the runtime account. Open `packages/data/operator-owner.sql`.
3. Set `@Approved = 1`, `@Action = N'ENROLL'`, and the two exact verified GUID
   literals. The script refuses defaults, malformed/truncated/zero GUIDs and
   unapproved actions. Execute the reviewed script through the native SQL editor.
   Never paste credentials into source, chat, logs or command arguments.
4. Sign in through the real provider and verify allowed inbox reads. A second,
   valid but unenrolled test identity must still receive 403.
5. To revoke, review the same exact pair, set approved action `REVOKE`, and execute.
   SQL membership is checked on every new read; revocation blocks subsequent
   reads even while a token remains valid. It cannot retract already delivered
   data or an in-flight read that held the membership lock before revocation.

There is **no enrollment API** and runtime users receive no enrollment permission.
For automated owner acceptance use secure process environment variables
`ACCEPTANCE_PHASE=owner`, `ACCEPTANCE_OWNER_TOKEN`, and
`ACCEPTANCE_UNENROLLED_TOKEN`; run `npm run acceptance`, then remove those variables.
It verifies denied/allowed reads and restart persistence, not directory enrollment
or the browser redirect itself. Never place tokens in a file/CLI argument/history.

The public profile installs its own `infra/static-web-apps.bicep` override.
`ownerAuth = null` intentionally omits **all** cloud `AUTH_*` app settings; it does
not insert placeholders or fake identities. After identity approval, provide one
complete `ownerAuth` object with nonempty `authority`, `issuer`, `audience`,
`clientId`, and `scope`. Partial objects are rejected by the parameter type, and
the application still validates tenant binding and real token signatures.
The SQL runtime service-principal client ID and secure secret remain required
independently, even when owner authentication is disabled. The ordinary protected
SWA template continues to require all five authentication parameters.
This override establishes configuration shape only, not cloud publication approval.

## Durable hard stops, not internet abuse protection

Forward migration `002-public-submissions.sql` adds the separate inbox, owner
allowlist, and one durable settings row. Migration 001 and its checksum are
unchanged. All app hosts serialize on that row with `UPDLOCK,HOLDLOCK`; in one SQL
transaction they enforce **60 successful submissions per rolling 60 seconds**
and **1000 total stored rows** by default. Label limits apply in API and SQL.
No runtime/restart resets controls. A full inbox/rate stop produces **429**; lock
timeout, deadlock or service failure produces **503**, not success. There is no
automatic mutation retry or client optimistic-save state.

Local/cloud permission scripts retain their existing bootstrap and append explicit
public/list procedure grants and legacy API denies. Runtime users can execute only
the public submission and membership-checking list procedures among application
entrypoints; base-table reads/writes and owner enrollment remain denied.
The installed `public-permissions.sql` is installer input, not a third bootstrap
to run independently. Changing caps, retention/purge rules or widening permissions
requires a deliberately reviewed **forward SQL migration**. Never edit an applied
migration, reset a volume, clear rows or restart to bypass a hard stop.

Optional live budget verification is skipped by default. With an already running,
approved isolated engine and restricted SQL settings in the secure process
environment, explicitly set
`RUN_PUBLIC_BUDGET_LIVE=I_APPROVE_BUDGET_CONSUMPTION` and run:

```powershell
node --test tests\public-submissions-live.test.mjs
```

It consumes up to 60 writes across two independent pools and expects further SQL
budget rejections; use a fast isolated target (the loop must complete within one
minute). It never creates identities, starts SQL or resets data. Unit/structure
tests alone do not prove live SQL locking, concurrent-host limits, revocation,
permissions, browser sign-in, or deployed behavior.

## Cloud publication is blocked pending explicit review

**Do not publish this public profile to the internet from the starter recipe.**
Follow the [deployment policy](./deployment.md#what-never-counts-as-approval-or-proof).
First record operator-approved abuse/bot and
ingress controls, privacy/notice and sensitive-data handling, cost ceilings,
retention/purge/access rules, incident response and tested concurrency/permission
results in the app-owned deployment record. Then adapt and verify the ingress and
publication workflow under that approval. There is no built-in approval flag,
automatic bypass, CAPTCHA, WAF or newly provisioned paid service.

The SQL stops only bound successful stored writes. They do **not** prevent traffic,
connection exhaustion, distributed bots, denial-of-service or hosting/network
charges. Origin validation is a browser safety check, not an anonymous caller's
identity or anti-bot guarantee. Keep public and owner acceptance, build/staging,
and reviewed deployed verification as distinct milestones.
