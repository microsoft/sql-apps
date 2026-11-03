# App Service F1 / DAB deployment record

Use this file as the app's single target, approval and result record.

| Decision | Record |
| --- | --- |
| Target and artifacts | Tenant, subscription, region, existing SQL database, source revision and immutable web/DAB image digests |
| Identity and access | DAB identity, SPA registration/consent, SQL operator, network access and image-pull scope |
| Cost and approvals | F1 limits, SQL costs, network costs, resource/write scope and exceptions |
| Evidence and remaining work | Actual settings, checks/results, failed or unrun acceptance, owner and next action |

## App Service F1 operator steps

1. Build and test the copied DAB app, then build immutable web/DAB images with
   explicit approved image names and a credential-free HTTPS `--npm-registry`.
   Publish only to the separately approved registry.
2. Use existing approved Azure SQL. Follow [shared SQL migration
   steps](./deployment-migrations.md), then run `infra/bootstrap.sql`
   with the deployed DAB managed-identity client ID. Preserve an existing
   differently bound `app_runtime`; do not overwrite it.
3. Fill `infra/app-service-f1.bicepparam` with the reviewed image digests,
   identity and approved resource names. Compile and preview the template. Deploy
   only after explicit target, resource, access and cost approval.
4. Register the exact output redirect URI and complete approved consent. Establish
   SQL connectivity separately; deploying the host does not provision it.
5. Verify the public DAB endpoint and same-origin proxy with allowed and denied
   controls, then test F1 sleep/wake, shared quotas and SQL persistence/restart.

This profile requires publicly pullable images; private pulls need a separately
reviewed design. Read [hosting.md](./hosting.md#app-service-f1--dab) before cloud
writes.
