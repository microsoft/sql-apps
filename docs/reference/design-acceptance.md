# Design review and visual approval

Keep three judgments separate:

- **Functional acceptance:** observed behavior, access rules and persistence.
- **Usability review:** the agent's rendered observations, defects and tradeoffs.
- **Visual-direction approval:** the user's explicit feedback on the presented
  direction. An agent cannot give this approval on the user's behalf.

Creation scaffolds files; setup assesses lifecycle readiness. Neither judges
domain evidence or aesthetics. Passing `sql-apps check` is not design approval.

## Start with visual ambition

Use `sql-apps-design` in the app's existing stack; no companion skill is required.
Reuse the brief, known preferences and established styles. For a new identity,
compare two meaningfully different visual directions, not just functional
arrangements or palette swaps. Name concrete references or domain cues and show
how they affect typography, proportions, materials, composition and interaction.
Choose for recognizable character as well as task fit.

For example, a cafe could contrast compact receipt-inspired counter tickets
with a spacious editorial menu board. "Warm background and green buttons" is
not an identity. Nor does removing a confusing headline establish character.
Do not force either concept, an external asset or a new package on another app.

Keep a short `docs/design-intent.md` note: audience, recurring task, first-read
information, visual ambition, alternatives and choice. Explain how the direction
will work at desktop and narrow widths. Prose or bullets suffice; **no exact
headings, comparison fields or capability declaration are required**.

Do not repeatedly reconfirm an established direction or shared workflow.
Ask about unresolved consequential choices, not every implementation detail.
Product decisions do not grant startup, database, installation or cloud consent;
reuse only recorded grants matching the current effects.

## Render early, then expand

Follow **brief -> visual direction -> representative screen -> render ->
critique -> improve -> re-render -> remaining states**.

Build one useful slice, not the entire state matrix first. Render its primary
screen at desktop and narrow widths while the direction is cheap to change.
Discover browser capabilities first: opening a preview does not guarantee an
inspection/action tool can acquire its required handle. Use supported authorized
alternatives, never guessed handles or unapproved tooling installs.

Critique both character and usability. Does the intended visual ambition survive
the render? What dominates the first viewport? Where is defining information?
What could belong unchanged to an unrelated app? What should be removed or
demoted? Rank up to three changes by visible problem, task consequence and
concrete improvement. Fix in a batch and re-render affected views; unresolved
findings, not a loop count, drive further passes.

Preserve access boundaries and truthful states throughout. After the slice
works and the direction is credible, review reachable account/access, loading,
empty, single-record, populated, saving, error, success and disabled states,
including role differences. Do not rerun unrelated backend acceptance for
visual-only edits.

## Keep evidence concise and attributed

In `docs/design-review.md`, briefly record the origin, source/build, viewport,
state and artifact or actual interaction; visible findings, changes and
re-review; remaining defects/tradeoffs; and who made each judgment. For example:

```markdown
Build abc123 at http://127.0.0.1:30000; single-order screen, desktop and narrow.
Agent observation: receipt numbers and the next counter action lead at both
widths. Removed summary tiles and re-rendered. Narrow ticket spacing still
needs work. User visual feedback: pending; no direction approval received.
```

Use flexible prose; renaming "Top changes" to "Top changes, first pass" must not
change any result. Report user feedback separately from directly observed
evidence. Missing tools mean unobserved evidence, not a passing review.

An optional coverage table can help with many states:

```markdown
| State | Desktop | Narrow |
| --- | --- | --- |
| empty | observed | observed |
| populated | fixed+re-reviewed | observed |
| error | blocked: service unavailable | |
| role: AppUser | observed | n/a: same presentation |
```

The checker recognizes this `State | Desktop | Narrow` table and summarizes
signed-out, no-access, first-run, empty, single-record, populated, saving, error,
success, disabled and the configured `requiredRole`. An empty cell is unreviewed;
`blocked: <reason>` and `n/a: <reason>` are explicit, not observations.
Duplicate rows, malformed rows and unsupported statuses in summarized cells fail
rather than silently inflating coverage. Other prose and tables are not a schema.

Coverage is not quality: "22 cells reviewed" says nothing about whether the
design is good. The checker reports document presence and optional coverage,
not verified observations, usability quality or user approval:

```text
Rendered coverage: complete (22 reviewed cells).
Design evidence: intent recorded; review recorded (content not validated).
Visual direction approval: not assessed by this check; report user feedback separately from agent assessment.
```

Without a matrix, coverage is not summarized. Missing/empty notes are reported
as missing; their presence alone proves nothing. Exact headings, an authored
"accepted" verdict or a complete matrix cannot certify aesthetics.

## Final report

Report four independent lines:

1. **Implemented/built:** exact source/build checks and results.
2. **Running:** intended origin and current readiness evidence.
3. **Functional acceptance:** accepted, partial or blocked, with browser/API/SQL
   evidence, including fresh-document reload and retained failed-save input.
4. **Design review:** rendered coverage, agent usability assessment and unresolved
   defects/tradeoffs; separately state **user visual-direction approval**:
   approved with attributed explicit feedback, pending, or changes requested.

Pending visual approval is not a new setup blocker or mandatory approval
ceremony. Continue authorized work; do not imply the user's aesthetic
expectations have been met. When the user has already chosen a direction,
attribute that choice and distinguish it from approval of the rendered result.
