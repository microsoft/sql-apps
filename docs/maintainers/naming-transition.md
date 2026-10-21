# Naming transition for existing checkouts

New users can skip this page. It applies to development checkouts and deployments created before the SQL Apps rename.

The visible brand is **SQL Apps**; packages, plugins and resource prefixes use `sql-apps`, SQL identifiers use `sql_apps`, and project-specific environment variables use `SQL_APPS_*`. No compatibility aliases are provided.

The canonical repository URL in documentation and manifests is `https://github.com/microsoft/sql-apps`. Publication to that repository requires write access and a reviewed history integration. Social imagery, deployment variable `SQL_APPS_CONFIG` and private runner label `sql-apps-private` require separate repository configuration; source edits do not configure them.

Existing checkout folders do not need renaming. Workspace IDs depend on the canonical checkout path, so moving a folder invalidates its descriptor. Rebuild runtime and selected-application artifacts, reinstall an old development plugin, and explicitly select the intended project before startup.

The `.sql-apps` namespace does not adopt pre-rebrand state, containers, databases, credentials or volumes. Preserve existing data and credentials; the rename does not authorize deleting or resetting them. The v0.1 candidate supports isolated workspaces only; older fixed-port and helper-front-door descriptors are rejected, not migrated.

Browser sessions must be created again under the new cookie/storage names. Deployment name changes are not an in-place resource migration and may select a different target; review the exact configuration before provisioning.
