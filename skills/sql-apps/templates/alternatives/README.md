# Optional hosting profiles

The default [starter](../starter/README.md) uses Container Apps and DAB. Choose an
alternative only before customizing a fresh copy. The installer refuses modified
files and does not migrate existing apps or cloud resources.

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

The installer updates `deployment.json` and replaces only the selected app's
README/deployment instructions. Functions also removes unused, unmodified DAB
files. If anything was changed, it stops rather than deleting user work.

For Functions, refresh the copied lockfile and dependencies, then use that
profile's README:

```powershell
npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved
npm ci
```

Each selected profile has its own cloud runbook. Local builds do not approve or
perform deployment. Public submissions remain blocked from cloud publication until
their explicit privacy, abuse, retention, cost and ingress gates are met.
