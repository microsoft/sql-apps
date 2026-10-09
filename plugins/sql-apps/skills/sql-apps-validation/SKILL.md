---
name: sql-apps-validation
description: "Use when testing SQL Apps changes, validating the local plugin, running unit tests and typechecking, or verifying real local SQL ownership, REST/GraphQL, browser gateway and offline file-processing acceptance."
---

# Validate SQL Apps

SQL Apps is a standalone project with its own runtime and workflow. Use only SQL Apps skills and project-owned commands for SQL Apps work. Do not disable or modify other installed plugins.
Confirm the intended SQL Apps application directory before edits. Do not infer a directory from another plugin, session title or conversation history. If the active project is unrelated or the target is unclear, ask which directory to use; do not convert or overwrite it.

Resolve `../../scripts/sql-apps.mjs` relative to this installed skill; run `node "<absolute-script-path>" home`. Execute repository commands **in that resolved checkout**, not in a plugin cache or unrelated session project.

Read `README.md` and `docs/reference/local-development.md`. Choose checks covering the change:

- Plugin packaging: `npm run plugin:check`.
- Dependency-free guided context/setup: `node --test tests/guide.test.mjs tests/setup.test.mjs`.
- Offline cost policy and preflight regression: after build/typecheck compilation, `node --test dist/tests/demo-cost.test.js dist/tests/azure-preflight.test.js`. Minimal SQL/compute template contracts: `npm run infra:test-demo`. No Azure deployment/sign-in is needed for these checks.
- Application delivery boundary: `npm run app:check`, plus SQL model, live API and database checks from `docs/maintainers/application-boundary.md`.
- Unit/regression tests: `npm test`.
- Strict TypeScript: `npm run typecheck`.
- Shared SQL project: `npm run sql:build`.
- Production DAB configuration: `npm run dab:validate` (requires internet; not database connectivity).

With local services available, invoke the wrapper with `test`, `api-test`, `app-test`, and `services-test`. These are real SQL/RLS, REST/GraphQL, gateway, Blob/Queue/Functions checks. **services-test briefly stops/restarts project-owned worker/storage and creates/deletes fixtures**; obtain permission and do not run during another user's processing. Run acceptance commands sequentially.

Verify measurable boundaries, user isolation, saved-snapshot retries/history, timer recovery, trace correlation and retention safety from command output. Browser health is not a substitute for these tests. Record exact commands and pass/fail results. Missing prerequisites and failing checks are not successes; resolve the error or report the remaining gap.

For a beginner's domain app, follow `docs/guides/build-your-app.md`: verify its agreed browser action and actual SQL save/reload, then the first useful change with invalid-input and existing-workflow checks. Use approved synthetic fixtures and do not require file/worker acceptance when those capabilities are absent. With agreement, record concise exact results through `guide-save "<absolute-brief.json>"`. Historical checkpoints are never current readiness or cloud authorization; source changes require re-verification.

Do not install dependencies unnecessarily, mutate unrelated data, run cloud deployment, or claim live cloud identity/private-network behavior from local tests.
