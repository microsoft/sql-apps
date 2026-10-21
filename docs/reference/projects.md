# Independent SQL Apps projects

SQL Apps application projects can run independently of the foundation checkout.
The reusable runtime and command implementations are distributed by the
`@microsoft/sql-apps` package; application repositories contain only their
project manifest, domain source, configuration, schema and package metadata.

This separation is a tooling contract, not permission to copy the foundation
repository into every application. Generated projects must not include the
foundation's plugins, examples, tests or runtime implementation source.

## Create and manage projects

Follow [Get started](../guides/getting-started.md) to verify and select an archive CLI,
review a creation plan and create your first application. Projects default to
`%USERPROFILE%\SqlAppsProjects` on Windows and `~/SqlAppsProjects` elsewhere.
Creation refuses to merge into an existing folder.

The archive contains its own allowlisted scaffold; no foundation checkout or
existing app is needed for `projects` or `bind-archive`. The initial release
candidate is **0.1.0**; old demo projects are not migration targets. To change the
root for future projects, choose an absolute path before creating them:

```powershell
node $cli projects root "D:\SqlAppsProjects"
```

List registered projects or register and open an existing application:

```powershell
node $cli projects list
node $cli projects open "C:\path\to\project"
```

Here `$cli` is the absolute installed archive executable from the guide. Open
the app and restart your optional assistant there after restore. The archive
CLI requires `create-plan --archive <absolute-tgz>` followed by
`create --archive <absolute-tgz> --approval <id>`. Planning blocks an existing
destination and application rechecks it. Creation copies and binds the reviewed
archive before the initial Git commit. It starts no helper, reserves no ports,
opens no browser and grants no setup permissions.

The foundation's existing `npm run projects -- ...` commands remain available.
They require the same explicit archive and current approval. Contributor tooling
can be selected explicitly with `SQL_APPS_TOOLING_HOME`; `SQL_APPS_HOME`
selects an app. The foundation is not an ambient runtime source.
The registry is a list/picker, never execution authority.

## Project manifest

Every project root contains `.sql-apps-project.json`. The manifest is strict and
has this shape:

```json
{
  "version": 1,
  "id": "b91d4857-9570-4d4b-a740-918471ca7e26",
  "name": "Equipment Checkout",
  "slug": "equipment-checkout",
  "starter": "data",
  "profile": "role-based-data",
  "scaffoldVersion": 1,
  "tooling": {
    "package": "@microsoft/sql-apps",
    "version": "0.1.0"
  }
}
```

`starter` must be `data` and `profile` must be `role-based-data`. Other starters
and old demo contracts are unsupported, not automatically migrated.
New projects copy `.config`, `content`, `dab`, `docs`, `public` and
`sql`, write `role-based-data.json`, and start with only `src/web/app.ts` as
application source. The entry point imports the typed
`@microsoft/sql-apps/browser` facade for client, authentication and local creation
status behavior. They do not copy `scripts`, `infra`, runtime implementation
source or the foundation runtime contract.

The tooling version is an exact semantic version, not a range. Commands reject
missing, malformed, oversized or linked manifests and stop searching at the
filesystem root.

## Package scripts

Project scripts call the package executable rather than repository-relative
foundation files:

```json
{
  "scripts": {
    "build": "sql-apps build",
    "app:check": "sql-apps check",
    "app:check-api": "sql-apps check-api",
    "consent": "sql-apps consent",
    "guide": "sql-apps guide",
    "local": "sql-apps local",
    "setup": "sql-apps setup",
    "setup:check": "sql-apps setup-check",
    "workspace:check": "sql-apps workspace-check"
  }
}
```

The executable finds the nearest validated project manifest, changes to that
project root and then dispatches the requested command from the installed
tooling package. `SQL_APPS_PROJECT_HOME` is an internal dispatch boundary and
must be an absolute path to the same validated project.

Before the first restore, use the explicitly selected archive CLI from the app
directory for `guide`, `setup plan` and the approved restore. It remains
bootstrap-only even when its package name and version match the app pin.
An optional plugin can use explicitly selected bootstrap tooling through
`SQL_APPS_TOOLING_HOME`; it never adopts a provider binding or globally active app.
Bootstrap setup stops after restore: re-run setup
through the installed pinned package and review any changed approval scopes.
Build, runtime execution and subsequent provenance checks all use the app-local
package, even when invoked via the external archive executable. An ancestor's
package is not a project restore;
a missing or mismatched package is not permission to run foundation runtime code.
Build output can contain compiled package runtime for distribution, not editable
copies of its implementation.

Generation records the exact tooling package and its runtime dependency metadata
in `package-lock.json`, not only in the root dependency declaration. Dependencies
that were development-only in the foundation are promoted when the tooling needs
them at runtime, so `npm ci --omit=dev` does not remove required tooling
dependencies. Creation explicitly copies the approved release archive and binds
the tooling lock entry to it. Other dependencies use the configured npm feed.
No version or source is substituted silently.

## Install from a release archive

Download `microsoft-sql-apps-<version>.tgz` and `SHA256SUMS` from the matching
[GitHub release](https://github.com/microsoft/sql-apps/releases). Compare the
archive's SHA-256 with the released checksum (`Get-FileHash <archive> -Algorithm SHA256`
in PowerShell). The archive must match the exact version in your project's
manifest and package metadata. A local foundation build can produce the same
format; see [runtime releases](../../CONTRIBUTING.md#releasing-the-runtime-package).

Normal creation already binds its reviewed archive; no separate binding step
is needed. For advanced repair, use **absolute** paths and review a read-only plan:

```powershell
node $cli bind-archive --project "C:\SqlAppsProjects\my-app" --archive "C:\Downloads\microsoft-sql-apps-0.1.0.tgz"
```

For existing source-backed workflows, the foundation's
`npm run tooling:bind -- --project ... --archive ...` wrapper is unchanged.
The bootstrap CLI installation itself is separately approved and uses npm
`--prefix` and `--ignore-scripts`; see [Get started](../guides/getting-started.md#2-select-the-cli-and-optional-assistant-guidance).

Run the same command with `--approve <approval-id>` only after reviewing the
reported version, archive SHA-256, destination and effects. Node and native `tar`
must be on PATH; inspection reads only package metadata and runs no archive
scripts. A changed archive, package, lockfile, manifest or Dockerfile needs a new
review.

Binding copies the archive into the application's own `tooling` directory and
updates only the tooling lock entry's relative `file:` resolution and SHA-512
integrity. The exact semantic version in `package.json` and
`.sql-apps-project.json` stays unchanged. Keep the copied archive and updated
lockfile in the application repository: another checkout or CI machine can
restore without the original download or foundation directory. Do not exclude
`tooling` from Git or the Docker build context.

For the generated Dockerfile, binding adds `COPY tooling/ ./tooling/` before
`RUN npm ci`. Custom layouts must also copy the archive before restoring; an
unsupported layout fails explicitly instead of guessing. The archive's runtime
dependencies must match the existing lock entry; binding does not resolve or
silently rewrite unrelated dependencies.

Binding does **not** install dependencies, build, launch services or grant setup
consent. Review a fresh setup plan and approve the intended restore; the lockfile
change invalidates previous restore approval. Other packages still use the
configured npm registry. Archive installation is a distinct, explicit route,
not evidence that `@microsoft/sql-apps` has been published to npm.

## Foundation and package boundaries

The foundation builds and validates the package with:

```powershell
npm run tooling:build
npm run tooling:check
npm run tooling:pack
```

The package contains compiled runtime commands, static assets and an allowlisted
project scaffold. Packaging rejects links, environment files except the explicit
scaffold `.env.example`, examples, tests, plugins,
dependency trees and unexpected top-level paths. A generated project owns its
Git history and `.sql-apps` state; it is not a worktree of the foundation.

Project scaffolding must write the manifest and package metadata atomically,
refuse an existing destination and clean up only the temporary directory it
created after a failure. The foundation exposes project creation through
`npm run projects -- create "<name>"`; generated projects use this package-based
contract and are independent of the foundation checkout.

For reviewed creation, run
`node $cli projects create-plan "<name>" --archive "<absolute-tgz>"`, then
`node $cli projects create "<name>" --archive "<absolute-tgz>" --approval <id>`.
The contributor `npm run projects -- ...` equivalents use the same archive and
approval contract. Creation starts no helper, service or browser.
See [creation lifecycle](progressive-creation.md) for setup approvals, isolated
ownership and current-evidence acceptance gates.
