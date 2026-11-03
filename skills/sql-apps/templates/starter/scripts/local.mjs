import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync, fork } from 'node:child_process';
import { once } from 'node:events';
import { composeArguments, localApi, localConfiguration, readEnvironment, root } from './config.ts';
import { listenForStop, requestLocalStop } from './runtime-control.mjs';

process.chdir(root);
const command = process.argv[2];
const api = localApi();
const secret = () => `Aa1!${randomBytes(24).toString('hex')}`;
let env;
function compose(args, options = {}) {
  const result = spawnSync('docker', [...composeArguments(env, api), ...args], {
    cwd: root, env, encoding: 'utf8', ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    let detail = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
    for (const name of ['MSSQL_SA_PASSWORD', 'APP_SQL_PASSWORD', 'SQL_CONNECTION_STRING']) {
      if (env[name]) detail = detail.replaceAll(env[name], '[redacted]');
    }
    throw new Error(`docker compose ${args[0]} failed. ${detail || "Inspect this project's container logs (do not publish secrets)."}`);
  }
  return options.stdio === 'inherit' ? '' : result.stdout.trim();
}
function sql(database, args, input) {
  return compose(['exec', '-T', 'sql', '/opt/mssql-tools18/bin/sqlcmd',
    '-S', 'localhost', '-U', 'sa', '-C', '-b', '-l', '5', '-t', '60', '-d', database, '-h', '-1', '-W', ...args], { input });
}
async function healthy(url, stopRequested) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (stopRequested()) throw new Error('Startup interrupted by a stop request.');
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return;
    } catch (error) {
      if (attempt === 39) throw new Error(`Service readiness failed at ${url}: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error(`Service never became healthy at ${url}. Inspect this project's logs.`);
}

if (command === 'init') {
  if (!existsSync('.env')) throw new Error('Copy .env.example to .env and configure identity first.');
  const current = readFileSync('.env', 'utf8');
  if (current.includes('COMPOSE_PROJECT_NAME=')) {
    if (!['MSSQL_SA_PASSWORD', 'APP_SQL_PASSWORD', ...(api === 'dab' ? ['SQL_CONNECTION_STRING'] : [])]
      .every(name => current.includes(`${name}=`))) {
      throw new Error('Incomplete existing local secrets. Restore .env for this persisted database; do not generate replacements.');
    }
    console.log('Existing project identity and secrets preserved.');
  } else {
    const name = `sqlapps-${randomBytes(6).toString('hex')}`;
    writeFileSync('.env', `${current}\nCOMPOSE_PROJECT_NAME=${name}\nMSSQL_SA_PASSWORD=${secret()}\nAPP_SQL_PASSWORD=${secret()}\n`, { mode: 0o600 });
    if (api === 'dab') {
      const settings = readEnvironment();
      writeFileSync('.env', `SQL_CONNECTION_STRING="Server=sql,1433;Database=appdb;User ID=app_api;Password=${settings.APP_SQL_PASSWORD};Encrypt=True;TrustServerCertificate=True;"\n`, { flag: 'a', mode: 0o600 });
    }
    console.log('Generated project-owned local credentials. No containers started.');
  }
} else if (command === 'start' || command === 'stop') {
  env = readEnvironment();
  if (!/^sqlapps-[a-f0-9]{12}$/.test(env.COMPOSE_PROJECT_NAME || '')) throw new Error('Run local:init; an isolated Compose project is required.');
  if (command === 'stop') {
    if (!await requestLocalStop(env)) compose(['stop'], { stdio: 'inherit' });
  } else {
    const config = localConfiguration(env, api);
    for (const file of ['packages/frontend/dist/index.html', 'dist/scripts/config.js',
      api === 'functions' ? 'packages/functions/dist/index.js' : 'dist/packages/server/server.js']) {
      if (!existsSync(file)) throw new Error(`Missing ${file}. Run npm run build before Start or acceptance.`);
    }
    const functions = api === 'functions' ? await import('./functions-local.mjs') : undefined;
    if (functions) {
      functions.checkFunctionsTools(functions.functionsEnvironment(env));
    }
    compose(['config', '--quiet']);
    await import('./check-config.mjs');
    let web;
    let runtime;
    let closeControl;
    const abort = new AbortController();
    let stopped;
    const stopRequest = new Promise(resolve => { stopped = resolve; });
    let stopping = false;
    let stopRequested = false;
    const requestStop = () => {
      stopRequested = true;
      abort.abort();
      stopped();
      if (web?.connected) web.send('stop');
    };
    const shutdown = async () => {
      if (stopping) return;
      stopping = true;
      const failures = [];
      try {
        if (runtime) await runtime.stop();
        if (web && web.exitCode === null && web.signalCode === null) {
          const exited = once(web, 'exit');
          if (!stopRequested && web.connected) web.send('stop');
          await exited;
        }
      } catch (error) { failures.push(error); }
      try { compose(['stop'], { stdio: 'inherit' }); }
      catch (error) { failures.push(error); }
      await closeControl?.(failures.length === 0);
      if (failures.length) throw new AggregateError(failures, 'Local shutdown failed; inspect the owned services.');
    };
    process.on('SIGINT', requestStop);
    process.on('SIGTERM', requestStop);
    process.on('message', message => { if (message === 'stop') requestStop(); });
    closeControl = await listenForStop(env, requestStop);
    try {
      if (stopRequested) throw new Error('Startup interrupted by a stop request.');
      compose(['up', '-d', '--wait', '--wait-timeout', '180', 'sql'], { stdio: 'inherit' });
      const engine = sql('master', ['-Q', "SET NOCOUNT ON; SELECT CONVERT(int,SERVERPROPERTY('EngineEdition'));"]);
      if (engine.trim() !== '5') throw new Error('Expected Azure SQL Database EngineEdition 5.');
      sql('master', ['-Q', "IF NOT EXISTS(SELECT 1 FROM sys.databases WHERE name=N'appdb') CREATE DATABASE appdb COLLATE SQL_Latin1_General_CP1_CI_AS;"]);
      const collation = sql('appdb', ['-Q', "SET NOCOUNT ON; SELECT CONVERT(nvarchar(128),DATABASEPROPERTYEX(DB_NAME(),'Collation'));"]);
      if (collation !== 'SQL_Latin1_General_CP1_CI_AS') throw new Error('Existing database collation differs from the pinned baseline. Review a migration; do not reset data.');
      const versionRows = sql('appdb', ['-Q', "SET NOCOUNT ON; IF OBJECT_ID('dbo.SchemaVersions') IS NOT NULL SELECT CONCAT(Version,':',Checksum) FROM dbo.SchemaVersions ORDER BY Version;"]);
      const versions = versionRows ? versionRows.split(/\r?\n/).map(row => {
        const match = row.match(/^(\d+):([a-f0-9]{64})$/);
        if (!match) throw new Error('Invalid migration history. Inspect the database without resetting it.');
        return { Version: Number(match[1]), Checksum: match[2] };
      }) : [];
      const files = readdirSync('packages/data/migrations').filter(file => file.endsWith('.sql')).sort();
      if (files.some((file, index) => !/^\d{3}-.+\.sql$/.test(file) || Number(file.slice(0, 3)) !== index + 1)) {
        throw new Error('Migrations must have unique, consecutive NNN-name.sql versions starting at 001.');
      }
      if (versions.some(version => !files.some(file => Number(file.slice(0, 3)) === version.Version))) throw new Error('Database contains unknown migrations.');
      for (const file of files) {
        const version = Number(file.slice(0, 3));
        const checksum = createHash('sha256').update(readFileSync(resolve('packages/data/migrations', file), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
        const applied = versions.find(item => item.Version === version);
        if (applied && applied.Checksum !== checksum) throw new Error(`Applied migration ${file} changed. Add a forward migration.`);
        if (!applied) {
          sql('appdb', ['-v', `MigrationHash=${checksum}`, '-i', `/schema/migrations/${file}`]);
          const recorded = sql('appdb', ['-Q', `SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.SchemaVersions WHERE Version=${version} AND Checksum='${checksum}';`]);
          if (recorded !== '1') throw new Error(`Migration ${file} did not commit its version/checksum.`);
        }
      }
      sql('master', [], `IF NOT EXISTS(SELECT 1 FROM sys.sql_logins WHERE name=N'app_api') CREATE LOGIN app_api WITH PASSWORD='${env.APP_SQL_PASSWORD}';\nGO\n`);
      sql('appdb', ['-i', '/schema/permissions.sql']);
      if (functions) {
        runtime = await functions.startFunctions(env, {
          signal: abort.signal, onRuntime: value => { runtime = value; },
        });
        console.log('SQL, Functions and Static Web Apps ready. Stop preserves the database volume.');
        process.send?.('ready');
        const exit = await Promise.race([runtime.exited, stopRequest]);
        if (!stopRequested) throw new Error(`${exit.tool} exited unexpectedly.`);
      } else {
        compose(['up', '-d', 'dab'], { stdio: 'inherit' });
        await healthy(`${config.dab}/`, () => stopRequested);
        if (stopRequested) throw new Error('Startup interrupted by a stop request.');
        web = fork(resolve(root, 'dist/packages/server/server.js'), [], { env, stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
        await Promise.race([
          once(web, 'message'),
          once(web, 'exit').then(() => { throw new Error('Packaged web server exited before readiness.'); }),
        ]);
        await healthy(`${config.publicConfig.redirectUri}health`, () => stopRequested);
        console.log('SQL, DAB, and packaged web app ready. Stop preserves the database volume.');
        process.send?.('ready');
        await once(web, 'exit');
        if (!stopRequested) throw new Error('Web process exited unexpectedly.');
      }
    } catch (error) {
      if (!stopRequested) throw error;
      console.log('Local stop requested.');
    } finally {
      await shutdown();
      process.disconnect?.();
    }
  }
} else {
  throw new Error('Usage: node scripts/local.mjs init|start|stop');
}
