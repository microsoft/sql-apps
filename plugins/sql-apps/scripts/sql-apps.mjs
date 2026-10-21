import { readFile, access, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export async function validateHome(value) {
  if (typeof value !== 'string' || !isAbsolute(value)) throw new Error('SQL Apps home must be an absolute checkout path');
  const root = await realpath(value);
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const foundation = pkg.name === 'sql-apps';
  const validLocalScript = foundation ? pkg.scripts?.local === 'node dist/src/local-cli.js' :
    pkg.scripts?.local === 'sql-apps local';
  if ((!foundation && (pkg.sqlApps?.project !== true ||
       typeof pkg.dependencies?.['@microsoft/sql-apps'] !== 'string')) || !validLocalScript) {
    throw new Error('The selected directory is not this SQL Apps application checkout');
  }
  for (const file of ['sql/database.sqlproj',
    ...(foundation ? ['src/local-cli.ts', 'plugins/sql-apps/plugin.json'] : ['.sql-apps-project.json'])]) await access(join(root, file));
  return root;
}

export async function resolveHome(options = {}) {
  const environment = options.environment ?? process.env;
  if (environment.SQL_APPS_HOME !== undefined) return validateHome(environment.SQL_APPS_HOME);
  let candidate = resolve(options.cwd ?? process.cwd());
  while (true) {
    try {
      const pkg = JSON.parse(await readFile(join(candidate, 'package.json'), 'utf8'));
      if (pkg.sqlApps?.project === true || pkg.name === 'sql-apps') return validateHome(candidate);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }
  throw new Error('Select a SQL Apps project: open its directory or set SQL_APPS_HOME to its absolute checkout path. The project registry and assistant plugin bindings do not select runtime ownership.');
}

async function resolveToolHome(options = {}) {
  const environment = options.environment ?? process.env;
  if (environment.SQL_APPS_TOOLING_HOME !== undefined) {
    if (!isAbsolute(environment.SQL_APPS_TOOLING_HOME)) throw new Error('SQL_APPS_TOOLING_HOME must be an absolute tooling package or contributor checkout path.');
    const home = await realpath(environment.SQL_APPS_TOOLING_HOME);
    const pkg = JSON.parse(await readFile(join(home, 'package.json'), 'utf8'));
    if (!['sql-apps', '@microsoft/sql-apps'].includes(pkg.name)) throw new Error('SQL_APPS_TOOLING_HOME must select an installed tooling package or contributor checkout, not an application project.');
    return home;
  }
  let home;
  try { home = await resolveHome(options); }
  catch (error) {
    throw new Error('Select the verified archive CLI for bootstrap, or set SQL_APPS_TOOLING_HOME to its absolute installed package directory. For contributor workflows, run from the foundation checkout.', { cause: error });
  }
  const pkg = JSON.parse(await readFile(join(home, 'package.json'), 'utf8'));
  if (pkg.name === 'sql-apps') return home;
  const candidate = join(home, 'node_modules', '@microsoft', 'sql-apps');
  try {
    await access(join(candidate, 'package.json'));
    return realpath(candidate);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error(`Project tooling is not restored in ${home}. Use the explicitly selected verified archive CLI to review setup and restore, or set SQL_APPS_TOOLING_HOME to that installed package directory. No source is selected or installed automatically.`);
  }
}

export async function dispatchProjects(args, options = {}) {
  const home = await resolveToolHome(options);
  const pkg = JSON.parse(await readFile(join(home, 'package.json'), 'utf8'));
  const projectMain = options.projectMain ??
    (await import(pathToFileURL(join(home, ...(pkg.name === '@microsoft/sql-apps' ? ['dist'] : []), 'scripts', 'projects.mjs')).href)).main;
  return projectMain(args, home, { requireApproval: true });
}

export async function workspaceReport(home, options = {}) {
  const environment = options.environment ?? process.env;
  const pkg = JSON.parse(await readFile(join(home, 'package.json'), 'utf8'));
  const foundation = pkg.name === 'sql-apps';
  const local = join(home, 'node_modules', '@microsoft', 'sql-apps');
  let tools = home;
  if (!foundation) {
    try { await access(join(local, 'package.json')); tools = await realpath(local); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (environment.SQL_APPS_TOOLING_HOME === undefined) throw new Error(`Project tooling is not restored in ${home}. Use the explicitly selected verified archive CLI to review setup and restore, or set SQL_APPS_TOOLING_HOME to its absolute installed package directory.`);
      tools = await resolveToolHome(options);
    }
  }
  const toolingPackage = JSON.parse(await readFile(join(tools, 'package.json'), 'utf8'));
  const inspector = join(tools, ...(toolingPackage.name === '@microsoft/sql-apps' ? ['dist'] : []), 'scripts', 'workspace-check.mjs');
  const { checkWorkspace } = await import(pathToFileURL(inspector).href);
  return checkWorkspace({
    home,
    activeDirectory: options.cwd ?? process.cwd(),
    bindingSource: environment.SQL_APPS_HOME !== undefined ? 'environment' : 'checkout',
    explicitHome: environment.SQL_APPS_HOME !== undefined,
    tooling: tools,
    foundation,
  });
}

export async function status(fetcher = fetch, origins = { app: 'http://127.0.0.1:18080', data: 'http://127.0.0.1:15000' }) {
  const services = [];
  for (const [name, url] of [
    ['gateway', `${origins.app}/health/live`],
    ['data-readiness', `${origins.app}/health/ready`],
    ['dab', `${origins.data}/health`],
  ]) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
      services.push({ name, url, status: response.status, healthy: response.ok });
    } catch (error) {
      services.push({ name, url, healthy: false, error: error instanceof Error ? error.name : 'UnknownError' });
    }
  }
  return { services, healthy: services.every(service => service.healthy),
    scope: 'HTTP liveness/data readiness only; not SQL authorization or cloud acceptance' };
}

const commands = new Set(['app', 'serve', 'start-sql', 'verify', 'app-test', 'stop', 'recover-sql']);
const consentCommands = new Set(['consent-plan', 'consent-status', 'consent-grant', 'consent-grant-once',
  'consent-terms', 'consent-revoke', 'consent-run']);

export async function main(args = process.argv.slice(2)) {
  const [command = 'help', container = 'sql-apps-sql'] = args;
  if (command === 'projects') {
    await dispatchProjects(args.slice(1));
    return;
  }
  const journey = command === 'setup';
  if (!journey && !consentCommands.has(command) && args.length > 2) throw new Error('Expected a command and its optional selection');
  if (command === 'help') {
    console.log('SQL Apps local plugin: projects <root|create-plan|create|list|open> | home | workspace-check | guide | guide-save <absolute-brief.json> | status | setup-check [existing-sql-container] | ' + [...commands].join(' | '));
    console.log('Project creation requires --archive <absolute-tgz> and a current reviewed --approval <id>; it never starts services or opens a browser. Local commands use project-owned tooling; no cloud deployment command is exposed.');
    console.log('Pre-build consent: consent-plan|consent-status|consent-run <operation> [selection] | consent-grant|consent-grant-once <absolute-plan.json> | consent-terms <absolute-reviewed-document> | consent-revoke [scope|terms]. Record only explicitly approved scopes.');
    console.log('Pre-build journey: setup plan|status|run [--workspace <base-port>] [--json]; setup run --approval <id> applies the reviewed setup plan. setup install-plan <tool> | setup install <absolute-reviewed-plan.json> remain separate tool-install approvals.');
    return;
  }
  if (!['home', 'workspace-check', 'guide', 'guide-save', 'status', 'setup-check', 'setup'].includes(command) && !commands.has(command) && !consentCommands.has(command)) throw new Error(`Unsupported plugin command: ${command}`);
  if (consentCommands.has(command)) {
    if (['consent-plan', 'consent-status', 'consent-run'].includes(command)) {
      if (args.length < 2 || args.length > 3) throw new Error('Provide an operation and its optional selection');
    } else if (command === 'consent-revoke') {
      if (args.length > 2) throw new Error('Provide at most one consent scope');
    } else if (args.length !== 2 || !isAbsolute(container)) throw new Error('Provide one absolute reviewed document/plan path');
  } else if (command === 'guide-save') {
    if (args.length !== 2 || !isAbsolute(container)) throw new Error('Provide an absolute project brief JSON path');
  } else if (command === 'guide') {
    if (args.length !== 1) throw new Error('guide takes no arguments');
  } else if (!journey && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(container)) throw new Error('Invalid SQL container name');
  const home = await resolveHome();
  if (command === 'home') { console.log(home); return; }
  const workspace = await workspaceReport(home);
  if (command === 'workspace-check') {
    console.log(JSON.stringify(workspace, null, 2));
    if (!workspace.executionAllowed) process.exitCode = 1;
    return;
  }
  if (!workspace.executionAllowed) {
    throw new Error(workspace.binding.code === 'EXPLICIT_HOME_REQUIRED' ?
      'Active checkout and installed binding differ. Select an explicit runtime home with SQL_APPS_HOME after reviewing workspace-check.' :
      `Selected runtime source is not ready: ${workspace.bound.code}. ${workspace.nextAction}`);
  }
  if (command === 'status') {
    const result = await status(fetch, workspace.runtime.origins);
    console.log(JSON.stringify({ home, ...result }, null, 2));
    if (!result.healthy) process.exitCode = 1;
    return;
  }
  const guided = command === 'guide' || command === 'guide-save';
  const setup = command === 'setup-check';
  const consent = consentCommands.has(command);
  if (workspace.bound.bootstrap &&
      (!journey && !guided && !setup && !consent || command === 'consent-run' && container !== 'restore')) {
    throw new Error('Restore the pinned project tooling first, then run setup plan through the installed package and review its approvals before build or runtime execution.');
  }
  const tools = workspace.bound.toolingHome;
  const toolingPackage = JSON.parse(await readFile(join(tools, 'package.json'), 'utf8'));
  const scripts = join(tools, ...(toolingPackage.name === '@microsoft/sql-apps' ? ['dist'] : []), 'scripts');
  const cli = journey ? join(scripts, 'setup.mjs') :
    consent ? join(scripts, 'local-consent.mjs') : guided ? join(scripts, 'guide.mjs') :
    setup ? join(scripts, 'setup-check.mjs') : join(tools, 'dist', 'src', 'local-cli.js');
  try { await access(cli); }
  catch (error) {
    throw new Error(journey ? 'Setup coordinator missing from the bound checkout; obtain the updated project.' : consent ? 'Consent commands missing from the bound checkout; obtain the updated project.' : guided ? 'Guide missing from the bound checkout; obtain the updated project.' :
      setup ? 'Setup diagnostic missing from the bound checkout; obtain the updated project.' :
      'Local CLI not built. Review consent-plan build, then after approval use consent-run build in the configured checkout', { cause: error });
  }
  if (!journey && !guided && !setup && !consent && !workspace.bound.build.ready) {
    throw new Error(`Runtime build is not verified: ${workspace.bound.build.code}. ${workspace.bound.build.nextAction}`);
  }
  const childArgs = journey ? [cli, ...args.slice(1)] : consent ? [cli, command.replace('consent-', ''), ...args.slice(1)] :
    guided ? [cli, ...(command === 'guide-save' ? ['--save', container] : []), '--json'] :
    setup ? [cli, '--json',
      ...(args.length === 2 ? ['--container', container] : [])] :
    [cli, command, ...(args.length === 2 ? [container] : [])];
  await new Promise((done, reject) => {
    const environment = { ...process.env, SQL_APPS_TOOLING_HOME: tools };
    if (workspace.bound.project) environment.SQL_APPS_PROJECT_HOME = home;
    else delete environment.SQL_APPS_PROJECT_HOME;
    const child = spawn(process.execPath, childArgs, { cwd: home, env: environment, shell: false, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (signal) reject(new Error(`Local CLI terminated by ${signal}`));
      else { process.exitCode = code ?? 1; done(); }
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Plugin command failed'); process.exitCode = 1; });
}
