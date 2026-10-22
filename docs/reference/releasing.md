# Packaging, verification, and releases

[Back to SQL Apps](../../README.md) · [Installation](../installation.md)

## Package layout

The repository is both a marketplace and a plugin. All catalog sources resolve to the root plugin; all hosts use the same skill payload.

| File | Purpose |
| --- | --- |
| [plugin.json](../../plugin.json) | Portable Agent Plugins 1.0 manifest |
| [Shared marketplace](../../.claude-plugin/marketplace.json) | Copilot/Claude catalog: `sql-apps@sql-apps-skills` |
| [Claude manifest](../../.claude-plugin/plugin.json) | Claude compatibility metadata |
| [Codex catalog](../../.agents/plugins/marketplace.json) | Repository-relative local plugin source |
| [Codex manifest](../../.codex-plugin/plugin.json) | Compatibility and display metadata |
| [Cursor catalog](../../.cursor-plugin/marketplace.json) | Team marketplace |
| [Cursor manifest](../../.cursor-plugin/plugin.json) | Native compatibility metadata |
| [Gemini manifest](../../gemini-extension.json) | Extension metadata and conventional skill discovery |
| [Routing skill](../../skills/sql-apps/SKILL.md) | Shared workflow and bundled references/templates |

There are no executable hooks, MCP servers, automatic companion dependencies, or build step. There is no duplicate host-specific application implementation. The release verifier is a maintainer-run Node.js check, not a plugin runtime.

## Release identity

This checkout is the **0.2.1 patch release candidate**. That identifies source metadata, not a published release or an updated user installation. The marketplace identity remains `sql-apps-skills`, the plugin/extension identity remains `sql-apps`, and the install coordinate remains `sql-apps@sql-apps-skills`.

`plugin.json` is the canonical version. Keep the Claude, Codex, Cursor, and Gemini manifests and the shared/Cursor catalog versions aligned with it. The Codex catalog in `.agents/plugins/marketplace.json` intentionally reads the plugin version rather than duplicating it.

Published release versions are **immutable**: never change shipped guidance or templates under an already published version, replace a versioned package in place, or retag a release. Any shipped payload change requires a new version in all versioned metadata. Freeze the reviewed source and package bytes together; record the source revision and verifier's skill-payload fingerprint. The fingerprint covers the skill payload, not a signed archive or a whole-repository digest.

## Verification status

| Host | Packaging | Native validation / loader |
| --- | --- | --- |
| Copilot CLI | Root manifest + shared catalog | 0.2.0 isolated local marketplace registration/install/list passed with one skill on CLI 1.0.102, but it reports `source: live`: no cached package was copied; 0.2.1 loading not exercised |
| VS Code | Root manifest + shared catalog | Existing cached 0.1.0 package inspected read-only; verifier correctly rejects its stale versions and changed skill bytes. Fresh 0.2.1 UI loading not exercised |
| Claude Code | Native manifest + shared catalog | Manifest/catalog validation passed; interactive loading not exercised |
| OpenAI Codex | Compatibility manifest + Codex catalog | Static checks only; CLI unavailable in the validation environment |
| Gemini CLI | Extension manifest + shared skills | Static checks only; CLI unavailable in the validation environment |
| Cursor | Portable/native manifests + Cursor catalog | Static checks only; host unavailable in the validation environment |

No host has passed end-to-end application-generation or Azure deployment evaluation yet. Package checks do not prove instruction-following, specialist availability, browser access, database behavior, or compatibility with an unreleased Rayfin schema.

## Validation commands

Run packaging tests with Node.js 22 or later:

```powershell
node --test tests\plugin.test.mjs tests\verify-release.test.mjs tests\workflow.test.mjs
copilot --plugin-dir C:\git\sql-apps-v3 plugin list --json
claude plugin validate C:\git\sql-apps-v3
claude plugin validate C:\git\sql-apps-v3\.claude-plugin\plugin.json
```

Replace the checkout path as needed. Tests cover manifest/version consistency, catalogs, shared skill paths, documentation links, host instruction destinations, design/alignment and attribution guidance, the service template, the absence of runtime components, and verifier positive/negative cases. `--plugin-dir` checks development discovery only.

## Package and installed-copy verification

Use the [portable verifier](../../scripts/verify-release.mjs) against an **explicitly supplied independent root**. It defaults the source to the checkout containing the script, not the current working directory. It reads both roots without modifying either, compares all manifest/catalog metadata, validates release names/versions, and compares the exact file set and bytes under `skills`, including bundled references and templates.

```powershell
$packageRoot = Read-Host 'Independent unpacked SQL Apps release package root'
node scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root "$packageRoot"
$installedRoot = Read-Host 'Actual host-installed SQL Apps root'
node scripts\verify-release.mjs --source-root C:\git\sql-apps-v3 --installed-root "$installedRoot"
```

Each success prints the version, number of skill files, compared paths, and a SHA-256 skill-payload fingerprint. Exit codes: `0` match, `1` missing/stale/mismatched package, `2` invalid command usage. Same-version content drift, missing or extra files, inconsistent compatibility metadata, malformed JSON, and linked skill payloads fail. Comparison is byte-exact, including line endings: package the reviewed bytes rather than ignoring normalization differences.

Do not substitute a repository root, marketplace catalog, `--plugin-dir`, or development link for the actual installed root. An unpacked-package pass establishes package fidelity only. An installed-root pass establishes that copy's fidelity, not which copy a running host activated. After install/update, start a **fresh session**, inspect the loaded skill/plugin path and version, and verify that exact root again. See [installed-path discovery](../installation.md#verify-the-actual-installed-root). A version-only plugin list is not payload verification.

For isolated Copilot checks, use a new configuration directory inside your checkout, never the live user settings or VS Code cache:

```powershell
$savedHome = $env:COPILOT_HOME
$savedAutoUpdate = $env:COPILOT_AUTO_UPDATE
try {
  $env:COPILOT_HOME = Join-Path (Get-Location).Path '.release-check-copilot-0.2.1'
  $env:COPILOT_AUTO_UPDATE = 'false'
  copilot plugin marketplace add C:\git\sql-apps-v3
  copilot plugin install sql-apps@sql-apps-skills
  copilot plugin list --json
} finally {
  $env:COPILOT_HOME = $savedHome
  $env:COPILOT_AUTO_UPDATE = $savedAutoUpdate
}
```

Use a previously nonexistent directory; retain diagnostics only as needed, then remove that isolated directory. CLI 1.0.102 reports local marketplace installs as `source: live` / `installedFrom: <checkout>` and explicitly says nothing was copied. This is useful discovery evidence, **not installed-package verification**; pointing the verifier at that checkout correctly fails. A published immutable artifact or a host's copied-install route is still needed to test real install/update propagation. Do not edit live caches to make a failed check pass.

### Runtime acceptance remains separate

Before claiming end-to-end support for a host, test it with the required specialists:

1. Generate a reservation app with a real UI-to-SQL save/reload and documented restart.
2. In a new conversation, change an invariant without losing policy or existing behavior.
3. Exercise missing SQL and DAB prerequisites and an out-of-profile request; expect an explicit blocker. Application data APIs require an actually installed Microsoft SQL DAB skill/tool; no silent Express-to-SQL CRUD substitution. Express is conditional for auth/orchestration/domain work.
4. Complete default `poc` / `free-first` local delivery with reproducible deployment-shaped artifacts, without cloud onboarding or resource creation. Explicit strict-zero choices remain strict. In a requested cloud review, distinguish confirmed incompatibility, missing evidence and recoverable tool failure; exercise bounded fallback and preserve scoped approvals rather than silently upgrading.
5. In an authorized environment, follow one Azure deployment workflow and verify the deployed primary workflow, including the attribution acceptance below.
6. Check workspace builds, real paths, `dist/index.html`, themes, keyboard behavior, and `rayfin/rayfin.yml` with `mssql`. Confirm no unintended Rayfin SDK/runtime installation or workflow handoff.

Record actual commands/results and host/plugin versions. A static test or installed skill does not count as a passed application scenario.

### Deployment experience and recipe acceptance (unverified)

No exercised core recipe is bundled. Follow the [deployment readiness and recovery contract](../../skills/sql-apps/references/deployment.md); this is a maintainer release gap, not evidence that a customer architecture is unsupported. To promote one immutable, versioned core recipe:

1. Record exact DAB/runtime versions, hosting tier/OS, identity trust, SQL permissions, process lifecycle, routing, build/publication and limitations. Run packaged UI/custom server/DAB/SQL migration checks locally; no Azure login required.
2. Exercise local/CI precompilation before assessing hosting runtime compatibility; a TypeScript source label must not reject F1. Do not assume F1 or B1 is proven without runtime evidence.
3. Produce one concise deployment review including costs/security/uncertainties and scopes. Simulate a tool timeout with one safe retry/alternative and a quota-evidence contradiction. Each must end with a concrete engineering action or precise approval, not repeated discovery.
4. Check resume preserves an approved B1 hosting exception and SQL-free constraint without reopening unchanged decisions or permitting SQL overages. Routine local checks do not request new product approval; host permissions and upstream mandatory gates remain in force.
5. Only in a separately authorized environment, deploy the core recipe and verify the real workflow, direct DAB authorization controls, SQL invariant/concurrency enforcement, restart and actual resource settings. Retain source revision, commands/results and sanitized evidence; failed/unrun checks stay unverified. Do not provision just to satisfy documentation tests.

### Deployment attribution acceptance (unverified)

Exercise the [attribution contract](../../skills/sql-apps/references/deployment-attribution.md) within the separately authorized Azure scenario above. Static checks do not prove a consuming assistant generates or deploys the required metadata. No attribution deployment scenario has been exercised yet.

| Case | Required evidence |
| --- | --- |
| New group and supported resources | Inspect rendered infrastructure for the sole attribution tag `sqlapps-version` using the brief's verified adopted version; check each new tag-capable resource, not just the group. Preserve an unrelated customer tag. |
| Existing/shared resources | Keep their names and tags unchanged without explicit reattribution scope; never replace them for metadata. |
| Tag conflicts and limits | A differently cased existing key is not duplicated; conflicting values or exhausted tag capacity are surfaced without overwriting customer tags. Record unsupported tagging and approved opt-outs. |
| Naming constraints and overrides | Check the final `sqlapps` suffix on new configurable names, with environment and stable uniqueness tokens before it; verify `-sqlapps` when hyphens are allowed and `sqlapps` appended directly for alphanumeric-only names. Check constrained storage naming, fixed child names such as `default`, and an approved customer naming override. Render/validate optional-service examples without provisioning services the app does not need. |
| Resume with newer guidance | Preserve the recorded attribution version and existing names unless an intentional guidance/infrastructure update is approved. |
| Local-only delivery | No Azure sign-in, provisioning, metadata readback, or telemetry resources are required. |

For an approved deployment, read back actual resource tags and names through the owning Azure workflow and compare them with the brief and rendered infrastructure. Report mismatches as failed attribution validation, approved overrides/unsupported cases as exceptions, and unrun checks as unverified. Do not query app data or metrics, add collectors or diagnostic settings, broaden permissions, or rename/delete resources for this check. Resource metadata is not evidence of active usage or Microsoft-wide reporting access.

## Publish a release

1. Review license, notices, payload, release identity, and validation results; do not reuse an existing release version for changed bytes.
2. Run all three test files above. Prepare an independent package from the reviewed candidate and run the verifier against its unpacked root. Record the exact source revision, version, commands/results, and payload fingerprint.
3. With maintainer authorization, publish reviewed commits to [microsoft/sql-apps](https://github.com/microsoft/sql-apps) and create the matching immutable version tag/release. A local 0.2.1 manifest change alone does not publish anything. Do not claim app/cloud acceptance based on a package check.
4. Keep installation examples pointed at this repository. For a pinned release, check the host's actual pinning syntax rather than guessing a tag parameter.
5. Test initial installation **and** marketplace refresh/plugin update from the previously released version, using isolated host configuration where supported. Locate the actual copied package, run the verifier, start a fresh session, confirm its loaded path/version, and rerun the verifier. Record host/plugin versions and distinguish copied installs from live development sources.
6. Verify each advertised installation route before broadening its status. Public marketplace listing may require separate submission, review, or account permissions. Keep unexercised hosts/runtime scenarios explicit.

The previous SQL Apps implementation used the same marketplace name. Existing installations need a marketplace refresh and plugin update after publication; a fresh session must still be checked. Actual publication is blocked until an authorized maintainer publishes the reviewed candidate and release identity. Real remote install/update propagation and runtime app/cloud acceptance remain separate unverified gates; no commit, push, tag, or publication is implied by these instructions.

## Maintenance boundary

The [constitution](../../skills/sql-apps/references/constitution.md) owns stack policy, the [router](../../skills/sql-apps/SKILL.md) chooses specialists, and the [plan](../../plan.md) explains architectural decisions. Keep decision history out of the product introduction.

Route to host/upstream capabilities instead of copying their implementation. Do not add a workflow engine, provider abstraction, or Rayfin-compatible runtime merely to grow the package.
