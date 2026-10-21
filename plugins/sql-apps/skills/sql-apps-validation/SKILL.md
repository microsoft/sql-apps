---
name: sql-apps-validation
description: "Use when validating SQL Apps changes or collecting test, browser, SQL, access, ownership, or deployment evidence."
---

# Validate SQL Apps

Resolve `../../scripts/sql-apps.mjs` from this skill, not cwd; quote its absolute path.
`home` selects input `docs/...`. Inspect `package.json`: `sqlApps.project` identifies
generated apps. Smallest covering check first; full suite only when warranted.

## Generated applications

After restore: `npm run build`, `npm run app:check`, declared tests, `npx --no-install tsc --noEmit`. Approved API check: `npm run app:check-api -- "<verified-origin>"`. No copied scripts, invented commands/runners or project switching; report missing checks.

## Foundation and plugin maintenance

Foundation: `npm run plugin:check`, `npm run typecheck`, relevant tests.
Targeted passes are not full-suite passes.

Use `docs/maintainers/application-boundary.md` for source, SQL and API/database absence checks.

## Live workflow evidence

Approved local apps: declared checks and `app-test` (Alice admitted, Bob 403).
Example-only `app-check`/`test` are not generated-app commands. Fixture writes/restarts
need approval; startup: `sql-apps-local`. Cloud probes follow publisher contracts.

Apply **Domain contracts and live acceptance** from the boundary reference:

- Use unique synthetic fixtures and owned sessions; snapshot preexisting records and remove only this run's fixtures.
- Supply the expected Origin and authorization. Pair invalid/foreign writes with a positive control; prove rejected writes leave data unchanged.
- Verify a real browser action, initial-load failure, failed-save retention and SQL save/reload. Reload means a new browser document and refetched SQL state.

Unavailable input/services/tools mean missing evidence. Forced DOM clicks, mocks, source review, health and compilation do not prove workflows.

For performance/changed reads, apply `docs/reference/read-performance.md`: comparable before/after measurements, sample counts, correctness. Report unobserved performance as missing functional evidence.

## Rendered browser review

Separate API/SQL acceptance, browser workflow acceptance and rendered visual review. Screenshots do not prove persistence/access; compile/API results do not prove visuals.

Use available, authorized in-app browser/preview tools with matching sessions.
Unreachable localhost means missing evidence. No external browser without
explicit request; no installs/settings changes without approval.

Before browser work, confirm a supported open/list operation returns the handle required by inspection/actions. An opened preview need not be controllable. Never invent or confuse page/instance handles; discover supported authorized alternatives before retrying.

Run `sql-apps-design`'s render-critique-improve loop before broad coverage. Verify the intended origin; use semantic browser inspection and real interactions at desktop and narrow widths. Source review or opening a tab is not visual review. If blocked, state exact evidence not observed separately from user-reported feedback.

Record origin, source/build, viewport, state, artifact, findings/re-review and authorship in `docs/design-review.md`; prose suffices. `sql-apps check` cannot verify observations/aesthetics. Setup assesses lifecycle only.

## Four-verdict report

Report exact commands/results:

- **Implemented/built:** source/build evidence.
- **Running:** intended origin/readiness.
- **Functional acceptance:** accepted, partial or blocked, with browser/API/SQL evidence.
- **Design review:** rendered coverage and agent usability assessment, defects/tradeoffs; **user visual-direction approval**: approved with attributed explicit feedback, pending or changes requested. Never infer approval from an agent verdict, check or matrix.

Historical checkpoints and local simulation do not prove current cloud identity, networking or authorization.
