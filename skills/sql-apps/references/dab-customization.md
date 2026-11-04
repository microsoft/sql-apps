# Customize a DAB workflow

Use for DAB entity/rule/role/error changes.

## Establish the version and evidence

Use the app's `baseline.json`, config and image pin, not a different host CLI.
Resolve uncertain behavior against version-matched docs/source; record revision
and label **source-derived, not live-verified** until tested with that image/SQL.

The sample expects duplicate 409 and invalid-label `DatabaseOperationFailed`;
custom procedures need verified error contracts.

## Wire the complete contract

| Surface | Review when replacing the sample |
| --- | --- |
| SQL | Entities, constraints, transactional/concurrent rules, views/procedures, session claims, migration history and restricted runtime grants |
| DAB | Entity source type, parameter types, allowed actions/roles and session-context configuration |
| Same-origin proxy | Permitted methods, paths and headers needed by the selected operations, without trusting caller-supplied identity |
| Browser | Shared types, request parameters, effective-role selection, error states and available actions |

Update configuration/unit/acceptance assertions together.
Verify temporal types/serialization; preserve the brief's time-zone rules.

## Roles and session claims

The starter grants only `authenticated` and strips `x-ms-*`.
**Keep the default proxy unchanged** unless explicit role selection is needed.

For an approved staff/member split:

1. Define minimum roles/actions with the identity owner; approve registration,
   consent and assignment changes separately.
2. Verify `X-MS-API-ROLE` with real tokens on the selected runtime.
   It selects a role, not membership; DAB must validate role membership.
3. If necessary, narrowly forward `X-MS-API-ROLE` through the proxy and send it
   deliberately from the app client. Keep forged principal, other `x-ms-*`,
   cookie and forwarded-identity headers blocked; never forward all headers.
   Preserve existing hop-by-hop and `Connection`-nominated header filtering.
4. Verify required claims in `SESSION_CONTEXT` (`oid`, effective role, others).
   Effective role need not contain every token role. Enforce ownership/invariants
   with SQL grants, not UI visibility.
5. Test direct and proxied staff/member actions, missing/invalid tokens, forged
   staff headers, missing role headers and ownership isolation.

## Business rejections and concurrency

Do not assume SQL `THROW` becomes HTTP 409. Verify production status/sanitized errors.
500/`DatabaseOperationFailed` may be an outage, not business rejection.
Never parse private SQL messages into public errors or enable development disclosure.

Use valid-write controls, SQL state and operator diagnostics to distinguish
rejection from outage. Without a stable specific reason, show a generic UI error.

For reservations, serialize overlap check/insert on the same resource in one SQL
transaction; client prechecks cannot enforce concurrency. Use half-open intervals
and test conflicting races plus independent-unit/back-to-back success controls,
exact winner counts and persisted rows.
