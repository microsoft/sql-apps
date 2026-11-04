## SQL Apps Deployment Shapes Implementation Plan

> Archived implementation plan. Tasks 1–6 are implemented. The live checks for
> Task 7 remain gated on separate approval. This file records design history;
> use the [current deployment policy](../../skills/sql-apps/references/deployment.md)
> and [shape catalog](../../skills/sql-apps/references/deployment-shapes.md) for
> current instructions.


## For agentic workers:

 REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

## Goal:

 Replace per-application deployment engineering with versioned, tested deployment shapes that require only application parameters and one scoped approval plan.

## Architecture:

 Extend the existing application-owned templates and deployment preparation scripts rather than creating a plugin runtime or a general deployment platform. A selected hosting/API shape supplies infrastructure, packaging, identity/network boundaries, cost disclosure, deployment phases, recovery and acceptance; an app supplies business code and bounded configuration. Approvals remain host-owned, while generated receipts describe state and never authorize operations.

## Tech Stack:

 Existing Node.js/TypeScript tooling, npm workspaces, Azure CLI/Bicep, Docker where the selected shape requires it, React/Vite, DAB or Functions, and Azure SQL Database.

## Spec:

 The embedded "

## Product requirements

" section of this document is the portable specification. Copy this complete document into the plugin repository before implementation.

## Global Constraints

Preserve existing application source, deployment decisions, credentials, data and unrelated files; no automatic migration or template overlay of existing apps.Retain Container Apps/DAB as the current default. Explicit user target choices override it.Keep Azure SQL Database as the supported database, with free-limit AutoPause where the free offer is selected; never substitute paid SQL silently.A deployment request is not spend, publication, identity, network or destructive-action approval.Preserve zero-azure-spend: metered allowances, scale-to-zero and budget alerts are not hard spending caps.Build explicitly before compiled tests, runtime startup and acceptance. Use locked dependencies and immutable image references.Never store secrets/tokens in plans, command arguments, receipts, chat or feedback. Use approved secret channels.Keep app decisions in app-brief.md, host/API selection in deployment.json, and approvals/costs/operator results in one app-owned deployment.md.Support Windows PowerShell; do not introduce a mandatory Bash, azd, plugin runtime or extra cloud service.Do not mark a shape verified on the strength of template validation, mocks, unit tests or local-only acceptance.Treat the file paths below as relative to the installed sql-apps plugin package. Verify their location in the source checkout before editing.

## Review Focus

Changed parameters or artifact digests after approval must invalidate that plan's applicability, not inherit authorization.Partial provisioning and failed-name reservations must be reconciled before retrying; successful generic inventory alone is insufficient.Existing modified files, unknown generated-output contents and symlinks must never be overwritten by preparation.A public quote-submission workflow must not force fake authentication or expose customer records when owner setup is incomplete.A free service SKU or allowance must never be presented as a zero-cost guarantee for the entire topology.

## Product requirements



## Problem and evidence

The source deployment recorded 15m50.619s from idea to local verification and 28m27.753s from local to deployed verification, totaling 44m18.372s. These are wall-clock times that include setup and approvals, not Azure provisioning time. Foundation provisioning took 201.169s and application provisioning took 74.583s. The remaining time includes image work, identity/bootstrap, failed attempts, verification and approvals; the evidence does not assign an exact duration to each category. Friction included a missing Docker build input, npm mirror routing, SQL regional provisioning restrictions, failed region-bound name reservation, serial approvals and SQL operator-process isolation. The existing starter and overlays provide the basis for this work; the goal is to improve them, not add another template layer.

## Desired user experience

Select shape -&gt; preflight -&gt; review one plan -&gt; approve -&gt; deploy -&gt; verify save/reload.Ask only for missing business or deployment decisions. Reuse recorded configuration. Present resource creation, cost exposure, image publication, identity grants and network changes together when known. Host-required permission prompts and user-controlled sign-in/consent remain separate where technically necessary.Ask again only when a proposed action changes the approved scope, such as a new region, paid tier, broader firewall rule, additional identity permission or destructive recovery. Do not silently switch shapes or regions.

## Initial catalog

Shape IDExisting starting pointPromotion requirementcontainer-apps-dabDefault starter; infra/main.bicep; web/DAB DockerfilesPublic web, internal DAB, private registry, managed identity, scoped SQL grants, bounded scaling, real cloud acceptancestatic-web-apps-functionsExisting Static Web Apps overlayValidate exact hosting/API tier compatibility, real provider identity, SQL connectivity/credential lifecycle and real cloud acceptanceapp-service-f1-dabExisting F1 overlayProve packaging/runtime, capacity, identity, networking and end-to-end behavior; keep experimental if unsuitableDo not silently turn the F1 shape into a paid App Service shape. If F1 cannot support the topology, document the incompatibility. Introduce app-service-dab with an explicitly priced, verified tier only as a separately reviewed follow-on.Every shape declares exact resources/SKUs, API/runtime, auth boundary, network boundary, packaging, database bootstrap, cost classes, supported configuration and verification status. Availability in the catalog does not mean recommended or verified.

## Allowed app-specific inputs

Application name, target subscription/tenant, approved hosting/SQL regions, owner identity, database/catalog, selected shape, approved resource reuse, and bounded size/scaling settings. Schema/migrations and business code remain app-owned. Secrets are referenced, not embedded.Runtime versions and implementation topology are shape-owned; changing them is a reviewed shape update or an explicitly recorded deviation, not an ordinary free-form parameter.

## Success criteria

No application-specific cloud scripts are required for an unchanged supported shape.One consolidated decision plan covers all known deployment actions; no redundant serial assistant approval questions.Preflight identifies observable missing tools, configuration and access before writes, and clearly marks provisioning eligibility that cannot be established read-only.Applying again with unchanged inputs reconciles existing resources rather than duplicating them.Acceptance proves real-provider permitted/denied access, real SQL save/reload and persistence after an owned runtime restart.Original milestones remain immutable; later verification completion is separately timestamped.At least the default shape has immutable-revision live evidence before being promoted to verified.No fixed deployment-time guarantee is advertised from one run. Report distributions from repeatable runs before setting a performance promise.

## File map

Existing files to extend:skills/sql-apps/SKILL.md: select/reuse a shape and invoke the app-owned workflow.skills/sql-apps/references/deployment.md: consolidated approval, bounded recovery and promotion policy.skills/sql-apps/references/constitution.md: adjust approval wording only if necessary; preserve policy invariants.skills/sql-apps/templates/starter/scripts/deployment.mjs: preserve preparation behavior and expose new phase commands.skills/sql-apps/templates/starter/scripts/config.ts: reuse current host/API profile validation.skills/sql-apps/templates/starter/package.json: add deployment commands.skills/sql-apps/templates/starter/Dockerfile.web: include all configuration needed by the workspace build.skills/sql-apps/templates/starter/infra/main.bicep: existing default infrastructure.skills/sql-apps/templates/starter/deployment.md and hosting.md: generated operator instructions and evidence fields.skills/sql-apps/templates/alternatives/README.md and install.mjs: preserve explicit overlay selection and safe materialization.Existing alternative infrastructure under templates/alternatives/app-service-f1/infra and templates/alternatives/static-web-apps/infra.Proposed new files, all application source copied with the starter unless noted:templates/starter/scripts/deployment-shapes.mjs: fixed catalog and normalized profile contract.templates/starter/scripts/deployment-plan.mjs: read-only checks, canonical plan generation and scope comparison.templates/starter/scripts/deployment-execution.mjs: ordered phases, reconciliation and resumable receipts.templates/starter/scripts/deployment-acceptance.mjs: common acceptance contract and benchmark events.templates/starter/tests/deployment-shapes.test.mjs, deployment-plan.test.mjs, deployment-execution.test.mjs, deployment-acceptance.test.mjs.references/deployment-shapes.md: catalog, supported inputs, boundaries and revision-linked verification evidence.Paths in the remainder of this plan are relative to skills/sql-apps/.

### Task 1: Define the catalog without breaking existing profile selection


**Interfaces:**
 Export resolveShape(profile) from templates/starter/scripts/deployment-shapes.mjs, consuming the existing validated { hosting, api } pair and returning { id, revision, status, phases, artifacts, inputKeys }. Status is experimental or verified; promotion requires Task 7 evidence.Add failing tests in deployment-shapes.test.mjs: current default resolves to container-apps-dab; the two existing alternatives resolve correctly; unsupported pairs fail explicitly; experimental shapes are never described as verified.Run node --test tests/deployment-shapes.test.mjs in a copied starter fixture and confirm failure for the missing catalog.Implement the catalog using the existing profile validator, not a second divergent hosting/API registry. Document resource/auth/network/cost boundaries in references/deployment-shapes.md.Run the targeted tests and existing profile/configuration tests; require all to pass.Commit this catalog change independently.

### Task 2: Generate one complete, reviewable deployment plan


**Interfaces:**
 Export createDeploymentPlan({ shape, inputs, observations, artifacts }) and compareApprovedScope(approvedPlan, proposedPlan) from deployment-plan.mjs. Plans include schemaVersion, shape ID/revision, normalized inputs, immutable artifact identifiers, resources, costs, publication/identity/network actions, uncertainty, and planHash. Scope comparison returns { applicable, changes }; it does not grant authorization.Add failing tests for canonical hashing independent of object key order; cost classification for every component; strict zero-spend rejection of unresolved charge exposure; missing owner/configuration reporting; and changed region/firewall/image digest requiring new plan review.Run node --test tests/deployment-plan.test.mjs and confirm the missing behavior fails.Implement deterministic plan rendering and read-only preflight through existing CLI/tooling. Discover the approved npm registry without copying credential-bearing configuration. Never claim a region is eligible merely because SKUs are listed.Add deployment:preflight and deployment:plan commands. Preserve existing deployment:prepare behavior and generated-output ownership checks.Run targeted tests; confirm preflight and plan execute no resource writes, sign-in or consent.Commit the plan generation and related operator documentation.

### Task 3: Make the default shape a reusable deployment path


**Interfaces:**
 Export executeDeploymentPhase({ plan, phase, receipt, authorize, adapter }) from deployment-execution.mjs. authorize is a host-supplied authorization boundary; a file, hash or receipt is never sufficient authorization. Phases are publish, foundation, bootstrap, applications, verify. Return updated phase status and resource/artifact references with secret values excluded.Add failing tests for complete phase order; no apply without authorized matching scope; failed bootstrap blocking applications; unchanged rerun reusing observed resources; and plan scope changes invalidating continuation.Run node --test tests/deployment-execution.test.mjs and confirm failure. Move reusable behavior into starter scripts, using source application evidence rather than customer identifiers. Reuse Bicep, managed identity and existing migration/permissions mechanisms; require checksum-safe forward migrations.Fix Dockerfile.web to include deployment.json. Add a build-context regression assertion and propagate an explicitly approved non-secret package-registry setting into the Docker build. Keep phase execution behind the host authorization boundary; the starter has no standalone apply command or bundled Azure write adapter. Reconcile state after uncertain writes before continuing.Run targeted tests, full copied-starter Build/Test, and the actual production Docker build with the chosen approved package route.Commit the default deployment path.

### Task 4: Add bounded recovery and safe resume


**Interfaces:**
 Add reconcileDeployment({ plan, receipt, observed }) in deployment-execution.mjs, returning { completedPhases, discrepancies, proposedRecovery }. Recovery proposals contain explicit scope deltas and never perform automatic region/tier changes.Add failing tests for failed SQL name reservation missing from generic inventory; timeout after resource creation; resumed bootstrap after partial completion; modified generated files/symlinks; and preserving existing SQL/data/image references.Run the execution and existing preparation tests; confirm new cases fail before implementation.Implement resource-specific reconciliation and phase receipts. Use distinct deterministic names for separately approved regional alternatives. Stop on unknown ownership or evidence gaps rather than deleting/recreating resources.Ensure a failed image build exposes the underlying tool/network error and approved route, without TLS bypass or credential output. Use isolated SQL operator processes where the installed driver requires them.Run targeted recovery tests and existing safe-staging regression tests.Commit recovery support and its documented limits.

### Task 5: Integrate alternative shapes without pretending they are equivalent

**Interfaces:**
 Alternatives implement the same plan/phase/result contracts, using shape-specific packaging, identity, bootstrap and acceptance adapters. DAB-only requirements never run for Functions.Add failing tests for explicit alternative selection; absence of DAB artifacts in Functions output; credential-reference-only plans; incompatible F1 topology rejection; and refusal to overlay a modified existing application.Run catalog/plan/preparation tests and verify the new assertions fail.Wire existing overlays into the phase contract. Validate current official hosting/API constraints and credential lifecycle before implementing a write path. Leave incompatible or unexercised profiles experimental with precise blockers.Update overlay installation and lockfile instructions only as needed; do not introduce multiple APIs or a fallback Express implementation.Run each copied profile's Build/Test and packaging checks separately. Keep real cloud validation separate from these results.Commit alternative integration.

### Task 6: Standardize acceptance, timing and correction feedback


**Interfaces:**
 Export recordBenchmarkEvent(log, event) from deployment-acceptance.mjs; event fields are { kind, utc, phase, result, evidenceRefs }. First valid idea-start, local-verified and deployed-verified milestones are immutable. Approval/sign-in waits are interval events, not subtracted from headline wall-clock totals. Add failing tests for immutable milestones, resumed runs, duration arithmetic, separate later owner verification, redaction, and an unavailable issue destination preserving local feedback.Run node --test tests/deployment-acceptance.test.mjs and confirm failure.Implement shared acceptance outcomes with separate local/cloud evidence. Require real SQL browser save/reload for customer milestones and report owner acceptance separately; do not let an incomplete owner check be described as fully verified delivery.Include allowed/denied real-provider controls, concurrency/idempotency and owned-runtime restart persistence in shape promotion checks. Public submission/private owner remains an explicit reviewed policy, never a fake-login bypass.Produce single-line feedback summaries with reproduction, expected/actual, impact and correction detail. Post only to an authorized issue destination; otherwise retain a portable local record without alternate-identity retries.Run targeted tests and check recorded milestone arithmetic.Commit acceptance/timing support.

### Task 7: Exercise, promote and document the first verified shape


**Interfaces:**
 Each verification record identifies shape revision, immutable plugin/source revision, tool/runtime versions, artifact digests, test context, observed settings, timestamps, passed/unrun checks and evidence locations. Existing apps adopt a new shape revision only by explicit review.Update SKILL.md, deployment guidance and starter operator docs to describe selection, one consolidated approval plan, execution, exception review and resume. Do not require separate assistant questions for already-approved unchanged actions.Run all copied-starter tests and builds; confirm supported alternatives still package and safe-staging safeguards remain intact.Obtain explicit isolated live-test approval for the default shape, including costs/access/publication and eventual cleanup scope. Perform real provisioning, real-provider controls, browser SQL save/reload, restart persistence and settings audit.Reapply unchanged configuration and demonstrate reconciliation without duplicate resources, schema resets or new approval questions for unchanged scope.Record the default shape's evidence at an immutable revision and promote only that tested revision. Keep alternatives experimental until separately exercised.Repeat at least three approved fresh-scope runs and three application-update runs before reporting preliminary timing distributions. Separate first environment setup, first app deployment, app update, approval waits and provisioning phases; report sample size and failures. Reuse shared resources only with explicit approval.Commit documentation/promotion evidence with private identifiers and secrets excluded. Delete test resources only under the approved cleanup scope.

## Release gate and rollout

Ship the default shape first; integrate alternatives through the same contract without making them blockers for default-shape improvement. Do not advertise all three as verified until each has its own live evidence.Release requires zero per-app deployment-script authoring on the unchanged default path, one reviewable scope plan, safe repeat application, preserved customer data, real cloud acceptance evidence and recorded limitations.This plan does not authorize implementation, cloud provisioning, spend, sign-in, public publication or cleanup. It is a handoff for implementation in the SQL Apps plugin repository.
