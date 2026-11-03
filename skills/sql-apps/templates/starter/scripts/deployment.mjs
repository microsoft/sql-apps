import { access, cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deploymentProfile } from './config.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

export { deploymentProfile };

async function regularDirectory(directory) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Refusing non-directory or symlink: ${directory}`);
}

async function stagedFiles(directory, prefix = '') {
  await regularDirectory(directory);
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Refusing staged symlink: ${name}`);
    if (entry.isDirectory()) {
      // npm ci owns this dependency tree; it must be reinstalled after re-staging.
      if (name !== 'api/node_modules') {
        result.push(`${name}/`, ...await stagedFiles(resolve(directory, entry.name), name));
      }
    } else if (entry.isFile()) result.push(name);
    else throw new Error(`Unrecognized staged entry: ${name}`);
  }
  return result.sort();
}

async function ownedOutput(output, profile) {
  try { await lstat(output); }
  catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  await regularDirectory(output);
  const current = (await stagedFiles(output)).filter(file => file !== '.generated.json');
  let marker;
  try { marker = JSON.parse(await readFile(resolve(output, '.generated.json'), 'utf8')); }
  catch (error) {
    throw new Error('Existing deployment output has no valid generated marker. Preserve it and review the directory.', { cause: error });
  }
  if (!marker || marker.version !== 1 || !isDeepStrictEqual(marker.profile, profile) ||
      !isDeepStrictEqual(marker.entries, current)) {
    throw new Error('Existing deployment output contains unrecognized files or a changed marker. Preserve it and review the directory.');
  }
  return true;
}

export async function prepareDeployment(directory = root) {
  directory = await realpath(directory);
  const profile = deploymentProfile(JSON.parse(await readFile(resolve(directory, 'deployment.json'), 'utf8')));
  await access(resolve(directory, profile.template));
  if (profile.api === 'dab') {
    for (const file of ['Dockerfile.web', 'Dockerfile.dab']) await access(resolve(directory, file));
    return { profile };
  }
  await access(resolve(directory, 'packages/functions/dist/index.js'));
  await access(resolve(directory, 'packages/frontend/dist/index.html'));
  const parent = resolve(directory, '.deployment');
  await mkdir(parent, { recursive: true });
  await regularDirectory(parent);
  const output = resolve(parent, profile.hosting);
  const previous = await ownedOutput(output, profile);
  const staging = await mkdtemp(resolve(parent, '.stage-'));
  let backup;
  try {
    await cp(resolve(directory, 'packages/frontend/dist'), resolve(staging, 'app'), { recursive: true });
    await mkdir(resolve(staging, 'api'));
    for (const file of ['dist', 'host.json', 'package.json', 'package-lock.json']) {
      await cp(resolve(directory, 'packages/functions', file), resolve(staging, 'api', file), {
        recursive: true, dereference: false, filter: source => !/\.(pem|key)$/i.test(source),
      });
    }
    await cp(resolve(directory, 'staticwebapp.config.json'), resolve(staging, 'app/staticwebapp.config.json'));
    await writeFile(resolve(staging, 'profile.json'), `${JSON.stringify(profile, null, 2)}\n`);
    await writeFile(resolve(staging, '.generated.json'), `${JSON.stringify({
      version: 1, profile, entries: await stagedFiles(staging),
    }, null, 2)}\n`);
    if (previous) {
      backup = `${staging}-previous`;
      await rename(output, backup);
    }
    try { await rename(staging, output); }
    catch (error) {
      if (backup) {
        try { await rename(backup, output); }
        catch (restoreError) {
          throw new AggregateError([error, restoreError], `Staging failed; previous output remains at ${backup}.`);
        }
      }
      throw error;
    }
    if (backup) await rm(backup, { recursive: true });
    return { profile, output };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { profile, output } = await prepareDeployment();
  console.log(output ? `Prepared ${profile.hosting}/${profile.api}: ${output}` : `Validated ${profile.hosting}/${profile.api} container recipe.`);
  console.log(`Infrastructure: ${profile.template}. No Azure operations performed.`);
  if (profile.api === 'functions') {
    console.log('Install API production dependencies with npm ci --omit=dev --ignore-scripts --prefix <output>\\api before publishing.');
  } else {
    console.log('Build and publish Dockerfile.web and Dockerfile.dab separately; the profile does not deploy images.');
  }
}
