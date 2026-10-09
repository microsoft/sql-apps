# Guide command and saved brief

`guide` records agreed decisions for the **Describe -> Run locally -> Make it yours -> Share optionally** journey. It is not an application generator, startup command or live-health check.

From the intended checkout:

```powershell
npm run guide
node scripts/guide.mjs --json
```

These dependency-free commands work before build or package restore. They report source/build/workspace state, saved decisions and a suggested next action without starting services or contacting Azure.

## Save a brief

Create a JSON file with the agreed decisions, then pass its path:

```powershell
node scripts/guide.mjs --save "C:\path\project-brief.json"
```

Example input:

```json
{
  "purpose": "Track equipment loans",
  "audience": "Our equipment team",
  "records": ["Equipment", "Loans"],
  "actions": ["Register equipment", "Record a return"],
  "capabilities": ["data"],
  "nextChange": "Add a due-date field",
  "costPreference": "zero-azure-spend"
}
```

Required text fields are nonblank, at most 500 characters, without control characters. `records` and `actions` contain 1-12 unique nonblank strings. `capabilities` must include `data`; optional values are `files` and `background-jobs`. The existing file processor requires `files` with `background-jobs`.

These are scope decisions, not switches that dynamically compose services. The foundation `app` command still starts its full file/job stack; the explicitly selected Todo reference has a separate data-only startup.

Optional `costPreference` is `zero-azure-spend` or `review-paid-costs`. It is never spending consent.

## Record historical evidence

An optional checkpoint records what was actually checked:

```json
"checkpoint": {
  "stage": "run-locally",
  "summary": "Created and reloaded a loan",
  "evidence": ["Browser save/reload passed; SQL row inspected"]
}
```

Add it to the complete brief object. Stage is `describe`, `run-locally` or `make-it-yours`; summary is nonblank and evidence contains 1-12 unique descriptions under the same text limits. Cloud-completion checkpoints and unknown fields are rejected.

Saved evidence is **historical**, not current readiness. Source changes require rebuilding and verifying the actual app locally. A completed local checkpoint does not authorize installations, downloads or cloud deployment.

## Storage and failure handling

The command saves version-1 state in `.sql-apps/guide.json`, including the canonical checkout path, source fingerprint, timestamp and brief. It uses a lock and atomic replacement.

Brief/state files must be regular files at most 16 KiB. Invalid JSON, oversized input, unexpected fields, copied checkout state and symlink state are rejected explicitly rather than reset or overwritten. A concurrent writer must finish before retrying; do not automatically remove its lock.

Keep credentials and actual application records out of the brief. Preserve local state when moving or troubleshooting the checkout.

The plugin equivalents are `guide` and `guide-save "<absolute-brief-path>"`; see [runtime binding](copilot-plugin.md#runtime-binding-and-direct-checks).
