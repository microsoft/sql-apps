# Contributing

Thank you for your interest in SQL Apps.
We welcome thoughtful contributions from both individual developers and AI-assisted workflows.

## Contributor License Agreement

Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
[Contributor License Agreements portal](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA-bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the
instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

## Code of Conduct

This project follows the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/microsoft/sql-apps/issues/new?template=bug.yml) issue template. Include reproduction steps and redacted validation evidence.

### Requesting Features

Use the [Feature Request](https://github.com/microsoft/sql-apps/issues/new?template=feature-request.yml) issue template. Describe your use case and the expected behavior.

### Submitting Pull Requests

1. Fork the repository and create a branch for your change.
2. Keep pull requests scoped to a focused set of changes.
3. Include a clear description of the change and its rationale.
4. Run any existing linters, builds, and tests before submitting.

Validate changes with `npm test`, `npm run typecheck`, `npm run sql:build`, `npm run infra:build`, and `npm run dab:validate` as applicable. Include each exact command and result; distinguish local/mocked results from live Azure acceptance.

Keep optional example workflow tests under `examples/<name>/tests`, not root
`tests`. `npm test` runs all foundation tests and then tests for examples present
in the checkout; absent examples are not restored. Domain applications retain
their own workflow tests and negative legacy SQL/API absence checks. Targeted
test results must not be reported as a full-suite pass.

Local lifecycle unit tests must leave the developer's workspace, credentials,
and containers untouched. Use temporary homes for legacy and isolated workspace
fixtures, and derive ports, names, database users, and origins from `runtimeFor()`.
Mocked isolated Docker inspections must include the matching workspace, image,
and loopback port bindings; do not reset `.sql-apps` to make tests pass.

For changes to SQL identity context, transactions or connection cleanup, build
the runtime and run `npm run test:sql-integration`. This opt-in suite needs
Docker and access to the Azure SQL Database private-preview image. It starts
and removes its own containers, waits for user-database provisioning (not only
`SELECT 1`), verifies EngineEdition 5, and tests real pooled owner isolation,
success/error cleanup, aborted transactions and the optional Todo limits.
Its local runtime identity is a least-privilege login mapped to a database user;
the container does not support the cloud publisher's contained SQL user.
Do not report mocked tests as equivalent to this real-engine check.

CI pulls the current preview image on a fresh runner. To reproduce against that
image locally rather than an older cached `latest`, refresh it before testing:

```powershell
docker pull sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest
npm run test:sql-integration
```

Database existence checks use `sys.databases`; current preview images can return
`NULL` for another database's `DB_ID` even from a `master` connection.

The manually dispatched [real SQL workflow](.github/workflows/sql-integration.yml)
runs these tests on `main` and is also a required predecessor of runtime
packaging, at the same commit. Maintainers must create the `sql-integration`
GitHub environment and restrict it to the `main` branch (not tags). Configure
required reviewers if a human approval gate is desired; branch restrictions
alone do not require approval. Store the preview registry's pull-only credentials
directly in GitHub as environment secrets
`SQL_PREVIEW_ACR_USERNAME` and `SQL_PREVIEW_ACR_PASSWORD`. Never use Azure
subscription or administrator credentials for this registry login. Missing
credentials, denied approval (when required) or failed SQL tests block packaging;
ordinary pull request checks do not receive these secrets.

Keep end-user walkthroughs in `docs/guides`, detailed commands in `docs/reference`, and contributor contracts in `docs/maintainers`. See the [documentation index](docs/README.md) and [application boundaries](docs/maintainers/application-boundary.md).

### Releasing the runtime package

Merging source and installing the assistant plugin do not publish
`@microsoft/sql-apps`. The supported release route is a versioned `.tgz` archive
with a SHA-256 checksum, distributed as a GitHub release asset. It does **not**
require npm publishing rights or membership in the Microsoft npm organization.
The package name is retained inside the archive; applications still pin its
exact semantic version.

The manually dispatched [runtime packaging workflow](.github/workflows/package-runtime.yml)
first requires the protected real SQL integration job, then builds and tests
`main`, checks the package inventory, packs the archive, proves
clone-free creation from that archive plus an independent app restore with empty
caches, and uploads the archive,
pack metadata and `SHA256SUMS` as the `runtime-archive-release` Actions artifact:

```powershell
gh workflow run package-runtime.yml --ref main -f version=0.1.0
```

0.1.0 is the initial unreleased candidate in this branch. Earlier demos are not
compatibility targets; do not reuse their assets or migrate their state implicitly.
Use the actual manifest version for later releases.
After a successful run,
download the artifact, review the checksum and create a GitHub release at
that run's exact commit, attaching the tarball and `SHA256SUMS`. Do not overwrite
an existing released version or asset. The workflow itself does not create a
public release, publish to npm or run automatically on a push.

For the same checks locally:

```powershell
npm test
npm run tooling:build
npm run tooling:check
npm pack .\dist\tooling-package --ignore-scripts --pack-destination .\dist
npm run tooling:verify-archive -- "C:\git\sql-apps\dist\microsoft-sql-apps-0.1.0.tgz"
Get-FileHash .\dist\microsoft-sql-apps-0.1.0.tgz -Algorithm SHA256
npm run test:archive-bootstrap
```

The archive verifier first installs the explicit candidate with npm `--prefix`
and lifecycle scripts disabled, using an empty cache. Only that installed
archive CLI/scaffold creates the app; the foundation factory is not used.
It reviews/applies archive-bound creation, checks bootstrap setup planning, restores the exact
app pin with scripts disabled and verifies dispatch to its local implementation.
It copies tracked app inputs (including the
bound archive, excluding `.sql-apps` receipts), removes fixture-owned original
app/bootstrap inputs and proves another independent restore with a fresh cache.
It cleans up only its temporary directory, without changing the user's npm
settings, applications or databases. Other dependencies still use the configured
npm registry. This proves installation and CLI startup, **not** a running
application, SQL persistence or rendered design acceptance. The separate
`test:archive-bootstrap` network-dependent suite also checks missing/wrong/linked
candidates and a failing feed; the ordinary unit suite remains feed-independent.
Run the relevant Windows/Linux Node 22/24 CI lanes before claiming cross-platform
acceptance; a Windows Node 22 result alone does not establish those other lanes.

Users explicitly select the verified archive in the reviewed creation plan;
creation binds it before the first commit and approved restore.
[Archive binding](docs/reference/projects.md#install-from-a-release-archive)
remains an advanced repair operation. A source merge or plugin install does not
make a package available. Never silently substitute a source or version.

Registry distribution remains a separate optional route if an authorized npm
maintainer later publishes the exact version. To verify that route, use
`npm run tooling:verify-feed -- --registry <registry-url>` against each intended
feed. Archive acceptance does not establish npm publication or mirror availability;
an E404 remains a blocker for the registry route, not for an explicitly bound
and verified archive release.

## Commit Messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/).

**Format:** `<type>(<scope>): <description>`

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `chore` | CI, scripts, infrastructure |
| `refactor` | Code restructuring without behavior change |

Examples:

```text
feat: add support for custom entity validators
fix: correct auth token refresh on expiry
docs: update getting started guide
chore(ci): add Node 22 to test matrix
```

## AI-Assisted Contributions

We encourage transparent use of AI agents, copilots, and other tools that accelerate high-quality contributions.
If AI helped you create the contribution, disclose the tools used and how they influenced the work in your pull request or issue summary.

When submitting AI-assisted changes, make sure that you:

- Test the changes yourself and share the results or reproduction steps.
- Understand the code you are contributing so that you can answer follow-up questions.
- Explain why the change is needed and how it improves SQL Apps.
- Provide evidence such as screenshots, logs, or test output when fixes or features require verification.

We may close contributions that:

- Appear to be untested or copy-pasted without human review.
- Offer generic suggestions that do not address specific SQL Apps needs.
- Consist of bulk submissions with no clear analysis or rationale.

Repeated submissions that ignore these guidelines may lead to additional review requirements or contribution limits.
Respect the maintainers' time and keep communication clear, direct, and professional.

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://docs.github.com/pull-requests)
