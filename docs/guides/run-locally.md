# Run locally

Run a browser app backed by SQL on your own computer. No Azure subscription is required. Complete [Get started](getting-started.md) first.

## Choose what to run

| What you are working on | Startup path |
| --- | --- |
| Your own app | Follow [Build your app](build-your-app.md). Use the foundation startup below once its screens and schema are implemented. |
| The included Todo reference | Follow the [Todo guide](../../examples/todo/README.md). It starts only SQL, DAB and the browser/API. |
| The foundation's file-processing demonstration | Use the startup below. It also starts local storage and Functions. |

The foundation is not a finished inventory or registration app. Its default browser demonstrates files and jobs; your domain screens need to be implemented.

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

Open the browser URL printed in the terminal. For the foundation demonstration, choose Development Alice, upload a small text file and select **Process file**. The completed job shows byte count and SHA-256. Development Bob has a separate view of files and jobs.

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

After stopping services, use `app` to start them again. Selected-reference commands have their own stop/resume steps in the Todo guide. Do not delete volumes or saved credentials to restart an app.

## When something fails

Read the named failed startup stage before retrying. Common first checks:

- **Tool not found:** reopen the terminal after installation and run the setup check again.
- **Docker unavailable:** start its Linux-container engine.
- **SQL image unauthorized:** complete preview access in your own terminal.
- **Port occupied:** identify the existing app; do not stop an unrelated process.
- **SQL or processing error:** use the [local runtime reference](../reference/local-development.md) for the affected service's diagnostics and recovery.

For deeper checks, use the [local runtime reference](../reference/local-development.md). Test commands that create fixtures or restart services are described there so you can choose when to run them.
