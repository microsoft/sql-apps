# Sharing your app

Before moving a local app online, decide **who should use it** and **what information it contains**. A public URL is not access control.

## App Service, then Container Apps

Assess App Service Free (`F1`) first for compatible static frontends, web apps
and APIs. Verify runtime, OS, region, quotas and required authentication.
F1 is for development/testing, has no SLA and can stop requests at quota limits;
never upgrade to a paid plan silently.

If Free is unsuitable or declined, assess Container Apps Consumption second.
Keep required DAB on ACA with managed identity to the Azure SQL free offer,
normally with frontend/gateway and localhost-only DAB in one app. Do not remove
DAB or split hosting merely to put App Service first. A static-only site needs
no DAB or database.

Use the [App Service-first, free-first reference](../reference/free-first.md) to
infer reasonable proposed defaults and show one review card. Ask only about
material ambiguity, requirements and consent, not every infrastructure flag.
Maintained Azure preparation, validation and deployment skills own this
app-specific infrastructure; it is not a bundled SQL Apps deployment.

ACA can remain inside free allowances for light use, but its subscription-wide
grants are not a spending cap: overage and supporting resources can bill.
Explicit cost-risk acceptance is required before provisioning. A strict-zero
preference keeps local use available; it does not authorize metered services.

## SWA only as a free fallback

Consider a new Static Web Apps deployment last, only when App Service and ACA are
unsuitable or declined and the **complete required setup fits Free**. Do not
drop DAB, managed identity or access requirements to make it fit. SWA's native
ACA backend integration requires Standard and fails this test.

Existing `personal-free` deployments remain supported without automatic
migration. For a compatible, explicitly selected free fallback, this publisher uses:

- Azure Static Web Apps **Free** for the site and managed Functions API;
- the Azure SQL Database free tier;
- explicitly invited Static Web Apps `owner` and, for a team, `member` roles (up to 25 invited people); and
- a generated, least-privilege SQL login held in application settings and protected local deployment state.

This is a personal-project tier with **no Static Web Apps SLA**. It can plausibly remain at **$0 Azure service cost** only while both services remain within their current free allowances. Eligibility and consumption are account-specific; free allowances are not a spending cap or availability promise.

**Not production-ready as-is.** The free SQL database can pause when idle or
when its monthly allowance runs out. Review security, compliance and
data-protection requirements before storing real or regulated data. Invitation
providers you choose (Microsoft Entra ID, GitHub or Google) have their own terms.
Service limits and regional availability can change; official documentation and
offer terms take precedence over this guide.

The trade-off for the low fixed cost is deliberate: Azure SQL has a public endpoint, and its `0.0.0.0` firewall rule admits connections from Azure resources outside your subscription. SQL authentication remains enabled because Static Web Apps managed Functions do not provide the application a managed identity. Stored-procedure allowlisting, object-scoped grants, invited roles, encryption, and certificate validation limit the resulting access, but do not turn this into an enterprise private-network architecture.

Use the [personal-free deployment reference](../reference/personal-free-deployment.md). The workflow is read-only until `deploy --approve` receives the approval code from the current plan.
Before `init`, infer proposed subscription, supported web/data regions,
dedicated resource group, environment and sharing values from validated context
and the brief; display them for approval rather than asking a question per flag.
Respect residency and the subscription's existing free SQL region. Pass every
required argument explicitly; an existing group is never reused silently.
`plan` then prints a creation card listing each
resource's region, cost posture and undo command.
Deployment applies `project=sql-apps`, the selected environment and
`deployment=personal-free` tags to the resource group and each taggable
application resource so usage and cost views can group this project.

## Choose the right path

| Need | Path |
| --- | --- |
| Compatible static frontend, web app or API | Assess App Service Free first; verify full feature/quota fit and omit unneeded SQL/DAB |
| App Service Free unsuitable or declined; containers or required DAB, possible charges accepted | Container Apps Consumption second; keep required gateway/DAB and managed identity, planned with maintained Azure/SQL skills |
| App Service and ACA unsuitable or declined; complete setup fits Free and accepts credential-based SQL if needed | SWA last as a qualifying fallback; the compatible `personal-free` publisher supports up to 25 invited owner/member users |
| Existing personal-free deployment | Keep the publisher and its live guard; no automatic migration |
| No cloud deployment | Keep using the local application |
| Enterprise SLA, private networking, organizational controls, or managed identity without accepting the conditions above | Plan a production architecture with maintained Azure and Azure SQL skills |
Do not choose the Container Apps candidate when a guaranteed $0 bill, continuous availability, no cold starts/SQL resume delay, required hosting/networking prohibited by policy, or required permissions are unavailable. A blocked ACA path does not automatically qualify SWA. Verify current DAB authentication support, service availability, subscription-wide allowance usage and Azure SQL Database free-tier availability before provisioning. The project ships no second cloud topology and does not provide a second deployer. Use maintained Azure preparation, validation and deployment skills to design, own and validate the container architecture.

### Plan a separate architecture

For the Container Apps candidate, prefer one Consumption Container App with gateway and DAB containers: only the gateway has public ingress, and DAB is reachable over localhost. Pin the DAB image and verify a supported private-boundary authentication mode. They share a trust boundary and scale/shut down together; do not claim independent managed identities. A separate internal DAB app is an exception that needs its own network, identity, cost and shutdown plan.

The gateway must validate issuer, audience and application access, then select a permitted DAB role from validated identity—not caller-supplied escalation headers. Declare only approved entities, operations and procedures. Use managed identity for Entra-only SQL with object-scoped permissions; verify the effective database identity over a real connection. Confirm that intended household or per-user access is preserved, and that the operator is actually an authorized app user.

Before provisioning, inspect the existing app and SQL/DAB contracts; confirm tenant, subscription, region, resource group, policy, quotas, service availability and identity permissions. Select registry, logging, networking and shutdown services; estimate all costs and record an exact resource inventory. Obtain separate explicit approval for provisioning/spend, identity changes and automated interruption. Never bypass policy with exemptions or weakened authentication.

Acceptance is more than a successful deployment: verify effective managed identity and least privilege, anonymous/unassigned denial and authorized access, rejection of role-header escalation, no public DAB access, real-browser CRUD and failed-save retention, independent SQL persistence, scale-from-zero and SQL resume. Setting minimum replicas to zero is not shutdown. Exercise the selected supported shutdown operation, alerts, shutdown of all approved app components, failure notification, data preservation and manual recovery in a disposable deployment before claiming those safeguards work. Report **implemented/built**, **running/deployed**, **functional acceptance**, **design acceptance**, and **cost safeguards** separately. State whether live Azure and shutdown tests actually ran.

Container Apps allowances are shared across a subscription and may already be consumed by other workloads. Zero minimum replicas, replica/resource limits, budgets and automated shutdown reduce exposure but do not cap spending or prevent all charges. Registry, logging, networking, automation, notifications and SQL can continue to cost money. Protective shutdown can interrupt service; it must preserve the database and other persistent state, and recovery requires manual approval. The required disclosure is: this may remain within free allowances at low usage, but shared usage, delayed metering, shutdown latency and supporting services can result in charges. See [Costs and growth](costs.md) and the cloud-preview skill for the maintained workflow and evidence requirements.

## Acceptance after deployment

Deployment success is not application acceptance. Verify separately:

1. anonymous and signed-in uninvited users cannot call domain APIs, and members cannot call owner-only routes;
2. each invited owner and member can sign in and use the operations meant for them;
3. a browser write persists to SQL and remains after reload;
4. the readiness endpoint reports healthy;
5. current Azure usage still fits the intended allowances.

Do not put sensitive data in a deployment that has not passed these checks.
