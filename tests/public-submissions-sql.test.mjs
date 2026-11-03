import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const container = process.env.SQLAPPS_PUBLIC_SQL_CONTAINER;
const application = process.env.SQLAPPS_PUBLIC_SQL_APP;
const gate = Boolean(container && application);
const owner = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const tenant = '11111111-1111-1111-1111-111111111111';
const other = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

test('approved disposable SQL: public owner boundary, shared budget, row cap, rollback, locking and grants', {
  skip: !gate, timeout: 120000,
}, async t => {
  assert.match(container, /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/);
  const name = `sqlapps_public_${randomBytes(6).toString('hex')}`;
  // Preserve the approved container's existing SQLCMDPASSWORD unless explicitly injected.
  const args = database => ['exec', '-i', ...(process.env.SQLCMDPASSWORD ? ['-e', 'SQLCMDPASSWORD'] : []), container,
    '/opt/mssql-tools18/bin/sqlcmd', '-S', 'localhost', '-U', 'sa', '-C', '-I', '-b', '-l', '5', '-t', '60',
    '-d', database, '-h', '-1', '-W', '-r', '1'];
  const sql = (database, input) => {
    const result = spawnSync('docker', args(database), {
      input, env: process.env, encoding: 'utf8', timeout: 65000,
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Disposable SQL check failed:\n${result.stdout}\n${result.stderr}`);
    return result.stdout.trim();
  };
  const concurrentSql = (database, input) => new Promise((accept, reject) => {
    const child = spawn('docker', args(database), { env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errors = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Task-owned SQL command timed out.')); }, 65000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`Disposable SQL command failed:\n${output}\n${errors}`));
      else accept(output.trim());
    });
    child.stdin.end(input);
  });
  const runtime = statement => `SET NOCOUNT ON; EXECUTE AS USER=N'app_runtime';
BEGIN TRY
  ${statement}
  SELECT N'OK';
END TRY
BEGIN CATCH
  SELECT CONVERT(varchar(20), ERROR_NUMBER());
END CATCH;
REVERT;`;
  const migrations = await Promise.all(['001-initial.sql', '002-public-submissions.sql']
    .map(file => readFile(resolve(application, 'packages/data/migrations', file), 'utf8')));
  const grants = await readFile(resolve(application, 'packages/data/permissions.sql'), 'utf8');
  const created = [];
  async function database(suffix) {
    const database = `${name}_${suffix}`;
    assert.equal(sql('master', "SET NOCOUNT ON; SELECT CONVERT(int,SERVERPROPERTY('EngineEdition'));"), '5');
    sql('master', `IF DB_ID(N'${database}') IS NOT NULL THROW 51090, 'Refuse an existing test database.', 1;
CREATE DATABASE [${database}] COLLATE SQL_Latin1_General_CP1_CI_AS;`);
    created.push(database);
    t.diagnostic(`Created disposable database ${database}; cleanup drops only this test-owned database.`);
    for (const migration of migrations) {
      const checksum = createHash('sha256').update(migration.replace(/\r\n/g, '\n')).digest('hex');
      sql(database, migration.replaceAll('$(MigrationHash)', checksum));
    }
    // Test-only contained user, no login/credential or real directory identity is created.
    sql(database, `CREATE USER app_runtime WITHOUT LOGIN;\n${grants}`);
    return database;
  }
  try {
    const functional = await database('functional');
    assert.equal(sql(functional, runtime("EXEC api.Submit @Label=N'Anonymous fixture';")), 'OK');
    assert.equal(sql(functional, runtime(`EXEC api.Submissions @TenantId='${tenant}', @OwnerId='${owner}';`)), '51000');
    sql(functional, `INSERT dbo.SubmissionOwners (TenantId, OwnerId) VALUES ('${tenant}','${owner}');`);
    const listed = sql(functional, runtime(`EXEC api.Submissions @TenantId='${tenant}', @OwnerId='${owner}';`));
    assert.match(listed, /Anonymous fixture/);
    assert.match(listed, /OK$/);
    assert.equal(sql(functional, runtime(`EXEC api.Submissions @TenantId='${other}', @OwnerId='${owner}';`)), '51000');
    sql(functional, `DELETE dbo.SubmissionOwners WHERE TenantId='${tenant}' AND OwnerId='${owner}';`);
    assert.equal(sql(functional, runtime(`EXEC api.Submissions @TenantId='${tenant}', @OwnerId='${owner}';`)), '51000');
    for (const statement of [
      'SELECT * FROM dbo.Submissions;', 'SELECT * FROM dbo.SubmissionOwners;', 'SELECT * FROM dbo.SubmissionBudget;',
      `INSERT dbo.SubmissionOwners VALUES ('${tenant}','${owner}');`,
      'UPDATE dbo.SubmissionBudget SET RowLimit=1000;', "EXEC api.CreateItem @Label=N'No legacy create';",
      'SELECT * FROM api.Items;',
    ]) assert.equal(sql(functional, runtime(statement)), '229');
    assert.equal(sql(functional, runtime("EXEC api.Submit @Label=N'';")), '51001');
    assert.equal(sql(functional, runtime("DECLARE @Label nvarchar(max)=REPLICATE(N'x',121); EXEC api.Submit @Label=@Label;")), '51001');

    const rate = await database('rate');
    const started = Date.now();
    const burst = `SET NOCOUNT ON; EXECUTE AS USER=N'app_runtime';
DECLARE @I int=0, @Accepted int=0, @Limited int=0;
WHILE @I < 36
BEGIN
  BEGIN TRY
    EXEC api.Submit @Label=N'Concurrent fixture';
    SET @Accepted+=1;
  END TRY
  BEGIN CATCH
    IF ERROR_NUMBER() <> 51029 THROW;
    SET @Limited+=1;
  END CATCH;
  SET @I+=1;
END;
REVERT; SELECT CONCAT(@Accepted,':',@Limited);`;
    const bursts = await Promise.all([concurrentSql(rate, burst), concurrentSql(rate, burst)]);
    assert.ok(Date.now() - started < 60000, 'Rate test must finish within one rolling minute.');
    const counts = bursts.map(output => {
      assert.match(output, /^\d+:\d+$/);
      return output.split(':').map(Number);
    });
    assert.equal(counts.reduce((sum, pair) => sum + pair[0], 0), 60);
    assert.equal(counts.reduce((sum, pair) => sum + pair[1], 0), 12);
    assert.equal(sql(rate, 'SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Submissions;'), '60');

    const capacity = await database('capacity');
    // Approved fixture seeding only, not a production retention/reset operation.
    sql(capacity, `INSERT dbo.Submissions(Label,CreatedAt)
SELECT TOP(999) N'Capacity fixture', DATEADD(day,-1,SYSUTCDATETIME())
FROM sys.all_objects a CROSS JOIN sys.all_objects b;`);
    assert.equal(sql(capacity, runtime("EXEC api.Submit @Label=N'Last slot';")), 'OK');
    assert.equal(sql(capacity, runtime("EXEC api.Submit @Label=N'Must roll back';")), '51029');
    assert.equal(sql(capacity, 'SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Submissions;'), '1000');

    const holding = concurrentSql(functional, `SET NOCOUNT ON; BEGIN TRANSACTION;
SELECT Id FROM dbo.SubmissionBudget WITH(TABLOCKX,HOLDLOCK) WHERE Id=1;
WAITFOR DELAY '00:00:20'; ROLLBACK TRANSACTION;`);
    try {
      let locked = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const locks = sql(functional, `SET NOCOUNT ON;
SELECT COUNT(*) FROM sys.dm_tran_locks WHERE resource_database_id=DB_ID()
  AND resource_type='OBJECT' AND resource_associated_entity_id=OBJECT_ID('dbo.SubmissionBudget')
  AND request_mode='X' AND request_status='GRANT' AND request_session_id<>@@SPID;`);
        locked = Number(locks) > 0;
        if (locked) break;
        await new Promise(accept => setTimeout(accept, 150));
      }
      assert.ok(locked, 'Observe the actual SQL lock, not buffered sqlcmd stdout, before checking timeout.');
      assert.equal(sql(functional, runtime("EXEC api.Submit @Label=N'Lock must time out';")), '1222');
    }
    finally { await holding; }
    assert.equal(sql(functional, 'SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Submissions;'), '1');
  } finally {
    for (const database of created.reverse()) {
      sql('master', `DROP DATABASE [${database}];`);
    }
  }
});
