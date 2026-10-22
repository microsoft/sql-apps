# SQL Apps constitution

The first-release profile is deliberately narrow. These are instruction-level policies, not a security sandbox or a promise that every prerequisite is available.

| Area | Policy |
| --- | --- |
| Application language | TypeScript; T-SQL for database work |
| UI | React with Vite |
| UI conventions | Tailwind CSS v4 tokens, Radix for complex controls, Lucide icons, `clsx`/`tailwind-merge`; Vitest/React Testing Library |
| Package layout | npm workspaces: `packages/frontend`, `packages/data`, `packages/shared`, `packages/server`; one deployment |
| Future platform intent | `rayfin/rayfin.yml` with `services.data.dialect: mssql`; not executed by SQL Apps or guaranteed supported by released Rayfin |
| Server | Node.js with Express; one deployable application serving API and compiled UI |
| Database access | Server-side `mssql`, parameterized queries, least privilege; specialist guidance owns authentication, pooling, and retries |
| Relational store | Azure SQL Database |
| Local store | Azure SQL Database container, subject to current specialist-documented availability and host prerequisites |
| Cloud host | Azure App Service plus Azure SQL Database |
| Optional services | Blob Storage for files, Microsoft Entra ID for sign-in, Application Insights for telemetry, Key Vault when secret storage is necessary |
| Delivery | Local is a complete outcome; Azure deployment is optional and separately approved |
| Project ownership | Ordinary editable files, no SQL Apps runtime dependency |

Use one application and one database first. Optional services are a support boundary, not a provisioning checklist. Add them only for an actual requirement.

Do not silently select another framework, ORM, API platform, database, or hosting service. Requests needing Functions, Container Apps, messaging, AI services, AKS, Fabric, or another stack exceed this profile. Explain the conflict; an explicitly accepted exception is not a newly supported profile. Do not rewrite an existing app to force it into this profile.

Microsoft SQL owns database expertise and local-engine setup. Azure Skills owns cloud workflows and service configuration. The assistant owns ordinary implementation, integration, and verification. Use installed guidance and host permissions, not duplicate SQL Apps lifecycle machinery.

Align UI and source boundaries with Rayfin without adding its runtime. Keep SQL repositories server-only, shared contracts browser-safe, and frontend API calls separate from components. Adopt these defaults for new apps; do not reorganize existing apps without scope approval. The router's app-design and Rayfin-alignment references define the conventions and migration boundary.

## Durable project policy

Merge the block below into the application's active host instruction file, preserving existing instructions: `.github/copilot-instructions.md` for Copilot, `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex or Cursor, and `GEMINI.md` for Gemini CLI. Respect an existing deliberately configured host-supported location. Do not write copies for inactive hosts.

The block intentionally contains the durable stack and routing constraints, not plugin installation paths or a second workflow. Replace the existing marked block on an intentional policy update; do not accumulate copies. When switching hosts, reconcile any existing policy copies. Keep product-specific requirements in `app-brief.md`.

```markdown
<!-- sql-apps:constitution:start -->
## SQL Apps project policy

- Use TypeScript, React/Vite, and Node.js/Express. Keep one application serving the API and compiled UI.
- For new apps use npm workspaces with packages/frontend, packages/data, packages/shared, and packages/server. Keep shared contracts browser-safe and SQL access server-only; views call an app-owned API client, not database or Rayfin SDK code.
- Use relative same-origin app API URLs (normally /api), with a Vite development proxy to Express. Reserve /.rayfin and descendants, /rayfin.config.json, and /.well-known/rayfin-control-plane for future Rayfin ownership; do not emulate its protocols. Use an app-owned health route such as /healthz.
- Use Tailwind CSS v4 semantic tokens in packages/frontend/src/global.css, Radix for complex controls, Lucide icons, and clsx/tailwind-merge. Record the visual direction; check keyboard access, light/dark themes, responsive layouts, and truthful data/mutation states. Use Vitest/React Testing Library for relevant UI tests.
- Use Azure SQL Database with server-side, parameterized `mssql` access. Never expose database credentials in browser code. Enforce authorization on the server; use least privilege and safe secret handling.
- Use Microsoft SQL guidance for schema, migrations, authentication, connection resiliency, diagnostics, and the local Azure SQL Database container. Check actual prerequisites; never substitute SQLite, mocked persistence, or a different database silently.
- Cloud deployment is optional. The supported cloud profile is Azure App Service and Azure SQL Database; Blob Storage, Entra ID, Application Insights, and Key Vault are optional only when needed.
- Route Azure work to installed Azure Skills. For azd use its prepare/validate/deploy workflow; for non-azd onboarding use its own complete pipeline. Do not mix their state or bypass their approvals. Local-only work must not enter cloud onboarding.
- Do not silently introduce another framework, ORM, API platform, service, or Rayfin/Fabric. Surface out-of-profile requirements before proceeding.
- Preserve rayfin/rayfin.yml with services.data.dialect: mssql. Keep enabled paths/build commands aligned with real packages; unused auth/realtime/storage/functions stay disabled. It is not proof of released Rayfin SQL support. SQL Apps does not execute it; its presence alone does not transfer workflow ownership or authorize Rayfin tooling. Require an explicit, version-validated migration before adopting the runtime.
- Read and maintain app-brief.md. Use normal project files and host task facilities, not a SQL Apps runtime or execution-state system. Preserve existing work.
- Verify the current app: build/tests, real UI-to-SQL save/reload, invalid input, applicable authorization, essential responsive states, and documented restart. Recheck the deployed workflow if deployed. Report unrun checks and blockers explicitly.
- Follow host permissions and specialist approval gates. Product approval is not permission for cloud spend, destructive operations, or real-data transfer. Use synthetic development data unless otherwise authorized.
<!-- sql-apps:constitution:end -->
```
