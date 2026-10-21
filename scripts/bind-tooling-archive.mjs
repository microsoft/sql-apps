import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual, promisify } from 'node:util';
import { withFileLock } from '../src/file-lock.mjs';
import { readProjectManifest } from '../src/project-contract.mjs';

const execute = promisify(execFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function regularFile(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Expected an unlinked regular file: ${path}`);
  return readFile(path);
}

export async function inspectToolingArchive(path) {
  if (!isAbsolute(path)) throw new Error('Select an absolute tooling archive path.');
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024 * 1024) {
    throw new Error('Tooling archive must be an unlinked regular file no larger than 32 MiB.');
  }
  const bytes = await readFile(path);
  if (bytes.length !== info.size) throw new Error('Tooling archive changed during inspection; review it again.');
  const temporary = await mkdtemp(join(tmpdir(), 'sql-apps-archive-inspect-'));
  try {
    const copy = join(temporary, 'runtime.tgz');
    await writeFile(copy, bytes, { flag: 'wx' });
    const { stdout } = await execute('tar', ['-xOf', copy, 'package/package.json'],
      { windowsHide: true, timeout: 10000, maxBuffer: 64 * 1024 });
    return { bytes, metadata: JSON.parse(stdout), sha256: hash(bytes),
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function bindingContext(project, archive) {
  if (!isAbsolute(project) || !isAbsolute(archive)) throw new Error('Select absolute project and archive paths.');
  const home = await realpath(project);
  try {
    const directoryInfo = await lstat(join(home, 'tooling'));
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) throw new Error('Project tooling directory must not be linked.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const manifest = await readProjectManifest(home);
  const [packageBytes, lockBytes, inspected] = await Promise.all([
    regularFile(join(home, 'package.json')), regularFile(join(home, 'package-lock.json')), inspectToolingArchive(archive),
  ]);
  const pkg = JSON.parse(packageBytes);
  const lock = JSON.parse(lockBytes);
  const version = manifest.tooling.version;
  const locked = lock.packages?.['node_modules/@microsoft/sql-apps'];
  if (pkg.sqlApps?.project !== true || pkg.dependencies?.['@microsoft/sql-apps'] !== version ||
      lock.lockfileVersion !== 3 || lock.packages?.['']?.dependencies?.['@microsoft/sql-apps'] !== version ||
      locked?.version !== version) {
    throw new Error('Project package and lockfile must match the exact tooling pin before binding an archive.');
  }
  if (inspected.metadata.name !== '@microsoft/sql-apps' || inspected.metadata.version !== version) {
    throw new Error(`Archive must match @microsoft/sql-apps@${version}; no version or package substitution is allowed.`);
  }
  for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
    if (!isDeepStrictEqual(inspected.metadata[key] ?? {}, locked[key] ?? {})) {
      throw new Error(`Archive ${key} do not match the locked tooling dependencies; obtain the matching release before restoring.`);
    }
  }
  let docker;
  try { docker = (await regularFile(join(home, 'Dockerfile'))).toString(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let nextDocker = docker;
  if (docker?.includes('RUN npm ci') &&
      (docker.indexOf('COPY tooling/ ./tooling/') < 0 || docker.indexOf('COPY tooling/ ./tooling/') > docker.indexOf('RUN npm ci'))) {
    if (!/^COPY package(?:\*|\.json package-lock\.json)[^\r\n]*$/m.test(docker)) {
      throw new Error('Dockerfile must copy tooling/ before npm ci; update the custom Dockerfile and review binding again.');
    }
    nextDocker = docker.replace(/(^COPY package(?:\*|\.json package-lock\.json)[^\r\n]*)(\r?\n)/m,
      '$1$2COPY tooling/ ./tooling/$2');
  }
  const relativeArchive = `tooling/microsoft-sql-apps-${version}-${inspected.sha256.slice(0, 16)}.tgz`;
  const effects = [
    `Copy the reviewed archive into ${join(home, ...relativeArchive.split('/'))}; retain it with the project.`,
    'Set package-lock.json to that relative archive and its SHA-512 integrity; preserve the exact package.json and project manifest version.',
    ...(nextDocker !== docker ? ['Copy tooling/ into the Docker build before npm ci.'] : []),
    'No install, package scripts, build, database changes, services or cloud operations. Review restore permissions separately.',
  ];
  const approval = hash(JSON.stringify({ home, archive, archiveHash: inspected.sha256, packageHash: hash(packageBytes),
    lockHash: hash(lockBytes), manifest, docker, effects })).slice(0, 12);
  return { home, manifest, packageBytes, lock, lockBytes, docker, nextDocker, inspected,
    plan: { home, archive, version, relativeArchive, sha256: inspected.sha256, integrity: inspected.integrity, effects, approval } };
}

export async function planToolingArchive(project, archive) {
  return (await bindingContext(project, archive)).plan;
}

async function writeAtomic(path, text) {
  const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, text, { flag: 'wx' });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function bindToolingArchive(project, archive, approval) {
  if (!isAbsolute(project) || !isAbsolute(archive)) throw new Error('Select absolute project and archive paths.');
  const home = await realpath(project);
  return withFileLock(join(home, '.sql-apps-tooling-bind.lock'), async () => {
    const context = await bindingContext(home, archive);
    const { plan, inspected, lock } = context;
    if (approval !== plan.approval) throw new Error('Review the current archive binding plan and pass its approval id.');
    const directory = join(home, 'tooling');
    await mkdir(directory, { recursive: true });
    const directoryInfo = await lstat(directory);
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) throw new Error('Project tooling directory must not be linked.');
    const destination = join(home, ...plan.relativeArchive.split('/'));
    try { await writeFile(destination, inspected.bytes, { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (!(await regularFile(destination)).equals(inspected.bytes)) throw new Error('Existing project archive differs; nothing was overwritten.');
    }
    if (!(await regularFile(join(home, 'package-lock.json'))).equals(context.lockBytes) ||
        !(await regularFile(join(home, 'package.json'))).equals(context.packageBytes) ||
        !isDeepStrictEqual(await readProjectManifest(home), context.manifest)) {
      throw new Error('Project metadata changed during binding; review a new approval.');
    }
    if (context.nextDocker !== context.docker) {
      if ((await regularFile(join(home, 'Dockerfile'))).toString() !== context.docker) {
        throw new Error('Dockerfile changed during binding; review a new approval.');
      }
      await writeAtomic(join(home, 'Dockerfile'), context.nextDocker);
    }
    lock.packages['node_modules/@microsoft/sql-apps'].resolved = `file:${plan.relativeArchive}`;
    lock.packages['node_modules/@microsoft/sql-apps'].integrity = plan.integrity;
    await writeAtomic(join(home, 'package-lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
    return plan;
  }, 5);
}

export async function main(args = process.argv.slice(2)) {
  const options = {};
  let invalid = args.length !== 4 && args.length !== 6;
  for (let i = 0; i < args.length; i += 2) {
    const key = { '--project': 'project', '--archive': 'archive', '--approve': 'approval' }[args[i]];
    if (!key || options[key] !== undefined || !args[i + 1]) invalid = true;
    else options[key] = args[i + 1];
  }
  if (invalid || !options.project || !options.archive) {
    throw new Error('Usage: sql-apps bind-archive --project <absolute-project> --archive <absolute-tgz> [--approve <plan-id>] (or npm run tooling:bind -- ...)');
  }
  const plan = await (options.approval ? bindToolingArchive(options.project, options.archive, options.approval) :
    planToolingArchive(options.project, options.archive));
  console.log(JSON.stringify({ ...plan, applied: Boolean(options.approval) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(`Archive binding failed: ${error.message}`);
    process.exitCode = 1;
  });
}
