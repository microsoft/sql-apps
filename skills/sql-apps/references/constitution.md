# SQL Apps constitution

This is the authoritative durable policy, not a security sandbox or runtime.
The [skill router](../SKILL.md) selects task guidance; [app design](./app-design.md),
[prerequisites](./prerequisites.md), and [deployment](./deployment.md) supply steps.
Preserve existing apps rather than rewriting them to fit the profile.

## Durable project policy

Merge this single block into the active host's instruction file, preserving other
instructions: `.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md` for
Codex/Cursor, or `GEMINI.md`. Respect an existing configured location. Replace the
marked block only for an intentional policy update; do not accumulate inactive-host
copies. `app-brief.md` holds app decisions and business constraints, not another
constitution. One app-owned `deployment.md` holds cloud target, cost/access
approvals, operator instructions and observed deployment results.

```markdown
<!-- sql-apps:constitution:start -->
## SQL Apps project policy

- Preserve source/behavior/decisions/unrelated work. Deliver one workflow using TypeScript, React/Vite, npm workspaces/browser-safe contracts; no plugin runtime.
- Select DAB by default or explicit Static Web Apps/Functions. DAB prerequisites/acceptance apply only to DAB; no unused API or parallel Express CRUD.
- Use local Azure SQL Database container (Private Preview) or Azure SQL Database cloud: EngineEdition 5, application catalog (`appdb` locally), never `master`/on-premises. Missing SQL/API leaves persistence incomplete; no mocks/fabricated acceptance.
- Validate real external identity/ownership; never trust caller roles/headers, UI controls or fake login. Keep secrets server-side, outside source/chat/arguments/logs. Use least-privilege SQL and constraints/procedures for transactional/concurrent invariants, without table-write bypass.
- Preserve credentials/volumes/history; forward-only checksum migrations, never edited applied migrations/data resets. Pin immutable runtimes/dependencies and reproducible lockfiles.
- Explicit Build precedes Start, compiled-code Test and acceptance; no compiler hooks. `npm start` aliases `local:start`, dispatching the selected profile; `serve:web` is internal DAB hosting. Init/preflight/Status/Preview/Connect/Stop need no compiled output. Stop only owned processes/containers; retain volumes.
- Separate build/unit, readiness, authenticated direct/proxied API, browser save/reload, SQL concurrency, restart/persistence and cloud evidence. Denials need allowed controls; report failed/unrun checks. Fixtures/local success never certify cloud.
- Default `intent: poc`, `costPreference: free-first`; preserve `zero-azure-spend`. Deployment requests/allowances are not spend approval. Local work needs no Azure login. Respect host permissions; obtain scoped setup/sign-in/terms, cloud-write/spend/access and destructive approvals.
- Keep host/API in `deployment.json`; target/costs/approvals/operator steps/results in one `deployment.md`, linked from the decision-only brief. Preserve approved topology/SQL free-limit AutoPause; allowances/budget alerts are not caps. Verify whole-topology settings.
- Preserve adopted `sqlapps-version`/customer metadata for new in-scope tag-capable resources; suffix optional. Record opt-outs in deployment.md. No unapproved existing-resource renaming/reattribution, sensitive names/tags or attribution telemetry.
- No speculative Rayfin manifest/SDK/provider/private CLI. Preserve existing manifests; migration requires explicit scope and released tooling.
<!-- sql-apps:constitution:end -->
```
