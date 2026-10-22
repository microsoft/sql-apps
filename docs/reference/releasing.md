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

There are no executable hooks, MCP servers, automatic companion dependencies, or build step. There is no duplicate host-specific application implementation.

## Verification status

| Host | Packaging | Native validation / loader |
| --- | --- | --- |
| Copilot CLI | Root manifest + shared catalog | Isolated registration, browse, and installation passed with one skill |
| VS Code | Root manifest + shared catalog | Installation/UI loading not yet exercised |
| Claude Code | Native manifest + shared catalog | Manifest/catalog validation passed; interactive loading not exercised |
| OpenAI Codex | Compatibility manifest + Codex catalog | Static checks only; CLI unavailable in the validation environment |
| Gemini CLI | Extension manifest + shared skills | Static checks only; CLI unavailable in the validation environment |
| Cursor | Portable/native manifests + Cursor catalog | Static checks only; host unavailable in the validation environment |

No host has passed end-to-end application-generation or Azure deployment evaluation yet. Package checks do not prove instruction-following, specialist availability, browser access, database behavior, or compatibility with an unreleased Rayfin schema.

## Validation commands

Run packaging tests with Node.js 22 or later:

```powershell
node --test tests\plugin.test.mjs
copilot --plugin-dir C:\git\sql-apps-v3 plugin list --json
claude plugin validate C:\git\sql-apps-v3
claude plugin validate C:\git\sql-apps-v3\.claude-plugin\plugin.json
```

Replace the checkout path as needed. Tests cover manifest/version consistency, catalogs, shared skill paths, documentation links, host instruction destinations, design/alignment guidance, the service template, and the absence of runtime components.

Before claiming end-to-end support for a host, test it with the required specialists:

1. Generate a reservation app with a real UI-to-SQL save/reload and documented restart.
2. In a new conversation, change an invariant without losing policy or existing behavior.
3. Exercise missing SQL prerequisites and an out-of-profile request; expect an explicit blocker.
4. Complete local-only delivery without cloud onboarding or resource creation.
5. In an authorized environment, follow one Azure deployment workflow and verify the deployed primary workflow.
6. Check workspace builds, real paths, `dist/index.html`, themes, keyboard behavior, and `rayfin/rayfin.yml` with `mssql`. Confirm no unintended Rayfin SDK/runtime installation or workflow handoff.

Record actual commands/results and host/plugin versions. A static test or installed skill does not count as a passed application scenario.

## Publish a release

1. Review license, notices, payload, and validation results.
2. Keep all versioned manifests and catalog entries aligned. Codex's catalog reads the plugin version rather than duplicating it.
3. Publish reviewed commits to [microsoft/sql-apps](https://github.com/microsoft/sql-apps). Tag the reviewed version when preparing a versioned release.
4. Keep installation examples pointed at this repository. For a pinned release, check the host's pinning syntax.
5. Verify each advertised installation route. Public marketplace listing may require separate submission, review, or account permissions.

The previous SQL Apps implementation used the same marketplace name. Existing installations may need a marketplace refresh and plugin update.

## Maintenance boundary

The [constitution](../../skills/sql-apps/references/constitution.md) owns stack policy, the [router](../../skills/sql-apps/SKILL.md) chooses specialists, and the [plan](../../plan.md) explains architectural decisions. Keep decision history out of the product introduction.

Route to host/upstream capabilities instead of copying their implementation. Do not add a workflow engine, provider abstraction, or Rayfin-compatible runtime merely to grow the package.
