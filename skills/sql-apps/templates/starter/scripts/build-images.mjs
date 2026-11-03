import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { localApi, root } from './config.ts';

function approvedRegistry(value) {
  let registry;
  try { registry = new URL(value); }
  catch { throw new Error('Supply an explicitly approved credential-free HTTPS npm registry URL with --npm-registry.'); }
  if (registry.protocol !== 'https:' || registry.username || registry.password || registry.search || registry.hash) {
    throw new Error('The explicitly approved npm registry must be a credential-free HTTPS URL without query values or fragments.');
  }
  return registry.href;
}

export function buildImages({ webImage, dabImage, npmRegistry, run = spawnSync } = {}) {
  if (localApi() !== 'dab') throw new Error('Functions publishes staged app/API content, not DAB images.');
  for (const image of [webImage, dabImage]) {
    if (typeof image !== 'string' || !/^[a-z0-9][a-zA-Z0-9._:/@-]*$/.test(image) || image.includes('://')) {
      throw new Error('Supply explicit approved web and DAB image names with --web-image and --dab-image.');
    }
  }
  const registry = approvedRegistry(npmRegistry);
  for (const args of [
    ['build', '--build-arg', `NPM_CONFIG_REGISTRY=${registry}`, '--file', 'Dockerfile.web', '--tag', webImage, '.'],
    ['build', '--file', 'Dockerfile.dab', '--tag', dabImage, '.'],
  ]) {
    const result = run('docker', args, { cwd: root, stdio: 'inherit' });
    if (result.error || result.status !== 0) {
      const failure = result.error ? `spawn failed (${result.error.code || 'unknown'})` : `exit code ${result.status}`;
      throw new Error(`Docker ${args[args.indexOf('--file') + 1]} build failed (${failure}) using approved npm route ${registry}. Inspect Docker output; no TLS settings were relaxed.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 6 || args[0] !== '--web-image' || args[2] !== '--dab-image' || args[4] !== '--npm-registry') {
    throw new Error('Usage: npm run images:build -- --web-image <approved-name> --dab-image <approved-name> --npm-registry <approved-https-url>');
  }
  buildImages({ webImage: args[1], dabImage: args[3], npmRegistry: args[5] });
  console.log('Built web/DAB images using the explicitly selected credential-free HTTPS registry. No images published or npm credentials copied.');
}
