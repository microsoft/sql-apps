# Static Web Apps / Functions deployment record

| Decision | Record |
| --- | --- |
| Target and artifacts | Tenant, subscription, region, existing SQL database, source revision and staged content |
| Identity and access | Functions service principal, SPA registration/consent, redirect URI, SQL operator and secret channels |
| Cost and approvals | Hosting and SQL limits, network costs, resource and write scope, exceptions |
| Evidence and remaining work | Actual settings, checks/results, failed or unrun acceptance, owner and next action |

## Static Web Apps operator steps

1. Build/test, then `npm run deployment:prepare`. After every restage:

   ```powershell
   npm ci --omit=dev --ignore-scripts --prefix .deployment\static-web-apps\api
   ```

2. Apply/verify [SQL migrations](./deployment-migrations.md); then run
   `infra/functions-bootstrap.sql` with the approved service-principal client ID.
   Verify restricted runtime grants.
3. Fill `infra/static-web-apps.bicepparam` with the approved target. Provide
   `SQL_CLIENT_SECRET` through a secure parameter channel; never put it in a file,
   command or log. Register exact redirect URI/consent with the identity owner.
4. Compile/preview against approved resource/access/cost scope. Deploy the site;
   consent, SQL connectivity and content are separate.
5. Publish the staged web and API together using the approved SWA CLI and
   deployment token. Test direct and proxied allowed/denied requests, real
   sign-in, Functions-to-SQL ownership, persistence and restart.
