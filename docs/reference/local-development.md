# Local runtime reference

The local inner loop uses the Azure SQL Database container (Private Preview, **EngineEdition 5**), Microsoft.Build.Sql/SqlPackage, Data API builder 2.0.12, Azurite 3.35.0 Blob/Queue storage, and the real Azure Functions v4 Node.js 22 host. It does not use a SQL Server substitute, cloud resources, or an upstream hosted runtime.

For the shortest startup path, use [Run locally](../guides/run-locally.md). This reference covers individual services, workspace ownership, file processing and recovery. If you have a pre-rebrand checkout, read [migration notes](../maintainers/naming-transition.md).

## Capability-scoped startup

The foundation `app` command starts SQL/DAB/storage/Functions/browser; saved brief capabilities do not turn services off. A role-authorized data application uses the [role-based-data profile](role-based-data.md), `role-based-app` and `role-based-serve` with the same explicit workspace/container selection. This stages SQL/schema/DAB/browser startup without storage/Functions and checks the configured procedure before listening.

`serve-sql` remains an advanced SQL-only gateway, not the configured role-based-profile launcher. Implement domain UI/schema/procedures, configure authorized DAB permissions, remove excluded controls, and verify the real SQL procedure/browser save-reload flow. The selected reference path below is anonymous synthetic-only, not a role-based-app substitute. The [role-based-data Azure path](role-based-data.md#identity-artifacts-and-deployment) selects matching resources while preserving private SQL.

Follow [scoped consent and readiness](../guides/run-locally.md#approvals-and-readiness). A proposed origin or successful build is not a running app. Publish the intended origin only after response/readiness probes, then report workflow acceptance separately.

## Prerequisites

First time installing development tools? Use [guided setup](../guides/getting-started.md) rather than treating this list as instructions. Copilot can offer approved installations, explain access/license conditions, guide restarts and verify each step on Windows, macOS or Linux. `node scripts/setup-check.mjs` runs before npm restore/build and never installs or mutates resources.

- Node.js 22 or 24 LTS and npm.
- .NET SDK 8 or later. The CLI restores this repository's SqlPackage tool.
- Docker with Linux containers. The SQL preview image requires x64; `start-sql` requests `linux/amd64`, including on emulated hosts.
- Access to the current preview container image, or an already running current Azure SQL container. Obtain preview access using the [official announcement](https://devblogs.microsoft.com/azure-sql/azure-sql-database-container-prpr/) and its linked instructions. This project does not distribute registry credentials or circumvent preview access.
- A free selected workspace port block. Explicit legacy compatibility uses 15000 (DAB), 18080 (gateway), 10000/10001 (Blob/Queue), and 17071 (Functions).
- Initial access to download the pinned public Azurite/Functions/Node images, npm packages, .NET SQL build dependencies and SqlPackage. Functions Core Tools need not be installed: the project runs the real host in its pinned container image.

No Azure CLI login, subscription, Entra registration, or billable resources are required for these commands. First use needs package/image downloads; cached dependencies and images can be used afterward.

## Start from this checkout

Run from the repository root:

```powershell
npm ci
npm run build
npm run local -- workspace-plan
```

### Select local workspace ownership

`workspace-plan` proposes a deterministic six-port block from the canonical checkout path and reports conflicts plus a free alternative, without writing state or changing Docker. Approve `npm run local -- workspace-init <base-port>` using the proposed block for a new isolated stack. The selected descriptor persists in `.sql-apps/workspace.json`; resource names, SQL/storage credentials, DAB config and settings are derived from the workspace ID. A descriptor copied from another checkout fails closed. Free-port observations are not reservations: startup rechecks conflicts, and bind races remain explicit failures.

For an existing legacy stack, approve `npm run local -- workspace-init legacy` instead. This preserves its names, ports, credential paths and volumes. Do not select isolation expecting old data to move automatically. The legacy stack remains separately available; no automatic transfer or schema cleanup is performed. `workspace-check` reports the selected mode, ports and origins.

Isolated mode also derives a database and least-privilege SQL login from the workspace ID. Explicitly reusing the same external SQL container from two workspaces therefore does not implicitly share their application database/login. Existing legacy databases are not renamed or copied.

The main `app` command requires this explicit selection. Advanced individual legacy commands remain available for existing workflows; agents must still obtain informed approval and confirm ownership. An external SQL container can be explicitly selected for `verify`/`init`; an isolated workspace will not stop or take ownership of it.

After selection and startup approval:

```powershell
npm run local -- app
```

After the intended server responds and `/health/ready` passes, open the URL printed by startup (**http://127.0.0.1:18080** in legacy mode). For approved foundation file/job scope, choose Development Alice or Development Bob and use file upload/list/download/delete, Function invocation and queued file processing. Switching users revokes the previous local session; each user sees only their own data, files and jobs. Reloading preserves the selected session within the browser tab; SQL rows and Blob files persist independently of browser sessions.

`app` starts/reuses the project-owned SQL container, publishes the schema, runs SQL security checks, recreates local DAB, starts persistent Azurite, builds/starts the local Functions image, and serves the existing frontend and gateway on a single loopback origin. It stays in the foreground. Ctrl+C stops the browser gateway; the service containers continue running. After restarting the browser server, select a user again because local sessions are held only in server memory.

For individual SQL/data steps and API acceptance:

```powershell
npm ci
npm run build
npm run local -- start-sql
npm run local -- init
npm run local -- data
npm run local -- api-test
```

Use `npm run local -- services` after the individual SQL/data steps, then `npm run local -- serve` to start only the browser gateway against running services. Pass the same optional SQL container name to every command when using a non-default container. `npm run local -- serve-sql` starts the optional SQL-only browser with unavailable file/function/processing controls, without requiring service credentials.

With the browser server running, use a second terminal:

```powershell
npm run local -- app-test
npm run local -- services-test
```

`app-test` obtains separate server-issued sessions, checks identity lookup and strict public job shapes, rejects anonymous access, and removes its sessions. `api-test` separately exercises real FileJob REST pagination, GraphQL owner isolation, processor writes and mutation denial directly against DAB, cleaning its fixtures.

`services-test` checks a real exact-4-MiB upload/download, 4-MiB-plus-one rejection, same-name isolation, HTTP Function authorization, queued/terminal SQL states, immutable snapshots after overwrite/delete, duplicate delivery, retries/poison handling, role-forgery denial and persistence across an Azurite restart. It also verifies owner-scoped OpenTelemetry trace correlation across the gateway and real worker, actual scheduled stale-job recovery, saved-snapshot retry with history, and opt-in retention against isolated fixtures. It also starts the same Functions image on an **internal Docker network with no public egress** and verifies a real queued job completes without downloading bindings. It briefly stops/restarts the project worker and storage; do not run it during other users' processing. Fixtures, sessions and the temporary offline-proof container are cleaned up.

## Explicitly selected synthetic reference

The default commands above keep their file/job behavior. An opt-in selected application uses the same workspace/source checks but a separate application database/login/configuration and route composition. It requires isolated mode; do not overwrite a legacy descriptor or transfer legacy data implicitly.

After explicit reference selection and download/EULA/schema approval:

```powershell
npm run app:build -- todo local-simulation
npm run local -- selected-app "<artifact-directory>"
```

Use the exact artifact directory printed by the builder. Startup rechecks source/checksums and occupied gateway/DAB/SQL ports, verifies owned resources, uses existing .NET/SqlPackage publishing without dropping unrelated objects, and probes the actual execute-only SQL login and procedure. It starts only SQL, selected DAB and the browser/API; no Azurite, Functions or cloud registration is required. The selected browser uses anonymous synthetic-data sessions, not the default development identities.

After Ctrl+C, `selected-serve "<artifact-directory>"` resumes with verified services and SQL-backed sessions. `selected-stop todo` removes only this selection's verified DAB container, preserving SQL data and protected credentials. To recreate that DAB service, use `selected-app` again. Configuration mismatch or existing SQL objects without credential state is an explicit review/repair boundary, never permission to reset credentials or data.

With separate synthetic-test approval, use `selected-test "<artifact-directory>"` against the already-running app. Its opt-in SQL/HTTP suite measures ownership, exact concurrent quotas/rate limits, title boundaries, expiry, bounded cleanup and permissions. It changes clocks only for its new synthetic sessions and removes those fixtures on success or failure. Run it without concurrent activity in an approved disposable workspace; it does not restart services or replace browser acceptance.

See [the reference guide](../../examples/todo/README.md). Local acceptance is not cloud-managed-identity or Azure deployment proof.

## Files and queued processing

Upload a safe ASCII single-segment name (letters/digits, underscore, hyphen and dot, up to 128 characters; no `..`). Maximum upload size is 4 MiB. Uploading the same name replaces only the selected user's file. Download and delete use the authenticated gateway, never a browser storage key or SAS.

Click **Process file**. Job progress updates automatically by default; **Refresh jobs** is also available. The gateway reads the selected user's file, saves an immutable private snapshot, creates an owner-defaulted SQL job and sends a base64-encoded Azure Storage Queue message. The real Functions queue trigger updates `queued` -> `processing` -> `completed`, computing SHA-256, byte count and UTF-8 text-line count. Empty content has zero lines; CRLF/CR/LF separators are supported, and a trailing separator counts a final empty line. Binary content is decoded with UTF-8 replacement characters for the text-line metric.

The source file can be replaced or deleted after submission without changing the snapshot. Duplicate delivery skips terminal jobs. Queue submission failures persist a failed job and return an explicit error. Processing retries up to five deliveries; exhausted messages enter `file-jobs-poison`, whose handler persists failure and logs the job ID. Inspect worker logs for failures; if the data service is unavailable even through poison-handler retries, recover services and inspect/replay the remaining poison messages rather than assuming successful processing.

Delete terminal jobs to remove their SQL record and snapshot. Queued/running jobs cannot be deleted (409). A **Retry snapshot** button on failed jobs creates a new job and copies the original private snapshot, even if the source file was deleted or replaced. The old job remains failed, and the new `parent_job_id` links history. Only the owner can retry; missing snapshots return 409 with guidance to upload again. Each explicit retry is a new submission, not automatic business-level deduplication.

Workers hold an exclusive Blob lease from the authoritative job check through processing and release it on completion or failure. Job deletion and retention must acquire that same lease before removing the SQL record, then delete the snapshot using the lease ID. A live worker therefore prevents deletion even if timeout recovery has marked its job failed. Lease conflicts are reported, not silently skipped.

If SQL deletion fails, the snapshot is preserved. If snapshot cleanup fails after the record is removed, the error is reported; repeating the owner-scoped job DELETE request cleans up the leftover snapshot. That repeat may return 404 because the record is already gone. Opt-in retention uses the same ordering and remains disabled by default.

The lease has no automatic expiry: a timeout is not proof that the worker stopped. If a worker process crashes or lease release fails, the snapshot stays protected. After explicitly stopping and verifying the owning workspace's worker is no longer running, keep its Azurite instance available and use Storage Explorer's **Break Lease** action on the exact `files/<tenant>/<owner>/jobs/<job-id>` blob. Then retry deletion or retention. Never break leases automatically or while a worker may still be running; do not reset storage or credentials to recover.

### Local feature flags

Optional settings are read from the selected workspace's gitignored `local-settings.json` (legacy path `.sql-apps\local-settings.json`; isolated path `.sql-apps\workspaces\<workspace-id>\local-settings.json`). Copy [local-settings.example.json](../../local-settings.example.json) there and change the values, then restart **both** `services` and the browser gateway. The worker receives validated settings through its environment; settings are startup snapshots, not hot-reloaded. Unknown keys, invalid types and out-of-range values fail startup explicitly.

| Setting | Default | Behavior |
| --- | --- | --- |
| `processing` | `true` | Allow new processing submissions; disabling it still permits viewing/deleting existing terminal jobs and draining accepted work |
| `automaticProgress` | `true` | Poll job status without manual refresh |
| `jobRetry` | `true` | Allow saved-snapshot retries; also requires processing enabled |
| `tracing` | `true` | Record local OpenTelemetry spans and expose the owner-scoped dashboard |
| `progressIntervalMs` | `2000` | Polling interval, 1,000-30,000 ms |
| `staleJobMinutes` | `60` | Recovery timeout, 5-10,080 minutes |
| `retentionDays` | `0` | **Disabled** by default; 1-365 days enables deletion of expired terminal jobs/snapshots and orphan snapshots |
| `traceRetentionDays` | `7` | Trace expiry, 1-30 days |

The server enforces processing/retry flags; they do not merely hide buttons. These are subscription-free configuration settings, **not an App Configuration emulator or a deployed cloud feature-flag service**. The production browser keeps these optional local capabilities off.

Automatic progress uses non-overlapping authenticated requests, pauses while the tab is hidden or a foreground action is busy, backs off to at most 30 seconds on failures, and aborts on page exit. Errors are shown alongside jobs; polling resumes when dependencies recover. This is polling, not a Web PubSub/WebSocket implementation.

### Recovery and scheduled retention

The real local Functions **timer trigger runs every minute**, using Azurite schedule monitoring. Jobs left queued/processing beyond the configured timeout are marked failed with recovery guidance. Late queue deliveries skip failed terminal records; explicit retry creates a fresh snapshot/job rather than resetting an old record underneath previous deliveries. An already-running worker can still complete the original job; its lease protects the snapshot until it finishes. The timeout is an operator recovery policy, not proof that a stalled process stopped; keep it comfortably above expected processing duration.

Setting `retentionDays` above zero enables destructive cleanup of terminal jobs whose last status change is older than the configured number of days. Their SQL rows are deleted before snapshots, preserving snapshots if SQL deletion fails. Orphan snapshots have an additional minimum 24-hour grace period. Active-job snapshots and source uploads are never removed by retention. Traces expire separately after `traceRetentionDays`. Timer failures are logged by Functions and propagate; storage/SQL operations are not an atomic cross-service transaction, so subsequent runs reconcile remaining orphans.

Run the same policy immediately with:

```powershell
npm run local -- maintain
```

Automatic job retention stays **off** unless you explicitly enable it. There is no automatic expiry for source uploads or per-user quota beyond the per-file limit. This is a learning workflow, not a production retention/compliance system.

### Local tracing dashboard

Use **Refresh traces** in the browser to view your latest 100 spans, including operation names, timings, status, trace/span/parent IDs and processing job IDs. The official OpenTelemetry SDK creates spans; a small local exporter persists a selected, sanitized record in a separate Azurite `traces` container. Submission passes trace context through Queue Storage to the actual Functions worker. Gateway request spans use route templates, not arbitrary URL/query content. Routine automatic status polling and trace-dashboard reads are excluded to avoid telemetry amplification.

The browser only sees traces in its verified owner's namespace. No bearer tokens, account keys, file contents, request bodies or filenames are exported in span records. Trace export failures are explicitly logged but are not treated as failed business operations. This local dashboard is not an Azure Monitor emulator or an OTLP collector, and it does not prove cloud tracing/managed identity behavior. Azure Monitor export is a separate future integration.

### Development identity boundary

The browser never supplies object IDs to the data proxy. A same-origin `/local/session` request selects one of two fixed development users and receives an unpredictable opaque bearer token. The local gateway validates that token, strips incoming identity/role headers, and creates the DAB principal server-side. Sessions expire after eight hours and are revoked on switch/sign-out.

The local server binds only to `127.0.0.1`, requires the exact development Host, and requires the same Origin on mutations, including session creation. It refuses `NODE_ENV=production`. These routes and session handling are absent from the production entry point; production still requires Entra access tokens. Development users are not real authenticated people, and local sessions are not a security boundary against other processes on your machine.

Azurite and the local Functions entry point use separately generated, gitignored credentials. The browser never receives them. Local HTTP Functions require the gateway's server-only secret and validated user envelope. Production Functions still require the exact Entra gateway service principal and application role; that verifier is not weakened. Local startup refuses production mode.

The local DAB `FileJob` entity allows ordinary simulated users only owner-scoped reads, excluding snapshot keys. Only the trusted server-side processor role creates/updates/deletes job records; the gateway strips caller principal/role headers. SQL filter/block predicates enforce ownership for both roles. The shared SQL project contains the job table, but production DAB does **not** expose it and cloud job processing is not enabled. Do not deploy the local image or generated DAB configuration to Azure.

`start-sql` creates `sql-apps-sql` using the current canonical `azure-sql/db-dev:latest` preview image. It generates a bootstrap password without printing it, publishes SQL only to a randomly allocated loopback port, and stores data in the `sql-apps-sql-data` named volume. Subsequent runs restart the same project-labeled container instead of replacing it. Docker may use its cached `latest` image; refreshing/upgrading is an explicit operator action, not an automatic destructive upgrade.

Readiness includes a fresh completion marker from the current preview image's control-plane initialization, not just an early `SELECT 1`. A measured preview recovery race (error 904 during control-plane reconciliation) receives at most three explicitly logged restart attempts; other failures are not silently reset. An exhausted reconcile failure is reported as preview control-plane recovery, not proof that registry access was revoked. The existing volume is preserved.

If a stopped **isolated, workspace-owned** SQL container repeatedly exits during reconciliation, review its bounded logs and obtain approval before `npm run local -- recover-sql`. This recreates only that stopped container, with the same image version, administrator credential, published port and labeled data volume/network. It refuses running, external, legacy or mismatched resources and a changed image tag. The normal `start-sql` command never does this implicitly.

Recovery records the original credential in an atomic, gitignored workspace recovery file before removing the stopped container. Treat local state as sensitive. Successful readiness removes that temporary record. If Docker creation or startup fails, the record remains; explicitly rerun `recover-sql` to resume rather than deleting state, resetting passwords or using ordinary startup to generate a replacement credential. The command does not publish schema or claim application readiness; resume `app` after SQL recovery to refresh DAB/service connections.

Live two-workspace testing observed this failure on the already-current preview image and verified that explicit container recreation preserved SQL rows and Blob data. A pull is not necessarily a fix: confirm the actual image changed, and do not compare a registry manifest's config digest with a different image-store identifier to infer a newer release. No image refresh or recreation of other running stacks is automatic.

`init` verifies the engine, creates `sql_apps_local`, builds/publishes the shared DACPAC, creates the mapped `sql_apps_local_dab` application login/user, grants only table CRUD and table `VIEW DEFINITION`, and runs real SQL security acceptance. SA is used only for provisioning, not the application. Publication blocks possible data loss and does not drop unspecified objects.

`data` reruns SQL acceptance, writes a separate development DAB configuration, and starts DAB at **http://127.0.0.1:15000**. SQL and DAB communicate on the SQL container's Docker network, not through a Docker Desktop-specific hostname. Restart `data` after restarting/recreating SQL, because its container IP may change.

`api-test` creates fresh identities/fixtures, verifies paginated owner reads, owner updates, cross-user mutation denial, owner-field injection denial, GraphQL create/read isolation, and anonymous access denial. It deletes fixtures afterward. SQL acceptance independently tests block predicates and missing delegated scope inside a rolled-back transaction.

After changing schema, shared DAB config, or code:

```powershell
npm run build
npm run local -- init
npm run local -- data
npm run local -- services
npm run local -- api-test
npm test
```

Repeated `init` preserves existing rows. Repeated `data` recreates only the project-labeled DAB container and reloads current configuration; it does not delete SQL data. Run `services` after `data` so the worker uses the current DAB network address. Repeated `services` rebuilds/recreates owned storage/Functions containers while retaining the Azurite volume and credentials.

## Reuse an existing SQL container

```powershell
npm run local -- verify sqldbdev
npm run local -- init sqldbdev
npm run local -- data sqldbdev
npm run local -- api-test
```

The existing container needs a published host SQL port, a Docker bridge network, the bundled `/opt/mssql-tools18/bin/sqlcmd`, and its bootstrap `MSSQL_SA_PASSWORD` environment setting. Initialization reads that credential in memory for schema publication; it does not print it or save it in project state. Run this only on a trusted developer machine, because privileged local processes can inspect Docker environment and SqlPackage arguments.

Do not run `start-sql sqldbdev` to take ownership of someone else's container: it deliberately refuses unowned names. This workflow does not stop/recreate your existing SQL container or alter its port bindings. If it is published on all interfaces, restrict it yourself before using it on an untrusted network.

Some older preview images report EngineEdition 5 but reject `CREATE USER ... FOR LOGIN`. The current canonical image supports this project's mapped app identity. Use a separate current container rather than granting the runtime SA permissions:

```powershell
npm run local -- start-sql sql-apps-sql-current
npm run local -- init sql-apps-sql-current
npm run local -- data sql-apps-sql-current
npm run local -- api-test
```

Legacy mode supports only one DAB instance on port 15000. Separate isolated checkouts use their own port blocks and resources. Within one workspace, switching the selected SQL container still requires review of its downstream data/service resources; never stop another workspace to free a port.

## Interactive REST and GraphQL

Local DAB uses documented [EasyAuth claim simulation](https://learn.microsoft.com/en-us/azure/data-api-builder/concept/security/authenticate-easy-auth), not actual authentication. The local gateway requires its issued session; the production gateway requires verified Entra tokens. Both reject caller-supplied principal headers.

Example reading owner-filtered file jobs from DAB directly with the local-only helper (after creating a job through the browser):

```powershell
@'
import { localPrincipal, localOrigin } from './dist/src/local.js';
const headers = {
  'x-ms-client-principal': localPrincipal('11111111-1111-4111-8111-111111111111'),
};
const rest = await fetch(`${localOrigin}/api/FileJob`, { headers });
if (!rest.ok) throw new Error(`REST failed: ${rest.status}`);
console.log(await rest.json());
const graph = await fetch(`${localOrigin}/graphql`, {
  method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({ query: '{ fileJobs { items { id status } } }' }),
});
if (!graph.ok) throw new Error(`GraphQL failed: ${graph.status}`);
console.log(await graph.json());
'@ | node --input-type=module -
```

Change the simulated object ID to exercise another user's view. Claims can be forged locally by design: never expose this endpoint remotely or deploy its generated configuration.

The Todo sample is not a default entity, browser feature or runtime dependency. See [application boundaries](../maintainers/application-boundary.md) for source/build/model, authenticated API and read-only database checks. Existing sample data is retained deliberately by schema publication and causes the database check to fail until a reviewed cleanup is explicitly approved.

## Lifecycle and secrets

```powershell
npm run local -- stop
npm run local -- data
npm run local -- services
npm run local -- stop-services
```

`stop` removes only the project-labeled DAB container; `data` recreates it. `stop-services` removes the worker container and stops Azurite, retaining SQL/Blob/Queue data and the local network. Restart with `services`. To stop project-created SQL separately, use Docker's standard `docker stop sql-apps-sql`. Restart with `start-sql`, `data`, then `services`. Stopping/removing containers does not delete named data volumes. Never remove volumes unless you intentionally want to discard data.

Gitignored `.sql-apps` holds per-container SQL/storage/function credentials and generated local DAB configuration. Preserve credentials alongside their persistent volumes and protect them as secrets. Lost/mismatched credentials fail explicitly; the CLI does not silently reset an existing login or replace a known storage account key. Bootstrap secrets remain in Docker configuration, not repository files. Do not check in state files or share Docker inspections.

Ownership labels prevent accidental replacement/removal of unrelated containers. Isolated lifecycle checks also verify workspace labels, expected image/provenance shape and loopback published ports before modifying containers; SQL/storage volumes and networks have workspace ownership labels. An unlabeled or mismatched container occupying a project name produces an actionable error rather than being deleted. Workspace Functions image tags include build-artifact fingerprints instead of sharing the global legacy image tag.

## What is and is not verified

This is a usable **frontend/gateway/SQL/DAB/Blob/Queue/Functions learning workflow**, not a complete emulation of Azure. Real two-user Blob access, real Functions HTTP/queue triggers, SQL job ownership, retry/failure behavior and persisted results are tested locally. Offline worker startup is tested on a network with no public egress; the pinned Functions base contains its extension bundle. Azurite telemetry is disabled. First-time package/image/tool downloads still need internet, as do changed dependencies that are not already cached.

Browser Entra login, managed identity, private endpoints, cloud Blob/Functions, Key Vault and cloud recovery still require Azure acceptance. Local SQL login/EasyAuth/storage secrets are intentionally separate from cloud Entra/managed-identity configuration. Azurite is not Azure Files or ADLS Gen2; its Table service is not part of this workflow. The SQL preview is not a production database or backup service; see the [current known limitations](https://microsoft.github.io/azure-sql-database-container/known-limitations.html).

No Azure free allowance is needed to start locally. The existing cloud template includes billed EP1/S0/private-endpoint resources and is **not** a free-tier template. A separate optional learning cloud deployment profile remains future work; do not deploy the current template expecting a zero bill.
