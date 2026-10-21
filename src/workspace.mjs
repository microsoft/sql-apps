import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { readSqlTarget } from './sql-target.mjs';

const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 12);
export const workspaceIdentity = hash;
const offsets = { gateway: 0, data: 1, sql: 5 };
const keys = Object.keys(offsets);
const validBlock = value => Number.isInteger(value) && value >= 20000 && value <= 60000 && value % 10 === 0;
const defaultBlock = home => 20000 + (parseInt(hash(home).slice(0, 8), 16) % 4000) * 10;

export const workspaceFile = (root = process.cwd()) => join(root, '.sql-apps', 'workspace.json');

export function readWorkspace(root = process.cwd()) {
  const home = realpathSync.native(root);
  let text;
  try { text = readFileSync(workspaceFile(home), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  let descriptor;
  try { descriptor = JSON.parse(text); }
  catch { throw new Error('Invalid workspace JSON; review .sql-apps/workspace.json without resetting state.'); }
  if (!descriptor || descriptor.version !== 1 || descriptor.mode !== 'isolated' ||
      typeof descriptor.home !== 'string' || typeof descriptor.id !== 'string' ||
      Object.keys(descriptor).some(key => !['version', 'mode', 'home', 'id', 'basePort'].includes(key)) ||
      !validBlock(descriptor.basePort)) {
    throw new Error('Invalid workspace descriptor; v0.1 supports only isolated version-1 workspaces. Preserve existing resources and select a fresh project; legacy demo state is not migrated or reset.');
  }
  if (descriptor.home !== home || descriptor.id !== hash(home)) {
    throw new Error('Workspace descriptor belongs to another checkout; select a new workspace explicitly, preserving existing state.');
  }
  return descriptor;
}

// A proposed descriptor lets consent plans compute the same contracts before workspace-init writes it.
export function describeWorkspace(root, selection) {
  const home = realpathSync.native(root);
  return candidate(home, selection);
}

export function runtimeFor(container, root = process.cwd(), proposed) {
  const home = realpathSync.native(root);
  const descriptor = proposed ?? readWorkspace(home);
  const id = hash(home);
  const defaultSql = `sql-apps-${id}-sql`;
  const sqlContainer = container ?? defaultSql;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(sqlContainer)) throw new Error('Invalid SQL container name');
  const suffix = hash(`${id}/${sqlContainer}`);
  const stateDirectory = join(home, '.sql-apps', 'workspaces', id);
  const basePort = descriptor?.basePort ?? defaultBlock(home);
  const ports = Object.fromEntries(keys.map(key => [key, basePort + offsets[key]]));
  const prefix = `sql-apps-${id}`;
  return {
    home, id, mode: descriptor?.mode ?? 'unselected', defaultSql, sqlContainer,
    database: `sql_apps_local_${id}`,
    login: `sql_apps_local_dab_${id}`,
    ownsSqlName: descriptor !== null && descriptor !== undefined && sqlContainer === defaultSql, stateDirectory, ports,
    origins: {
      app: `http://127.0.0.1:${ports.gateway}`, data: `http://127.0.0.1:${ports.data}`,
    },
    names: {
      data: `${prefix}-local-data-${suffix}`,
      sqlNetwork: `${prefix}-sql-network`,
      sqlState: join(stateDirectory, `local-${suffix}.json`),
      dataConfig: join(stateDirectory, `dab-local-${suffix}.json`),
    },
    labels: ['--label', `sql-apps.workspace=${id}`],
  };
}

export async function portState(port) {
  return new Promise(done => {
    const server = createServer();
    const timer = setTimeout(() => { server.close(); done('unknown'); }, 2000);
    server.once('error', error => { clearTimeout(timer); done(error.code === 'EADDRINUSE' ? 'occupied' : 'unknown'); });
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      clearTimeout(timer);
      server.close(() => done('free'));
    });
  });
}

function candidate(home, basePort) {
  if (!validBlock(basePort)) throw new Error('Choose an explicit port block aligned to 10 between 20000 and 60000.');
  return { version: 1, mode: 'isolated', home, id: hash(home), basePort };
}

async function inspectPorts(descriptor, probe, includeSql) {
  return Promise.all(keys.filter(name => includeSql || name !== 'sql').map(async name => ({ name, port: descriptor.basePort + offsets[name],
    state: await probe(descriptor.basePort + offsets[name]) })));
}

export async function proposeWorkspace(root = process.cwd(), probe = portState, options = {}) {
  const home = realpathSync.native(root);
  const existing = readWorkspace(home);
  if (existing) return { selected: existing, scope: 'Existing selection; resource ownership still needs verification before startup.' };
  const includeSql = options.includeSql ?? (await readSqlTarget(home, runtimeFor(undefined, home).defaultSql)).provider === 'container';
  const basePort = defaultBlock(home);
  const descriptor = candidate(home, basePort);
  const ports = await inspectPorts(descriptor, probe, includeSql);
  const conflicts = ports.filter(port => port.state !== 'free');
  let alternative = null;
  if (conflicts.length) {
    for (let attempt = 1; attempt <= 100; attempt++) {
      const other = candidate(home, 20000 + ((basePort - 20000 + attempt * 10) % 40000));
      if ((await inspectPorts(other, probe, includeSql)).every(port => port.state === 'free')) { alternative = other; break; }
    }
  }
  return { descriptor, ports, conflicts, alternative,
    nextAction: 'Review setup plan and approve its proposed isolated port block. Existing resources are never stopped or migrated automatically.',
    scope: 'Read-only proposal; free ports are observations, not reservations or proof of container ownership.' };
}

export async function initializeWorkspace(root = process.cwd(), selection, probe = portState) {
  const home = realpathSync.native(root);
  if (readWorkspace(home)) throw new Error('Workspace already selected; review existing state instead of overwriting its descriptor.');
  const descriptor = describeWorkspace(home, selection);
  const ports = await inspectPorts(descriptor, probe,
    (await readSqlTarget(home, runtimeFor(undefined, home).defaultSql)).provider === 'container');
  if (ports.some(port => port.state !== 'free')) throw new Error('Selected port block is occupied or unverifiable; rerun setup plan and approve a free alternative.');
  await mkdir(join(home, '.sql-apps'), { recursive: true });
  try { await writeFile(workspaceFile(home), `${JSON.stringify(descriptor, null, 2)}\n`, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('Workspace already selected by another operation; inspect it without overwriting.');
    throw error;
  }
  return runtimeFor(undefined, home);
}
