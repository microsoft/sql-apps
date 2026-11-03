import { deploymentProfile } from './config.ts';

const deploymentPhases = Object.freeze(['publish', 'foundation', 'bootstrap', 'applications', 'verify']);
const inputKeys = Object.freeze([
  'applicationName',
  'targetTenant',
  'targetSubscription',
  'hostingRegion',
  'sqlRegion',
  'ownerIdentity',
  'database',
  'resourceReuse',
  'size',
]);

const shapes = {
  'container-apps/dab': {
    id: 'container-apps-dab',
    revision: '1.0.0',
    status: 'experimental',
    phases: deploymentPhases,
    artifacts: ['web-image', 'dab-image', 'infrastructure'],
    inputKeys,
  },
  'app-service-f1/dab': {
    id: 'app-service-f1-dab',
    revision: '1.0.0',
    status: 'experimental',
    phases: deploymentPhases,
    artifacts: ['web-image', 'dab-image', 'infrastructure'],
    inputKeys,
  },
  'static-web-apps/functions': {
    id: 'static-web-apps-functions',
    revision: '1.0.0',
    status: 'experimental',
    phases: deploymentPhases,
    artifacts: ['static-web-app', 'functions-package', 'infrastructure'],
    inputKeys,
  },
};

export function resolveShape(profile) {
  const validated = deploymentProfile({
    hosting: profile?.hosting,
    api: profile?.api,
    ...(profile?.access === undefined ? {} : { access: profile.access }),
  });
  const shape = shapes[`${validated.hosting}/${validated.api}`];
  if (!shape) {
    throw new Error(`No deployment shape is cataloged for ${validated.hosting}/${validated.api}.`);
  }
  return {
    ...shape,
    phases: [...shape.phases],
    artifacts: [...shape.artifacts],
    inputKeys: [...shape.inputKeys],
  };
}
