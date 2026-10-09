import { buildSelectedApplication } from '../dist/src/application-build.js';

const [name, profile, ...extra] = process.argv.slice(2);
if (!name || !['local-simulation', 'public-demo'].includes(profile) || extra.length) {
  console.error('Usage: npm run app:build -- <application> <local-simulation|public-demo>');
  process.exitCode = 1;
} else {
  try {
    const result = await buildSelectedApplication(process.cwd(), name, profile);
    console.log(`Selected application artifacts verified: ${result.directory}`);
    console.log('This is a build, not a deployment or a live SQL readiness claim.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Selected application build failed');
    process.exitCode = 1;
  }
}
