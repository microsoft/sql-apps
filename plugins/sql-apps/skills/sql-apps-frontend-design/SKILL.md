---
name: sql-apps-frontend-design
description: "Use when designing or refining custom screens in a standalone SQL Apps application, including visual direction, responsive behavior, accessibility, or browser-based visual review."
---

# Design custom SQL Apps interfaces

SQL Apps is a standalone project with its own runtime and workflow. Work in the confirmed absolute application directory from the SQL Apps application workflow. Use only SQL Apps skills and project-owned commands for SQL Apps work. Do not disable or modify other installed plugins. Do not infer a directory from another plugin, session title or conversation history.

Use this skill for the visual design and rendered-interface review of a custom application. Preserve existing app workflows and agreed capability boundaries; do not invent SQL, authentication, authorization, or data behavior for visual design. The `sql-apps-application` skill is authoritative for SQL Apps setup, project boundaries, data and identity behavior, authorization, local startup, and functional acceptance; route those questions there. Do not redesign the SQL Apps foundation browser or create a shared SQL Apps theme, framework, or component system.

## Design workflow

1. Inspect the intended application and its existing visual patterns before proposing changes. Understand the users, primary task, important information, and device context; ask only about missing decisions that materially affect the interface.
2. For a substantial new interface or visual redesign, present two or three app-appropriate visual directions with concise trade-offs and a recommendation. Get approval of the direction before implementation. For a small extension or refinement, follow the existing application's visual language without adding an approval step.
3. Translate the selected direction into the page composition, hierarchy, typography, color, spacing, density, and imagery appropriate to this app. Respect an existing product identity; avoid generic dashboard layouts and decoration without a purpose. Include only interaction states and controls supported by the agreed application behavior.
4. Implement within the existing project structure. Prefer existing dependencies and assets; do not add an unapproved package or fetch remote fonts or images for appearance. Keep the interface semantic, responsive, and consistent with existing patterns.
5. Preserve usability and accessibility: use clear labels, keyboard-operable controls, visible focus, sufficient contrast, and respect reduced-motion preferences when motion is present. Do not trade these for visual novelty.
6. When safe and feasible, run the project's documented preview and inspect the actual rendered interface in a browser at desktop and narrow-mobile viewports. Inspect the primary screen and relevant states reachable in the preview, such as populated, empty, loading, error, disabled, or success states. Fix meaningful layout, hierarchy, wrapping, responsive, affordance, and consistency issues, then inspect the changed render again.
7. If browser preview or a relevant state is unavailable or unsafe to reach, state the limitation and report what you did inspect. Do not claim visual or end-to-end validation based only on source inspection, a successful build, or a generated screenshot.

Report the chosen direction, significant UI decisions, viewports and states actually inspected, iterations made, and remaining visual or accessibility checks. Visual review does not replace the application skill's functional, SQL, access, or runtime validation.
