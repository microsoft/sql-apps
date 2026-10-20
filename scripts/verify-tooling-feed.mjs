import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createProject } from './projects.mjs';
import { bindToolingArchive, planToolingArchive } from './bind-tooling-archive.mjs';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function verifyToolingFeed(source, registry, archive) {
  if (!registry && !archive) throw new Error('Explicitly select a registry or release archive for verification.');
  const url = registry ? new URL(registry) : undefined;
  if (url && (url.username || url.password ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')))) {
    throw new Error('Use an HTTPS registry without embedded credentials; HTTP is allowed only on 127.0.0.1 for tests.');
  }
  const expected = JSON.parse(await readFile(join(source, 'packages', 'sql-apps', 'package.json'), 'utf8'));
  const userHome = await mkdtemp(join(tmpdir(), 'sql-apps-feed-check-'));
  try {
    const project = await createProject(source, 'Feed Verification', { userHome, initializeGit: false });
    if (url) await writeFile(join(project.path, '.npmrc'), `registry=${url.href}\n@microsoft:registry=${url.href}\n`);
    if (archive) {
      const plan = await planToolingArchive(project.path, archive);
      await bindToolingArchive(project.path, archive, plan.approval);
    }
    const options = { cwd: project.path, windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024 };
    const args = ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--no-update-notifier', '--fetch-retries=0',
      '--fetch-timeout=30000', '--cache', join(userHome, 'empty-cache'),
      ...(url ? ['--registry', url.href] : [])];
    if (process.platform === 'win32') {
      const npm = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
      if (!isAbsolute(npm) || !(await lstat(npm)).isFile()) {
        throw new Error('npm CLI unavailable; run through npm run tooling:verify-feed or review your Node installation.');
      }
      await execute(process.execPath, [npm, ...args], options);
    } else {
      await execute('npm', args, options);
    }
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
      console.log(`Verified ${report.name}@${report.version} from ${report.archive ?? report.registry}: clean generated-project npm ci and CLI startup passed.`);
    }).catch(error => {
      console.error(`Release verification failed; installation is not accepted: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
