# Rayfin alignment

SQL Apps follows compatible project and design conventions to make future migration to [Rayfin](https://github.com/microsoft/rayfin) easier when supported. It does not recreate or depend on Rayfin's runtime.

## Conventions for new apps

- Use npm workspaces: `packages/frontend` for React/Vite, `packages/data` for server-only SQL repositories and migrations, `packages/shared` for browser-safe contracts, and `packages/server` for Express. Keep one application deployment.
- Follow the bundled app-design guidance for Tailwind tokens, accessible components, and consistent UI states.
- Keep frontend API calls behind a small app-owned client using relative, same-origin URLs. Keep database access server-side so UI and persistence can change independently.
- Copy the bundled service template to `rayfin/rayfin.yml`, retaining `services.data.dialect: mssql`.
- Keep configured paths and build commands accurate. The frontend builds to `dist/index.html`; data has its own working build command.
- Enable optional services only for implemented requirements. Do not add Rayfin SDKs, service emulation, or a generic provider abstraction for hypothetical compatibility.

Preserve existing project layouts unless restructuring is explicitly in scope.

## Compatibility boundary

The configuration records alignment intent; SQL Apps does not execute it. Its presence does not authorize a Rayfin workflow handoff. Proposed `mssql` support is not a guarantee of compatibility with a released Rayfin version.

When migration is requested, consult Rayfin's current documentation and tooling, confirm support for the app's SQL, identity, and service requirements, and verify the migrated workflows. Leave migration and runtime implementation to Rayfin.
