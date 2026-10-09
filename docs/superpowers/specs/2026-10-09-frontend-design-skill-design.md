# SQL Apps Frontend Design Skill

## Problem

SQL Apps helps assistants build custom browser applications, but its application guidance focuses on domain scope, data boundaries, runtime behavior, and validation. It gives little practical direction for visual identity, hierarchy, responsive layouts, or visual iteration. As a result, assistants can deliver functionally complete interfaces that look generic or unfinished.

The SQL Apps foundation browser is intentionally a functional example, not the design target for every app. A new skill should help users and assistants create distinctive, usable interfaces for the domain app they are building without turning SQL Apps into a theme or template system.

## Goals

- Improve visual craft and usability of custom applications built with SQL Apps.
- Fit the existing SQL Apps skill/plugin conventions and application workflow.
- Preserve freedom to use an app-appropriate visual identity and the existing project stack.
- Make browser-based visual review an explicit acceptance activity when feasible.
- Keep functional, data, access, and deployment decisions within the existing SQL Apps application workflow.

## Non-goals

- Redesigning `public/` or the shipped foundation browser.
- Creating a universal SQL Apps theme, component library, or domain-specific starter template.
- Mandating a frontend framework, CSS library, typography, palette, or design trend.
- Replacing the application skill's SQL, authorization, safety, or runtime guidance.
- Treating a successful build, source inspection, or generated screenshot as proof of end-to-end app behavior.

## Proposed approach

Add a focused `sql-apps-frontend-design` skill to the SQL Apps plugin. Route custom UI creation and visual-polish tasks to it from the existing `sql-apps-application` skill, and add a short discovery cue to `docs/guides/build-your-app.md`. Update the repository's explicit plugin skill inventory, packaging check, and targeted tests so the skill is included and validated with the existing bundle.

This keeps the app workflow authoritative for SQL Apps-specific boundaries and gives visual design a focused reusable workflow. It is preferred over expanding the app skill into a catch-all and over a shared visual system that could make unrelated custom apps look alike.

## Skill responsibilities and workflow

### 1. Understand the interface being designed

- Inspect the existing application and its established visual patterns before proposing changes.
- Understand the intended users, primary task, important information, and device context from the app brief. Ask only for missing decisions that materially affect the interface.
- For substantial new interfaces, present two or three app-appropriate visual directions with concise trade-offs and recommend one. Obtain user approval of the direction before implementation.
- For small extensions or refinements, follow the existing app's visual language rather than adding an approval ceremony.
- Do not make users choose a framework or cloud architecture as a prerequisite to visual design.

### 2. Establish an app-specific design direction

Translate the approved direction into practical choices for page composition, information hierarchy, typography, color, spacing, density, and imagery or illustration when useful. Avoid generic dashboard patterns or decorative effects without a purpose. Respect an existing product brand when present; do not impose a SQL Apps theme on the app.

Identify the key populated, empty, loading, error, disabled, and success states applicable to the requested workflow. Do not add states or controls for capabilities the app does not have.

### 3. Implement within existing project constraints

- Use the existing frontend stack, assets, and dependencies where suitable. Do not add packages or fetch remote fonts/images just for appearance without user approval.
- Keep the implementation semantic, responsive, and consistent with the established app structure.
- Preserve existing workflow, data, identity, authorization, and capability boundaries; route SQL Apps-specific questions to the application skill rather than inventing behavior.
- Prefer clear focus states, sufficient contrast, keyboard-operable controls, meaningful labels, and respect for reduced-motion preferences. Do not trade usability or accessibility for visual novelty.

### 4. Review the rendered interface and iterate

When a local browser preview is available, run the app using its documented project workflow and inspect the actual rendered UI at a desktop viewport and a narrow mobile viewport. Review the primary screen and important populated/empty/loading/error states that are feasible to reach. Fix meaningful issues in hierarchy, spacing, text wrapping, responsive behavior, affordance clarity, and visual consistency, then inspect the changed render again.

Use visual browser tools when available. Otherwise use the project's supported preview and screenshot mechanism. Do not start unrelated services or use production data just to obtain a preview. If browser review cannot be performed safely or feasibly, state that limitation explicitly and report what was checked instead; do not claim visual acceptance based only on source code or a successful build.

### 5. Report evidence and remaining gaps

Summarize the design direction and significant interface decisions, list the viewports and states actually inspected, describe any iterations made, and clearly identify visual or accessibility checks that remain unverified. Preserve the application skill's separate requirements for functional workflow, persistence, access, and SQL validation; visual inspection does not replace them.

## Quality bar

A completed UI change should:

- Communicate an intentional, app-appropriate visual identity rather than an unexamined default.
- Make the primary task and information hierarchy apparent.
- Present relevant interaction states and content at the right level of visual emphasis.
- Remain usable at desktop and narrow mobile sizes without clipping or awkward overflow.
- Provide keyboard access, visible focus, understandable labels, sufficient contrast, and reduced-motion handling where motion is present.
- Be visually inspected in a running browser when feasible, with limitations reported honestly.

## Integration and validation

Expected implementation touchpoints:

- Add `plugins/sql-apps/skills/sql-apps-frontend-design/SKILL.md` using the plugin's existing skill frontmatter, portable-project rules, and focused length limit.
- Add a narrowly scoped route to the design skill in `plugins/sql-apps/skills/sql-apps-application/SKILL.md`.
- Add a short note to `docs/guides/build-your-app.md` so users discover the design guidance when asking an assistant to implement screens.
- Update `scripts/check-plugin.mjs` and `tests/plugin.test.ts` for the explicit skill inventory and bundle contents.
- Update relevant assertions in `tests/guide.test.mjs` and `tests/plugin.test.ts` to protect the skill metadata, routing, visual review criteria, and packaging behavior.

Run the focused plugin and guide tests, followed by the repository's relevant validation if needed. Do not modify the foundation's runtime UI, change runtime dependencies, or alter unrelated worktree changes as part of this skill addition.

## Assumptions and boundaries

- The skill is part of the SQL Apps plugin source, not a separately installed global skill and not an exported skill copy inside an application checkout.
- Skill routing is additive: non-UI SQL Apps work continues to use the existing skills, and the application skill remains authoritative for SQL Apps-specific implementation and safety.
- Browser inspection is required when feasible but must not trigger unsafe service startup, unapproved network access, or a false claim of end-to-end validation.
