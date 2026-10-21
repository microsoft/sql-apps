import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import sql from 'mssql';
import { GenericContainer, Wait } from 'testcontainers';
import { sqlProcedureConnection, SqlConnectionDiscardedError } from '../dist/src/sql-procedure-runtime.js';

const image = 'sqldbpreview-dpgaeqhmgphzd4bk.azurecr.io/azure-sql/db-dev:latest';
const password = `SqlApps1!${randomBytes(24).toString('base64url')}`;
const appPassword = `SqlApps1!${randomBytes(24).toString('base64url')}`;
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
let container;
let admin;
let pool;
let connection;
let settings;

before(async () => {
  container = await new GenericContainer(image)
    .withEnvironment({ ACCEPT_EULA: 'Y', MSSQL_SA_PASSWORD: password })
    .withExposedPorts(1433)
    .withPlatform('linux/amd64')
    .withWaitStrategy(Wait.forSuccessfulCommand(
      `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '${password}' -C -b -l 2 -d master -Q "IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'appdb') CREATE DATABASE appdb;" && ` +
      `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '${password}' -C -b -l 2 -d appdb -Q "SELECT 1;"`,
    ))
    .withStartupTimeout(120_000)
    .start();
  const endpoint = {
    server: container.getHost(), port: container.getMappedPort(1433),
    options: { encrypt: true, trustServerCertificate: true },
    pool: { max: 1, min: 0, idleTimeoutMillis: 30_000 },
  };
  admin = new sql.ConnectionPool({ ...endpoint, database: 'master', user: 'sa', password });
  await admin.connect();
  assert.equal((await admin.request().query("SELECT CAST(SERVERPROPERTY('EngineEdition') AS int) AS engine")).recordset[0].engine, 5);
  await admin.request().query("IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'appdb') CREATE DATABASE appdb;");
  await admin.request().query(`CREATE LOGIN sql_apps_runtime WITH PASSWORD = '${appPassword}';`);
  await admin.close();
  admin = new sql.ConnectionPool({ ...endpoint, database: 'appdb', user: 'sa', password });
  await admin.connect();
  await admin.request().query(await readFile(new URL('../sql/security/owner.sql', import.meta.url), 'utf8'));
  await admin.request().query(`
    CREATE TABLE dbo.RuntimeRows(owner_oid nvarchar(36) NOT NULL, title nvarchar(40) NOT NULL);
    INSERT dbo.RuntimeRows VALUES (N'${alice}', N'Alice only'), (N'${bob}', N'Bob only');
  `);
  await admin.request().query('CREATE USER sql_apps_runtime FOR LOGIN sql_apps_runtime;');
  await admin.request().query('GRANT CONNECT TO sql_apps_runtime;');
  await admin.request().query(`
    CREATE SECURITY POLICY dbo.RuntimeOwnerPolicy
      ADD FILTER PREDICATE dbo.OwnerPredicate(owner_oid) ON dbo.RuntimeRows WITH (STATE = ON);
  `);
  await admin.request().query(`
    CREATE PROCEDURE dbo.ReadRuntimeRows AS
    SET NOCOUNT ON;
    SELECT title, @@SPID AS connection_id,
      CONVERT(nvarchar(36), SESSION_CONTEXT(N'oid')) AS owner_id,
      CONVERT(nvarchar(40), SESSION_CONTEXT(N'scp')) AS scope,
      CONVERT(nvarchar(16), SESSION_CONTEXT(N'role')) AS role
    FROM dbo.RuntimeRows;
  `);
  await admin.request().query(`
    CREATE PROCEDURE dbo.RuntimeFailure AS
    SET NOCOUNT ON;
    THROW 51000, 'Expected runtime procedure failure', 1;
  `);
  await admin.request().query(`
    CREATE PROCEDURE dbo.RuntimeAbort AS
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    THROW 51001, 'Expected aborted transaction', 1;
  `);
  for (const name of ['ReadRuntimeRows', 'RuntimeFailure', 'RuntimeAbort']) {
    await admin.request().query(`GRANT EXECUTE ON dbo.${name} TO sql_apps_runtime;`);
  }
  settings = { ...endpoint, database: 'appdb', user: 'sql_apps_runtime', password: appPassword };
  pool = new sql.ConnectionPool(settings);
  await pool.connect();
  connection = sqlProcedureConnection(pool);
});

after(async () => {
  try {
    try { await pool?.close(); }
    finally { await admin?.close(); }
  } finally {
    await container?.stop();
  }
});

async function context() {
  return (await pool.request().query(`
    SELECT @@SPID AS connection_id,
      SESSION_CONTEXT(N'oid') AS owner_id,
      SESSION_CONTEXT(N'scp') AS scope,
      SESSION_CONTEXT(N'role') AS role;
  `)).recordset[0];
}

test('real pooled SQL requests isolate two owners and clear all identity keys', async () => {
  const initial = await context();
  for (const [owner, role, title] of [[alice, 'owner', 'Alice only'], [bob, 'member', 'Bob only']]) {
    const rows = await connection.execute(owner, role, 'ReadRuntimeRows', {}, { name: 'ReadRuntimeRows', parameters: {} });
    assert.deepEqual(rows, [{
      title, connection_id: initial.connection_id, owner_id: owner, scope: 'access_as_user', role,
    }]);
    assert.deepEqual(await context(), {
      connection_id: initial.connection_id, owner_id: null, scope: null, role: null,
    });
  }
});

test('a throwing procedure rolls back without leaving identity on the reused connection', async () => {
  const initial = await context();
  await assert.rejects(
    connection.execute(alice, 'owner', 'RuntimeFailure', {}, { name: 'RuntimeFailure', parameters: {} }),
    /Expected runtime procedure failure/,
  );
  assert.deepEqual(await context(), {
    connection_id: initial.connection_id, owner_id: null, scope: null, role: null,
  });
  const rows = await connection.execute(bob, 'member', 'ReadRuntimeRows', {}, { name: 'ReadRuntimeRows', parameters: {} });
  assert.deepEqual(rows.map(row => row.title), ['Bob only']);
  assert.equal(rows[0].connection_id, initial.connection_id);
});

test('an automatically aborted transaction discards its pool before another owner connects', async () => {
  const discarded = new sql.ConnectionPool(settings);
  await discarded.connect();
  try {
    await assert.rejects(
      sqlProcedureConnection(discarded).execute(alice, 'owner', 'RuntimeAbort', {}, { name: 'RuntimeAbort', parameters: {} }),
      SqlConnectionDiscardedError,
    );
    assert.equal(discarded.connected, false);
  } finally {
    await discarded.close();
  }
  const rows = await connection.execute(bob, 'member', 'ReadRuntimeRows', {}, { name: 'ReadRuntimeRows', parameters: {} });
  assert.deepEqual(rows.map(row => row.title), ['Bob only']);
});
