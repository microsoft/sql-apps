# Public inbox deployment record

**Block publication until approved/tested** abuse/ingress, privacy, retention,
response and cost controls.

| Decision | Record |
| --- | --- |
| Target and artifacts | Tenant, subscription, region, SQL host/database, source revision, staged content and immutable runtime versions |
| Access and enrollment | Approved ingress/abuse controls, identity owner, verified owner tenant/object IDs, operator and secret channels |
| Privacy and cost | Notice, permitted submission data, retention/purge rule, budget limit, hosting/network assumptions and exceptions |
| Evidence and remaining work | Actual settings, checks/results, failures, open gates and next owner/action |

## Functions operator steps

1. Build/test, then `npm run deployment:prepare`. After every restage:

   ```powershell
   npm ci --omit=dev --ignore-scripts --prefix .deployment\static-web-apps\api
   ```
2. Apply/verify [SQL migrations](./deployment-migrations.md) `001-initial.sql` then
   `002-public-submissions.sql` in the application database. Verify history/
   checksums before API startup.
3. Use `infra/functions-bootstrap.sql` with the approved Functions service
   principal, then verify its restricted grants. Do not grant table writes,
   `db_owner` or enrollment to the runtime identity.
4. Configure SWA/SQL credentials through approved secret channels. Leave `ownerAuth`
   unset for anonymous-only use; set all five real values together after owner approval.
5. Before publication, complete the publication gates in
   [public-submissions.md](./public-submissions.md) and the approved target scope.
6. After approved deployment, verify denied anonymous reads and allowed submissions,
   owner denial and allowed read, SQL limits/permissions, persistence, cost and
   actual ingress. Enroll the owner only through the reviewed SQL operator script.

No secrets in files/chat/history/arguments/logs/frontend.
Reconcile failed writes before retry; preserve submissions/history.
