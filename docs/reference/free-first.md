# App Service-first, free-first cloud planning

Use this reference only when sharing or cloud planning is requested. Local
operation needs no Azure deployment. It is guidance for maintained Azure skills,
not another SQL Apps profile or publisher.

## Selection order

1. **App Service first.** Assess App Service Free (`F1`) for a compatible static
   frontend, web app or API. Verify runtime, OS, region, authentication and the
   complete required setup against Free capabilities and quotas. A static-only
   site needs no DAB or database. Do not force containers, sidecars, Always On
   or unsupported features into F1, or silently select a paid App Service plan.
2. **Container Apps second.** When App Service Free cannot satisfy the app or is
   declined, assess the smallest suitable ACA Consumption architecture.
   **DAB remains on ACA**, using managed identity to SQL: normally keep frontend,
   gateway and localhost-only DAB in one Container App. Required DAB therefore
   routes here rather than being removed or forced onto App Service. Do not
   split frontend and DAB across services merely to put App Service first.
3. **SWA last**, not the default for static sites. Consider it when the
   App Service and Container Apps paths are unsuitable or declined, and only when the **complete
   required setup fits Free**: hosting, API, authentication, database if needed,
   account eligibility and supporting services. Explain external build costs.
   Native SWA-to-ACA backend linking requires Standard and fails this check.
4. If none fits, keep local operation available and hand the smallest
   necessary change to maintained Azure skills for pricing and approval. Do not
   upgrade App Service or SWA, discard required DAB/managed identity, weaken access, convert the
   database engine, or add paid resources to force a fit.

Existing `personal-free` deployments remain supported without migration. That
publisher uses SWA Free, managed Functions and a SQL credential, not hosted DAB
or SQL managed identity. It is a new-deployment fallback only if those
differences meet the actual requirements. See its [deployment reference](personal-free-deployment.md).

## Cost classes and service choices

These public facts were checked on **2026-10-20**. Recheck official terms and
the selected account/region before relying on them; a copied catalog is not an
eligibility check or a price quote.

| Need | Starting choice | Class and exhaustion behavior |
| --- | --- | --- |
| Compatible static frontend, web app or API | App Service Free (`F1`) first; verify the complete setup | **Free SKU, quota-limited:** currently 60 CPU minutes per day, 1 GB RAM and 1 GB storage. No SLA; intended for development/testing, not supported for production. CPU/bandwidth exhaustion stops requests with HTTP 403 until reset; memory exhaustion can stop the app temporarily and full storage causes failed writes. Supporting services have separate costs; never automatically upgrade. |
| App Service Free unsuitable or declined; containers or required DAB | ACA Consumption second; omit unused components | **Allowance-metered:** subscription-wide monthly grants currently include 180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million external HTTP requests. Excess usage bills. Count all containers, revisions and other workloads sharing the grant. |
| Relational data | Azure SQL Database free offer, when eligible | **Stop at limit:** up to ten databases per subscription, each with 100,000 vCore-seconds, 32 GB data and 32 GB backup monthly. Use `AutoPause` at exhaustion. Paid continuation is one-way, never an automatic fallback. The subscription's first free database constrains the free-offer region. |
| Complete free web fallback | SWA Free, optionally the compatible `personal-free` publisher | **Free SKU:** current bandwidth quota is 100 GB per subscription/month with no overage path; traffic can become unavailable. No SWA SLA. Managed Functions have no SQL managed identity; linking ACA requires Standard. |
| Container images | Authorized private GHCR package when compatible | **Currently free policy:** GitHub documents Container registry image storage and bandwidth as currently free. Builds, Actions, tokens and other products have separate terms; recheck before publishing. |
| Existing document workload or explicit Cosmos requirement | Maintained Cosmos guidance | **Allowance-metered:** lifetime free tier currently includes 1,000 RU/s and 25 GB, one opted-in account per subscription, chosen at creation; not serverless. Excess storage/throughput bills. |
| Functions-specific triggers/events | Maintained Functions guidance | **Allowance-metered plus supporting costs:** required storage bills separately; always-ready Flex instances have no free grant. Do not replace a DAB server with Functions by default. |
| Existing PostgreSQL/MySQL dependency | Matching maintained Azure database skill | **Time-limited/eligibility-specific offers:** verify exact terms and expiry. Do not rewrite an existing engine to claim a durable free offer. |
| Uploads, jobs, messaging, email, AI, private networking, HA or compliance | Maintained Azure specialist | Price every required component and prefer qualifying free offers only when sufficient. Keep these capabilities outside the SQL Apps runtime. |

Free allowances are **not a spending cap**. Replica limits constrain consumption
rate, not cumulative cost. Budgets are delayed alerts, not a stop mechanism.
Unknown eligibility or missing usage permissions means **unknown**, not free.
Trials and starting credits are not durable free tiers.

Saved `zero-azure-spend` and `review-paid-costs` are **not spending consent**.
Preserve saved values; a missing preference retains the conservative
`zero-azure-spend` default. With strict zero spend, do not provision
allowance-metered ACA/Cosmos/Functions on an assumption of $0: assess compatible
App Service Free first, keep local use available or assess a fully qualifying
SWA fallback after ruling out ACA. If DAB plus managed identity
is required, that credential-based fallback does not qualify. Explain the
conflict; obtain a new explicit cost-risk decision before provisioning ACA.

## Infer proposed defaults; do not interrogate

Inspect the selected project and saved brief first. Ask only about material
ambiguity, access/data requirements, permissions or acceptance, not framework,
SKU or service preferences discoverable from the app.

- Propose the validated project tenant/subscription; otherwise propose the active
  CLI account, displaying its exact target for approval. Conflicting selections,
  organizational policy or ambiguous accounts are blockers, not implicit choices.
- Prefer the subscription's existing SQL free-offer region, then approved
  project/data residency. Otherwise propose `eastus2`, subject to service
  availability and residency review. Co-locate app and data where supported;
  never silently choose a fallback region or move existing data.
- Generate names and a dedicated resource group; propose `dev`. Never reuse an
  unrelated group automatically. Respect saved team/public requirements;
  otherwise propose one authenticated owner.
- Default to the app's system-assigned managed identity for SQL, separate from
  the schema/deployment operator.
- For App Service, propose F1 only after verifying the required runtime and
  features. Use the Azure-provided hostname and a compatible code deployment;
  do not add a registry or paid plan to make the recommendation fit. Disclose
  quota stops, idle unloading, cold starts and lack of an SLA.
- For ACA, propose zero minimum replicas, one maximum replica, one active revision and
  Azure-provided hostnames. These are exposure controls, not a bill ceiling.
- Size the gateway plus DAB from measured startup and representative requests,
  not a single-container 0.25-vCPU example. Include both containers in estimates.
- Disable persisted ACA logs by default while retaining real-time log streaming;
  disclose the loss of historical diagnostics. Do not silently create ACR,
  Log Analytics, Application Insights, private endpoints or automation.
- Prefer an already authorized private GHCR publication route. Do not publish
  public application images or change visibility without separate approval.
  Check image contents and keep secrets/state out. Registry credentials, if
  required, are separate from passwordless DAB-to-SQL access.

SWA fallback initialization still requires explicit CLI arguments. Derive
proposed values and present them together; those flags do not require a
questionnaire. Respect its supported web regions without overriding SQL
residency. Confirm the complete-free-setup check before selecting the publisher.

## Read-only preflight and approval card

Cloud preflight may inspect the approved target using current maintained Azure,
SQL and cost guidance. It must not install tools, register providers, accept
terms, create identities/groups, change firewalls or publish artifacts.

Check App Service F1 runtime/feature fit and quotas, current account offer/expiry,
free SQL availability and existing region,
shared grant usage, service quotas, policy, allowed regions, required identity
permissions, supported pinned DAB authentication and the image/build route.
Guest/personal accounts and unavailable app-registration rights need an explicit
supported path; never weaken authentication or bypass policy. A failed lookup is
a named blocker or uncertainty, not proof of eligibility.

Show one recommendation and a review card before writes:

| Field | Required evidence |
| --- | --- |
| Target | Project, tenant, subscription, environment, exact regions and names; new or reused resources. |
| Inventory | Every app/container, SQL resource, registry/build step, identity, network, logging, automation and notification dependency; include resources created implicitly by tools. |
| Cost | Class for each resource, current offer source/inspection time, actual eligibility and remaining-grant evidence, account-aware estimate and unknowns. Do not invent a numeric price. |
| Limits | Relevant quota, what happens when exhausted, cold starts, SQL resume and availability/security trade-offs. |
| Acceptance | Separate acknowledgments for provisioning/cost risk, identity/firewall changes, third-party publication/credentials and optional automated interruption. They can share one form; a general "build it" is not all four. |
| Undo | Cleanup scope, persistent data retained, export/backup option, shutdown behavior and manual recovery. Deletion needs its own approval. |
| Revision | Source hash or artifact fingerprint plus resource/configuration inputs. Re-plan and reapprove changed regions, resources, images/source, permissions or cost posture. |

Use `azure-prepare` -> `azure-validate` -> `azure-deploy` for app-specific
infrastructure, with maintained SQL identity and Azure cost guidance as needed.
Pass the app/access contract, inventory, approved defaults, free constraints,
unknowns and acceptance criteria intact. A paid addition requires an approved
delta, not a fresh generic architecture that discards these constraints.
If a specialist is missing, name it and preserve the handoff; never install it
automatically or invent an alternative publisher.

Review the complete resolved infrastructure before writes. Do not use
`az containerapp up --source` without reviewing implicit registry/logging costs.
Keep the existing publisher's exact-plan approval code and fail-closed live
guard. External Azure workflows use their own reviewed approval mechanisms:
this plugin supplies no universal command firewall or hard spending cap.

## DAB on ACA: preserve the application's boundary

Only the gateway has public ingress; DAB is reachable over localhost. The
containers share a trust boundary and scale together, not independent identities.
A separate DAB app is an exception needing its own cost/network/identity plan.

Preserve real token validation, issuer/audience, application access, gateway-chosen
DAB role, immutable owner identity and SQL session context/isolation. Do not use
caller-supplied escalation headers, email-based ownership, anonymous quickstart
permissions, authentication simulators or broad reader/writer grants as shortcuts.
Declare only approved entities, procedures and operations.

Pin DAB (the current foundation uses 2.0.12) and verify its supported
authentication provider and claim/session-context contract. Use managed identity
for DAB-to-SQL, encryption and certificate validation, with no SQL password in
the cloud DAB configuration. Grant only object-scoped permissions on approved
objects; no schema/admin privileges for the runtime. Verify the effective SQL
principal through a real connection, not just the existence of an identity.

Managed identity does not make SQL networking private. Disclose a public SQL
endpoint and any `0.0.0.0` rule, which admits Azure connection attempts from
outside the subscription. Firewall or identity changes need acceptance.

## Idle, resume and live acceptance

SQL serverless idle auto-pause requires **no sessions** and no user-workload CPU
throughout the delay; General Purpose's documented minimum is 15 minutes.
ACA scale-to-zero alone does not prove this. Use database-free platform
liveness probes; avoid SQL keep-warm polling and verify pinned DAB pool/health
behavior. Deliberate database-backed readiness and domain acceptance still matter.

Measure ACA cold start plus SQL resume against the gateway's real timeouts.
Show truthful waking/error feedback and retain unsaved input. Use bounded,
supported retries; never automatically retry non-idempotent mutations.
If idle/resume does not work, disclose the blocker and hand it to maintained
Azure/SQL guidance rather than speculatively changing the foundation runtime.

In a separately approved disposable canary, verify:

1. Effective SQL managed identity and only the approved object-scoped grants.
2. Anonymous/unassigned denial, intended owner/member access and cross-owner
   isolation, rejection of role-header escalation, and no public DAB.
3. Real-browser save/fresh-document reload, visible rejected-save feedback with
   input retained, and independent SQL persistence; use synthetic records only.
4. SQL actually auto-pauses while idle, followed by a resumed real workflow.
5. Actual resource settings and supporting costs; usage data can lag.
6. Any separately approved alerts/shutdown: correct scope, failure notification,
   persistent data preservation and manual recovery. Setting minimum replicas to
   zero is not shutdown. Automation/notifications can cost money and are optional.

Use the validation skill's independent verdicts and report cost safeguards as
configured, exercised, partial or blocked. A build, loader check, template
deployment or health endpoint does not prove model behavior or live acceptance.
For App Service, separately verify the actual F1 plan, runtime and required auth,
real-browser behavior, any SQL identity/grants and persistence, quota/error
feedback and cold-start behavior. No live App Service acceptance is implied
by placing it first. Until observed, these hosting recipes are researched
candidates, not live-certified bundled deployments.

## Sources and inspiration

The guided defaults, creation card and resumable free-tier experience draw
inspiration from [mhyon/azurefree](https://github.com/mhyon/azurefree).
This reference independently verifies terms; it does not import that plugin,
its Claude-specific hooks, or its fail-open shell-pattern guard.

- [ACA billing](https://learn.microsoft.com/azure/container-apps/billing), [logging options](https://learn.microsoft.com/azure/container-apps/log-options) and [managed identities](https://learn.microsoft.com/azure/container-apps/managed-identity).
- [App Service plans](https://learn.microsoft.com/azure/app-service/overview-hosting-plans), [Free plan limits and production restriction](https://azure.microsoft.com/pricing/details/app-service/linux/) and [quota enforcement](https://learn.microsoft.com/azure/app-service/web-sites-monitor).
- [Azure SQL free offer](https://learn.microsoft.com/azure/azure-sql/database/free-offer?view=azuresql-db) and [serverless auto-pause/resume](https://learn.microsoft.com/azure/azure-sql/database/serverless-tier-auto-pause-resume?view=azuresql-db).
- [DAB managed identity](https://learn.microsoft.com/azure/data-api-builder/quickstart/authentication-managed-identity): demonstrates the SQL identity hop, not a complete free/authorized topology; samples include anonymous APIs and supporting resources.
- [SWA quotas](https://learn.microsoft.com/azure/static-web-apps/quotas) and [Standard-only ACA integration](https://learn.microsoft.com/azure/static-web-apps/apis-container-apps).
- [Cosmos free tier](https://learn.microsoft.com/azure/cosmos-db/free-tier), [Functions consumption costs](https://learn.microsoft.com/azure/azure-functions/functions-consumption-costs), [budget limitations](https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets) and [GitHub Packages/Container registry billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages).
