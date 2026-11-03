# Optional Rayfin migration

Read this leaf only for an explicitly requested migration to [Rayfin](https://github.com/microsoft/rayfin). Similar design/package conventions are not a compatibility guarantee; SQL Apps does not recreate or depend on its runtime.

## Transferable conventions

- Use npm workspaces: `packages/frontend` for React/Vite, `packages/data` for SQL migrations/procedures and DAB configuration, `packages/shared` for browser-safe contracts, and `packages/server` only for necessary custom authentication, orchestration, or domain code. Do not add direct-SQL CRUD repositories to fill a package.
- Follow the bundled app-design guidance for Tailwind tokens, accessible components, and consistent UI states.
- Keep frontend API calls behind a small app-owned client, preferring relative same-origin URLs with verified routing. Keep SQL access server-side and preserve selected API permissions and SQL invariants.
- Do not generate `rayfin/rayfin.yml` by default. Keep the executable app configuration authoritative rather than maintaining a speculative second service manifest.
- Keep package paths and build commands accurate. A DAB configuration is not a running Rayfin service.
- Enable optional services only for implemented requirements. Do not add Rayfin SDKs, service emulation, or a generic provider abstraction for hypothetical compatibility.

Preserve layouts unless restructuring is in scope.

These conventions do not prescribe a paid host, a mandatory Express server, or a single-process deployment. DAB is the default API; explicit managed Functions can replace it. The brief's PoC/zero-spend constraints survive handoffs. Verify the complete topology rather than assuming the service template proves hosting compatibility.

## Compatibility boundary

Hosting/API selection lives in app-owned `deployment.json`, not invented Rayfin fields. SQL Apps does not use a private Rayfin build or ship retained manifest examples. Preserve any existing app manifest until a migration or removal is explicitly scoped.

When migration is requested, consult Rayfin's released documentation and tooling, confirm support for the app's SQL, identity, and service requirements, then generate configuration and verify the migrated workflows. Leave migration and runtime implementation to Rayfin. No current compatibility claim follows from similar package layouts.
