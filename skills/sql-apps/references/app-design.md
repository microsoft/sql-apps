# App design

Follow the brief's UI direction; prioritize the primary workflow.

## Shared technology conventions

- Tailwind CSS v4: define semantic color, type, spacing, radius and focus tokens in `packages/frontend/src/global.css` before styling screens.
- Radix for complex controls; semantic HTML for simple ones. Import only needed primitives.
- Lucide React icons: hide decorative icons; name icon-only actions.
- Vitest/React Testing Library for UI behavior; existing host browser tools for real workflows, not another runner.

Preserve compatible existing tooling.

## Consistent, accessible screens

- Prefer system/licensed local fonts; approve external font privacy/network use.
- Support system light/dark preference and an override; check contrast/focus in both.
- Use mobile-first layouts, bounded wide content, readable tables and aligned controls; avoid page overflow.
- Label inputs; provide validation, keyboard operation, logical focus/return and reduced motion.
- Target WCAG 2.2 AA; report tested checks, not certification.

## Honest data and mutation states

Show loading, empty, error, saving, success and permission-denied states.
Sanitize errors without hiding actionable causes; auth/configuration failures are
not empty results or endless loading.

Match API permissions, SQL rules and save-success responses.
Retain failed values, prevent duplicate submissions and confirm destructive targets.
Optimistic UI needs rollback/error handling.
Show unavailable/quota states; never silently upgrade a sleeping or exhausted PoC.

## Review the rendered result

Test the SQL-backed workflow at desktop/narrow widths: keyboard, both themes,
dense content and empty/error states. Record results.

Retry capture timeout once; then mark visual review unavailable, not app unready.
DOM checks prove behavior, not visual review. Never bypass CSP/iframe restrictions.

### When SQL or identity is blocked

Use test-scoped interception or fixtures labeled **fixture-only visual review**:
rendering, not authentication, authorization or persistence. No real customer data,
shipped fake sign-in, production mock fallback or acceptance bypass.

Inspect the actual viewport: readable labels, reachable primary/destructive actions,
focus and scrolling. Compare DOM measurements if captures clip.

Record fixture views/blockers. Remove test interception before real-provider acceptance.

Design source: [Rayfin app-design](https://github.com/microsoft/rayfin/blob/0979439a7a0806abd0ee48c2619b37f297ae1324/samples/universal-app/template/.agents/skills/app-design/SKILL.md),
reviewed 2026-10-21.
