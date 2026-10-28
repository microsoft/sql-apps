# Rayfin alignment

SQL Apps follows compatible project and design conventions to make future migration to [Rayfin](https://github.com/microsoft/rayfin) easier when supported. It does not recreate or depend on Rayfin's runtime.

## Conventions for new apps

- Use npm workspaces: `packages/frontend` for React/Vite, `packages/data` for SQL migrations/procedures and DAB configuration, `packages/shared` for browser-safe contracts, and `packages/server` only for necessary custom authentication, orchestration, or domain code. Do not add direct-SQL CRUD repositories to fill a package.
- Follow the bundled app-design guidance for Tailwind tokens, accessible components, and consistent UI states.
- Keep frontend API calls behind a small app-owned client, preferring relative same-origin URLs with verified routing. Keep SQL access server-side and preserve selected API permissions and SQL invariants.
- Copy the DAB service template, or `rayfin.functions.yml` for explicit managed Functions, to `rayfin/rayfin.yml`, retaining `services.data.dialect: mssql`. Functions disables the Rayfin data runtime, not the SQL migration package.
- Keep configured paths and build commands accurate. The frontend builds to `dist/index.html`; data has its own working configuration validation/build command. A DAB configuration is not a Node server build or a running Rayfin data service.
- Enable optional services only for implemented requirements. Do not add Rayfin SDKs, service emulation, or a generic provider abstraction for hypothetical compatibility.

Preserve layouts unless restructuring is in scope.

These conventions do not prescribe a paid host, a mandatory Express server, or a single-process deployment. DAB is the default API; explicit managed Functions can replace it. The brief's PoC/zero-spend constraints survive handoffs. Verify the complete topology rather than assuming the service template proves hosting compatibility.

## Compatibility boundary

The configuration records alignment intent; SQL Apps does not execute it. Hosting/API selection lives in app-owned `deployment.json`, not invented Rayfin fields. Keep the brief, selection and enabled services consistent. Its presence does not authorize a Rayfin workflow handoff. Proposed `mssql` support is not a guarantee of compatibility with a released Rayfin version.

When migration is requested, consult Rayfin's current documentation and tooling, confirm support for the app's SQL, identity, and service requirements, and verify the migrated workflows. Leave migration and runtime implementation to Rayfin.
