---
name: sql-apps-design
description: "Use when building or changing SQL Apps screens, or reviewing a generic interface, unclear hierarchy, or responsive layout."
---

# Design for the app

Own the design pass in the app's existing stack; no companion skill is required. Separate functional acceptance, agent usability review and user visual-direction approval.

## Choose a direction

- Reuse the brief, styles and preferences. Name audience, recurring task, first-read information and recognizable visual ambition.
- Compare two distinct visual directions for new identities: concrete references or domain cues, typography, proportions, materials and composition, not palette swaps or rearrangements alone. Starter CSS is not design direction.
- Briefly note the choice in `docs/design-intent.md`; no exact headings or extra approval ceremony. Ask only about unresolved consequential choices.

## Make the purpose visible

- Lead with defining information and recurring action; keep account, setup, and administration secondary. Typography, spacing, color, and layout reinforce hierarchy and character.
- Give each surface one clear primary action; keep secondary and destructive actions distinct. Compose empty, single-record, and populated states.
- Preserve readable line lengths, wrapping long content, contrast, visible keyboard focus, semantic structure and accessible labels.
- Show truthful signed-out, authorized, no-access, loading, empty, error, saving, success and disabled states. Keep test-persona selection off product screens; status uses text or iconography, never color alone.

## Review

The first implementation is a candidate, not an approved design.

1. **Checkpoint.** Render one representative primary-task screen at desktop and narrow widths together, at the intended origin. Source review and compilation are not visual review.
2. **Critique.** Is the ambition visible? What dominates the first viewport? Where is defining information? What belongs to an unrelated app or should be removed or demoted? Rank up to three highest-impact changes: visible problem, task consequence and concrete change.
3. **Fix observed problems and re-review.** Batch changes, re-render. Unresolved findings, not a loop count, drive passes.
4. **Expand** to remaining states after the representative slice works and conveys the ambition.

Reuse authorized native browser/preview sessions; skip backend checks for visual-only edits. In `docs/design-review.md`, record build/render, findings, changes, tradeoffs and attributed feedback. Flexible prose suffices; matrix is optional. `sql-apps check` cannot approve aesthetics. Coverage is not quality. Agent assessment is not user approval; absent explicit feedback, report visual approval pending.

`sql-apps-application` is authoritative. Visual approval does not authorize schema, identity, data, or startup changes.