# Costs and growth

## Start locally

Building and running SQL Apps with a local container or Express database does
not create an Azure usage bill. You still need the required tools and downloads;
the container route also needs private-preview access unless a usable image is
cached. Choosing Azure SQL directly can incur Azure charges even when the app
runs on your computer. Docker Desktop and your chosen AI provider have their own
licensing, account, and pricing conditions.

You do not need to deploy to Azure to build, test, or keep using a local app.

## App Service first when you choose to share

**You are responsible for your Azure bill.** Microsoft controls free allowances,
eligibility, regional availability and offer end dates, and can change them.
Official documentation and offer terms take precedence over this repository.

Assess **App Service Free (`F1`) first**, **Container Apps Consumption second**,
then **SWA Free as the last fallback**. Verify that the complete required setup
fits each option rather than silently selecting a paid App Service plan.
F1 is quota-limited, intended for development/testing and has no SLA; CPU or
bandwidth exhaustion stops requests until reset. Supporting services can bill.

Keep required DAB on ACA with managed identity to SQL, normally alongside the
web gateway/frontend in one app; do not remove DAB or split services to force
App Service first. Omit DAB/SQL for a static-only site. These are separately
planned candidates, not new bundled publishers or guaranteed-free deployments.

Use the [App Service-first, free-first reference](../reference/free-first.md) for
proposed defaults, current offer sources, the complete resource inventory and
approval boundaries. Maintained Azure skills own infrastructure preparation,
validation and deployment. Free-oriented recommendations must preserve the
application's access and data requirements.

ACA grants are shared across a subscription; usage beyond them bills.
Scale-to-zero, one maximum replica and one active revision reduce exposure,
not cumulative spend. Include all containers, overlapping revisions, SQL,
registry/builds, logging, networking, automation and notifications in the
estimate. Do not silently create ACR or a monitoring workspace. Current GHCR
container-image storage/bandwidth terms may avoid a paid registry, but builds,
publication permissions and credentials remain separate.

Use maintained **Azure Cost** guidance for current regional/account-aware
estimates, actual spend, forecasts and governance. An estimate is not a quote,
spending cap, deployment approval or proof of free-offer eligibility.
Missing permissions or delayed metering mean unknown, not zero.

`zero-azure-spend` and `review-paid-costs` are preferences, not spending consent.
The strict-zero preference cannot authorize allowance-metered ACA on an
assumption of $0. Assess compatible App Service Free first, keep local use
available or consider SWA last only if the complete required setup qualifies
for Free. Required DAB/managed identity must not be
dropped to make that fallback fit.

Before any provisioning, obtain explicit acceptance of the exact resource plan
and cost risk, with separate acknowledgments for identity/firewall changes,
third-party publication and any automated interruption. Re-plan changes to
resources, regions, images/source, permissions or cost posture.

## SWA only as a qualifying free fallback

Static Web Apps is not the default web integration. A new SWA fallback must
satisfy the **complete required setup on Free**, not just a free frontend.
Native ACA backend linking requires SWA Standard and does not qualify.
Do not silently upgrade SWA or add paid services.

The existing `personal-free` publisher remains supported for current deployments
and explicitly selected compatible fallbacks. It creates SWA Free with managed
Functions and the Azure SQL Database free tier. This can be **potentially $0**
within current account-specific allowances, with **no Static Web Apps SLA**.
It creates no always-billable Azure service, registry or monitoring workspace.

Its bundled resources stop rather than bill at their free limits: SWA Free has
no bandwidth overage path, and SQL uses `AutoPause` instead of paid continuation.
Exhaustion can interrupt the application until allowances reset; $0 does not
mean uninterrupted availability.

The trade-off is public SQL, the Azure-services `0.0.0.0` firewall rule and a
generated least-privilege SQL credential. This is not hosted DAB, passwordless
SQL access or private networking. See [sharing](sharing.md) and the
[publisher reference](../reference/personal-free-deployment.md).

`publish status` verifies only that publisher's managed resources. A passing
live guard proves the Free SKU and SQL settings at that moment, not future
terms, ACA safeguards or unrelated resources. Its tags (`project=sql-apps`,
environment and `deployment=personal-free`) group costs; they impose no cap.
Manual upgrades/additions, GitHub Actions, domains, tools, AI providers and
third parties have separate terms.

## Monitor and grow deliberately

Budgets send delayed alerts; they do not stop spending. Automated shutdown also
has latency and does not stop all supporting-service charges. It requires
separate approval and a disposable test of failure notification, data
preservation and manual recovery before it can be described as exercised.
Never describe these safeguards as guaranteed $0.

Verify real SQL idle auto-pause and scale-from-zero/resume rather than relying
on minimum-replica settings. Persistent SQL sessions and health polling can
consume the allowance while nobody uses the app.

Use [usage and growth](../reference/monitor-growth.md) to investigate observed
pressure before buying capacity. If uploads, background work, AI, private
networking, compliance or continuous availability exceed the free setup,
maintained Azure skills should explain the smallest required paid delta and
obtain fresh acceptance, not silently expand the personal default.
