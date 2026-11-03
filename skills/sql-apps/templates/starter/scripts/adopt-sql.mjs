import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readEnvironment, root } from './config.ts';

async function noSymlink(directory, file) {
  let current = directory;
  for (const part of file.split('/')) {
    current = resolve(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Refusing redirected adoption path: ${file}`);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }
}

function inspect(args, directory) {
  const result = spawnSync('docker', args, { cwd: directory, encoding: 'utf8', timeout: 15_000 });
  if (result.error || result.status !== 0) {
    throw new Error('Docker inspection failed. The exact immutable image must already be cached; no pull or login is performed.');
  }
  return result.stdout.trim();
}

export async function adoptSqlImage({ directory = root, image, reason, env = readEnvironment(), run = inspect } = {}) {
  directory = await realpath(directory);
  for (const file of ['baseline.json', 'compose.sql.yml', '.local/sql-image-adoptions']) await noSymlink(directory, file);
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
    throw new Error('Record a non-secret approval reason of 1 to 1000 characters.');
  }
  if (typeof image !== 'string' || !/^[a-z0-9][a-z0-9._:/-]*@sha256:[a-f0-9]{64}$/.test(image)) {
    throw new Error('Specify an immutable repository@sha256:digest, never a mutable tag.');
  }
  const previousBaseline = await readFile(resolve(directory, 'baseline.json'), 'utf8');
  const baseline = JSON.parse(previousBaseline);
  const previousImage = baseline.images?.sql;
  if (typeof previousImage !== 'string' || image.split('@')[0] !== previousImage.split('@')[0]) {
    throw new Error('Cached adoption must keep the approved SQL image repository.');
  }
  if (image === previousImage) throw new Error('This immutable SQL image is already the recorded baseline.');
  const compose = await readFile(resolve(directory, 'compose.sql.yml'), 'utf8');
  const reference = `image: ${previousImage}`;
  const imageLines = compose.split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith('image:'));
  if (imageLines.length !== 1 || imageLines[0] !== reference) {
    throw new Error('The SQL Compose image reference differs from baseline.json. Review the existing app before adoption.');
  }
  if (!/^sqlapps-[a-f0-9]{12}$/.test(env.COMPOSE_PROJECT_NAME || '')) {
    throw new Error('Run local:init first so adoption can inspect only this app-owned Compose project.');
  }
  const states = run(['ps', '--all', '--filter', `label=com.docker.compose.project=${env.COMPOSE_PROJECT_NAME}`, '--format', '{{.State}}'], directory);
  if (states.split(/\r?\n/).some(state => state && !['exited', 'created', 'dead'].includes(state))) {
    throw new Error('Stop this app before changing its SQL image. No running or paused project containers may remain.');
  }
  const metadata = JSON.parse(run(['image', 'inspect', image], directory));
  if (!Array.isArray(metadata) || metadata.length !== 1 || !metadata[0] || !Array.isArray(metadata[0].RepoDigests) ||
      !metadata[0].RepoDigests.includes(image) ||
      metadata[0].Os !== 'linux' || metadata[0].Architecture !== 'amd64') {
    throw new Error('The exact repository digest must be cached as linux/amd64. Image compatibility is not inferred.');
  }
  const history = resolve(directory, '.local/sql-image-adoptions');
  await mkdir(history, { recursive: true });
  const record = resolve(history, `${randomUUID()}.json`);
  const entry = {
    at: new Date().toISOString(), reason: reason.trim(), previousImage, image,
    previousBaseline, previousCompose: compose, imageId: metadata[0].Id,
    platform: 'linux/amd64', status: 'pending-application',
    requiredChecks: ['EngineEdition 5', 'appdb', 'migrations and permissions', 'selected API authenticated integration'],
  };
  await writeFile(record, `${JSON.stringify(entry, null, 2)}\n`, { flag: 'wx' });
  baseline.images.sql = image;
  try {
    await writeFile(resolve(directory, 'baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`);
    await writeFile(resolve(directory, 'compose.sql.yml'), compose.replace(reference, `image: ${image}`));
    entry.status = 'pending-integration';
    await writeFile(record, `${JSON.stringify(entry, null, 2)}\n`);
  } catch (error) {
    const failures = [error];
    for (const [file, contents] of [['baseline.json', previousBaseline], ['compose.sql.yml', compose]]) {
      try { await writeFile(resolve(directory, file), contents); }
      catch (restoreError) { failures.push(restoreError); }
    }
    throw new AggregateError(failures, `SQL adoption failed. Inspect the preserved original configuration in ${record}; do not start until both references agree.`);
  }
  return { image, record };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--image' || args[2] !== '--reason') {
    throw new Error('Usage: npm run local:adopt-sql -- --image <approved-repository@sha256:digest> --reason "<non-secret approval reason>"');
  }
  const result = await adoptSqlImage({ image: args[1], reason: args[3] });
  console.log(`Recorded explicit cached SQL image adoption: ${result.record}`);
  console.log('Engine, appdb, migrations/permissions and selected-API authenticated integration checks remain pending. No containers started, data reset, images pulled, or compatibility certified.');
}
