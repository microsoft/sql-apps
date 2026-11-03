import { cp, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const templates = dirname(fileURLToPath(import.meta.url));
const starter = resolve(templates, '../starter');
const dabPayload = [
  'packages/server', 'tests/server.test.mjs', 'tests/local.test.mjs', 'tests/fixtures/local-process.mjs',
  'packages/data/dab-config.json', 'compose.yml', 'Dockerfile.web', 'Dockerfile.dab',
  'infra/main.bicep', 'infra/main.bicepparam', 'infra/bootstrap.sql',
  'scripts/build-images.mjs',
];

async function safePath(root, file) {
  let target = root;
  for (const part of file.split(/[\\/]/)) {
    target = resolve(target, part);
    try {
      if ((await lstat(target)).isSymbolicLink()) throw new Error(`Refusing symlink in ${file}.`);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }
}

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error('Alternative templates must not contain symlinks.');
    if (entry.isDirectory()) result.push(...await files(resolve(directory, entry.name), name));
    else result.push(name);
  }
  return result;
}

async function unmodified(root, file) {
  await safePath(root, file);
  const source = resolve(starter, file);
  const target = resolve(root, file);
  const original = await lstat(source);
  const current = await lstat(target);
  if (original.isDirectory() !== current.isDirectory()) throw new Error(`Expected unmodified starter ${file}.`);
  const names = original.isDirectory() ? await files(source) : [''];
  if (original.isDirectory() && !isDeepStrictEqual(names.sort(), (await files(target)).sort())) {
    throw new Error(`Unexpected files in ${file}; select alternatives only in a fresh starter.`);
  }
  for (const name of names) {
    if (!(await readFile(resolve(source, name))).equals(await readFile(resolve(target, name)))) {
      throw new Error(`Refusing to replace modified ${file}${name ? `${sep}${name}` : ''}.`);
    }
  }
}

export async function installAlternative(hosting, directory) {
  const publicSubmissions = hosting === 'static-web-apps-public';
  if (publicSubmissions) hosting = 'static-web-apps';
  if (!['app-service-f1', 'static-web-apps'].includes(hosting)) {
    throw new Error('Choose app-service-f1, static-web-apps, or static-web-apps-public and a copied starter application directory.');
  }
  const root = await realpath(resolve(directory));
  const fromTemplates = relative(await realpath(dirname(templates)), root);
  if (!fromTemplates.startsWith('..') && !isAbsolute(fromTemplates)) {
    throw new Error('Never install into the plugin templates.');
  }
  await safePath(root, 'deployment.json');
  await safePath(root, 'package.json');
  const profileFile = resolve(root, 'deployment.json');
  const profile = JSON.parse(await readFile(profileFile, 'utf8'));
  if (!isDeepStrictEqual(profile, { hosting: 'container-apps', api: 'dab' })) {
    throw new Error('Only a fresh default starter can select an alternative; existing profiles require a migration review.');
  }
  const manifestFile = resolve(root, 'package.json');
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const original = JSON.parse(await readFile(resolve(starter, 'package.json'), 'utf8'));
  if (manifest.name !== original.name || !isDeepStrictEqual(manifest.scripts, original.scripts)) {
    throw new Error('Apply alternatives only to an unmodified copied starter manifest.');
  }
  const source = resolve(templates, hosting);
  const sources = new Map((await files(source)).map(file => [file, resolve(source, file)]));
  sources.set('deployment.md', resolve(source, 'deployment.md'));
  if (hosting === 'static-web-apps') sources.set('README.md', resolve(source, 'README.md'));
  if (publicSubmissions) {
    const overlay = resolve(templates, 'public-submissions');
    for (const file of await files(overlay)) sources.set(file, resolve(overlay, file));
    sources.set('public-submissions.md', resolve(templates, '../../references/public-submissions.md'));
    sources.set('README.md', resolve(overlay, 'README.md'));
  }
  const payload = [...sources.keys()];
  const directories = new Set();
  for (const file of payload) {
    for (let directory = dirname(file); directory !== '.'; directory = dirname(directory)) {
      directories.add(directory);
    }
  }
  for (const directory of directories) {
    await safePath(root, directory);
    try { await lstat(resolve(starter, directory)); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try { await lstat(resolve(root, directory)); }
      catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      throw new Error(`Unexpected existing ${directory}; select alternatives only in a fresh starter.`);
    }
  }
  const replacements = ['deployment.md', ...(hosting === 'static-web-apps' ? ['README.md'] : []),
    ...(hosting === 'static-web-apps' ? ['.env.example', 'tsconfig.backend.json',
      ...(publicSubmissions ? ['packages/frontend/src/profile.ts', 'scripts/acceptance.mjs'] : [])] : [])];
  const removals = hosting === 'static-web-apps' ? dabPayload : ['infra/main.bicep', 'infra/main.bicepparam'];
  for (const file of [...removals, ...replacements]) await unmodified(root, file);
  if (publicSubmissions) await unmodified(root, 'packages/data/permissions.sql');
  for (const file of payload) {
    await safePath(root, file);
    try { await lstat(resolve(root, file)); }
    catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (!replacements.includes(file)) {
      throw new Error(`Refusing to overwrite ${file}. Review an existing app rather than overlaying it.`);
    }
  }
  for (const file of payload) {
    const target = resolve(root, file);
    await mkdir(dirname(target), { recursive: true });
    await cp(sources.get(file), target, { force: replacements.includes(file), errorOnExist: !replacements.includes(file) });
  }
  if (publicSubmissions) {
    const grants = await readFile(resolve(root, 'packages/data/public-permissions.sql'), 'utf8');
    for (const [file, principal] of [['permissions.sql', 'app_runtime'], ['functions-permissions.sql', 'app_functions']]) {
      const path = resolve(root, 'packages/data', file);
      await writeFile(path, `${await readFile(path, 'utf8')}\n${grants.replaceAll('app_runtime', principal)}`);
    }
  }
  for (const file of removals) await rm(resolve(root, file), { recursive: true });
  if (hosting === 'static-web-apps') {
    delete manifest.scripts['serve:web'];
    delete manifest.scripts['images:build'];
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  await writeFile(profileFile, `${JSON.stringify({ hosting, api: hosting === 'static-web-apps' ? 'functions' : 'dab',
    ...(publicSubmissions ? { access: 'public-submissions' } : {}) }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await installAlternative(process.argv[2], process.argv[3] || process.cwd());
  console.log('Alternative copied. No tools installed, resources changed, or data migrated.');
  if (['static-web-apps', 'static-web-apps-public'].includes(process.argv[2])) {
    console.log('Refresh the app lockfile with npm install --package-lock-only --ignore-scripts --omit-lockfile-registry-resolved, then npm ci.');
  }
}
