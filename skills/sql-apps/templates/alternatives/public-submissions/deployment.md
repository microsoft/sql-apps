# Public inbox deployment record

Public cloud publication is **blocked until the operator approves and tests**
abuse/ingress controls, privacy notice, retention, response, and cost exposure.
Local submission tests are not publication approval. Keep this file as the sole
target, approval and result record; the copied `README.md` owns local commands.

| Decision | Record |
| --- | --- |
| Target and artifacts | Tenant, subscription, region, SQL host/database, source revision, staged content and immutable runtime versions |
| Access and enrollment | Approved ingress/abuse controls, identity owner, verified owner tenant/object IDs, operator and secret channels |
| Privacy and cost | Notice, permitted submission data, retention/purge rule, budget limit, hosting/network assumptions and exceptions |
| Evidence and remaining work | Actual settings, checks/results, failures, open gates and next owner/action |

## Functions operator steps

1. Build and test the selected profile, then run `npm run deployment:prepare`.
   After every restage, reinstall API production dependencies as described in
   [hosting.md](./hosting.md#static-web-apps-free--functions).
2. Use the shared [SQL migration procedure](./deployment-migrations.md) to apply
   and verify **both** `001-initial.sql` and `002-public-submissions.sql` against
   the application database, in version order. Never start the API before migration
   history and both checksums are verified.
3. Use `infra/functions-bootstrap.sql` with the approved Functions service
   principal, then verify its restricted grants. Do not grant table writes,
   `db_owner` or enrollment to the runtime identity.
4. Configure the SWA template and SQL service-principal secret through approved
   secure channels. Leave `ownerAuth` unset for anonymous-only operation; configure
   all five real owner identity values together only after identity-owner approval.
5. Before publication, complete the publication gates in
   [public-submissions.md](./public-submissions.md). Use only the approved target
   and scope; a successful Bicep deployment is not acceptance.
6. After approved deployment, verify anonymous denials and allowed submissions,
   owner denial and allowed read, SQL limits/permissions, persistence, cost and
   actual ingress. Enroll the owner only through the reviewed SQL operator script.

Keep tokens and SQL secrets out of files, chat, shell history, command arguments,
logs and public frontend settings. Reconcile a failed deployment before retrying;
preserve submissions and migration history.
