import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createProject } from './projects.mjs';
import { inspectToolingArchive } from './bind-tooling-archive.mjs';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function npm(args, cwd, cache, registry) {
  const options = { cwd, windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024 };
  args = [...args, '--ignore-scripts', '--no-audit', '--no-fund', '--no-update-notifier',
    '--fetch-retries=0', '--fetch-timeout=30000', '--cache', cache,
    ...(registry ? ['--registry', registry] : [])];
  if (process.platform !== 'win32') return execute('npm', args, options);
  const cli = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!isAbsolute(cli) || !(await lstat(cli)).isFile()) {
    throw new Error('npm CLI unavailable; run through npm run tooling:verify-feed or review your Node installation.');
  }
  return execute(process.execPath, [cli, ...args], options);
}

async function installedPackage(home, expected) {
  const tools = join(home, 'node_modules', '@microsoft', 'sql-apps');
  const pkg = JSON.parse(await readFile(join(tools, 'package.json'), 'utf8'));
  assert.equal(pkg.name, expected.name, 'Installed tooling name differs from the release.');
  assert.equal(pkg.version, expected.version, 'Installed tooling version differs from the project pin.');
  assert.deepEqual(pkg.bin, expected.bin, 'Installed CLI differs from the release.');
  return { tools, bin: join(tools, pkg.bin['sql-apps']), pkg };
}

async function verifyArchive(expected, archive, registry) {
  const inspected = await inspectToolingArchive(archive);
  assert.equal(inspected.metadata.name, expected.name, 'Archive package must match the release.');
  assert.equal(inspected.metadata.version, expected.version, 'Archive version must match the release.');
  assert.deepEqual(inspected.metadata.dependencies ?? {}, expected.dependencies ?? {},
    'Archive dependencies must match the release.');
  const userHome = await realpath(await mkdtemp(join(tmpdir(), 'sql-apps-archive bootstrap ')));
  try {
    const incoming = join(userHome, 'incoming');
    const bootstrap = join(userHome, 'bootstrap');
    await mkdir(incoming);
    await mkdir(bootstrap);
    const candidate = join(incoming, 'candidate.tgz');
    await writeFile(candidate, inspected.bytes, { flag: 'wx' });
    await npm(['install', '--prefix', bootstrap, '--no-save', '--package-lock=false', candidate],
      userHome, join(userHome, 'bootstrap-cache'), registry);
    const tool = await installedPackage(bootstrap, expected);
    const env = { ...process.env, HOME: userHome, USERPROFILE: userHome,
      SQL_APPS_HOME: undefined, SQL_APPS_FOUNDATION_HOME: undefined,
      SQL_APPS_PROJECT_HOME: undefined, SQL_APPS_TOOLING_HOME: undefined,
      COPILOT_HOME: join(userHome, 'unused-profile'), NODE_ENV: 'test', SQL_APPS_LOCAL_AUTH: 'preview' };
    async function cli(args, cwd = userHome, allowBlocked = false) {
      try {
        return await execute(process.execPath, [tool.bin, ...args],
          { cwd, env, windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
      } catch (error) {
        if (allowBlocked && error.code === 1) return error;
        throw error;
      }
    }
    const plan = JSON.parse((await cli(['projects', 'create-plan', 'Archive Verification', '--archive', candidate])).stdout);
    assert.match(plan.approval, /^[a-f0-9]{12}$/);
    const project = JSON.parse((await cli(['projects', 'create', 'Archive Verification', '--archive', candidate,
      '--approval', plan.approval])).stdout);
    assert.equal(project.path, plan.home);
    assert.equal(plan.archive.sha256, inspected.sha256);
    const lock = JSON.parse(await readFile(join(project.path, 'package-lock.json'), 'utf8'));
    const relativeArchive = lock.packages['node_modules/@microsoft/sql-apps'].resolved.slice('file:'.length);
    const before = JSON.parse((await cli(['setup', 'plan', '--json'], project.path, true)).stdout);
    assert.equal(before.home, project.path);
    assert.equal(before.bootstrap, true);
    assert.equal(before.stages.find(stage => stage.id === 'build').status, 'blocked');
    await npm(['ci'], project.path, join(userHome, 'app-cache'), registry);
    const installed = await installedPackage(project.path, expected);
    const { stdout } = await execute(process.execPath, [installed.bin, '--help'],
      { cwd: project.path, env, windowsHide: true, timeout: 10000 });
    const handoff = JSON.parse((await cli(['workspace-check'], project.path)).stdout);
    assert.equal(handoff.bound.bootstrap, false);
    assert.equal(handoff.bound.toolingHome, await realpath(installed.tools));

    await execute('git', ['add', '-A'], { cwd: project.path, windowsHide: true });
    const tracked = (await execute('git', ['ls-files', '-z'], { cwd: project.path, windowsHide: true })).stdout.split('\0').filter(Boolean);
    assert.ok(tracked.includes(relativeArchive), 'The relative runtime archive must be retained in Git.');
    assert.equal(tracked.some(path => path.startsWith('.sql-apps/')), false);
    const independent = join(userHome, 'independent-app');
    for (const file of tracked) {
      const destination = join(independent, ...file.split('/'));
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(join(project.path, ...file.split('/')), destination);
    }
    await rm(project.path, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    await rm(bootstrap, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    await rm(incoming, { recursive: true, force: true });
    await npm(['ci'], independent, join(userHome, 'independent-cache'), registry);
    const restored = await installedPackage(independent, expected);
    await execute(process.execPath, [restored.bin, 'guide', '--json'], { cwd: independent, env, windowsHide: true, timeout: 10000 });
    return { name: restored.pkg.name, version: restored.pkg.version, archive, registry, cliOutput: stdout,
      bootstrapCreated: true, bootstrapPlanning: true, installedHandoff: true, independentRestore: true, installOnly: true };
  } finally {
    await rm(userHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

export async function verifyToolingFeed(source, registry, archive) {
  if (!registry && !archive) throw new Error('Explicitly select a registry or release archive for verification.');
  const url = registry ? new URL(registry) : undefined;
  if (url && (url.username || url.password ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')))) {
    throw new Error('Use an HTTPS registry without embedded credentials; HTTP is allowed only on 127.0.0.1 for tests.');
  }
  const expected = JSON.parse(await readFile(join(source, 'packages', 'sql-apps', 'package.json'), 'utf8'));
  if (archive) return verifyArchive(expected, archive, url?.href);
  const userHome = await mkdtemp(join(tmpdir(), 'sql-apps-feed-check-'));
  try {
    const project = await createProject(source, 'Feed Verification', { userHome, initializeGit: false });
    if (url) await writeFile(join(project.path, '.npmrc'), `registry=${url.href}\n@microsoft:registry=${url.href}\n`);
    const options = { cwd: project.path, windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024 };
    await npm(['ci'], project.path, join(userHome, 'empty-cache'), url?.href);
    const installedHome = join(project.path, 'node_modules', '@microsoft', 'sql-apps');
    const installed = JSON.parse(await readFile(join(installedHome, 'package.json'), 'utf8'));
    assert.equal(installed.name, expected.name, 'Installed tooling name differs from the release.');
    assert.equal(installed.version, expected.version, 'Installed tooling version differs from the project pin.');
    const { stdout } = await execute(process.execPath, [join(installedHome, installed.bin['sql-apps']), '--help'],
      { ...options, timeout: 10000 });
    return { name: installed.name, version: installed.version, registry, archive, cliOutput: stdout };
  } finally {
    await rm(userHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || !['--registry', '--archive'].includes(args[0])) {
    console.error('Usage: npm run tooling:verify-feed -- --registry <registry-url> | npm run tooling:verify-archive -- <absolute-tgz>');
    process.exitCode = 1;
  } else {
    verifyToolingFeed(root, args[0] === '--registry' ? args[1] : undefined, args[0] === '--archive' ? args[1] : undefined).then(report => {
      console.log(`Verified ${report.name}@${report.version} from ${report.archive ?? report.registry}: ${report.independentRestore ? 'archive-only creation, binding, installed handoff and independent restore' : 'clean generated-project npm ci and CLI startup'} passed (installation lane; not app/SQL/browser acceptance).`);
    }).catch(error => {
      console.error(`Release verification failed; installation is not accepted: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
