# Install SQL Apps

Remote commands install the
[published version](./reference/releasing.md#package-and-release-identity), not this checkout.
Confirm discovery in a fresh session after install/update.

Replace `C:\git\sql-apps-v3` with your checkout. Review configuration prompts and
disable duplicate copies. Registration alone does not install the plugin.

## GitHub Copilot and VS Code

```powershell
copilot plugin marketplace add microsoft/sql-apps
copilot plugin install sql-apps@sql-apps-skills
```

Local marketplace:

```powershell
copilot plugin marketplace add C:\git\sql-apps-v3
```

Update an existing CLI install:

```powershell
copilot plugin marketplace update sql-apps-skills
copilot plugin update sql-apps@sql-apps-skills
copilot plugin list --json
```

VS Code marketplace chat commands are `/plugin marketplace add microsoft/sql-apps`
then `/plugin install sql-apps@sql-apps-skills`. CLI and VS Code installs/updates
are separate. See the [VS Code guide](https://code.visualstudio.com/docs/agent-customization/agent-plugins).

### Local VS Code development

Enable `chat.plugins.enabled` if needed; add to user settings:

```json
{
  "chat.pluginLocations": {
    "C:\\git\\sql-apps-v3": true
  }
}
```

Reload; find `sql-apps` in **Configure Skills** or the slash picker.

For session-only CLI discovery:

```powershell
copilot --plugin-dir C:\git\sql-apps-v3 plugin list --json
```

## Claude Code

```powershell
claude plugin marketplace add microsoft/sql-apps
claude plugin install sql-apps@sql-apps-skills
```

Local testing:

```powershell
claude --plugin-dir C:\git\sql-apps-v3
```

Use `/sql-apps:sql-apps` or ask Claude to use SQL Apps.
See [Claude installation](https://code.claude.com/docs/en/discover-plugins).

## OpenAI Codex

```powershell
codex plugin marketplace add microsoft/sql-apps
```

For local testing, use `codex plugin marketplace add C:\git\sql-apps-v3`.
Open the Plugins Directory, select **SQL Apps Skills**, install **SQL Apps**,
then start a fresh session.

The Codex IDE extension currently lacks plugin support.
See [supported surfaces](https://developers.openai.com/plugins/build/plugins).

## Gemini CLI

```powershell
gemini extensions install https://github.com/microsoft/sql-apps
```

Local development:

```powershell
gemini extensions link C:\git\sql-apps-v3
```

Check `/extensions list` and `/skills list`. Install copies the extension;
link uses the checkout. Update with `gemini extensions update sql-apps`.
Review activation consent. See [extensions](https://geminicli.com/docs/extensions/reference/)
and [skills](https://geminicli.com/docs/cli/skills/).

## Cursor

1. Open **Dashboard -> Plugins & MCPs -> Team Marketplaces -> Add Marketplace**.
2. **Import from Repo**: `https://github.com/microsoft/sql-apps`.
3. Review **SQL Apps**, enable it for the team, then install from **Customize**.

Requires eligible Teams/Enterprise access. Public Marketplace listing needs separate
submission/review. See [marketplaces](https://cursor.com/docs/plugins)
and [formats](https://cursor.com/docs/reference/plugins).

## Application prerequisites

The plugin installs no app tools.
Use [prerequisites](../skills/sql-apps/references/prerequisites.md) for SQL preview
access, companion tools and identity; see [tested runtimes](./reference/releasing.md#compatibility-and-preview-boundaries).

## Project instructions and troubleshooting

Open the app directory, not the plugin. Ask to use SQL Apps.
If discovery fails, check enablement/duplicates and refresh or restart.
Suspect a stale/corrupt package? Use
[installed-root verification](./reference/releasing.md#verify-the-actual-installed-root).

| Host | Default project instructions |
| --- | --- |
| Copilot | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` |
| Codex / Cursor | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |

Respect configured locations. Write only the active host's policy; reconcile
copies when changing hosts. Installing a skill does not make it always-on.
