# Static Web Apps / Functions deployment record

Use this file as the app's single target, approval and result record. It covers
Functions only; it does not use DAB or container images.

| Decision | Record |
| --- | --- |
| Target and artifacts | Tenant, subscription, region, existing SQL database, source revision and staged content |
| Identity and access | Functions service principal, SPA registration/consent, redirect URI, SQL operator and secret channels |
| Cost and approvals | Hosting and SQL limits, network costs, resource and write scope, exceptions |
| Evidence and remaining work | Actual settings, checks/results, failed or unrun acceptance, owner and next action |

## Static Web Apps operator steps

1. Build and test the copied app. Run `npm run deployment:prepare`; after each
   preparation, reinstall API production dependencies:

   ```powershell
   npm ci --omit=dev --ignore-scripts --prefix .deployment\static-web-apps\api
   ```

2. Follow [shared SQL migration steps](./deployment-migrations.md) for
   every migration and verify each recorded checksum before bootstrapping
   `infra/functions-bootstrap.sql` with the approved Functions service-principal
   client ID. Keep the runtime grants least-privilege.
3. Fill `infra/static-web-apps.bicepparam` with the approved target. Provide
   `SQL_CLIENT_SECRET` through a secure parameter channel; never put it in a file,
   command, report or log. Register the exact output redirect URI with the identity
   owner and obtain approved consent.
4. Compile and preview the template; compare all changes with the recorded scope.
   Deploy only after explicit resource, access and cost approval. The template
   creates a site, not consent, SQL connectivity or app content.
5. Publish the staged web and API together using the approved SWA CLI and
   deployment token. Test direct and proxied allowed/denied requests, real
   sign-in, Functions-to-SQL ownership, persistence and restart.

Follow the shared SQL Apps acceptance checks before describing delivery as verified.
