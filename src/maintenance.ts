import { type DeploymentConfig } from './config.js';
import { type DeploymentState } from './deployment.js';
import { type Run } from './process.js';
import { build } from 'esbuild';
import { imageDigest } from './artifacts.js';

export async function deployStatic(
  config: DeploymentConfig, state: DeploymentState, run: Run,
  buildAssets: () => Promise<void> = async () => {
    await build({ entryPoints: ['src/web/app.ts'], bundle: true, format: 'esm', outfile: 'public/app.js' });
  },
): Promise<DeploymentConfig> {
  const currentImage = (await run('az', ['containerapp', 'show', '--name', state.outputs.gatewayName,
    '--resource-group', config.resourceGroup, '--subscription', config.subscriptionId,
    '--query', 'properties.template.containers[0].image', '-o', 'tsv'])).trim();
  if (!currentImage.startsWith(`${config.registryServer}/`) || !/@sha256:[a-f0-9]{64}$/.test(currentImage)) {
    throw new Error('Static-only deployment requires the current gateway image to be pinned to an ACR digest');
  }
  if (!config.gatewayImage.startsWith(`${config.registryServer}/`) || config.gatewayImage.includes('@')) {
    throw new Error('Set gatewayImage to a new version tag for the static-only build output');
  }
  await buildAssets();
  await run('az', ['acr', 'build', '--subscription', config.subscriptionId, '--registry', config.registryServer.split('.')[0]!,
    '--image', config.gatewayImage.slice(config.registryServer.length + 1), '--file', 'infra/static.Dockerfile',
    '--build-arg', `RUNTIME_IMAGE=${currentImage}`, '.']);
  const pinned = { ...config, gatewayImage: await imageDigest(config.gatewayImage, config, run) };
  await updateImage('gateway', pinned, state, run);
  return pinned;
}

export async function updateImage(
  target: 'gateway' | 'functions', config: DeploymentConfig, state: DeploymentState, run: Run,
): Promise<void> {
  if (!state.outputs.gatewayUrl) throw new Error('Complete a full deployment before image-only updates');
  if (target === 'gateway') {
    await run('az', ['containerapp', 'update', '--name', state.outputs.gatewayName, '--resource-group', config.resourceGroup,
      '--subscription', config.subscriptionId, '--image', config.gatewayImage, '-o', 'none']);
  } else {
    await run('az', ['functionapp', 'config', 'container', 'set', '--name', state.outputs.functionsName,
      '--resource-group', config.resourceGroup, '--subscription', config.subscriptionId,
      '--image', config.functionsImage, '--registry-server', `https://${config.registryServer}`, '-o', 'none']);
  }
}

export async function setSecret(
  name: string, value: string, config: DeploymentConfig, state: DeploymentState, run: Run,
): Promise<void> {
  if (!/^[a-zA-Z0-9-]{1,127}$/.test(name)) throw new Error('Invalid Key Vault secret name');
  if (!value) throw new Error('Secret value must not be empty');
  await run('az', ['keyvault', 'secret', 'set', '--vault-name', state.outputs.vaultName,
    '--subscription', config.subscriptionId, '--name', name, '--value', value, '-o', 'none']);
}
