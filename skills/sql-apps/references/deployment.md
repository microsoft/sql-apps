# Deployment-shaped delivery

Provisioning is optional; architectural readiness is not. Use the existing Azure and SQL specialists, not a SQL Apps deployment engine. Local completion must be deployment-ready with reproducible packaging, while cloud acceptance requires a working deployed workflow.

## Start locally with the deployment boundary

Before building the first workflow, choose a pinned DAB version and compatible runtime, portable configuration using environment/secret references, and a supported authentication model that can work behind the intended cloud ingress. Record development-only identity adapters explicitly; never ship spoofable role/identity headers as authentication.

For an empty app, copy the versioned [application starter](../templates/starter/README.md), including its lockfile and dotfiles. Resolve the external identity contract and intended hosting/routing boundary in the initial brief; planning is not provisioning or spend approval. The starter reuses compatible packaging, SQL bootstrap, least-privilege setup, readiness and restart checks, not shop business logic or a custom identity provider. Preserve existing apps rather than overlaying the skeleton. Run its first thin vertical slice before implementing every workflow; expand SQL invariants for the actual domain.

Use the starter's [deployment recipe candidate](../templates/starter/deployment.md) as an artifact contract, not an exercised cloud recipe. Track build/unit checks, real API acceptance, browser acceptance, restart-verified local acceptance and deployed acceptance separately. Record timestamps and waits for each phase; wall time is not measured labor and time savings remain unproven.

Keep UI build output, any necessary custom-server runtime output/dependencies, the pinned DAB runtime/configuration, and SQL migrations/permissions reproducible from documented commands. Record target OS/architecture/runtime, startup commands, ports, proxy/routing, process restart/shutdown, health checks, and required environment values without secret values. Run the packaged artifacts locally, not only development servers. Do not require Azure sign-in or provisioning for this check.

Evaluate the deployed runtime artifact, not the source language. TypeScript is not evidence that F1 is incompatible: evaluate local/CI precompilation, production dependencies and publication first. Likewise, a successful build is not proof that the target supports DAB's runtime, multiple processes, authentication, quotas, or ingress. Check those separately through current specialist guidance.

## One concise deployment review

When deployment is requested, maintain one review in the brief or the owning specialist's existing plan:

| Decision | Required content |
| --- | --- |
| Target and resources | Subscription/region, isolated or shared scope, resource types/SKUs, topology, recipe revision and evidence status |
| Artifacts and security | Packaging/startup/routing, identity, SQL permissions, network/access changes, migrations and sensitive operations |
| Costs | Free offers versus allowances versus paid resources, recurring/usage estimates and assumptions, quota exhaustion and overage behavior; no guaranteed-free promise |
| Accepted decisions | Component-specific constraints and approved exceptions, including cost ceilings and scope; preserve rather than reopen unchanged choices |
| Remaining findings | Category, known evidence and conflicting sources, next safe action, owner, stopping condition and precise approval if needed |
| Acceptance | Deployed UI-to-DAB-to-SQL save/reload, direct authorization denials with allowed controls, SQL concurrency rules, restart and resource settings/attribution readback |

Implementation approval covers routine non-destructive local build/test, packaging, and inspection within the approved scope and host permissions. Keep explicit gates for cloud writes, spend changes, access changes, and destructive actions. Group related requested cloud changes into the review, but retain the owning workflow's gates. Never treat a review or a deployment request as permission to execute writes.

Carry accepted decisions into handoffs and resume. For example, an approved B1 hosting exception unlocks that specific hosting path while a SQL-free requirement remains in force. Record the hosting tier, affected resources, spending limit and SQL constraint separately; do not change the whole cost posture to unrestricted paid or ask again for the unchanged exception. Material scope/cost/security changes still need approval.

## Bounded recovery, not dead ends

Classify every finding:

| Category | Response |
| --- | --- |
| confirmed incompatibility | Cite the actual runtime/service constraint; propose a compatible artifact/topology or a narrowly scoped approval. Never weaken authorization, DAB or SQL invariants. |
| missing evidence | State what is unknown and what observation would resolve it. Perform bounded local validation or authorized read-only reconciliation; do not equate uncertainty with unsupported. |
| recoverable tooling failure | Record the operation/error and check whether a timed-out write already took effect before retrying. Allow one retry for a plausibly transient safe operation, then one alternative supported tool/API path; do not repeat discovery indefinitely. |

For each investigation use one explicit hypothesis and evidence target; after one retry and one alternative, summarize results and the next engineering action or exact user decision. Do not blindly repeat writes, switch identities, broaden access, or install tools without applicable permission. If no safe action remains, preserve the local DAB app and hand over a concrete resolution path.

For contradictory SQL quota/eligibility evidence, reconcile subscription, region, offer, API/version, timestamps and resource scope through authorized read-only inspection. Distinguish stale/partial tool output from a service rejection. If this cannot settle eligibility, a separately approved isolated provisioning attempt may be proposed only when it can honor the user's remaining constraints: spell out resources, possible costs, free-limit flags, post-create readback, failure handling and separately approved cleanup. It is not guaranteed cost-free; strict zero-spend forbids an experiment with unresolved charge exposure. A B1 exception does not authorize paid SQL or SQL overages.

Stop unapproved cloud writes, not safe engineering work. Never silently upgrade or treat failure as success. Every blocker must name what is known, what is uncertain, the next safe action, and any precise approval needed.

## Versioned recipe evidence

**No exercised recipe is currently bundled.** This is a maintainer validation gap, not a claim that the architecture is unsupported and not an exercise each customer should have to repeat. Do not advertise end-to-end cloud support until at least one core recipe passes the following gate.

Maintain recipe artifacts and evidence at an immutable source revision, using ordinary source/run documentation rather than a new workflow system. A recipe must pin actual DAB, Node/.NET and packaging versions and document hosting tier/OS, identity/token trust, least-privilege SQL access, process lifecycle, ingress/routing, build/publication, migrations, cost/eligibility assumptions, quotas, limitations and restart/rollback. Retest when a pinned component or topology changes.

Candidate starting point: the official [DAB code-based App Service deployment](https://learn.microsoft.com/en-us/azure/data-api-builder/deployment/azure-app-service), combined with an explicitly specified UI/custom-server publication and routing model. It is not yet a tested SQL Apps recipe. Its example tier does not prove F1 compatibility or authorize B1. The [.NET runtime is not the build SDK](https://learn.microsoft.com/en-us/azure/data-api-builder/deployment/azure-app-service); restore/assemble DAB on the build machine rather than on startup. [App Service ZIP deployment](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip) supports building artifacts before publication.

Promotion requires an independently approved isolated deployment, documented actual versions/commands/results, a working deployed workflow, direct DAB negative/positive authorization checks, SQL invariant/concurrency checks, restart, and post-create readback of SKUs, SQL free-limit flags, network/access settings and `sqlapps-version`/final `sqlapps` suffix choices. Record failed/unrun checks honestly; local tests and template rendering alone do not qualify.
