---
name: sql-apps-getting-started
description: Guide beginners through describing, running and changing a useful SQL Apps application locally, with optional separately approved Azure sharing.
---

# SQL Apps

Work in the intended application checkout. Follow **Describe -> Run locally -> Make it yours -> Share optionally**. Read `README.md`, `docs/guides/build-your-app.md` and `docs/guides/getting-started.md`. SQL experience is welcome, not required.

Ask one outcome-focused question at a time about users, information and actions. Check setup/private-preview access early. Summarize the small agreed scope before edits; do not require framework or Azure-service choices. Select only needed capabilities using supported existing paths; a saved capability list is not a dynamic launcher.

Once Node exists, run `npm run guide` and `node scripts/setup-check.mjs` before restore/build. Explain one actionable blocker, expected result and safe resume. Ask before installations, downloads, EULA acceptance, workspace/schema changes or startup; saving a brief is not consent.

Use the existing application/local skills and clean application boundary. Verify a real browser action and SQL save/reload, then make and verify one useful change. Save only agreed decisions and exact evidence through `npm run guide -- --save <brief-path>`. Historical reports are not live acceptance; source changes require local re-verification. Keep secrets and actual records out of the brief.

Do not scaffold another runtime or install unverified platform packages. This project owns its configuration and runtime contracts; no external platform source is a prerequisite.

## Validation

- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run sql:tools`
- `npm run sql:build`
- `npm run infra:build`
- `npm run dab:validate`

Use `npm run azure -- help` for the implemented command surface. Run `npm run build` after editing TypeScript.

## Deployment

Local success is enough. Discuss deployment only when sharing is requested. Public anonymous demos require synthetic data; read `docs/reference/demo-deployment.md` and disclose its unfinished deployment path. Real-data authenticated applications need the separate full deployment review. Do not silently substitute profiles.

Follow the canonical policy in `docs/reference/demo-cost.md` and run offline `demo-cost` before Azure requests. Lead with free tier, not a free-deployment promise. Preserve `free-paused`/`AutoPause`; never enable paid continuation or fallback without explicit approval. Saved preferences do not authorize spending.

Read `docs/reference/deployment.md` and `docs/maintainers/operations.md` before changing deployment behavior.
Use Azure CLI and Bicep directly through the project orchestration. Review the configured subscription, resource group, identities, images, costs, and what-if before mutation. SQL publishing requires a privately connected runner with the SQL administrator identity.

Never report cloud success from compilation or mocked tests. Validate live sign-in, two-user row/file isolation, function identity, and repeat deployment. Keep secrets out of client configuration and logs.
