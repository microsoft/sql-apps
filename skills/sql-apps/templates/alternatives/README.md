# Optional hosting profiles

Default: [Container Apps/DAB](../starter/README.md).
Select alternatives before customizing a fresh copy; never overlay an existing app.

| Profile | Difference from default |
| --- | --- |
| `app-service-f1` | Public web/DAB sites, existing SQL |
| `static-web-apps` | Managed Functions, no DAB/images, existing SQL |
| `static-web-apps-public` | Same Functions host; anonymous submissions, authenticated enrolled readers |

```powershell
node C:\path\to\plugin\skills\sql-apps\templates\alternatives\install.mjs app-service-f1 C:\apps\my-app
# Or: static-web-apps
# Or: static-web-apps-public
```

Modified files cause refusal; Functions removes unchanged DAB files.
Follow the installed README for dependencies/startup and runbook for deployment.
See [profile boundaries](../../references/deployment-shapes.md#profile-bundles-and-request-boundaries)
and [public-inbox publication review](../../references/public-submissions.md).
