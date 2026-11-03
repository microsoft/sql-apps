import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import { authenticationConfiguration, required } from '../packages/functions/src/config.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

export function functionsEnvironment(env) {
  if (['SQL_CLIENT_ID', 'SQL_CLIENT_SECRET', 'SQL_TENANT_ID'].some(name => env[name]) ||
      (env.SQL_SERVER && env.SQL_SERVER !== '127.0.0.1')) {
    throw new Error('Local Functions uses the local database; remove cloud SQL settings from this local environment.');
  }
  authenticationConfiguration(env);
  return {
    ...env, SQL_SERVER: '127.0.0.1', SQL_DATABASE: 'appdb', SQL_USER: 'app_api',
    SQL_PASSWORD: required(env, 'APP_SQL_PASSWORD'), SQL_PORT: required(env, 'SQL_PORT'),
    FUNCTIONS_WORKER_RUNTIME: 'node', FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT: '1',
    NO_UPDATE_NOTIFIER: '1',
  };
}

function invocation(tool, args) {
  if (!['func', 'swa'].includes(tool) || args.some(arg => !/^[a-zA-Z0-9_:./\\-]+$/.test(arg))) {
    throw new Error('Invalid local tool arguments.');
  }
  return process.platform === 'win32' ?
    [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${tool} ${args.join(' ')}`]] : [tool, args];
}

export function checkFunctionsTools(env) {
  for (const [tool, minimum] of [['func', 4], ['swa', 2]]) {
    const [command, args] = invocation(tool, ['--version']);
    const result = spawnSync(command, args, { env, encoding: 'utf8', timeout: 15_000, windowsHide: true });
    const version = result.stdout?.match(/\b(\d+)\.\d+\.\d+\b/);
    if (result.error || result.status !== 0 || !version || Number(version[1]) < minimum) {
      throw new Error(`Install or repair ${tool === 'func' ? 'Azure Functions Core Tools 4' : 'Static Web Apps CLI 2'} through your approved setup. No tools were installed or services started.`);
    }
  }
}

function launchTool(tool, args, options) {
  const [command, commandArgs] = invocation(tool, args);
  return spawn(command, commandArgs, {
    ...options, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32',
  });
}

export async function stopProcessGroup(pid, { kill = process.kill, wait = delay } = {}) {
  const signal = value => {
    try { kill(-pid, value); return true; }
    catch (error) { if (error.code === 'ESRCH') return false; throw error; }
  };
  if (!signal('SIGTERM')) return;
  for (const escalation of [false, true]) {
    if (escalation && !signal('SIGKILL')) return;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (!signal(0)) return;
      await wait(50);
    }
  }
  if (signal(0)) throw new Error('Owned local process group cleanup failed.');
}

async function terminate(child) {
  if (!child.pid) return;
  const finished = child.exitCode !== null || child.signalCode !== null;
  const exited = finished ? Promise.resolve() : once(child, 'exit');
  if (process.platform === 'win32') {
    if (finished) return;
    const result = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore', windowsHide: true,
    });
    if (result.status !== 0 && child.exitCode === null && child.signalCode === null) {
      throw new Error('Could not stop an owned local Functions/SWA process. Inspect its terminal; no unrelated process was targeted.');
    }
  } else {
    await stopProcessGroup(child.pid);
  }
  await exited;
}

export async function startFunctions(env, { launch = launchTool, request = fetch, signal, onRuntime } = {}) {
  const settings = functionsEnvironment(env);
  const api = new URL(env.FUNCTIONS_URL || `http://127.0.0.1:${env.FUNCTIONS_PORT || '7071'}`).origin;
  const app = new URL(env.APP_ORIGIN).origin;
  for (const origin of [api, app]) {
    const url = new URL(origin);
    const probe = createServer();
    await new Promise((resolve, reject) => {
      probe.once('error', error => reject(new Error(`Local port ${url.port || '80'} is unavailable. Stop its owner or choose another port.`, { cause: error })));
      probe.listen(Number(url.port || 80), url.hostname, () => probe.close(resolve));
    });
  }
  const children = [];
  const startup = new AbortController();
  const startupSignal = AbortSignal.any([startup.signal, ...(signal ? [signal] : [])]);
  let stopping;
  let finish;
  const exited = new Promise(resolve => { finish = resolve; });
  const stop = () => stopping ||= (async () => {
    startup.abort();
    const results = await Promise.allSettled([...children].reverse().map(terminate));
    const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
    if (errors.length) throw new AggregateError(errors, 'Owned local process cleanup failed.');
  })();
  const runtime = { stop, exited };
  onRuntime?.(runtime);
  const check = async url => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      startupSignal.throwIfAborted();
      let response;
      try { response = await request(url, { signal: AbortSignal.any([AbortSignal.timeout(2000), startupSignal]) }); }
      catch (error) {
        if (!(error instanceof TypeError) && !['TimeoutError', 'AbortError'].includes(error.name)) throw error;
      }
      if (response?.ok) {
        const config = await response.json();
        if (config.clientId !== env.AUTH_CLIENT_ID || config.redirectUri !== `${app}/`) {
          throw new Error('The local API returned unexpected public configuration; check origins and port ownership.');
        }
        return;
      }
      await delay(250, undefined, { signal: startupSignal });
    }
    throw new Error('Local Functions/SWA readiness timed out. Inspect the owned process logs.');
  };
  const start = async (tool, args, cwd, url) => {
    const child = launch(tool, args, { env: settings, cwd });
    children.push(child);
    child.once('error', () => finish({ tool, error: 'Could not launch the local tool.' }));
    child.once('exit', (code, signal) => finish({ tool, code, signal }));
    await Promise.race([
      check(url), exited.then(exit => { throw new Error(`${exit.tool} exited before readiness.`); }),
    ]);
  };
  try {
    await start('func', ['start', '--port', new URL(api).port || '80', '--address', '127.0.0.1'],
      resolve(root, 'packages/functions'), `${api}/api/config`);
    await start('swa', ['start', join('packages', 'frontend', 'dist'), '--api-devserver-url', api,
      '--swa-config-location', '.', '--host', new URL(app).hostname,
      '--port', new URL(app).port || '80'], root, `${app}/config.json`);
    return runtime;
  } catch (error) {
    await stop();
    throw error;
  }
}
