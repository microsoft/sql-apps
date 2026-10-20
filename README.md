# SQL Apps

<img src="content/icons/sql-apps.png" alt="SQL Apps icon: a blue database with a purple application ribbon" width="160">

**Build locally. Make it yours. Share when ready.**

SQL Apps is a local-first foundation for building SQL-backed web applications
with the AI assistant of your choice. Start with an idea rather than a framework
choice, then implement your own screens, data and workflows.

## What you get

- **An application foundation:** TypeScript, a SQL database and a local runtime
  with sign-in and role-based access.
- **Your own project:** each application lives in an independent Git repository,
  separate from the SQL Apps tooling.
- **A guided workflow:** provider-neutral guides and an optional
  [assistant plugin](docs/reference/plugins.md) for Claude Code and GitHub Copilot.

The foundation is not a finished domain app. You and your assistant build and
test the behavior your application needs. File storage and background jobs are
outside SQL Apps; add them separately with maintained Azure skills if needed.

## What will you build?

Track equipment loans, manage inventory, collect registrations or give a small
team a shared review workflow. These are ideas, not prebuilt templates.

To try an already implemented example, use the separate
[Todo reference app](examples/todo/README.md). New projects do not include its
screens or sample data.

## Get started

**Start with [Get started](docs/guides/getting-started.md)** to check tools and
package access, install assistant guidance and create an independent project.

Open the generated application in your editor, give your assistant access to
that project and ask:

> Help me build an equipment checkout app with SQL Apps. Start by asking who will use it and what it should do. Help me run it locally, then make one useful change. Do not deploy it yet.

Replace equipment checkout with your idea. The journey is
**Describe -> Run locally -> Make it yours -> Share optionally**.

A useful first result is a real workflow: save a record to SQL, reload and see
it again, and get a clear message when a save is invalid. A readiness check or
launch URL alone does not prove your app works.

## Learn more

| I want to... | Start here |
| --- | --- |
| Turn an idea into an app | [Build your app](docs/guides/build-your-app.md) |
| Start, stop or resume locally | [Run locally](docs/guides/run-locally.md) |
| Install or verify assistant support | [SQL Apps plugin](docs/reference/plugins.md) |
| Share with other people | [Sharing your app](docs/guides/sharing.md) |
| Understand costs and free-tier limits | [Costs and growth](docs/guides/costs.md) |
| Find commands, configuration or contributor docs | [Documentation index](docs/README.md) |

## Important limits

- **Local first, not access-free.** The preferred SQL container is in private
  preview; other database routes are available. Tools and AI providers have
  their own access, licensing and pricing conditions. See [setup requirements](docs/guides/getting-started.md).
- **Sharing is optional, and charges may apply.** You are responsible for your
  Azure bill. Free allowances and cost guards are not a guarantee of no charges;
  budgets alert rather than stop spending. See [costs and safeguards](docs/guides/costs.md).
- **App Service, then containers, then SWA.** Assess compatible App Service Free
  first, then Container Apps with explicit acceptance of possible charges.
  Keep DAB on ACA with managed identity; SWA is only a fallback when the complete
  required setup fits Free. See [cloud planning](docs/reference/free-first.md).
- **Your assistant acts with real permissions.** Review plans and approvals,
  keep backups and do not bypass permissions. See [setup safety](docs/guides/getting-started.md#2-select-the-foundation-and-assistant-guidance).
- **Not production-ready as-is.** A working local app is not production
  certification. The personal cloud option has availability and networking
  trade-offs; review them before storing real or regulated data. See [sharing limits](docs/guides/sharing.md).

## Trademarks

This project may contain trademarks or logos for projects, products, or services.
Authorized use of Microsoft trademarks or logos must follow the [Microsoft Trademark and Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos is subject to those third parties' policies.

## License

[MIT](LICENSE). SQL Apps is provided "as is," without warranty of any kind.

For contributions and help, see [Contributing](CONTRIBUTING.md), [Support](SUPPORT.md) and [Security](SECURITY.md).
