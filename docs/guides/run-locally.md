# Run locally

Run a browser app backed by SQL on your own computer. No Azure subscription is required. Complete [Get started](getting-started.md) first.

## Choose what to run

| What you are working on | Startup path |
| --- | --- |
| Your own data-only app | Follow [Build your app](build-your-app.md) and the data-only steps below; do not start excluded file/job services. |
| Your own app with files/jobs | Use the foundation startup below after implementing its screens, schema and authorization. |
| The included Todo reference | Follow the [Todo guide](../../examples/todo/README.md). It starts only SQL, DAB and the browser/API. |
| The foundation's file-processing demonstration | Use the startup below. It also starts local storage and Functions. |

The foundation is not a finished inventory or registration app. Its default browser demonstrates files and jobs; your domain screens need to be implemented.

## Approvals and readiness

Before the first approval, explain the remaining stages: needed tool installations, dependency restore, build, workspace initialization, container downloads/builds, SQL terms/schema/startup, then synthetic acceptance writes. Approve only the named operations and target; approving `npm ci` does not approve build, and workspace initialization does not approve launch. Previously approved operations need not be approved again unless their scope changes.

If the approval control first returns "user unavailable" or is invisible, no approval was captured. Stop retrying that control. The assistant should provide one precise statement with the actual checkout, operations, effects and exclusions that you can send in ordinary chat. Wait for explicit consent before continuing.

Startup passes `ACCEPT_EULA=Y`; there is no chat dialog. Review the [container documentation/access instructions](https://aka.ms/azuresqldb-container) and applicable preview terms supplied with your registry access. Explicitly approving SQL startup under those terms permits the launcher to pass that value; it is not approval for other licenses.

Report **implemented**, **built**, **running** and **workflow verified** separately. A proposed port/URL is unavailable until the intended server responds and readiness checks pass. Only then open/publish the launch URL. Verify the agreed browser save/reload action and SQL persistence separately; tests or a successful build do not replace it. If launch is blocked, the task is blocked, not complete.

## Run a data-only domain app

For a role-authorized domain app, use the [role-based-data profile](../reference/role-based-data.md): configure its dedicated application role and read-only readiness procedure, then use `npm run local -- role-based-app` after scoped build/workspace/startup approval. It starts SQL/DAB/browser only and explicitly labels authorized/unauthorized user simulations; `role-based-serve` resumes it. Real Entra sign-in is used in Azure, not local simulation.

For advanced SQL-only work without this role-based profile, the existing individual steps remain available, with the scoped approvals above:

1. Restore/build as needed and select the workspace using `workspace-plan` and approved `workspace-init`.
2. Use `npm run local -- start-sql`, or `verify <selected-container>` for explicitly approved reuse.
3. Use `npm run local -- init` and `npm run local -- data`.
4. Start the gateway with `npm run local -- serve-sql`.

Pass the same optional SQL container name throughout when selecting a non-default container. `serve-sql` omits file/job adapters but does not generate domain screens, custom application roles or app-specific readiness checks. Remove excluded controls and verify the application's actual browser action, authorization and SQL save/reload. Do not run `app`, `services` or file-processing acceptance for this scope. The selected synthetic reference is not a role-authorized substitute.

## Start the foundation

From the project folder:

```powershell
npm ci
npm run build
npm run local -- workspace-plan
```

Review the proposed port block. Select it by replacing `<base-port>` with the reported value:

```powershell
npm run local -- workspace-init <base-port>
npm run local -- app
```

Workspace selection keeps this checkout's service names, ports and saved state separate. Startup downloads missing images, accepts the SQL container EULA, publishes the project schema and launches services. Read the [local runtime reference](../reference/local-development.md) before reusing an existing stack or database.

After the intended server responds and `/health/ready` passes, open its reported browser URL. For the approved foundation file/job demonstration, choose Development Alice, upload a small text file and select **Process file**. The completed job shows byte count and SHA-256. Development Bob has a separate view of files and jobs.

These local identities are simulations, not production sign-in. Keep the local app and DAB on loopback; do not expose them to other computers.

For your own application, try its main action and reload to check persistence. Use test data, not sensitive production records.

## Stop and return later

Press **Ctrl+C** in the browser-server terminal. SQL and storage data remain saved; their containers may still be running.

To resume against those services:

```powershell
npm run local -- serve
```

To stop the foundation worker and storage without deleting their data:

```powershell
npm run local -- stop-services
```

After stopping foundation services, use `app` to start them again. Data-only apps resume with `serve-sql` against running SQL/DAB, not `serve` or `app`. Selected-reference commands have their own stop/resume steps in the Todo guide. Do not delete volumes or saved credentials to restart an app.

## When something fails

Read the named failed startup stage before retrying. Common first checks:

- **Tool not found:** reopen the terminal after installation and run the setup check again.
- **Docker unavailable:** start its Linux-container engine.
- **SQL image unauthorized:** complete preview access in your own terminal.
- **Port occupied:** identify the existing app; do not stop an unrelated process.
- **SQL or processing error:** use the [local runtime reference](../reference/local-development.md) for the affected service's diagnostics and recovery.

For deeper checks, use the [local runtime reference](../reference/local-development.md). Test commands that create fixtures or restart services are described there so you can choose when to run them.
