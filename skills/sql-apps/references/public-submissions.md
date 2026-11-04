# Opt-in public submission, private owner inbox

Explicit opt-in: anonymous `Label` (1–120 characters) to **one inbox**.
No signup, owner choice, reads or edits. Success is **202** `{"accepted":true}`,
never an ID, read URL or proof of ownership.

## Select and run

Select `static-web-apps-public` before customization; existing apps need scoped
migration, not overlays. Only `static-web-apps`/`functions` supports
`"access":"public-submissions"`; missing auth never selects it.
Use the installed README for startup and acceptance.

## Configure and enroll an owner

Configure all five through the identity owner:
`AUTH_AUTHORITY`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_CLIENT_ID`, `AUTH_SCOPE`.
Use `https://login.microsoftonline.com/<nonzero-tenant-GUID>/v2.0`, matching issuer,
real API audience, approved SPA client and `openid` plus delegated API scope.
Register `APP_ORIGIN/` redirect/logout and consent.
Partial/invalid configuration fails; ID tokens, fake SWA headers and cookies do not authenticate.

`GET /api/Submissions` requires RS256 signature, issuer/audience/tenant/lifetime,
nonzero `oid` and delegated scope validation, plus SQL allowlist membership.
**Login is not membership:** unenrolled users receive **403**. Reads return at
most 100 latest records; legacy Items/CreateItem routes cannot read or enroll.

1. Verify tenant/user object GUIDs with the identity owner in the real directory,
   never email, display name, browser input, unvalidated tokens or first caller.
2. Obtain operator approval; open `packages/data/operator-owner.sql` through a
   privileged **appdb** connection, never the runtime account.
3. Set `@Approved = 1`, `@Action = N'ENROLL'` and the verified tenant/user GUIDs.
   Execute in the native SQL editor.
4. Sign in through the real provider and verify allowed inbox reads. A second,
   valid but unenrolled test identity must still receive 403.
5. To revoke, approve the same pair with `@Action = N'REVOKE'`. Membership is
   checked on each read; revocation blocks future reads, not delivered data or
   in-flight reads holding the membership lock.

No enrollment API/runtime grant.

In `infra/static-web-apps.bicep`, `ownerAuth = null` omits all cloud `AUTH_*` settings.
After approval, supply complete `authority`, `issuer`, `audience`, `clientId`, `scope`;
SQL client ID/secret remain required. Protected SWA requires all five auth values.

## Durable hard stops, not internet abuse protection

`002-public-submissions.sql` adds inbox, allowlist and a durable settings row;
migration 001 stays unchanged. All hosts serialize with `UPDLOCK,HOLDLOCK` in one
transaction: **60 successful submissions per rolling 60 seconds**, **1000 stored
rows** by default. API/SQL validate labels. Restart does not reset limits.
Rate/full inbox: **429**; lock timeout/deadlock/service failure: **503**.
No automatic mutation retry or optimistic save.

Bootstrap grants only submission/list and denies legacy/table/enrollment access.
`public-permissions.sql` is installer input, not another bootstrap.
Change limits/retention/permissions by reviewed forward migration, never reset/clear
or edit applied files to bypass controls.

Verify limits under concurrent live SQL writes; unit tests cannot prove locking.
In an approved public-profile app with isolated running SQL and restricted
connection settings in process environment:

```powershell
$env:RUN_PUBLIC_BUDGET_LIVE = 'I_APPROVE_BUDGET_CONSUMPTION'
try {
  node --test tests\public-submissions-live.test.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Live budget verification failed.' }
} finally {
  Remove-Item Env:\RUN_PUBLIC_BUDGET_LIVE
}
```

Consumes up to 60 writes across two pools within one minute; no startup, reset
or identity creation.

## Cloud publication is blocked pending explicit review

Before publication, record approved/tested bot/ingress controls, privacy notice,
sensitive-data limits, costs, retention/purge/access, incident response and SQL
concurrency/grants in the [deployment record](./deployment.md).
No built-in approval bypass, CAPTCHA or WAF.

SQL limits bound stored writes, **not** traffic, connection exhaustion, bots,
denial-of-service or hosting/network charges. Origin checks are not identity or
anti-bot protection.
