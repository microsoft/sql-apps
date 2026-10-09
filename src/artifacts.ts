import { deploymentSchema, type DeploymentConfig } from './config.js';
import type { Run } from './process.js';

export const imageFields = ['gatewayImage', 'dabImage', 'functionsImage'] as const;
export const pinnedDabImage = 'mcr.microsoft.com/azure-databases/data-api-builder:2.0.12@sha256:85db5c7f1af9d0bc93af824a0602285880a07dba210854bc68394e08d9d338ac';

export async function imageDigest(image: string, config: DeploymentConfig, run: Run): Promise<string> {
  const reference = image.slice(config.registryServer.length + 1);
  const digest = (await run('az', ['acr', 'repository', 'show',
    '--subscription', config.subscriptionId, '--name', config.registryServer.split('.')[0]!,
    '--image', reference, '--query', 'digest', '-o', 'tsv'])).trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error(`ACR returned an invalid digest for ${reference}`);
  if (image.includes('@') && image.split('@')[1] !== digest) throw new Error(`ACR digest mismatch for ${reference}`);
  const repository = reference.split('@')[0]!.split(':')[0]!;
  return `${config.registryServer}/${repository}@${digest}`;
}

export async function buildArtifacts(config: DeploymentConfig, run: Run): Promise<DeploymentConfig> {
  if (imageFields.some(field => config[field].includes('@'))) {
    throw new Error('Artifact builds require new version tags for all three configured images, not digests');
  }
  if (new Set(imageFields.map(field => config[field])).size !== imageFields.length) {
    throw new Error('Artifact builds require distinct gateway, DAB and Functions image references');
  }
  await run('az', ['acr', 'show', '--subscription', config.subscriptionId,
    '--resource-group', config.resourceGroup, '--name', config.registryServer.split('.')[0]!, '-o', 'none']);
  const dockerfiles = ['Dockerfile', 'dab/Dockerfile', 'functions/Dockerfile'];
  const pinned = { ...config };
  for (const [index, field] of imageFields.entries()) {
    await run('az', ['acr', 'build', '--subscription', config.subscriptionId,
      '--registry', config.registryServer.split('.')[0]!, '--image', config[field].slice(config.registryServer.length + 1),
      '--file', dockerfiles[index]!, '.']);
    pinned[field] = await imageDigest(config[field], config, run);
  }
  return deploymentSchema.parse(pinned);
}
