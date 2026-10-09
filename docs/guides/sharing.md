# Sharing your app

Before moving a local app online, decide **who should use it** and **what information it contains**. A public URL is not a substitute for access control.

## Choose the right path

| You want to... | Current option |
| --- | --- |
| Keep using the app on your computer | Stay local. No cloud deployment is needed. |
| Let people try a public app with synthetic data | The minimal public-demo workflow is still in development. Local reference testing, image assembly, diagnostics and templates exist, but there is no completed guided deployment command. |
| Share an authenticated app with real users | The full Azure deployment commands are available. They require Entra setup, paid infrastructure and a privately connected SQL deployment runner. |

Do not put real or sensitive information in the anonymous synthetic-data reference.

## Review costs first

Read [Costs and growth](costs.md). The goal is free-tier-first, but the current templates include recurring charges. A cost review is a decision step, not permission to spend or deploy.

For a public-demo cost review after building:

```powershell
npm run azure -- demo-cost azure-demo-cost.example.json
```

The zero-spend example reports known fixed-charge blockers and exits 2. This is expected; it does not create resources. See the [cost command reference](../reference/demo-cost.md) to interpret its output.

## Prepare an authenticated deployment

If this is the path you need, follow the [deployment reference](../reference/deployment.md). You will review your Azure target, identities, images, networking, schema and costs before creating resources.

After deployment, test sign-in, each user's access, saved data, file behavior and recovery in that environment. Local tests and template compilation do not prove those cloud behaviors.

For the evolving minimal public-demo path, use [public-demo preparation](../reference/demo-deployment.md). It is a technical reference, not a shortcut around the incomplete deployment workflow.
