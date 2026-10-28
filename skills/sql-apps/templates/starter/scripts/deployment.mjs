import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './config.mjs';

export function deploymentProfile(value) {
  const profiles = {
    'container-apps': { api: 'dab', template: 'infra/main.bicep' },
    'app-service-f1': { api: 'dab', template: 'infra/app-service-f1.bicep' },
    'static-web-apps': { api: 'functions', template: 'infra/static-web-apps.bicep' },
  };
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !['hosting', 'api'].includes(key)) ||
      !Object.hasOwn(profiles, value.hosting) || value.api !== profiles[value.hosting].api) {
    throw new Error('deployment.json must select container-apps/dab, app-service-f1/dab, or static-web-apps/functions.');
  }
  return { ...value, template: profiles[value.hosting].template };
}

export async function prepareDeployment(directory = root) {
  const profile = deploymentProfile(JSON.parse(await readFile(resolve(directory, 'deployment.json'), 'utf8')));
  const output = resolve(directory, '.deployment', profile.hosting);
  // Refuse existing output rather than mixing stale code or dependencies with a new artifact.
  await mkdir(resolve(directory, '.deployment'), { recursive: true });
  await mkdir(output);
  if (profile.hosting === 'static-web-apps') {
    await cp(resolve(directory, 'packages/frontend/dist'), resolve(output, 'app'), { recursive: true });
    await cp(resolve(directory, 'packages/functions'), resolve(output, 'api'), {
      recursive: true,
      filter: source => {
        const name = source.split(/[\\/]/).at(-1);
        return name !== 'node_modules' && !name.startsWith('local.settings') &&
          !name.startsWith('.env') && !/\.(pem|key)$/i.test(name);
      },
    });
    await cp(resolve(directory, 'staticwebapp.config.json'), resolve(output, 'app/staticwebapp.config.json'));
  }
  await writeFile(resolve(output, 'profile.json'), `${JSON.stringify(profile, null, 2)}\n`);
  return { profile, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { profile, output } = await prepareDeployment();
  console.log(`Prepared ${profile.hosting}/${profile.api}: ${output}`);
  console.log(`Infrastructure: ${profile.template}. No Azure operations performed.`);
  if (profile.api === 'functions') {
    console.log('Install API production dependencies with npm ci --omit=dev --ignore-scripts --prefix <output>\\api before publishing.');
  } else {
    console.log('Build and publish Dockerfile.web and Dockerfile.dab separately; the profile does not deploy images.');
  }
}
