# Support

SQL Apps is an early-preview assistant plugin. This repository provides no
service-level agreement or Microsoft support commitment. Azure product support
remains governed by your Azure agreement.

For setup and known validation limits, start with the [README](./README.md).
Use [repository issues](https://github.com/microsoft/sql-apps/issues) for non-security
bugs and questions when your account is authorized. Check repository permissions
and known enterprise policy before promising or attempting issue creation;
GraphQL permission discovery can itself fail. [Enterprise Managed Users](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/understanding-iam-for-enterprises/abilities-and-restrictions-of-managed-user-accounts)
cannot contribute to public repositories outside their enterprise. On denial, do
not retry under another identity. Preserve sanitized feedback locally through a
user-approved channel, or arrange a user-approved authorized-maintainer handoff.
Include the plugin version, assistant/host version, relevant
companion plugin versions, steps to reproduce, expected and actual behavior,
and redacted diagnostic output.

Never post access tokens, connection secrets, or private user data. Report
vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).

Microsoft SQL guidance and the Azure CLI, Docker, and Azure services have their
own support and reporting channels. SQL Apps does not extend their support
policies. The bundled Container Apps recipe has no exercised cloud acceptance;
local packaging checks do not certify a deployed application.

The F1/DAB and Static Web Apps Free/managed Functions integrations are candidate
profiles with local checks, not completed live certification. See the
[hosting profiles](./skills/sql-apps/templates/starter/hosting.md) for identity,
publication, cost boundaries and open live gates. No profile guarantees zero cost.
