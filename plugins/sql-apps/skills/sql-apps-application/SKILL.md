---
name: sql-apps-application
description: "Use when guiding a beginner to describe, build and change a useful SQL Apps application locally, implementing a domain-specific app, or verifying that sample UI, clients, APIs and schema are absent from delivery."
---

# Build a clean application, not a modified example

Resolve `../../scripts/sql-apps.mjs` relative to this installed skill; run its absolute path with `home` to locate the foundation. The session application/worktree may be a different checkout. Confirm the intended application directory before edits. Do not overwrite the foundation or silently use its runtime binding for application-specific commands; set `SQL_APPS_HOME` to the validated application checkout when invoking its launcher.

Read `docs/maintainers/application-boundary.md` in the foundation. The reusable foundation defaults to no selected examples. Keep auth, domain-neutral `dbo.OwnerPredicate`, deployment tools and only the foundation capabilities the application uses. Do not copy `examples/` into a generated application or include it in TypeScript runtime inputs, browser bundles, DAB configuration, SQL projects or container images.

## Describe -> Run locally -> Make it yours -> Share optionally

Read `docs/guides/build-your-app.md` in the intended application. Once Node exists, run the launcher's read-only `workspace-check`, then `guide` with the explicit application home when required. Recover agreed decisions, not just conversation memory; source changes flag historical evidence for re-verification. Do not require SQL knowledge.

Ask one outcome-focused question at a time about the intended users, information, actions and required fields/access. Explain files/background work in everyday terms. Do not ask beginners to choose frameworks, Azure services or deployment topology. Check setup/private-preview acquisition requirements early via the local skill.

Present a small scope summary before edits: useful screens/actions, stored information, access/validation rules, selected capabilities, a first useful change and explicit exclusions. No cloud deployment is planned by default. Agree on the summary and save it via `guide-save "<absolute-brief.json>"` using `docs/reference/guide.md` only with authorization; no credentials or actual records. Preserve root `selectedExamples: []`.

Use existing supported startup paths. The explicitly chosen synthetic reference starts SQL/DAB/browser only; it is not a prerequisite for a new app. The full foundation starts file/job services too, and a saved capability list does not dynamically turn them off. Do not invent launcher flags or claim this skill is an automatic general-purpose application generator.

1. Confirm domain behavior and selected capabilities with the user. Use the existing infrastructure and CLI, not upstream packages or another deployment implementation.
2. Implement domain-specific frontend/client/API/schema and tests. Never preserve the Todo screen in a hidden section, Todo client methods, DAB entity, sample migration, grants or default fixtures.
3. Keep `application.json` named for this application with `selectedExamples: []`. Build, then run `npm run app:check`. The checker scans source, built runtime/browser files, schema inputs and image copy boundaries; fail on leftover example components. Do not weaken it to make a failure disappear.
4. Build SQL and check its extracted DACPAC model: `node scripts/check-application.mjs . sql/obj/Debug/model/model.xml`. Test application workflows, owner isolation and any selected file/job services. Replacing the Todo example must not break shared RLS.
5. Against a running local application, run `npm run app:check-api -- <loopback-origin>` to verify authenticated Todo REST absence and rejection of the Todo GraphQL field. Then run `npm run local -- app-check <sql-container>` for database absence.
6. An existing database can retain legacy sample objects under non-destructive publishing. Fail/report that fact separately; do not claim database cleanliness from source checks. Review/export existing sample data and request explicit approval for a separate cleanup migration. Never enable drop-unspecified-objects or silently delete data.

Report exact commands/results and any remaining migration or live-acceptance gap. A clean browser alone does not prove a clean application. Cloud deployment remains separately authorized and billable.

For the user's first local success, verify an actual agreed browser action and SQL persistence/reload with approved synthetic fixtures, plus relevant invalid-input and ownership behavior. Then implement the brief's first useful change and repeat the changed action, validation and existing workflow tests. Explain what changed and how to change it again. Save actual commands/results and browser evidence as a historical `run-locally` or `make-it-yours` checkpoint, never as current acceptance or blanket consent.

A useful local app is success. Offer sharing only as an optional next step through the cloud-preview skill; review synthetic versus real data and access before choosing a profile. Never infer an anonymous public app from a request to share real data.

Follow `docs/reference/demo-cost.md`: lead with local-first/free-tier-first guidance and run the offline cost review before sharing. Saved preferences are not spending consent; do not promise a free deployment or automatically move to paid capacity.

An explicit reference-app selection is separate from replacing it with a real application: use `app:build -- <selection> <profile>` and the selected artifact checker without changing the clean root selection. Selected local commands accept the exact artifact directory, verify workspace/source/checksums, and provision a separate application database/login/DAB namespace. Follow the local skill for consent, `selected-app`, `selected-serve`, `selected-test` and `selected-stop`. Never copy the complete examples tree into application delivery or treat selected-build success as cloud readiness.
