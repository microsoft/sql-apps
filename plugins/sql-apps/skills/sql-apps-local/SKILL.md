---
name: sql-apps-local
description: "Use when checking SQL Apps prerequisites, selecting SQL/workspace, or starting, resuming and stopping locally."
---

# Run SQL Apps locally

Resolve `../../scripts/sql-apps.mjs` relative to this skill, not cwd. Quote its
absolute path; `home` selects the app containing `docs/...`, never the cache.
Own lifecycle, not domain acceptance.

## Plan and approve

Run `guide`, then `setup plan --json`. Only `role-based-data`: SQL, DAB, gateway.

Before restore, use the verified archive CLI or explicit `SQL_APPS_TOOLING_HOME`.
Afterward, review `setup plan` through the app's pinned package; no runtime fallback.

Present effects together; obtain approval before `setup run --approval <id>`.
Bootstrap covers restore only and stops; app-local approval covers missing local stages.
Rerun plan/run after corrections. Never manufacture a grant, bypass a blocker or
claim failure as success. Unavailable controls capture nothing; autonomy is not consent.

Keep progress in chat using `setup status`; report milestones/blockers, not waits.
Creation never starts a helper or browser.
An external browser requires an explicit request; prefer authorized native
previews at the verified app origin.

## Keep database alternatives actionable

Prefer **Azure SQL container -> Azure SQL directly -> SQL Server 2025 Express**.
Missing preview access/Docker: offer the next reviewed route; continue app work.
Endpoints need pinned host DAB and .NET/ASP.NET Core 8.0, not Docker.
Use `--sql-provider` and absolute nonsecret `--sql-target` JSON for planning and
approval. Keep saved targets sticky; never silently fail over, migrate data or
present empty/mock persistence as previous data. Diagnose unknown probes and
ownership mismatches instead of switching.

Azure: reuse an explicitly selected dev database or separately review
`setup azure-plan`/`azure-provision`: subscription/tenant, identity, exact-IP
firewall, free-only costs. Refusal never authorizes paid provisioning/publishing.
CLI installation/login remain explicit.

Express: supported Windows x64, SQL Server 2025 Express only. Inspect existing
instances; choose explicitly. Never upgrade, replace or install over
older/broken/unverified instances. Review `setup install-plan sql-express`,
including its pinned Microsoft installer and license/privacy acceptance.
`configure-express` (containment/TCP/restart) and `configure-express-auth`
(mixed-mode/restart) require separate administrator `grant-once` approvals; SA remains untouched.

## Missing tools and lifecycle

Review `setup install-plan <tool>` source, command, downloads, disk/privilege
effects. Execute unchanged only after approval. Never bootstrap
managers, overwrite versions, self-elevate, reboot, open firewalls or disable
security controls. Credentials belong in the user's terminal, never chat/source.

Run `workspace-check` before lifecycle commands. Resolve project/provenance
mismatches explicitly, never copy state.
Reuse only matching `/local/workspace` identity and `/health/ready`: checkout,
source, workspace, profile, authentication and SQL provider/target fingerprint
(or unchanged container identity). Liveness alone is insufficient.

`app` initializes SQL/DAB/gateway; `serve` reuses running dependencies; `stop`
stops only verified owned DAB. Preserve SQL data and credentials; never stop
unrelated processes. Recovery/destructive cleanup need separate approval.
Keep commands attached. Endpoint Ctrl+C stops gateway/host DAB; resume with `app`.
Container Ctrl+C leaves SQL/DAB running.
Examples require explicit selection; otherwise keep `selectedExamples: []`.

## Verify completion

Publish a launch URL only after intended ownership/readiness verification.
Use current browser workflow evidence and required rendered review via
`sql-apps-validation`; health is not acceptance.
Explain stop/resume. Simulation is not cloud authorization; publishing is optional.
