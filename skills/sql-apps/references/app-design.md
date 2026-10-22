# App design: aligned with Rayfin, independent of its runtime

Use this guidance for new UI and material visual changes. It summarizes transferable principles from Rayfin's app-design and CRUD guidance; it does not vendor its component kits or require its hooks, SDK, authentication gate, or Fabric services.

## Decide the visual direction first

Record a short visual direction in the app brief: intended audience, tone, typography, and one distinguishing detail. Make the layout serve the primary workflow rather than defaulting to identical dashboard cards. Build a runnable shell early, but show honest loading states until real data is integrated.

## Shared technology conventions

- React with Vite and TypeScript.
- Tailwind CSS v4 with semantic CSS custom-property tokens in `packages/frontend/src/global.css`. Define colors, typography, spacing, radii, and focus styles there before styling screens.
- Radix primitives for complex interactive controls such as dialogs, menus, and tabs; ordinary semantic HTML for simple controls. Use only the primitives needed by the app.
- Lucide React for UI icons. Decorative icons are hidden from assistive technology; icon-only actions have accessible names.
- A small `cn()` helper using `clsx` and `tailwind-merge` for conditional classes. Verify token-based size/color utilities do not conflict when merged.
- Vitest and React Testing Library for relevant UI behavior. Use the host's existing browser tooling for real workflow checks; do not add a separate runner merely to match a template.

Select current mutually compatible stable versions through normal package tooling, not copied alpha versions from a Rayfin template. Do not import `@microsoft/rayfin-*` or copy Rayfin's build hooks. These libraries are generated-app dependencies, not dependencies of this plugin. Preserve an existing app's tooling unless a change is explicitly in scope.

## Consistent, accessible screens

- Keep surfaces, text, borders, controls, and status colors on semantic tokens. Use a consistent spacing/type scale; avoid repeated hard-coded component values.
- Choose readable typography with a clear hierarchy. Prefer system or locally bundled licensed fonts; external font services require an explicit privacy/network decision. Do not make offline development depend on a CDN.
- Support light and dark tokens, honoring the user's system preference with a usable override. Check contrast and focus visibility in both modes.
- Use mobile-first layouts, readable content widths on wide screens, and an intentional density for tables and toolbars. Align mixed controls; avoid document-level horizontal overflow.
- Give inputs visible labels, useful validation, and consistent typography/heights. Ensure keyboard operation, logical focus order, and focus return after dialogs close. Respect reduced-motion preferences.
- Aim for WCAG 2.2 AA; report what was tested rather than claiming certification.

## Honest data and mutation states

Implement loading, empty, error, saving, success, and permission-denied states. Treat authorization/configuration failures as errors, not endless loading or empty-success results. Sanitize errors while preserving an actionable explanation.

Validate against DAB permissions and SQL-enforced rules, not an assumed Express CRUD layer. Keep form values on failure, prevent duplicate submissions, and identify destructive targets in confirmation prompts. Use optimistic UI only with rollback and explicit failure handling. A fulfilled wrapper promise is not proof of a successful save; honor the operation's actual success contract. Show actionable unavailable/quota-exhausted states when a free PoC sleeps or reaches its limits; never silently upgrade resources.

## Review the rendered result

Exercise the primary workflow through real DAB requests backed by SQL; inspect desktop and narrow widths, keyboard interaction, both themes, empty/error states, and dense repeated elements. Build/type-check without suppressing TypeScript errors. Keep the app's design direction and relevant checks in the brief/run documentation, not another design-management system.

## Upstream reference

Reviewed Rayfin revision `0979439a7a0806abd0ee48c2619b37f297ae1324` on 2026-10-21:

- [App design](https://github.com/microsoft/rayfin/blob/0979439a7a0806abd0ee48c2619b37f297ae1324/samples/universal-app/template/.agents/skills/app-design/SKILL.md)
- [UI style recipes](https://github.com/microsoft/rayfin/blob/0979439a7a0806abd0ee48c2619b37f297ae1324/samples/universal-app/template/.agents/skills/app-design/references/ui-style-recipes.md)
- [CRUD UI](https://github.com/microsoft/rayfin/blob/0979439a7a0806abd0ee48c2619b37f297ae1324/samples/universal-app/template/.agents/skills/crud-ui/SKILL.md)

Deliberate differences: no Rayfin-specific auth/theme hooks, SDK clients, mandatory CDN fonts, or copied component kit. Revisit version-matched upstream guidance during an actual migration.
