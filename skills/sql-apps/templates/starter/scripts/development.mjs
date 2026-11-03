import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { composeArguments, localAccess, localApi, localConfiguration, localEndpoints, readEnvironment, root } from './config.ts';

function execute(args, env) {
  const result = spawnSync('docker', args, { cwd: root, env, encoding: 'utf8', timeout: 15_000 });
  if (result.error || result.status !== 0) {
    if (args[0] === 'image') {
      throw new Error('A required cached image is unavailable. Follow the approved preview/DAB image setup; preflight never pulls images or signs in.');
    }
    throw new Error(`Docker ${args[0]} failed. Check Docker availability and this app's configuration; no resources were changed.`);
  }
  return result.stdout.trim();
}

export async function inspectDevelopment(command, env, { api = 'dab', run = execute, request = fetch } = {}) {
  if (!['preflight', 'status', 'preview', 'connect', 'ready'].includes(command)) {
    throw new Error('Usage: development.mjs preflight|status|preview|connect|ready');
  }
  const endpoints = localEndpoints(env, api);
  if (command === 'preflight') {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    if (major < 22 || (major === 22 && (minor < 22 || (minor === 22 && patch < 2)))) {
      throw new Error('Node 22.22.2 or newer is required.');
    }
    run(['--version'], env);
    run(['compose', 'version'], env);
    const baseline = JSON.parse(readFileSync(resolve(root, 'baseline.json'), 'utf8'));
    for (const [name, image] of Object.entries(baseline.images)) {
      if (api === 'dab' || name === 'sql') run(['image', 'inspect', image], env);
    }
    localConfiguration(env, api);
    if (api === 'functions') {
      const { checkFunctionsTools, functionsEnvironment } = await import('./functions-local.mjs');
      checkFunctionsTools(functionsEnvironment(env));
    }
    run([...composeArguments(env, api), 'config', '--quiet'], env);
    return 'PREFLIGHT PASSED: tools, cached images and local configuration checked. No services started; authenticated acceptance remains unverified.';
  }
  const compose = composeArguments(env, api);
  if (command === 'connect') {
    if (!env.SQL_PORT) {
      throw new Error('SQL is private. To opt in to native access, set an unused SQL_PORT in .env and restart local:start. Only loopback will be published.');
    }
    const binding = run([...compose, 'port', 'sql', '1433'], env);
    if (binding !== `127.0.0.1:${Number(env.SQL_PORT)}`) throw new Error('SQL loopback binding is not active. Start this app before connecting.');
    return `In the native MSSQL extension, add a connection to 127.0.0.1,${Number(env.SQL_PORT)}; database appdb; SQL login app_api.\nEnter the app-owned APP_SQL_PASSWORD using the native credential dialog; do not paste it into Chat or save it in source.\nLocal preview certificate: encrypt the connection and trust the local certificate only for this loopback target.\nOpen New Query on that database node. The restricted login cannot read base tables or bypass API ownership.`;
  }
  const healthy = async (url, publicConfig = false) => {
    try {
      const response = await request(url, { signal: AbortSignal.timeout(2000) });
      if (!response.ok) return false;
      if (!publicConfig) return true;
      const config = await response.json();
      if (api === 'functions' && localAccess() === 'public-submissions') {
        return config.access === 'public-submissions' && config.redirectUri === `${endpoints.app}/` &&
          (config.ownerAuth === null || config.ownerAuth?.clientId === env.AUTH_CLIENT_ID);
      }
      return config.clientId === env.AUTH_CLIENT_ID && config.redirectUri === `${endpoints.app}/`;
    }
    catch (error) {
      if (error instanceof TypeError || error instanceof SyntaxError || ['TimeoutError', 'AbortError'].includes(error.name)) return false;
      throw error;
    }
  };
  if (command === 'preview') {
    if (!await healthy(`${endpoints.app}${api === 'functions' ? '/config.json' : '/health'}`, api === 'functions')) {
      throw new Error('The local web app is not ready. Run local:status and inspect its terminal.');
    }
    return `Open ${endpoints.app}/ in your browser. HTTP readiness does not verify sign-in or persisted application data.`;
  }
  const containers = run([...compose, 'ps', '--all', '--format', 'json'], env);
  const services = containers.startsWith('[') ? JSON.parse(containers) :
    containers.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const state = name => services.find(service => service.Service === name);
  const sqlHealthy = state('sql')?.State === 'running' && state('sql')?.Health === 'healthy';
  const dabRunning = state('dab')?.State === 'running';
  const webReady = await healthy(`${endpoints.app}${api === 'functions' ? '/config.json' : '/health'}`, api === 'functions');
  const apiReady = api === 'functions' ? await healthy(`${endpoints.api}/api/config`, true) :
    dabRunning && await healthy(`${endpoints.api}/`);
  const summary = `SQL: ${sqlHealthy ? 'healthy' : 'not ready'}; ${api === 'functions' ? 'Functions' : 'DAB'}: ${apiReady ? 'responding' : 'not ready'}; web: ${webReady ? 'responding' : 'not ready'}.`;
  if (!sqlHealthy || !apiReady || !webReady) throw new Error(`${summary} Stack readiness is incomplete. Start with local:start; no authenticated acceptance was performed.`);
  const identity = run([...compose, 'exec', '-T', 'sql', '/opt/mssql-tools18/bin/sqlcmd',
    '-S', 'localhost', '-U', 'sa', '-C', '-b', '-d', 'appdb', '-h', '-1', '-W',
    '-Q', "SET NOCOUNT ON; SELECT CONCAT(CONVERT(int,SERVERPROPERTY('EngineEdition')),':',DB_NAME());"], env);
  if (identity !== '5:appdb') throw new Error('Unexpected SQL engine or application database; readiness failed.');
  return `${summary} EngineEdition 5 and appdb confirmed. Authenticated API/browser acceptance remains unverified.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(await inspectDevelopment(process.argv[2], readEnvironment(), { api: localApi() }));
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
