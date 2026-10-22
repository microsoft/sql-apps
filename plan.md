# SQL Apps: an opinionated router, not another app platform

## 1. The product in one sentence

**SQL Apps configures an existing coding assistant to build free-first TypeScript proofs of concept on Azure SQL Database with Data API builder (DAB), routing specialist work to existing plugins.**

The user describes an app. SQL Apps supplies the stack constitution and keeps the work aligned with it. The assistant builds the application using its ordinary coding tools, Microsoft SQL guidance, and Azure Skills when needed.

SQL Apps is not an application runtime, scaffolding framework, cloud control plane, or agent orchestration engine. It is a small distribution of instructions and routing guidance. Generated applications do not depend on SQL Apps to run.

This document replaces the previous specification. It defines a proposed first-release boundary, not implemented capabilities or permission to provision resources.

Implementation has started: the root plugin manifest, routing skill, constitution, brief template, README, license, and packaging tests now exist. Packaging tests and native Copilot CLI discovery have passed; VS Code installation, application-generation scenarios, and Azure deployment remain unverified or not performed. The plugin source is maintained at [microsoft/sql-apps](https://github.com/microsoft/sql-apps). See the [README](./README.md) for setup and release checks.

## 2. What was wrong with the previous plan

The problem was not just length. The plan said "thin orchestration" while specifying enough machinery to become a competing platform.

| Previous commitment | Why it goes | Replacement |
| --- | --- | --- |
| Adaptive frameworks and architectures | Removes the opinionated constraint that makes SQL Apps useful; multiplies support paths | One default application stack |
| General idea-to-app lifecycle | Duplicates the coding assistant and upstream onboarding workflows | Short app brief, then ordinary implementation |
| Versioned execution records and phase schemas | Creates a SQL Apps workflow runtime | Host task/session facilities and normal project files |
| Dependency scheduler, output ownership, atomic state, locks | Reimplements agent orchestration infrastructure | Host-native delegation only when useful |
| Approval references and revision matching | Turns a thin plugin into a consent system | Host permissions and the owning specialist's approval gates |
| Source/artifact/environment fingerprints and evidence invalidation | Builds a verification platform before proving the router adds value | Existing tests and checks against the current app |
| Generic capability interfaces and handoff schemas | Requires adapters for capabilities the assistant already discovers | Named, documented routes to installed skills/tools |
| SQL, identity, deployment, and operations requirements repeated at length | Creates another copy of specialist guidance that will drift | A few invariants plus upstream ownership |
| Broad multi-host and multi-pattern release matrix | Makes packaging breadth a prerequisite to usefulness | Prove one host and one app path first |
| "One-shot" as the headline promise | Implies reliability the plugin cannot enforce | Clear scope, actual checks, honest blockers |

Keep the valuable parts: clarify consequential requirements, build real workflows, verify SQL persistence, preserve project ownership, and obtain applicable approval before cloud or destructive work. None requires a new engine.

## 3. The constitution

Azure SQL Database and TypeScript are the defining choices. The remaining defaults below are proposed product decisions to keep the first release narrow, not requirements inferred from the upstream plugins.

| Area | First-release policy |
| --- | --- |
| Language | TypeScript for application code; T-SQL for database work |
| Intent and cost | `intent: poc` and `costPreference: free-first`; explicit `zero-azure-spend` remains strict; production intent is not spend approval |
| UI | React with Vite |
| Design and testing | Rayfin-informed Tailwind v4 tokens, Radix primitives, Lucide icons, `clsx`/`tailwind-merge`; Vitest/React Testing Library |
| Application data APIs | DAB with validated identity and role/ownership permissions; no automatic Express-to-SQL CRUD |
| Custom server | Node.js/Express only for necessary authentication, orchestration, or domain behavior |
| Database rules | SQL constraints and transaction-safe procedures exposed through DAB enforce transactional/concurrent invariants without bypass write paths |
| Relational data | Azure SQL Database; no silent SQLite, PostgreSQL, Cosmos DB, or Fabric substitution |
| Local database | Route to Microsoft SQL's Azure SQL Database container guidance; check availability and prerequisites before promising a local run |
| Cloud hosting | Complete free-first topology/cost review; no automatic paid SKU |
| Optional services | Azure Blob Storage for files, Microsoft Entra ID for sign-in, Application Insights for telemetry, Key Vault when secret storage is needed |
| Structure | npm workspaces for frontend, data (SQL/DAB configuration), shared contracts, and a custom server only when needed; one application and one database |
| Migration intent | `rayfin/rayfin.yml` with `services.data.dialect: mssql`; not executed by SQL Apps or proof of released Rayfin support |
| Delivery | A working local app is sufficient; cloud deployment is optional |
| Deployment attribution | Sole `sqlapps-version` tag using the adopted guidance version; final `sqlapps` suffix on new resource names by default, with customer overrides |
| Ownership | Normal source, migrations, configuration, tests, and run instructions; no SQL Apps runtime dependency |

The service list is a support boundary, not a provisioning checklist. Do not create storage, identity registrations, telemetry resources, or a vault unless the app needs them.

Deployment attribution is metadata only: the brief records `sqlapps-version` from the actual SQL Apps plugin manifest when its guidance is adopted, plus the final `sqlapps` suffix naming pattern and approved exceptions. Environment and stable uniqueness tokens come before the suffix. Preserve these choices on resume; a newer installed plugin must not automatically relabel old infrastructure. Merge the sole attribution tag onto each new tag-capable resource and new group, since group tags are not inherited. Preserve customer tags and existing/shared resources; do not rename or replace resources for attribution. The signal indicates resource footprint, not active usage or unique applications; it adds no runtime telemetry, data access, or Microsoft reporting access. The [deployment attribution contract](./skills/sql-apps/references/deployment-attribution.md) owns naming constraints, overrides, and verification.

Do not silently introduce another framework, ORM, data API platform, or database. Specialists may assess alternative hosting for the required DAB app, disclosing support boundaries and verifying the complete topology. Messaging, AI services, AKS, or another application stack exceed the initial profile. An explicitly accepted exception is not a newly supported profile.

These are instruction-level policies, not a security sandbox. Host permissions and actual tests remain authoritative. Browser code must never receive database credentials; authorization must hold at DAB, including direct requests, and SQL must enforce transactional invariants.

Assess hosting, DAB, SQL, authentication, build/publication, and supporting resources together. Distinguish free SKUs and quota-stopped offers from metered allowances, trials, and credits; never promise guaranteed free operation. Qualifying zero-spend SQL requires `useFreeLimit: true` and `freeLimitExhaustionBehavior: AutoPause`, not just idle auto-pause. Azure SQL Basic is paid. Stop unapproved cloud writes, not safe investigation: classify confirmed incompatibility, missing evidence and recoverable tooling failure, then provide bounded recovery and a next safe action/precise approval. Preserve component-specific accepted decisions, such as B1 hosting with SQL still free. The [constitution](./skills/sql-apps/references/constitution.md) owns cost policy.

Local completion is deployment-ready: pinned DAB, portable configuration, supported authentication, reproducible UI/custom-server/DAB/SQL packaging, and documented hosting recipe/evidence status. Evaluate precompiled runtime artifacts, not TypeScript labels, when assessing F1. The [deployment guidance](./skills/sql-apps/references/deployment.md) defines one concise review, bounded recovery, scoped approvals and recipe promotion. No exercised core recipe is yet bundled; do not represent documentation or static tests as successful deployment evidence.

## 4. Compose what already exists

The assistant is the orchestrator. A skill supplies guidance; a tool performs an operation; a plugin packages capabilities. Routing to a skill does not require launching another agent.

| Responsibility | Owner | SQL Apps contribution |
| --- | --- | --- |
| Editing, implementation, task tracking, delegation, test execution | Existing coding assistant | App intent and constitution |
| DAB APIs/authorization, schema, T-SQL, migrations, SQL authentication, local engine, SQL diagnostics | [Microsoft SQL plugins](https://github.com/microsoft/microsoft-sql) | Relevant app rules and required DAB/SQL boundary |
| Azure preparation, resource planning, costs, deployment, identity configuration, diagnostics | [Azure Skills](https://github.com/microsoft/azure-skills) | Selected service boundary and requested outcome |
| App-specific integration and acceptance | The coordinating assistant | Ensure UI requests traverse DAB, SQL enforces rules, and actual resource settings match the approved cost posture |
| Durable product context | Ordinary application repository | One short brief and project instructions |

### Microsoft SQL

Use one suitable SQL bundle rather than installing every overlapping plugin. Upstream recommends `microsoft-sql` for general coding agents or `microsoft-sql-vscode` for the MSSQL extension experience. Container guidance is already included in the broad bundle; the VS Code bundle can be paired with the container plugin when needed.

Examples of routes are `dab-rest-and-graphql`, `azuresql-db-dab`, `design-azure-sql-schema`, `schema-migrations-safely`, and `azuresql-db-container`. Resolve actual installed capabilities before invoking them. Missing DAB is a blocker, not permission to substitute Express CRUD. Follow current prerequisites and limitations; a remembered skill name is not proof of availability.

### Azure Skills

Do not wrap every Azure skill in a SQL Apps skill. Choose the applicable workflow and let it own its lifecycle:

- For an explicitly selected azd workflow, use `azure-prepare`, then `azure-validate`, then `azure-deploy`, satisfying their current prerequisites.
- For non-azd onboarding, `azure-app-onboard` owns its complete pipeline, including its own deployment path. Do not invoke it as a small planning helper or mix its state with the azd pipeline.
- For a service-specific issue, route directly to the relevant installed guidance, such as `azure-diagnostics`, `azure-storage`, or `entra-app-registration`.

Do not invoke cloud onboarding during a local-only build: its workflow includes Azure account context and deployment gates. Do not claim SQL Apps can skip an upstream skill's mandatory steps.

### Rayfin: alignment and eventual migration, not a competing runtime

[Rayfin](https://github.com/microsoft/rayfin) already provides scaffolding, TypeScript data models, authentication, data APIs, storage, and hosting. Its getting-started skill then routes to version-locked guidance inside the generated project. That routing pattern is worth borrowing.

The reviewed public examples are Fabric-oriented, while the user has also supplied a proposed `custom-aca` path with a self-hosted control plane and per-app runtimes/resources. Rayfin should not be characterized as exclusively Fabric-backed. Selecting it remains an application-platform decision, not merely loading another SQL skill; the supplied custom-aca PostgreSQL topology is not an Azure SQL support guarantee.

**Do not include Rayfin's runtime by default.** Align new-project workspace boundaries and transferable UI conventions now, keeping SQL/DAB configuration and frontend clients separate. Do not let alignment reintroduce a mandatory Express server or direct-SQL CRUD layer. The app-design and alignment references link the reviewed upstream guidance without copying its kits or introducing its SDK.

The user supplied a proposed service-YAML shape and requested `dialect: mssql` ahead of released SQL support. Include it in each new app as `rayfin/rayfin.yml`, with unused services disabled and paths matching real packages. Use the conventional filename without claiming current runtime compatibility: project instructions must explain that SQL Apps does not execute it and file presence does not authorize a Rayfin workflow handoff. When documented SQL support is released, use Rayfin's version-matched tooling to assess and migrate explicitly. SQL Apps must not build a config interpreter, service runtime, or generic migration engine.

Preserve relative same-origin APIs and reserve Rayfin's protocol/config/discovery paths. For a prospective custom-aca migration, delegate discovery, Entra management roles, asynchronous operations, per-app resource provisioning, schema jobs, and site releases to Rayfin. Do not introduce those mechanisms or a second hosting profile into SQL Apps.

## 5. The smallest useful package

Start with a small payload and a marketplace catalog, not a framework:

```text
<host plugin manifest>
.claude-plugin/marketplace.json
README.md
skills/sql-apps/SKILL.md
skills/sql-apps/references/constitution.md
skills/sql-apps/references/app-design.md
skills/sql-apps/references/rayfin-alignment.md
skills/sql-apps/templates/app-brief.md
skills/sql-apps/templates/rayfin.yml
```

- **Manifest:** discovery and host packaging only. Use dependency declarations only if the selected host supports them; otherwise document prerequisite installation.
- **Marketplace catalog:** list the root plugin as `sql-apps@sql-apps-skills`, without duplicating its payload.
- **Host compatibility metadata:** package the same skill for Copilot/VS Code, Claude Code, OpenAI Codex, Gemini CLI, and Cursor. Use their required catalogs/manifests, not copied skills or host-specific runtimes. Distinguish static packaging, native loader validation, and end-to-end application validation in the README.
- **README:** what SQL Apps does, supported host/profile, prerequisites, invocation, and known limitations.
- **One routing skill:** recognize SQL Apps requests, load the constitution, identify applicable installed specialists, and keep the work in scope.
- **Constitution reference:** the single maintained source of stack and service policy.
- **Brief template:** outcome, users/roles, essential workflows, data rules, exclusions, intent/cost constraints, complete-topology assessment, and architecture/cost acceptance checks. Keep it concise; link an existing specialist plan rather than duplicating it.
- **Design/alignment references and service template:** transferable UI choices, migration-oriented package boundaries, and explicit future `mssql` service intent; no extra runtime or duplicate agent workflow.

For a generated app, integrate a concise constitution into the host-supported project instruction file, preserving existing instructions. A skill is loaded on demand; it is not by itself an always-on project constitution. Keep application intent in `app-brief.md` and run commands in the ordinary README.

No custom MCP server, plugin resolver, state database, event bus, model loop, approval ledger, or generic handoff protocol. No custom agent initially. Add one only if demonstrated context isolation or tool restrictions require it.

Skills can deliver the behavior. The plugin exists to make that behavior easy to install and discover, not to supply an execution runtime.

## 6. Routing behavior

The router has one job: **given the request, project, constitution, and installed capabilities, select the next appropriate owner without inventing a new workflow.**

| Request or condition | Route |
| --- | --- |
| New SQL Apps application | Clarify consequential gaps, confirm a short brief and profile, then let the assistant implement using the applicable SQL guidance |
| DAB APIs/authorization, SQL design, connections, migrations, or local database | Relevant Microsoft SQL skill/tool |
| Ordinary UI/server implementation or app change | Assistant's normal coding workflow; consult SQL/Azure specialists only for the affected work |
| Deploy an accepted application | Appropriate Azure workflow carrying current costs and accepted decisions; one complete topology/cost/security review and bounded resolution of uncertainties |
| SQL or Azure failure | Owning diagnostic skill, supplied with the actual error and relevant context |
| Resume or change an app | Read the brief, project instructions, current code, and specialist-owned artifacts; inspect reality rather than trusting old task status |
| Missing capability | Report the exact prerequisite and supported installation path; do not invent success or install silently |
| Out-of-profile requirement | Explain the conflict and propose an explicit exception or another product |

A handoff is a short task description: project location, desired result, current `intent` and `costPreference` values, DAB/SQL requirements, approved topology/cost boundary, and acceptance checks. Carry those values explicitly to every specialist, not just as a brief link. Every Azure handoff also carries recorded `sqlapps-version`, the final `sqlapps` suffix naming pattern, and approved overrides/exceptions. Use the host's tools directly unless a bounded task genuinely benefits from a separate agent.

Borrow the [Mission Control](https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/) discipline: scoped tasks, sufficient context, visible progress, and review. Do not build another Mission Control. Parallelism is optional and appropriate only for independent work; a schema/API/UI dependency chain is not automatically three parallel agents.

## 7. A complete user journey

> "Build a shared-equipment reservation app."

1. Confirm the project location. Resolve only material ambiguities: who can reserve, who can see reservations, and whether overlaps are allowed.
2. Confirm the short app brief with `intent: poc`, `costPreference: free-first`, and the SQL Apps profile; strict zero spend is explicit and existing choices are preserved.
3. Check the relevant host tools, SQL/DAB guidance, and runtime/local-engine prerequisites. Surface a blocker before building around an unavailable dependency.
4. Implement one real workflow across React, DAB, and SQL; add custom server behavior only where necessary. Reuse upstream guidance without copying it into SQL Apps.
5. Run the checks below and leave usable source plus exact run instructions. If cloud delivery was not requested, stop here.
6. If deployment is requested, retain PoC intent, component constraints and accepted decisions through the selected Azure workflow. Present one concise review, investigate evidence gaps with bounded recovery and request precise approvals for writes/spend/access changes. Local engineering checks stay within implementation approval and host permissions. Verify actual deployed behavior and settings; a plan or successful local tests are not cloud success.

For later changes, update the brief where intent changes, implement across affected layers, and rerun relevant checks. No SQL Apps execution record is required. Upstream workflows may keep their own artifacts; SQL Apps should not duplicate them.

## 8. Done means checked, not narrated

Use the generated project's existing test/build tooling and the host's browser/SQL tools:

- Type-check/build the application and run relevant tests.
- Exercise the primary UI workflow through DAB against real SQL; save, reload, and confirm persistence with sanitized request/runtime evidence.
- Check invalid input and direct DAB role/ownership restrictions, including a denied operation and allowed control. Test SQL invariant violations and concurrent conflicts for atomic rejection without partial writes or bypass permissions.
- Inspect the essential UI at desktop and narrow widths, including error/empty states.
- Confirm the documented start/restart path works. Distinguish "verified runnable" from "currently running."
- If deployed, repeat architecture/authorization/invariant checks at the deployed origin and read actual SKUs, SQL free-limit flags, and supporting meter/overage settings against the approved cost posture. An estimate or IaC declaration is not evidence of actual settings.
- Read back actual tags/names for each in-scope resource against the brief's recorded attribution version, naming pattern, and approved exceptions. Report mismatches separately from approved overrides/unsupported cases; no renamed resources, overwritten customer tags, or added telemetry to force a pass. Local-only delivery needs no Azure attribution checks.

Report what ran, what passed, and what is blocked. A scaffold, successful deployment command, screenshot, or specialist's success message alone is not proof that the application works.

Do not build an evidence subsystem to enforce this checklist. Keep commands and results in normal test reports or the handover. Recheck affected behavior after changes. Respect host permissions; app approval is not blanket permission for cloud spend, destructive operations, or real-data movement.

## 9. First release and deletion test

Package for **Copilot/VS Code, Claude Code, OpenAI Codex, Gemini CLI, and Cursor**, using one canonical skill and the React/DAB/Azure SQL PoC profile. Publish changed payloads under distinguishable, immutable versions; verify actual installed manifests and skill bytes, not just the source checkout or a development link. The 0.3.0 minor-release candidate is not itself a published release. Prove the end-to-end proposal in Copilot in VS Code first; packaging another host does not certify its loader or application workflow.

Implement only the package above. Evaluate:

1. A fresh reservation app completes a real UI-to-DAB-to-SQL workflow, enforces authorization and SQL invariants, and restarts from its instructions.
2. A new conversation adds a rule without losing the constitution or existing behavior.
3. Missing SQL prerequisites and out-of-profile requests produce explicit blockers, not substitute architectures.
4. Local-only delivery does not enter cloud onboarding or provision resources.
5. An authorized Azure deployment follows one upstream workflow, preserves scoped approvals and passes deployed architecture/cost acceptance. Evidence gaps get a bounded resolution path; unapproved writes stop without automatic upgrades. Strict zero-spend choices remain strict.

Before implementing any additional SQL Apps component, ask:

> Does the host or an existing plugin already own this? Can a short instruction or route solve the problem?

If yes, do not build it. If no, first demonstrate the concrete failure, then add the smallest missing glue. Upstream reusable fixes rather than maintaining a competing copy.

The product earns its existence only if this small package makes the chosen stack more consistent and the specialist handoffs more reliable than using the upstream plugins alone. If it does not, distribute a constitution and setup recipe instead of inventing more machinery.

## Sources and maintenance boundary

Reviewed against the published sources on 2026-10-21. Upstream names and workflows can change; compatibility must be checked with the installed versions.

- [Microsoft SQL catalog and bundle overlap guidance](https://github.com/microsoft/microsoft-sql#choose-a-plugin)
- [Azure Skills capabilities and installation](https://github.com/microsoft/azure-skills)
- [Azure onboarding workflow](https://github.com/microsoft/azure-skills/blob/main/skills/azure-app-onboard/SKILL.md)
- [Azure preparation scope and prerequisites](https://github.com/microsoft/azure-skills/blob/main/skills/azure-prepare/SKILL.md)
- [Rayfin platform and local-development scope](https://github.com/microsoft/rayfin)
- [Rayfin getting-started routing pattern](https://github.com/microsoft/rayfin/blob/main/skills/rayfin-getting-started/SKILL.md)
- [Mission Control orchestration guidance](https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/)
