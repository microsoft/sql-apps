# Application creation and acceptance

The initial v0.1 workflow is **scaffold -> restore -> review -> run -> verify**.
Creation is a deterministic file/Git operation, not a second process lifecycle.
It does not start a front door, reserve ports, open a browser or maintain a
cross-session helper receipt. Old progressive-demo workspaces are not migrated.

## Create with a reviewed archive

Using the verified archive CLI from [Get started](../guides/getting-started.md):

```powershell
node $cli projects create-plan "My App" --archive $archive
node $cli projects create "My App" --archive $archive --approval <printed-id>
```

Both the packaged CLI and the contributor/plugin wrapper require the archive and
current approval. Browser flags and unreviewed public creation are not supported.
Existing destinations block planning as well as application.

Review the destination, Git initialization, archive SHA-256, copy destination,
lockfile integrity and Docker build changes. The generated repository retains
the archive, so later restores do not depend on the original download.
Scaffold, tooling and archive changes invalidate approval. Creation never grants
dependency installation, SQL terms, schema publication or cloud permission.

## One lifecycle owner

From the app, run `setup plan`; approve its displayed effects using
`setup run --approval <id>`. Before restore use the selected archive CLI.
Bootstrap grants restore only and stops afterward; review a fresh plan through
the app's exact installed package before build or startup.

Setup selects one isolated version-1 workspace and verifies ownership before
reuse. A listening port or remembered PID never proves ownership. Unknown
processes block startup and are never stopped automatically.
See [setup](setup.md) and [local development](local-development.md).

## Assistant progress and previews

Keep milestones and blockers in chat using read-only `setup status` and
`setup plan` observations. There is no public `creation` command.
Prefer available, authorized in-app browser/preview tools for real interaction
at the verified application origin. Reuse only the matching session.
A tool controlling an external window is not necessarily an embedded preview.

If a tool is missing, denied or cannot reach localhost, name the unobserved
workflow/design evidence and continue other authorized work. Do not silently
open an external browser, install tools, forward ports or expose services.
External browser opening requires its own explicit user request.

## Acceptance is not readiness

- SQL data requires an actual configured least-privilege query/save/reload.
- Data access requires authorized procedure execution, not DAB liveness.
- Browser acceptance requires the primary user journey and visible error handling.
- Usability review requires rendered desktop and narrow evidence.
- User visual-direction approval requires attributed explicit feedback, not an
  agent's own verdict or a passing checker.

Build success, a process listener, an HTTP health response or historical notes
do not establish these results. Follow [design acceptance](design-acceptance.md)
and the validation skill's four-verdict report. No helper status or additional
`creation accept` approval is needed.

## Release prerequisites

This checkout prepares an unpublished 0.1.0 candidate. A source merge or plugin
installation does not publish the runtime. Run the packaging, integrity and
independent empty-cache archive-restore checks in
[Contributing](../../CONTRIBUTING.md#releasing-the-runtime-package).
Do not reuse an older demo archive or overwrite a released asset.
