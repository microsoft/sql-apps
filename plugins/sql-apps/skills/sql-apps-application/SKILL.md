---
name: sql-apps-application
description: "Use when guiding a beginner to describe, build and change a standalone SQL Apps application locally, implementing a domain-specific app, or verifying that sample UI, clients, APIs and schema are absent from delivery."
---

# Build a clean application, not a modified example

SQL Apps is a standalone project with its own runtime and workflow. Use only SQL Apps skills and project-owned commands for SQL Apps work. Do not disable or modify other installed plugins.
Confirm the intended SQL Apps application directory before edits. Do not infer a directory from another plugin, session title or conversation history. If the active project is unrelated or the target is unclear, ask which directory to use; do not convert or overwrite it.

Resolve `../../scripts/sql-apps.mjs` relative to this installed skill; run its absolute path with `home` to locate the foundation. The session application/worktree may be a different checkout. Confirm the intended application directory before edits. Do not overwrite the foundation or silently use its runtime binding for application-specific commands; set `SQL_APPS_HOME` to the validated application checkout when invoking its launcher.

Identify the loaded skill source, installed launcher and application checkout separately. Editing exported skill copies in an application does not change the active plugin. Verify the marketplace source and reload a fresh session after editing that source; `SQL_APPS_HOME` selects runtime code, not instructions.

Read `docs/maintainers/application-boundary.md` in the foundation. The reusable foundation defaults to no selected examples. Keep auth, domain-neutral `dbo.OwnerPredicate`, deployment tools and only the foundation capabilities the application uses. Do not copy `examples/` into a generated application or include it in TypeScript runtime inputs, browser bundles, DAB configuration, SQL projects or container images.

## Describe -> Run locally -> Make it yours -> Share optionally

Read `docs/guides/build-your-app.md` in the intended application. Once Node exists, run the launcher's read-only `workspace-check`, then `guide` with the explicit application home when required. Recover agreed decisions, not just conversation memory; source changes flag historical evidence for re-verification. Do not require SQL knowledge.

Ask one outcome-focused question at a time about the intended users, information, actions and required fields/access. Explain files/background work in everyday terms. Do not ask beginners to choose frameworks, Azure services or deployment topology. Check setup/private-preview acquisition requirements early via the local skill.

Present a small scope summary before edits: useful screens/actions, stored information, access/validation rules, selected capabilities, a first useful change and explicit exclusions. No cloud deployment is planned by default. Agree on the summary and save it via `guide-save "<absolute-brief.json>"` using `docs/reference/guide.md` only with authorization; no credentials or actual records. Preserve root `selectedExamples: []`.

State local and cloud support for the agreed capability/access profile before implementation. The explicit `role-based-data` profile provides SQL/DAB/browser startup and matching paid private-SQL Azure orchestration; read `docs/reference/role-based-data.md`. Domain screens/procedures and live acceptance remain app-specific. The full foundation retains its services; do not silently add excluded capabilities or switch authorized access to an anonymous demo.

### Data-only application path

For role-authorized data scope, configure `role-based-data.json` and explicit role-authorized DAB procedures with a read-only GET readiness endpoint. After scoped restore/build/workspace/EULA/schema approvals, run `role-based-app` in the validated checkout, then `role-based-serve` to resume. It omits storage/Functions and probes the procedure before listening; Alice is labeled simulated user with required role, Bob a simulated user without the required role. `serve-sql` remains an advanced SQL-only path, not this configured launcher. Implement domain screens/procedures and hide excluded controls; the profile is not an app generator.

Do not run full `app`/`services` or require a file-processing acceptance roundtrip for data-only scope. If a needed command is absent from the installed launcher, inspect project-owned CLI help and use its documented checkout command; never invent a launcher flag. The explicitly chosen synthetic reference starts SQL/DAB/browser only but is not a prerequisite or a role-authorized substitute. A saved capability list does not dynamically compose services.

### End-to-end application authorization

For a custom application role (for example `AppUser`), check role definition and allowed member types, application role assignment, token claims, gateway-selected DAB role, entity/procedure permissions and SQL grants. With `role-based-data`, `identity` creates the configured human role and `role-based-assign` assigns explicitly approved users/groups; the foundation still creates `Function.Invoke`. These require separate authorized Entra work; an app-side role check alone is insufficient.

Explicitly test custom-role forwarding against live local DAB: an authorized authorized request succeeds, missing/unassigned roles fail, caller-supplied role headers cannot escalate access, and procedure permissions match the selected role. The gateway must choose the trusted DAB role from validated claims (or explicitly gated local simulation), not arbitrary client headers. A local authorized simulation does not prove Entra assignment or cloud token behavior. Preserve owner isolation where required by the agreed app.

### Custom UI design

For substantial new screens, visual redesigns, or UI-focused polish, use `sql-apps-frontend-design` for app-specific visual direction and rendered-browser review. Keep SQL, data, authentication, authorization, capability, and runtime decisions in this application workflow.

1. Confirm domain behavior and selected capabilities with the user. Use the existing infrastructure and CLI, not upstream packages or another deployment implementation.
2. Implement domain-specific frontend/client/API/schema and tests. Never preserve the Todo screen in a hidden section, Todo client methods, DAB entity, sample migration, grants or default fixtures.
3. Keep `application.json` named for this application with `selectedExamples: []`. Build, then run `npm run app:check`. The checker scans source, built runtime/browser files, schema inputs and image copy boundaries; fail on leftover example components. Do not weaken it to make a failure disappear.
4. Build SQL and check its extracted DACPAC model: `node scripts/check-application.mjs . sql/obj/Debug/model/model.xml`. Test application workflows, owner isolation and any selected file/job services. Replacing the Todo example must not break shared RLS.
5. Against a running local application, run `npm run app:check-api -- <loopback-origin>` to verify authenticated Todo REST absence and rejection of the Todo GraphQL field. Then run `npm run local -- app-check <sql-container>` for database absence.
6. An existing database can retain legacy sample objects under non-destructive publishing. Fail/report that fact separately; do not claim database cleanliness from source checks. Review/export existing sample data and request explicit approval for a separate cleanup migration. Never enable drop-unspecified-objects or silently delete data.

Report exact commands/results and any remaining migration or live-acceptance gap. A clean browser alone does not prove a clean application. Cloud deployment remains separately authorized and billable.

For the user's first local success, verify an actual agreed browser action and SQL persistence/reload with approved synthetic fixtures, plus relevant invalid-input and ownership behavior. Then implement the brief's first useful change and repeat the changed action, validation and existing workflow tests. Explain what changed and how to change it again. Save evidence under the actual stage (`run-locally` or `make-it-yours`, not `describe`) and update completed `nextChange` with the agreed outstanding change or explicit no-change status. Record exact commands/results and distinguish agent-verified acceptance from user-reported testing. Guide setup suggestions do not override completed setup or prove live readiness; report outstanding acceptance separately.

A useful local app is success. Offer sharing only as an optional next step through the cloud-preview skill; review synthetic versus real data and access before choosing a profile. Never infer an anonymous public app from a request to share real data.

Select the approved application profile before a cost command through the cloud-preview skill. `demo-cost` is synthetic-demo-only; `role-based-cost` reviews the matching paid role-based-data template. Unsupported capability combinations remain explicit gaps, not permission to substitute a foundation/demo review. Saved preferences are not spending consent; do not promise free deployment or automatically move to paid capacity.

An explicit reference-app selection is separate from replacing it with a real application: use `app:build -- <selection> <profile>` and the selected artifact checker without changing the clean root selection. Selected local commands accept the exact artifact directory, verify workspace/source/checksums, and provision a separate application database/login/DAB namespace. Follow the local skill for consent, `selected-app`, `selected-serve`, `selected-test` and `selected-stop`. Never copy the complete examples tree into application delivery or treat selected-build success as cloud readiness.
