import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const checkout = fileURLToPath(new URL('../', import.meta.url));
const manifests = [
  'plugin.json', 'gemini-extension.json',
  '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.cursor-plugin/plugin.json',
];
const catalogs = [
  '.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json',
  '.agents/plugins/marketplace.json',
];

export function verifyRelease({ sourceRoot = checkout, installedRoot } = {}) {
  if (!installedRoot) throw new Error('An explicit installed/package root is required');
  const errors = [];
  function resolveRoot(directory, label) {
    try {
      const resolved = realpathSync(directory);
      if (!statSync(resolved).isDirectory()) throw new Error('not a directory');
      return resolved;
    } catch (error) {
      throw new Error(`${label} root: cannot read ${directory}: ${error.message}`);
    }
  }
  sourceRoot = resolveRoot(sourceRoot, 'source');
  installedRoot = resolveRoot(installedRoot, 'installed');
  if (sourceRoot === installedRoot) {
    throw new Error('Installed/package root must be distinct from the source; a plugin-dir loader is not an installation');
  }

  function readMetadata(directory, label) {
    return new Map([...manifests, ...catalogs].map((relative) => {
      try {
        const data = JSON.parse(readFileSync(path.join(directory, relative), 'utf8'));
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('expected a JSON object');
        return [relative, data];
      } catch (error) {
        errors.push(`${label} ${relative}: cannot read JSON: ${error.message}`);
        return [relative, null];
      }
    }));
  }
  const source = readMetadata(sourceRoot, 'source');
  const installed = readMetadata(installedRoot, 'installed');
  const version = source.get('plugin.json')?.version;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    errors.push('source plugin.json: expected a release version such as 0.2.1');
  }
  function checkName(data, expected, label) {
    if (data?.name !== expected) errors.push(`${label}: name ${data?.name}; expected ${expected}`);
  }
  function checkVersion(actual, label) {
    if (actual !== version) errors.push(`${label}: version ${actual}; expected ${version}`);
  }
  for (const [label, metadata] of [['source', source], ['installed', installed]]) {
    for (const relative of manifests) {
      const data = metadata.get(relative);
      if (!data) continue;
      checkName(data, 'sql-apps', `${label} ${relative}`);
      checkVersion(data.version, `${label} ${relative}`);
    }
    for (const relative of catalogs) {
      const data = metadata.get(relative);
      if (!data) continue;
      checkName(data, 'sql-apps-skills', `${label} ${relative}`);
      if (!Array.isArray(data.plugins) || data.plugins.length !== 1) {
        errors.push(`${label} ${relative}: expected exactly one plugin entry`);
      }
      const plugin = data.plugins?.[0];
      checkName(plugin, 'sql-apps', `${label} ${relative} plugin`);
      // Codex deliberately takes the version from its plugin manifest.
      if (relative !== '.agents/plugins/marketplace.json') {
        checkVersion(data.metadata?.version, `${label} ${relative} metadata`);
        checkVersion(plugin?.version, `${label} ${relative} plugin`);
      }
    }
  }
  for (const relative of [...manifests, ...catalogs]) {
    if (source.get(relative) && installed.get(relative) &&
        !isDeepStrictEqual(source.get(relative), installed.get(relative))) {
      errors.push(`metadata differs from source: ${relative}`);
    }
  }

  function payload(directory, label) {
    const files = new Map();
    function walk(relative) {
      try {
        if (lstatSync(path.join(directory, relative)).isSymbolicLink()) {
          errors.push(`${label} ${relative}: linked payload is not an independent package copy`);
          return;
        }
        for (const entry of readdirSync(path.join(directory, relative), { withFileTypes: true })) {
          const file = `${relative}/${entry.name}`;
          if (entry.isSymbolicLink()) {
            errors.push(`${label} ${file}: linked payload is not an independent package copy`);
          } else if (entry.isDirectory()) {
            walk(file);
          } else if (entry.isFile()) {
            files.set(file, readFileSync(path.join(directory, file)));
          } else {
            errors.push(`${label} ${file}: expected a regular payload file`);
          }
        }
      } catch (error) {
        errors.push(`${label} ${relative}: cannot read payload: ${error.message}`);
      }
    }
    walk('skills');
    return files;
  }
  const expected = payload(sourceRoot, 'source');
  const actual = payload(installedRoot, 'installed');
  if (!expected.has('skills/sql-apps/SKILL.md')) errors.push('source skills/sql-apps/SKILL.md: missing required skill');
  for (const [file, bytes] of expected) {
    if (!actual.has(file)) errors.push(`missing payload file: ${file}`);
    else if (!bytes.equals(actual.get(file))) errors.push(`payload bytes differ: ${file}`);
  }
  for (const file of actual.keys()) {
    if (!expected.has(file)) errors.push(`unexpected payload file: ${file}`);
  }
  if (errors.length) throw new Error(`Release verification failed:\n- ${errors.join('\n- ')}`);
  const fingerprint = [...expected.keys()].sort().map((file) => [
    file, createHash('sha256').update(expected.get(file)).digest('hex'),
  ]);
  const payloadDigest = createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
  return { sourceRoot, installedRoot, version, skillFiles: expected.size, payloadDigest };
}

const usage = 'Usage: node scripts/verify-release.mjs --installed-root <installed-or-unpacked-package> [--source-root <checkout>]';

function main(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = { '--installed-root': 'installedRoot', '--source-root': 'sourceRoot' }[args[index]];
    const value = args[index + 1];
    if (!key || options[key] || !value || value.startsWith('--')) {
      console.error(usage);
      return 2;
    }
    options[key] = value;
  }
  if (!options.installedRoot) {
    console.error(usage);
    return 2;
  }
  try {
    const result = verifyRelease(options);
    console.log(`PASS sql-apps ${result.version}: ${result.skillFiles} skill files match byte-for-byte`);
    console.log(`Source: ${result.sourceRoot}\nInstalled/package: ${result.installedRoot}`);
    console.log(`Skill payload SHA-256: ${result.payloadDigest}`);
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
