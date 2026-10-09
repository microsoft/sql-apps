# Costs and growth

## Start locally

Running SQL Apps on your computer does not create an Azure usage bill. You still need the required tools, downloads and SQL private-preview access. Docker Desktop and your chosen AI provider have their own licensing, account and pricing conditions.

You do not need to deploy to Azure to build, test or keep using a local app.

When adding capabilities, consider their future costs without choosing cloud infrastructure yet. Files need storage, background work needs compute, and AI calls can add usage charges. Do the detailed pricing review when you decide to share, not before you have a useful local app.

## Understand free tier before sharing

**Free tier means recurring monthly allowances, not a time-bound trial.** Allowances have limits and eligibility requirements; they are not unlimited hosting.

Azure SQL and Container Apps have free allowances, but the current demo templates also use a paid container registry and managed networking. Scaling the app to zero does not remove those charges. The authenticated deployment uses additional paid services.

If zero Azure spending is a requirement, stay local until you have reviewed a hosting design that meets it. SQL Apps does not currently provide a guaranteed zero-cost deployment.

Before creating resources, review the target region, subscription eligibility, fixed charges, expected usage and cleanup plan. The [offline demo cost command](../reference/demo-cost.md) identifies known charges without contacting Azure; it is not a price quote or a spending cap.

## What happens when an allowance runs out?

The free-tier SQL configuration pauses at its monthly limit rather than automatically switching to paid usage. That can make the app unavailable until the next calendar month. Idle pause and resume can also introduce delays.

Other Azure resources may charge for usage beyond their allowances. Budget alerts notify you; they do not stop spending. Review actual subscription-wide usage, not just visitor counts.

## Grow when the app needs it

Start with visibility, not an upgrade. After sharing an app on Azure SQL, you can use **Database Hub in Microsoft Fabric (preview)** to monitor it in place. The experience is available with a Fabric Free license; no Fabric capacity or separate Database Hub license is required to get started, and enabling its SQL performance monitoring has no extra cost. Your Azure resources still have their normal charges.

Follow [Monitor usage and decide when to grow](../reference/monitor-growth.md) to connect your database, check free-tier headroom, and investigate resource pressure with read-only SQL queries.

1. **Observe:** check remaining SQL free allowance, performance during a real app action, and subscription-wide costs.
2. **Improve:** investigate expensive queries, repeated polling or background work before adding capacity.
3. **Decide:** consider paid capacity when measured limits, unacceptable delays or availability/recovery needs justify it.
4. **Verify:** repeat the same app action after an approved change and compare performance and cost.

Popularity is a reason to review usage, not a user-count threshold for upgrading. Public visitor-session creation has no app-level admission throttle or active-session cap; existing per-session data and mutation limits still apply. Automated traffic consumes resources too.

You choose whether and when to pay for more capacity. SQL Apps does not change billing or upgrade automatically. Monitoring is a separate opt-in setup using Database Hub or the Azure portal, not something the SQL Apps commands configure for you.

For current allowance figures, template settings and monitoring steps, use the [cost reference](../reference/demo-cost.md). For deployment choices, read [Sharing your app](sharing.md).
