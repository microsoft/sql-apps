# Costs and growth

## Start locally

Building and running SQL Apps with a local container or Express database does
not create an Azure usage bill. You still need the required tools and downloads;
the container route also needs private-preview access unless a usable image is
cached. Choosing Azure SQL directly can incur Azure charges even when the app
runs on your computer. Docker Desktop and your chosen AI provider have their own
licensing, account, and pricing conditions.

You do not need to deploy to Azure to build, test, or keep using a local app.

## Review Azure costs when you choose to share

**You are responsible for your Azure bill.** Microsoft controls free allowances,
eligibility, regional availability and offer end dates, and can change them.
Check [Azure pricing](https://azure.microsoft.com/pricing) and Cost Management
for your subscription before relying on a service being free. Official
documentation and offer terms take precedence over this repository.

Use the maintained **Azure Cost** plugin for current regional and account-aware
price estimates, actual spend analysis, forecasts, optimization, and governance.
Use `azure-app-onboard` when comparing Azure architectures. A cost estimate is
not a quote, spending cap, deployment approval, or proof that a resource is
eligible for the Azure SQL Database free tier.

The primary personal-project target is Static Web Apps Free with managed
Functions and the Azure SQL Database free tier. It can plausibly remain at
**$0 Azure service cost** while both services remain within their current
allowances. Static Web Apps Free has no SLA. Eligibility, regional availability
and usage are account-specific, and a free allowance is not a spending cap.

Unlike architectures described as "almost free," this profile creates no
always-billable Azure service. For example, [Dan George's .NET 8 and React
architecture](https://medium.com/@dangeorge35/deploy-a-full-stack-net-8-react-app-to-azure-for-almost-free-4fedc36820d3)
adds Service Bus Basic, whose operations are billable, and runs the API on App
Service F1. SQL Apps instead uses the managed Functions included with Static
Web Apps Free and does not create Service Bus or a separate App Service plan.

The bundled resources are configured to stop rather than bill when their free
limits are exhausted. Static Web Apps Free has no bandwidth overage path, and
Azure SQL uses the free tier's `AutoPause` behavior instead of paid overage.
Quota exhaustion can therefore interrupt the site or database until the
allowance resets; $0 cost does not mean uninterrupted availability.

See Microsoft's current [Static Web Apps quotas](https://learn.microsoft.com/azure/static-web-apps/quotas)
and [Azure SQL Database free-offer FAQ](https://learn.microsoft.com/azure/azure-sql/database/free-offer-faq)
for the service limits and exhaustion behavior.

A passing live cost guard proves the deployed SKU and exhaustion settings at
that moment. It does not guarantee future Azure terms or cover resources added
or upgraded manually. GitHub Actions, custom domains, developer tools, AI
providers, and third-party services are outside the Azure resources created by
this profile and have their own terms.

`publish status` checks only the resources managed by the bundled publisher.
It does not discover unrelated resources created in the Azure portal, with
`azd`, through GitHub Actions or with Azure CLI. Budgets send alerts; they do not
stop spending. Treat the cost guard as a safety net, not a guarantee.

The publisher tags the resource group, Static Web App, SQL server and database
with `project=sql-apps`, the selected environment and
`deployment=personal-free`. Use those tags to group usage and cost data; tags
identify resources but do not impose a budget or spending cap.

The personal-free profile creates no container registry, private network,
private endpoint, private DNS or monitoring workspace. Read
[Sharing your app](sharing.md) and the
[personal-free deployment reference](../reference/personal-free-deployment.md)
before approving it. Use the Azure Cost plugin to confirm current account and
regional facts rather than treating this documentation as a quote.

## Keep the application contract

The low-cost profile makes an explicit networking trade-off: public Azure SQL
with the Azure-services firewall rule and a generated least-privilege SQL
credential. Do not describe it as private networking or managed identity.
If those controls or an SLA are requirements, select and price a production
architecture instead of quietly adding services to the personal default.

### Separately planned Container Apps candidate

When Entra-only SQL or managed identity is required and scale-to-zero is
acceptable, maintained Azure and Azure SQL skills may determine that a
Container Apps Consumption gateway/DAB topology fits. This is not a second
SQL Apps profile, a guaranteed-free route, or a spending-capped design. Confirm
current allowances and subscription-wide usage; include SQL, registry,
logging, networking, automation and notification costs in the estimate.

Replica limits constrain consumption rate, not cumulative spend. Budgets are
delayed notifications, and shutdown has latency and does not stop supporting
service charges. Use early usage monitoring where available, and exercise any
approved shutdown and manual recovery operation in a disposable deployment.
Never report these safeguards as proof of $0 cost.

Recheck the current [Container Apps billing](https://learn.microsoft.com/azure/container-apps/billing)
and [Azure budget guidance](https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets)
when planning; subscription-wide free grants and metering change. For Entra-only
SQL, verify the [Data API Builder managed identity requirements](https://learn.microsoft.com/azure/data-api-builder/quickstart/managed-identity)
for the pinned DAB version instead of assuming the authentication boundary.
