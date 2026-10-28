import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

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
  if (profile.api === 'functions') {
    await access(resolve(directory, 'packages/functions/dist/index.js'));
  }
  const output = resolve(directory, '.deployment', profile.hosting);
  // Refuse existing output rather than mixing stale code or dependencies with a new artifact.
  await mkdir(resolve(directory, '.deployment'), { recursive: true });
  await mkdir(output);
  if (profile.hosting === 'static-web-apps') {
    await cp(resolve(directory, 'packages/frontend/dist'), resolve(output, 'app'), { recursive: true });
    await mkdir(resolve(output, 'api'));
    for (const file of ['dist', 'host.json', 'package.json', 'package-lock.json']) {
      await cp(resolve(directory, 'packages/functions', file), resolve(output, 'api', file), {
        recursive: true,
        filter: source => !/\.(pem|key)$/i.test(source),
      });
    }
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
