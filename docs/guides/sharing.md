# Sharing your app

Before moving a local app online, decide **who should use it** and **what information it contains**. A public URL is not a substitute for access control.

## Choose the right path

| You want to... | Current option |
| --- | --- |
| Keep using the app on your computer | Stay local. No cloud deployment is needed. |
| Let people try a public app with synthetic data | The minimal public-demo workflow is still in development. Local reference testing, image assembly, diagnostics and templates exist, but there is no completed guided deployment command. |
| Share an authenticated app with the full foundation capabilities | Full Azure commands require Entra setup, paid Functions/storage/Key Vault/private-network infrastructure and a privately connected SQL deployment runner. |
| Share a role-authorized data-only domain app | Use the [role-based-data profile](../reference/role-based-data.md): matching cost review, two-image artifacts, authorized identity/assignment and private SQL deployment. Paid infrastructure and live authorization/browser acceptance are still required. |

Do not put real or sensitive information in the anonymous synthetic-data reference.

## Review costs first

Select the agreed capability/access profile before choosing a cost command. Read [Costs and growth](costs.md). The goal is free-tier-first, but current templates include recurring charges. A cost review is a decision step, not permission to spend or deploy.

For a public-demo cost review after building:

```powershell
npm run azure -- demo-cost azure-demo-cost.example.json
```

The zero-spend example reports known fixed-charge blockers and exits 2. This is expected; it does not create resources. Its output is demo-only, not a price estimate for an authenticated app. Review the authenticated application's actual resources/prices separately; missing estimates are unknown, not zero. See the [cost command reference](../reference/demo-cost.md).

## Prepare an authenticated deployment

If this is the path you need, follow the [deployment reference](../reference/deployment.md). You will review your Azure target, identities, images, networking, schema and costs before creating resources.

If the approved app excludes files/jobs, select `role-based-data` rather than expanding to the full template or changing authorized access to an anonymous demo. Its `identity` command creates the configured human role and `role-based-assign` manages explicitly approved assignments; the foundation profile still creates `Function.Invoke`. Verify token claims and trusted DAB forwarding in the real environment.

Existing-resource discovery must not change the deployment subject. Older matching Azure resources are potential collisions and remain untouched. Keep the new checkout and its artifacts as the source unless reuse is explicitly requested and separately reviewed. Preparation is not permission to create, modify or delete resources.

After an approved deployment, test sign-in, each user's access, saved data, selected capabilities and recovery in that environment. Local tests and template compilation do not prove those cloud behaviors.

For the evolving minimal public-demo path, use [public-demo preparation](../reference/demo-deployment.md). It is a technical reference, not a shortcut around the incomplete deployment workflow.
