---
name: sql-apps-cloud-preview
description: "Use when a user wants to publish, share, deploy, price, or assess cloud readiness for a SQL Apps project, especially a small private or personal project."
---

# Publish SQL Apps

Sharing is optional: **App Service first**, **Container Apps second**, **SWA last**
as a qualifying free fallback. Omit unnecessary DAB/SQL. Follow
`docs/reference/free-first.md` for defaults, approvals and acceptance.

Resolve `../../scripts/sql-apps.mjs` relative to this skill, not cwd. Quote its
absolute path; `home` selects the project containing input `docs/...`.
Run `workspace-check` before changes. Missing reference/specialist: name the
blocker; never invent guidance or install companions automatically.

## App Service-first planning

Infer settings from validated context/brief; present one recommendation/review
card. Ask only about ambiguity, requirements or consent, not infrastructure flags.
Preserve deployments/access rules.

Verify App Service Free (`F1`) runtime, OS, region, quotas and auth. Disclose
development/testing limits, quota stops and no SLA; never silently upgrade.
If unsuitable/declined, assess ACA. DAB stays on ACA; do not remove it or split
services merely for priority.

Container Apps Consumption pairs frontend/gateway with localhost-only DAB and
SQL managed identity: a candidate, not a bundled profile. Preserve required
DAB, managed identity, immutable ownership and object-scoped grants. Verify pinned
DAB authentication, policy, eligibility, shared allowances and supporting costs.

SWA is a fallback only when the complete required setup fits Free. Never upgrade
to Standard or weaken access/identity. With `zero-azure-spend`, never assume metered
ACA costs $0; assess compatible App Service Free, local use or a qualifying fallback.
Preferences are not spending consent. Guaranteed $0/continuous availability or
policy can block cloud.

Hand infrastructure to `azure-prepare` -> `azure-validate` -> `azure-deploy`,
never another publisher. Review all resources before writes; obtain separate
explicit approval for provisioning/cost risk, identity/firewall changes,
publication and optional interruption. Re-plan changed inputs/paid additions;
obtain fresh acceptance.
Budgets are not spending caps. Verify idle SQL pause, resume and approved
shutdown/manual recovery disposably, keeping data.

## Personal-free fallback

`personal-free` remains the only bundled cloud profile: **Static Web Apps Free +
managed Functions + Azure SQL Database free tier**. **No Static Web Apps SLA**;
**potentially $0 within current allowances**. Existing deployments are supported;
new ones must pass the complete-free-setup check, accepting SQL credentials.

1. **Confirm the API contract.** `personal-free-api.json` allowlists every route,
   procedure, parameter and sign-in provider. Teams declare member routes,
   including readiness; procedures read `SESSION_CONTEXT(N'role')`.
2. **Initialize local configuration.** Infer/review subscription, supported web/data
   regions, resource group, environment and sharing; pass required flags to
   `npm run publish -- init`. Never silently reuse/move data.
3. **Plan.** Show the `npm run publish -- plan` creation card verbatim.
4. **Approve.** Azure writes require explicit approval using that exact plan's code.
5. **Deploy.** `npm run publish -- deploy --approve <code>` applies
   `project=sql-apps`, environment and `deployment=personal-free` tags, verifies
   free settings and publishes the application.
6. **Invite/verify.** Up to 25 owner/member invitees; `npm run publish -- status`
   must report `Cost guard: verified`. Test authorized/denied users, browser
   save/reload and SQL persistence; deployment is not acceptance.

The fallback guard fails closed unless Free SKU and SQL free-tier/AutoPause
settings are proven. SQL is public; `0.0.0.0` admits Azure resources outside this
subscription. Generated credentials stay in settings/protected state. Grants:
`CONNECT`, `EXECUTE`, `VIEW DEFINITION` on declared procedures. Ownership uses
provider plus immutable user ID, never email. The guard excludes other resources.

## Evidence

For foundation publisher changes, run regressions; routine publishing need not.
Disclose unverified implementation or live canary checks.
Use `sql-apps-validation`'s four-verdict report. Report live Azure validation and
cost safeguards: configured, exercised, partial or blocked.
Estimates/settings/builds/loaders never prove guaranteed free, private networking
or live certification.
