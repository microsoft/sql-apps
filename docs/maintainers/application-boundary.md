# Application delivery boundaries

Contributor and agent reference: use these checks when changing application composition or preparing a domain application for delivery. For the user journey, start with [Build your app](../guides/build-your-app.md).

The reusable foundation contains authentication, ownership security, storage/jobs and deployment tooling. A real application selects capabilities and supplies its own domain UI, client operations and schema. Examples are explicitly separate, not hidden UI sections shipped to every user.

## Default boundary

`application.json` names the application and declares `selectedExamples: []`. The default runtime client, browser, DAB and SQL project are sample-free. The Todo reference lives in `examples/todo` with its own client, entity fragment, schema project and acceptance implementation. Its regression tests run in the foundation suite; it is not an application dependency.

`tsconfig.runtime.json` compiles only runtime sources, excluding tests/examples. Container builds do not compile example tests and copy only intended runtime output. The local Functions image no longer copies the entire `dist` tree. The domain-neutral `dbo.OwnerPredicate` is independently defined under `sql/security`; file-job RLS has no dependency on a Todo table/function.

New applications must not copy `examples/` or add Todo-only features unless explicitly requested. The installed `sql-apps-application` skill guides application-specific development and requires the checks below. This is a validated workflow, not a general schema/application generator.

## Required evidence

Run in the intended application checkout, not the foundation or plugin cache:

```powershell
npm run build
npm run app:check
npm run sql:build
node scripts\check-application.mjs . sql\obj\Debug\model\model.xml
npm test
npm run app:check-api -- http://127.0.0.1:18080
npm run local -- app-check <sql-container-name>
```

- **Source and artifacts:** scans active `src`, `public`, `dab`, `sql`, compiled `dist/src`, `dist/functions`, browser bundle and supplied SQL model. The SQL project extracts the actual DACPAC model using MSBuild's built-in Unzip task. Recognizes explicit Todo types/methods/entities/UI IDs and example imports, not arbitrary developer TODO comments. Rejects broad Docker copies that ship examples/test output. Missing build output fails rather than proving absence.
- **CI:** `npm test` runs the delivery check, plus negative tests inserting leftovers into each surface; CI repeats it after SQL build. Keep application-specific behavior/security tests too.
- **API:** creates a separate local acceptance session, verifies authenticated `/api/Todo` returns 404 and the GraphQL `todos` field produces an unknown-field/schema-validation error, then revokes its own session. A backend outage or authentication denial is not accepted as proof of absence.
- **Database:** an admin-only read-only check detects sample table/security objects and requires the shared ownership predicate. It fails on legacy databases instead of dropping objects. Fresh databases published from the default project have no sample table.

No one check proves all layers. These checks target the known reference example, not every possible generated placeholder. Add explicit signatures/acceptance for future examples rather than broad keyword bans or silently excluding failures.

## Existing data is preserved

Schema publishing retains `DropObjectsNotInSource=False` and data-loss blocking. Removing the example from source does **not** drop its table or legacy security objects in existing databases. The old default `sql-apps-sql` database can therefore fail the database-cleanliness check even after source, API and browser are clean.

Do not enable drop-unspecified-objects or reset volumes to make acceptance pass. Review sample row counts under an administrator, export anything needed, and obtain explicit approval for a separately reviewed cleanup migration. Preserve other application objects and shared security. No automatic destructive migration is included or executed.

For a clean development database without deleting existing data:

```powershell
npm run local -- start-sql sql-apps-clean-sql
npm run local -- init sql-apps-clean-sql
npm run local -- app-check sql-apps-clean-sql
```

This creates/reuses a separately owned container and persistent volume. It does not replace the original database or start another DAB/gateway. Follow the documented lifecycle when switching local data services (only one default DAB/gateway port at a time).
