# SQL Apps: an opinionated router, not another app platform

## 1. The product in one sentence

**SQL Apps configures an existing coding assistant to build free-first TypeScript proofs of concept on Azure SQL Database with Data API builder (DAB), routing specialist work to existing plugins.**

The user describes an app. SQL Apps supplies the stack constitution and keeps the work aligned with it. The assistant builds the application using its ordinary coding tools, Microsoft SQL guidance, and Azure Skills when needed.

SQL Apps is not an application runtime, scaffolding framework, cloud control plane, or agent orchestration engine. It is a small distribution of instructions and routing guidance. Generated applications do not depend on SQL Apps to run.

This document replaces the previous specification. It defines a proposed first-release boundary, not implemented capabilities or permission to provision resources.

Implementation has started: the root plugin manifest, routing skill, constitution, brief template, README, license, and packaging tests now exist. Packaging tests, native Copilot CLI discovery, and one supervised VS Code candidate's local application checkpoints have passed. Copied installation/update, broader application-generation scenarios, and Azure deployment remain unverified or not performed; the release guide records the scoped evidence and limits. The plugin source is maintained at [microsoft/sql-apps](https://github.com/microsoft/sql-apps). See the [README](./README.md) for setup and release checks.

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

The intentionally narrow profile is TypeScript and React/Vite, DAB over Azure SQL, and SQL-enforced business rules. Database targets are the local Azure SQL Database container or Azure SQL Database cloud, never an on-premises fallback; follow the [prerequisite routing](./skills/sql-apps/references/prerequisites.md). Custom server code is conditional; Azure provisioning is optional. If SQL/DAB is missing, users may still build UI, schema, and scaffolding, but persistence remains incomplete.

The [constitution](./skills/sql-apps/references/constitution.md) owns current stack, security, and cost policy. [Deployment guidance](./skills/sql-apps/references/deployment.md) owns cloud review and evidence; [attribution guidance](./skills/sql-apps/references/deployment-attribution.md) owns resource tags and naming. These policies are guardrails, not a provisioning checklist or runtime.

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

Examples of routes are `dab-rest-and-graphql`, `azuresql-db-dab`, `design-azure-sql-schema`, `schema-migrations-safely`, and `azuresql-db-container`. Resolve actual installed capabilities before invoking them. Missing DAB blocks database integration, not useful UI/schema/scaffolding work; never substitute Express CRUD. Follow current prerequisites and limitations; a remembered skill name is not proof of availability.

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
skills/sql-apps/references/prerequisites.md
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

The [routing skill](./skills/sql-apps/SKILL.md) is the source of truth for choosing installed SQL/Azure specialists, carrying accepted decisions into handoffs, and continuing safe work when capabilities are missing. Ordinary implementation stays with the coding assistant; SQL Apps adds no orchestration runtime.

## 7. A complete user journey

The [README's equipment-reservation request](./README.md#2-build-your-first-workflow) demonstrates the user experience. Keep the prompt natural; track deeper DAB, SQL-concurrency, restart, and deployment checks separately in the [release guide](./docs/reference/releasing.md). Missing prerequisites call for setup guidance and honest incomplete status, not blocking all creation or pretending persistence works.

## 8. Done means checked, not narrated

Use existing project tests and tools. The [release guide](./docs/reference/releasing.md) defines runtime and deployed acceptance; report actual results, gaps, and approvals. A scaffold or successful command alone is not evidence that the app works.

## 9. First release and deletion test

Package for **Copilot/VS Code, Claude Code, OpenAI Codex, Gemini CLI, and Cursor**, using one canonical skill and the React/DAB/Azure SQL PoC profile. Publish changed payloads under distinguishable, immutable versions; verify actual installed manifests and skill bytes, not just the source checkout or a development link. The 0.2.1 patch-release candidate is not itself a published release. Prove the end-to-end proposal in Copilot in VS Code first; packaging another host does not certify its loader or application workflow.

Implement only the package above. Evaluate:

1. A fresh reservation app completes a real UI-to-DAB-to-SQL workflow, enforces authorization and SQL invariants, and restarts from its instructions.
2. A new conversation adds a rule without losing the constitution or existing behavior.
3. Missing SQL/DAB prerequisites offer supported setup guidance and allow useful UI/schema/scaffolding work; persistence remains incomplete until real prerequisites are available.
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
