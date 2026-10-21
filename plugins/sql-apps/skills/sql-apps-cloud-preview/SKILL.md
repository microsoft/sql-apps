---
name: sql-apps-cloud-preview
description: "Use when a user wants to publish, share, deploy, price, or assess cloud readiness for a SQL Apps project, especially a small private or personal project."
---

# Publish SQL Apps

Sharing is optional: **App Service first**, **Container Apps second**, **SWA last**
only for a complete-free-setup fallback. Follow `docs/reference/free-first.md`.

Resolve/quote `../../scripts/sql-apps.mjs` from this skill, not cwd. `home`
selects the app containing input `docs/...`. Run `workspace-check` before edits.
Missing reference/specialist: name the blocker; never invent guidance or auto-install.

## Azure Skills handoff

`azure@azure-skills` from `microsoft/azure-skills` owns Azure infrastructure.
Follow `docs/reference/plugins.md#azure-workflow-routing`:

- Readiness-only: `azure-app-onboard-prereq`; no deployment.
- Requested non-azd onboarding: `azure-app-onboard`, preserving the existing app.
- Explicit azd or existing `azure.yaml`: `azure-prepare` -> `azure-validate` ->
  `azure-deploy`; require their approved plan and successful validation.

Assessment/pricing never authorizes deployment.

## App Service-first planning

Infer from validated context/brief; show one review card. Ask only about
consequential ambiguity/consent, never infrastructure flags. Preserve deployments/access.

Verify App Service Free (`F1`) runtime, OS, region, quotas and auth. Disclose
development/testing limits, quota stops and no SLA; never silently upgrade.
If unsuitable/declined, assess ACA. DAB stays on ACA; never remove it or split
services for priority.

Container Apps Consumption pairs frontend/gateway with localhost-only DAB and
SQL managed identity: a candidate, not a bundled profile. Preserve required
DAB, managed identity, immutable ownership and object-scoped grants. Verify pinned
DAB authentication, policy, eligibility, shared allowances and supporting costs.

SWA is a fallback only when the complete required setup fits Free. Never upgrade
to Standard or weaken access/identity. With `zero-azure-spend`, never assume metered
ACA costs $0; assess compatible App Service Free, local use or a qualifying fallback.
Preferences are not spending consent. Guaranteed $0/continuous availability or
policy can block cloud.

Review resources before writes; obtain separate
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

Run regressions for foundation publisher changes. Use `sql-apps-validation`'s
four-verdict report; disclose unverified implementation or live canary checks.
Report live Azure validation and cost safeguards: configured, exercised,
partial or blocked.
Estimates/settings/builds/loaders never prove guaranteed free, private networking
or live certification.
