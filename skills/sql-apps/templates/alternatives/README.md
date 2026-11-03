# Explicit alternative architectures

The default [starter](../starter/README.md) contains only the DAB architecture.
These overlays are optional application source, not a plugin runtime or migration
tool. Do not copy them unless the user selects the alternative. Preserve existing
apps and approved infrastructure; changing an existing app needs a scoped review.

After copying the default starter into an empty app directory, and before adapting
the sample, run the installer from this directory with the selected profile and
absolute destination:

```powershell
node install.mjs app-service-f1 C:\apps\my-app
# OR, only for the explicitly selected Functions architecture:
node install.mjs static-web-apps C:\apps\my-app
```

The installer requires a fresh default starter and refuses existing overlay files.
For Functions, it verifies DAB-only files are unmodified before removing
`packages/server`, `tests/server.test.mjs`, `packages/data/dab-config.json`,
full-stack `compose.yml`, `Dockerfile.dab` and `Dockerfile.web`.
It retains shared SQL `compose.sql.yml` / `compose.database.yml`,
migrations and permissions, frontend/shared/data workspaces, and common configuration.
The selected Functions API is the only installed API. Modified files block
materialization rather than being discarded; do not use this as an existing-app
migration tool.

Selection does not install dependencies, deploy, migrate data, authenticate or
change resources. For Functions, refresh the copied app's lockfile before installing:

```powershell
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
npm ci
npm run build
npm test
```

| Overlay | Adds | Does not establish |
| --- | --- | --- |
| `app-service-f1` | Optional F1 infrastructure; retains the same DAB API | F1 capacity, identity, networking or live acceptance |
| `static-web-apps` | Managed Functions API, local Functions/SWA lifecycle, tests, restricted SQL bootstrap, static hosting and infrastructure | Authenticated real-SQL/browser acceptance or cloud certification |

Both `npm start` and `npm run local:start` dispatch the selected profile after an
explicit `npm run build`; Test and acceptance also never compile implicitly.
Functions keeps common compiled configuration checks: `tsconfig.backend.json`
compiles only shared `config.ts`, not the removed DAB server. Build remains one
full `npm run build`; Test has no compiler hook.
Both profiles use the same local commands. Functions starts the existing Functions
Core Tools and SWA CLI against the owned SQL container, not DAB or a custom emulator.
It requires those tools already installed and an explicit loopback `SQL_PORT`.
See the [local Functions workflow](../starter/hosting.md#local-development) and keep
unit/host checks separate from authenticated real-SQL/browser acceptance.
Never weaken authorization or substitute SWA's fake identities for real sign-in.

## Repeatable deployment preparation

From the copied app after Build/Test, run `npm run deployment:prepare`.
DAB profiles validate their selection and Docker inputs without writing a
`.deployment` receipt. Functions stages compiled web/API output under
`.deployment/static-web-apps`. Rerunning preparation automatically replaces only
that verified-inventory generated directory. Unknown filenames anywhere, including
nested app/API paths, invalid markers and symlinks are rejected, not deleted.
The npm-owned `api/node_modules` exception is discarded on re-stage and must be
reinstalled. No manual remove/move or reset flag is needed.
The separate standalone production install is still required after each preparation
and before approved publication:

```powershell
npm ci --omit=dev --ignore-scripts --prefix .deployment\static-web-apps\api
```

See the copied app's [publication steps](../starter/deployment.md#static-web-apps-publication).
