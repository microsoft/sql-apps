import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { localApi, root } from './config.ts';

export function buildImages({ webImage, dabImage, run = spawnSync } = {}) {
  if (localApi() !== 'dab') throw new Error('Functions publishes staged app/API content, not DAB images.');
  for (const image of [webImage, dabImage]) {
    if (typeof image !== 'string' || !/^[a-z0-9][a-zA-Z0-9._:/@-]*$/.test(image) || image.includes('://')) {
      throw new Error('Supply explicit approved web and DAB image names with --web-image and --dab-image.');
    }
  }
  const discovery = process.platform === 'win32'
    ? run(process.env.ComSpec, ['/d', '/s', '/c', 'npm config get registry'], { cwd: root, encoding: 'utf8', timeout: 15_000 })
    : run('npm', ['config', 'get', 'registry'], { cwd: root, encoding: 'utf8', timeout: 15_000 });
  if (discovery.error || discovery.status !== 0) {
    throw new Error('Host npm registry discovery failed. Check npm configuration without publishing credentials.');
  }
  let registry;
  try { registry = new URL(discovery.stdout.trim()); }
  catch { throw new Error('Host npm registry configuration must be a credential-free HTTPS URL.'); }
  if (registry.protocol !== 'https:' || registry.username || registry.password || registry.search || registry.hash) {
    throw new Error('Host npm registry configuration must be a credential-free HTTPS URL.');
  }
  for (const args of [
    ['build', '--build-arg', `NPM_CONFIG_REGISTRY=${registry.href}`, '--file', 'Dockerfile.web', '--tag', webImage, '.'],
    ['build', '--file', 'Dockerfile.dab', '--tag', dabImage, '.'],
  ]) {
    const result = run('docker', args, { cwd: root, stdio: 'inherit' });
    if (result.error || result.status !== 0) {
      throw new Error(`Docker ${args[args.indexOf('--file') + 1]} build failed. Inspect its output; an npm wrapper error alone does not establish a network or TLS cause. No TLS settings were relaxed.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--web-image' || args[2] !== '--dab-image') {
    throw new Error('Usage: npm run images:build -- --web-image <approved-name> --dab-image <approved-name>');
  }
  buildImages({ webImage: args[1], dabImage: args[3] });
  console.log('Built web/DAB images using the host HTTPS package registry. No images published or npm credentials copied.');
}
