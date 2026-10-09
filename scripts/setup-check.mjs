import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, access } from 'node:fs/promises';
import { totalmem } from 'node:os';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runtimeFor } from '../src/workspace.mjs';

const execute = promisify(execFile);
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const containerPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

async function exists(path) {
  try { await access(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function run(command, args, root) {
  const options = { cwd: root, timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true, shell: false };
  if (command === 'npm' && process.platform === 'win32') {
    const { stdout } = await execute('where.exe', ['npm'], options);
    for (const candidate of stdout.trim().split(/\r?\n/)) {
      const cli = join(dirname(candidate), 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (await exists(cli)) return (await execute(process.execPath, [cli, ...args], options)).stdout;
    }
    throw new Error('NPM_UNAVAILABLE');
  }
  return (await execute(command, args, options)).stdout;
}

async function portState(port) {
  return new Promise(done => {
    const server = createServer();
    const timer = setTimeout(() => { server.close(); done('unknown'); }, 2000);
    server.once('error', error => {
      clearTimeout(timer);
      done(error.code === 'EADDRINUSE' ? 'occupied' : 'unknown');
    });
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      clearTimeout(timer);
      server.close(() => done('free'));
    });
  });
}

export function parseArguments(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && !options.json) options.json = true;
    else if (args[i] === '--container' && !options.container && containerPattern.test(args[i + 1] ?? '')) options.container = args[++i];
    else if (args[i] === '--profile' && !options.profile && ['foundation', 'role-based-data'].includes(args[i + 1])) options.profile = args[++i];
    else throw new Error('Usage: node scripts/setup-check.mjs [--json] [--container <existing-sql-container>] [--profile <foundation|role-based-data>]');
  }
  return options;
}

export async function checkSetup(options = {}, injected = {}) {
  const root = resolve(options.root ?? defaultRoot);
  const runtime = runtimeFor(undefined, root);
  if (options.container && !containerPattern.test(options.container)) throw new Error('Invalid SQL container name');
  if (options.profile && !['foundation', 'role-based-data'].includes(options.profile)) throw new Error('Invalid setup profile');
  const deps = {
    platform: process.platform, architecture: process.arch, nodeVersion: process.versions.node,
    memoryBytes: totalmem(), read: path => readFile(path, 'utf8'), exists, port: portState, fetch,
    run: (command, args) => run(command, args, root), ...injected,
  };
  const checks = [];
  const add = (id, status, code, message, nextAction, required = true) =>
    checks.push({ id, status, code, message, nextAction, required });
  const pkg = JSON.parse(await deps.read(join(root, 'package.json')));
  if (pkg.name !== 'sql-apps') throw new Error('Run setup-check from a validated SQL Apps checkout');
  if (pkg.engines?.node !== '>=22 <23 || >=24 <25') throw new Error('Node requirements changed; update the setup diagnostic before using it');
  if (!['win32', 'darwin', 'linux'].includes(deps.platform)) {
    add('platform', 'action-required', 'PLATFORM_REVIEW_REQUIRED', 'This operating system has no documented local setup route.',
      'Review host/container compatibility before installing anything; do not apply another OS recipe.');
  }
  const supportedNode = /^(22|24)\.\d+\.\d+$/.test(deps.nodeVersion);
  add('node', supportedNode ? 'ready' : 'action-required', supportedNode ? 'NODE_READY' : 'NODE_UNSUPPORTED',
    `Node.js ${deps.nodeVersion}.`, 'Use Node.js 22 or 24 LTS; preserve existing version-manager installations.');
  try {
    if (!/^\d+\.\d+\.\d+\s*$/.test(await deps.run('npm', ['--version']))) throw new Error('invalid version');
    add('npm', 'ready', 'NPM_READY', 'npm is available.', 'No installation needed.');
  } catch {
    add('npm', 'action-required', 'NPM_UNAVAILABLE', 'npm could not be verified.',
      'Use the Node installer that includes npm, or reopen your terminal after installation.');
  }
  try {
    const sdks = await deps.run('dotnet', ['--list-sdks']);
    if (!sdks.split(/\r?\n/).some(line => Number(/^(\d+)\./.exec(line)?.[1]) >= 8)) {
      add('dotnet', 'action-required', 'SDK_TOO_OLD', '.NET SDK 8 or later is missing (a runtime alone is not sufficient).',
        'Install a compatible .NET SDK using the getting-started guide.');
    } else {
      try {
        const selected = (await deps.run('dotnet', ['--version'])).trim();
        if (!/^\d+\.\d+\.\d+$/.test(selected) || Number(selected.split('.')[0]) < 8) throw new Error('invalid SDK');
        add('dotnet', 'ready', 'SDK_READY', `Selected .NET SDK ${selected}.`, 'SDK selection is valid in this checkout.');
      } catch {
        add('dotnet', 'action-required', 'SDK_SELECTION_FAILED', 'Installed SDKs do not resolve to a compatible SDK in this checkout.',
          'Review global.json and SDK selection with Copilot; do not silently replace it.');
      }
    }
  } catch {
    add('dotnet', 'action-required', 'SDK_UNAVAILABLE', '.NET SDK could not be checked.',
      'Install the SDK, not just the runtime, then reopen the terminal and run this check again.');
  }
  let engine;
  try {
    if (!/^Docker version \d+\.\d+\.\d+/i.test((await deps.run('docker', ['--version'])).trim())) throw new Error('invalid Docker version');
    add('docker-cli', 'ready', 'DOCKER_CLI_READY', 'Docker CLI is available.', 'Check the engine below.');
    try {
      const result = JSON.parse(await deps.run('docker', ['info', '--format',
        '{"OSType":{{json .OSType}},"Architecture":{{json .Architecture}},"MemTotal":{{json .MemTotal}}}']));
      if (result.OSType !== 'linux' || typeof result.Architecture !== 'string') {
        add('docker-engine', 'action-required', 'LINUX_ENGINE_REQUIRED', 'A Linux container engine could not be verified.',
          'Switch Docker to Linux containers; Windows containers cannot run this stack.');
      } else {
        engine = result;
        add('docker-engine', 'ready', 'DOCKER_ENGINE_READY', `Linux Docker engine (${result.Architecture}) is responding.`,
          'No engine restart needed.');
      }
    } catch {
      add('docker-engine', 'action-required', 'DOCKER_NOT_RUNNING', 'Docker engine did not respond with valid information.',
        'Start Docker Desktop or ask for help with the Linux service/socket permissions, then check again.');
    }
  } catch {
    add('docker-cli', 'action-required', 'DOCKER_UNAVAILABLE', 'Docker CLI could not be verified.',
      'Follow the OS-specific Docker guide; check license eligibility before installing.');
    add('docker-engine', 'not-checked', 'ENGINE_NOT_CHECKED', 'Engine not checked without Docker CLI.', 'Install/start Docker, then retry.');
  }
  add('capacity', 'ready', 'CAPACITY_INFORMATION', `Host memory: ${Math.round(deps.memoryBytes / 1024 ** 3)} GiB; ` +
    (Number.isFinite(engine?.MemTotal) ? `Docker memory: ${Math.round(engine.MemTotal / 1024 ** 3)} GiB.` : 'Docker memory not available.'),
  'Check official Docker requirements and available disk space; download/build sizes vary. This is not a capacity certification.', false);
  const emulated = engine && !['amd64', 'x86_64'].includes(engine.Architecture) || !['x64', 'amd64'].includes(deps.architecture);
  add('sql-platform', 'ready', emulated ? 'SQL_X64_EMULATION' : 'SQL_X64_NATIVE',
    emulated ? 'The SQL preview requires x64 emulation on this host.' : 'Host architecture matches the x64 SQL preview.',
    emulated ? 'The existing launcher requests linux/amd64; verify Docker supports emulation before starting.' : 'No emulation configuration expected.', false);
  if (engine) {
    if (options.container) {
      try {
        const state = JSON.parse(await deps.run('docker', ['container', 'inspect', options.container, '--format',
          '{"status":{{json .State.Status}},"owner":{{json (index .Config.Labels "sql-apps.local")}},"image":{{json .Config.Image}}}']));
        const running = state.status === 'running';
        add('sql-image', running ? 'ready' : 'action-required', running ? 'SQL_CONTAINER_SELECTED' : 'SQL_CONTAINER_STOPPED',
          running ? 'Selected SQL container is running; its engine is not yet verified.' : 'Selected SQL container is not running.',
          'Obtain approval to reuse it and run local verify to check EngineEdition 5. Never replace/restart an unowned container automatically.');
      } catch {
        add('sql-image', 'action-required', 'SQL_CONTAINER_UNAVAILABLE', 'Selected container could not be inspected.',
          'Confirm the container name with its owner. Do not create a replacement under that name.');
      }
    } else {
      const source = await deps.read(join(root, 'src', 'local.ts'));
      const image = /const sqlImage = '([^']+)';/.exec(source)?.[1];
      if (!image) throw new Error('Cannot locate the project SQL image; update setup-check for the current runtime');
      try {
        const cached = JSON.parse(await deps.run('docker', ['image', 'inspect', image, '--format',
          '[{"Architecture":{{json .Architecture}},"Os":{{json .Os}}}]']));
        if (!Array.isArray(cached) || cached[0]?.Architecture !== 'amd64' || cached[0]?.Os !== 'linux') throw new Error('wrong image platform');
        add('sql-image', 'ready', 'SQL_IMAGE_CACHED', 'Project SQL preview image is cached locally.',
          'No registry download is needed for this image. Engine identity is verified during startup.');
      } catch {
        add('sql-image', 'action-required', 'SQL_IMAGE_ACCESS_REQUIRED', 'Project SQL preview image could not be verified in the local cache.',
          'Follow the official preview signup/registry access steps, or select an existing verified Azure SQL container. Do not paste credentials into chat.');
      }
    }
  } else add('sql-image', 'not-checked', 'SQL_NOT_CHECKED', 'SQL image/container not checked without the engine.', 'Start Docker, then rerun setup-check.');
  let containers = [];
  if (engine) {
    try {
      const output = await deps.run('docker', ['ps', '--format', '{"owner":{{json (.Label "sql-apps.local")}},"workspace":{{json (.Label "sql-apps.workspace")}},"ports":{{json .Ports}}}']);
      containers = output.trim() ? output.trim().split(/\r?\n/).map(line => JSON.parse(line)) : [];
      if (containers.some(value => typeof value.owner !== 'string' || typeof value.ports !== 'string')) throw new Error('invalid container list');
    } catch {
      add('ownership', 'not-checked', 'OWNERSHIP_NOT_CHECKED', 'Existing Docker port ownership could not be checked.',
        'Inspect only safe project ownership labels before reusing services.', false);
    }
  }
  const ports = [[runtime.ports.gateway, null], [runtime.ports.data, 'data'],
    ...(options.profile === 'role-based-data' ? [] :
      [[runtime.ports.blob, 'storage'], [runtime.ports.queue, 'storage'], [runtime.ports.functions, 'functions']])];
  for (const [port, owner] of ports) {
    const state = await deps.port(port);
    if (state === 'free') add(`port-${port}`, 'ready', 'PORT_FREE', `Local port ${port} is free.`, 'Available for application startup.');
    else if (state === 'occupied' && owner && containers.some(value => value.owner === owner &&
      (runtime.mode !== 'isolated' || value.workspace === runtime.id) &&
      new RegExp(`127\\.0\\.0\\.1:${port}->`).test(value.ports))) {
      add(`port-${port}`, 'ready', 'OWNED_SERVICE_RUNNING', `Port ${port} is used by a labeled project service.`,
        'Check the intended checkout/container before reuse; a label alone does not prove readiness.');
    } else {
      let healthy = false;
      if (port === runtime.ports.gateway && state === 'occupied') {
        try {
          const response = await deps.fetch(`${runtime.origins.app}/health/live`, { signal: AbortSignal.timeout(2000), redirect: 'error' });
          await response.text();
          healthy = response.ok;
        } catch { healthy = false; }
      }
      add(`port-${port}`, 'action-required', healthy ? 'EXISTING_GATEWAY_CHECK_OWNERSHIP' : state === 'occupied' ? 'PORT_OCCUPIED' : 'PORT_NOT_CHECKED',
        healthy ? `An existing gateway responds on port ${port}; its ownership is unverified.` : `Port ${port} is occupied or could not be checked.`,
        'Identify the existing process/service with the user. Reuse only the intended application; never kill it automatically.');
    }
  }
  for (const [id, path, action] of [
    ['dependencies', 'node_modules/typescript/package.json', 'After approval, run npm ci from this checkout. Initial downloads need internet.'],
    ['build', 'dist/src/local-cli.js', 'After dependencies and approval, run npm run build.'],
  ]) {
    const present = await deps.exists(join(root, path));
    add(id, present ? 'ready' : 'action-required', present ? `${id.toUpperCase()}_PRESENT` : `${id.toUpperCase()}_MISSING`,
      present ? `${id} files are present (not a freshness/correctness check).` : `${id} files are missing.`, action, false);
  }
  return { version: 1, platform: deps.platform, architecture: deps.architecture, root,
    workspace: { id: runtime.id, mode: runtime.mode, ports: runtime.ports, origins: runtime.origins },
    ready: checks.filter(check => check.required).every(check => check.status === 'ready'), checks,
    scope: 'Read-only prerequisite check, not SQL authorization, complete offline-cache, ownership or runtime acceptance. See docs/guides/getting-started.md.' };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  const report = await checkSetup(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`SQL Apps setup check (${report.platform}/${report.architecture})`);
    for (const check of report.checks) console.log(`[${check.status}] ${check.message}\n  Next: ${check.nextAction}`);
    console.log(report.scope);
    console.log(report.ready ? 'Prerequisites checked. Approve downloads/build/startup next.' : 'Action needed. Follow the guide or ask Copilot to help with the checks above.');
  }
  if (!report.ready) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    const message = 'Setup check could not complete. No installation or resource changes were performed.';
    if (process.argv.includes('--json')) console.log(JSON.stringify({
      version: 1, ready: false, checks: [{
        id: 'diagnostic', status: 'action-required', code: 'DIAGNOSTIC_FAILED', message,
        nextAction: 'Confirm this checkout, file permissions and usage: node scripts/setup-check.mjs [--json] [--container <existing-sql-container>].',
        required: true,
      }],
    }, null, 2));
    else console.error(`${message} Confirm this checkout, command arguments and file permissions.`);
    process.exitCode = 1;
  });
}
