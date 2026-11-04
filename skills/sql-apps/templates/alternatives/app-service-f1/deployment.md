# App Service F1 / DAB deployment record

| Decision | Record |
| --- | --- |
| Target and artifacts | Tenant, subscription, region, existing SQL database, source revision and immutable web/DAB image digests |
| Identity and access | DAB identity, SPA registration/consent, SQL operator, network access and image-pull scope |
| Cost and approvals | F1 limits, SQL costs, network costs, resource/write scope and exceptions |
| Evidence and remaining work | Actual settings, checks/results, failed or unrun acceptance, owner and next action |

## App Service F1 operator steps

1. Build/test DAB and immutable web/DAB images with approved names and
   credential-free HTTPS `--npm-registry`. Approve publication separately.
2. Use existing approved Azure SQL. Follow [shared SQL migration
   steps](./deployment-migrations.md), then run `infra/bootstrap.sql`
   with the deployed DAB managed-identity client ID. Preserve an existing
   differently bound `app_runtime`; do not overwrite it.
3. Fill `infra/app-service-f1.bicepparam` with digests, identity and approved names.
   Compile/preview; deploy only within target/resource/access/cost approval.
4. Register the exact redirect URI/consent and establish SQL connectivity separately.
5. Verify the public DAB endpoint and same-origin proxy with allowed and denied
   controls, then test F1 sleep and wake, shared quotas, SQL persistence and app restart.

Images must be publicly pullable; private pulls need separate design/approval.
