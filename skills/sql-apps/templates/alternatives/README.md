# Optional hosting profiles

The default [starter](../starter/README.md) uses Container Apps and DAB. Choose an
alternative only before customizing a fresh copy. The installer refuses modified
files and does not migrate existing apps or cloud resources.

These are selection identifiers, not permission to change an existing app.
`static-web-apps-public` retains its public identifier but maps to
`hosting: static-web-apps`, `api: functions`, `access: public-submissions`.
It is an access-mode variant of the Functions bundle. Default protected Functions
does not gain anonymous endpoints by installing tooling or omitting identity.
See the [shared profile boundaries](../../references/deployment-shapes.md#profile-bundles-and-request-boundaries).

| Profile | API | Main difference |
| --- | --- | --- |
| `app-service-f1` | DAB | Uses two public F1 containers and an existing Azure SQL database |
| `static-web-apps` | Managed Functions | Uses a managed Functions API, no DAB or container images |
| `static-web-apps-public` | Managed Functions | Accepts anonymous submissions; owner reads require real sign-in and SQL enrollment |

Select it from the copied app directory:

```powershell
node C:\path\to\plugin\skills\sql-apps\templates\alternatives\install.mjs app-service-f1 C:\apps\my-app
# Or: static-web-apps
# Or: static-web-apps-public
```

The installer updates `deployment.json` and replaces the selected app's README
and deployment instructions. Functions removes the unchanged DAB server,
configuration, Docker, Compose and default infrastructure files. It stops rather
than deleting a file the app owner changed.

It checks the default profile, manifest and affected replacement/removal files;
it is not a general existing-app compatibility checker. A customized supported
app must be changed in place; explain an unsupported stack and separately scope
any migration. A nonempty unrelated directory is not an installation target.

For Functions, refresh the copied lockfile and dependencies, then use that
profile's README:

```powershell
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
npm ci
```

Each profile has its own cloud runbook. Read the
[shared approval rules](../../references/deployment.md#what-never-counts-as-approval-or-proof)
before cloud work.
The public inbox also has distinct privacy, abuse, retention, cost and ingress
gates in the [public-submissions guide](../../references/public-submissions.md).
