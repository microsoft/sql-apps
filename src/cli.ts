import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { run } from './process.js';
import { smoke } from './smoke.js';
import { deployStatic, setSecret, updateImage } from './maintenance.js';
import { buildArtifacts } from './artifacts.js';
import { preflightDemo, DemoPreflightError } from './azure-preflight.js';
import { reviewDemoCost } from './demo-cost.js';
import { reviewRoleBasedCost } from './role-based-cost.js';
import { assignApplicationRole, applicationRegistrationRole } from './role-based-identity.js';
import { roleBasedSmoke } from './role-based-smoke.js';
import { validateRoleBasedCloudDab } from './role-based-profile.js';
import {
  configureRedirect, delegatedScopeId, deploy, functionRoleId, parametersFile, preflight,
  publishSchema, readConfig, readState, saveJson, saveState, statePath, withDeploymentLock, provision,
} from './deployment.js';

const [command, configPath = 'sql-apps.json', argument] = process.argv.slice(2);
async function main() {
  if (command === 'help' || !command) {
    console.log('Usage: npm run azure -- <validate|artifacts|identity|plan|provision|deploy|status|schema|static|redirect|smoke|gateway|functions|secret-set> [config.json] [secret-name]\nRun npm run build first. Azure CLI, Bicep, .NET and SqlPackage are used directly.');
    console.log('Public-demo diagnostics: demo-preflight <explicit target configuration>. Read-only cache/tenant/ARM/provider/region/permission evidence; no Graph, app registration, login reset or resource writes. Not deployment readiness.');
    console.log('Public-demo costs: demo-cost <explicit cost configuration>. Offline free-allowance/fixed-charge review; no Azure login, network requests or resource writes. Exit 2 means cost intent is blocked or acknowledgement is missing; exit 1 means invalid input.');
    console.log('Role-based-data: role-based-cost <cost configuration> is offline and profile-specific. Use validate/artifacts/identity/plan/provision/deploy/status/schema with a role-based-data deployment configuration. role-based-assign <config> <user-or-group-object-id> explicitly assigns its application role; role-based-smoke <config> needs delegated tokens with and without the required role in SQL_APPS_USER_TOKEN / SQL_APPS_SECOND_USER_TOKEN. All cloud writes need operator approval; local simulations never deploy.');
    return;
  }
  if (command === 'demo-cost' || command === 'role-based-cost') {
    if (process.argv.length !== 4) throw new Error('Provide an explicit matching-profile cost configuration; no billing choice or spending consent is inferred.');
    const input: unknown = JSON.parse(await readFile(resolve(configPath), 'utf8'));
    const report = command === 'role-based-cost' ? reviewRoleBasedCost(input) : reviewDemoCost(input);
    console.log(JSON.stringify(report, null, 2));
    if (!report.review.canProceedToWhatIf) process.exitCode = 2;
    return;
  }
  if (command === 'demo-preflight') {
    if (process.argv.length !== 4) throw new Error('Provide an explicit public-demo target configuration; no subscription/tenant defaults are inferred.');
    const target: unknown = JSON.parse(await readFile(resolve(configPath), 'utf8'));
    console.log(JSON.stringify(await preflightDemo(target, run), null, 2));
    return;
  }
  if (!['validate', 'artifacts', 'identity', 'plan', 'provision', 'deploy', 'status', 'schema', 'static', 'redirect', 'smoke', 'gateway', 'functions', 'secret-set', 'role-based-assign', 'role-based-smoke'].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }
  const config = await readConfig(resolve(configPath));
  if (config.profile === 'role-based-data') validateRoleBasedCloudDab(JSON.parse(await readFile('dab/dab-config.json', 'utf8')), {
    profile: 'role-based-data', requiredRole: config.requiredRole!, readinessPath: config.readinessPath!,
  });
  if (command === 'role-based-assign') {
    if (!argument || process.argv.length !== 5) throw new Error('Provide exactly one authorized user/group object ID');
    await assignApplicationRole(config, argument, run);
    console.log('Application role assignment verified or created; acquire a fresh delegated access token and run role-based-smoke.');
    return;
  }
  if (command === 'validate') { console.log('Configuration valid'); return; }
  if (command === 'artifacts') {
    await withDeploymentLock(statePath(config), async () => {
      const pinned = await buildArtifacts(config, run);
      if (JSON.stringify(await readConfig(resolve(configPath))) !== JSON.stringify(config)) {
        throw new Error('Configuration changed during artifact builds; images were published but configuration was not overwritten');
      }
      await saveJson(resolve(configPath), pinned);
    });
    console.log(`${config.profile === 'role-based-data' ? 'Two' : 'Three'} images published to ACR; configuration atomically updated to immutable digests.`);
    return;
  }
  if (command === 'identity') {
    const account = z.object({ tenantId: z.string() }).parse(JSON.parse(await run('az', ['account', 'show', '-o', 'json'])));
    if (account.tenantId !== config.tenantId) throw new Error('Sign Azure CLI into the configured tenant before creating its application');
    const registration = z.object({ id: z.string().uuid(), appId: z.string().uuid() }).parse(JSON.parse(
      await run('az', ['ad', 'app', 'create', '--display-name', `${config.name}-${config.environment}`, '--sign-in-audience', 'AzureADMyOrg', '-o', 'json']),
    ));
    const path = resolve('.sql-apps', 'identity.json');
    await mkdir('.sql-apps', { recursive: true });
    await writeFile(path, JSON.stringify({
      identifierUris: [`api://${registration.appId}`],
      api: { requestedAccessTokenVersion: 2, oauth2PermissionScopes: [{
        id: delegatedScopeId, value: 'access_as_user', type: 'User', isEnabled: true,
        adminConsentDisplayName: 'Access SQL Apps', adminConsentDescription: 'Access this application as the signed-in user.',
        userConsentDisplayName: 'Access SQL Apps', userConsentDescription: 'Access your application data.',
      }] },
      spa: { redirectUris: ['http://localhost:8080'] },
      appRoles: config.profile === 'role-based-data' ? [applicationRegistrationRole(config)] : [{
        id: functionRoleId, value: 'Function.Invoke', displayName: 'Invoke functions',
        description: 'Allow the gateway to invoke application functions.', allowedMemberTypes: ['Application'], isEnabled: true,
      }],
    }));
    await run('az', ['rest', '--method', 'PATCH', '--url', `https://graph.microsoft.com/v1.0/applications/${registration.id}`, '--body', `@${path}`, '-o', 'none']);
    await run('az', ['ad', 'sp', 'create', '--id', registration.appId, '-o', 'none']);
    console.log(`Created app registration ${registration.appId}. Set apiClientId to this value in your configuration.`);
    return;
  }
  if (command === 'plan') {
    await preflight(config, run);
    console.log(await run('az', ['deployment', 'group', 'what-if', '--subscription', config.subscriptionId,
      '--resource-group', config.resourceGroup, '--template-file', 'infra/main.bicep',
      '--parameters', `@${await parametersFile(config, true)}`]));
    return;
  }
  if (command === 'deploy') {
    await withDeploymentLock(statePath(config), async () => {
      const state = await deploy(config, run);
      console.log(`Runtime readiness passed: ${state.outputs.gatewayUrl}. Run authenticated acceptance before release.`);
    });
    return;
  }
  if (command === 'provision') {
    await withDeploymentLock(statePath(config), async () => {
      const state = await provision(config, run);
      await saveState(statePath(config), state);
      console.log(`Infrastructure available (saved stage: ${state.stage}). Configure private runner connectivity to ${state.outputs.networkId}, then run deploy. Saved stages are historical, not live acceptance.`);
    });
    return;
  }
  const state = await readState(config);
  if (command === 'role-based-smoke') {
    const first = process.env.SQL_APPS_USER_TOKEN;
    const second = process.env.SQL_APPS_SECOND_USER_TOKEN;
    if (!first || !second) throw new Error('Set delegated authorized and valid tokens without the required role in the trusted process environment; do not paste tokens into chat');
    await roleBasedSmoke(config, state.outputs.gatewayUrl, first, second);
    console.log('Live authorized procedure succeeded; requests from valid users without the required role and anonymous callers were denied, including forged role headers. Browser save/reload remains separate acceptance.');
    return;
  }
  if (command === 'smoke' && config.profile === 'role-based-data') {
    throw new Error('Use role-based-smoke for role-based-data, not the foundation file/job smoke suite');
  }
  if (command === 'static') {
    await preflight(config, run, false);
    await withDeploymentLock(statePath(config), async () => {
      const pinned = await deployStatic(config, state, run);
      if (JSON.stringify(await readConfig(resolve(configPath))) !== JSON.stringify(config)) {
        throw new Error('Configuration changed during static deployment; runtime updated but configuration was not overwritten');
      }
      await saveJson(resolve(configPath), pinned);
    });
    console.log('Static assets deployed on the existing runtime digest; verify status and browser behavior.');
    return;
  }
  if (command === 'gateway' || command === 'functions') {
    await preflight(config, run);
    await withDeploymentLock(statePath(config), () => updateImage(command, config, state, run));
    console.log(`${command} image updated; run status and authenticated smoke to verify.`);
    return;
  }
  if (command === 'secret-set') {
    if (!argument || !process.env.SQL_APPS_SECRET_VALUE) throw new Error('Provide a secret name and set SQL_APPS_SECRET_VALUE in the trusted deployment process.');
    await withDeploymentLock(statePath(config), () => setSecret(argument, process.env.SQL_APPS_SECRET_VALUE!, config, state, run));
    console.log('Key Vault secret updated without persisting its value locally.');
    return;
  }
  if (command === 'smoke') {
    const first = process.env.SQL_APPS_USER_TOKEN;
    const second = process.env.SQL_APPS_SECOND_USER_TOKEN;
    if (!first || !second) throw new Error('Set SQL_APPS_USER_TOKEN and SQL_APPS_SECOND_USER_TOKEN for two users; tokens are not persisted.');
    await smoke(state.outputs.gatewayUrl, first, second, fetch, `https://${state.outputs.functionsName}.azurewebsites.net`);
    console.log('Authenticated two-user CRUD, GraphQL, files, function invocation, anonymous rejection, and fixture cleanup passed.');
    return;
  }
  if (command === 'status') {
    console.log(await run('az', ['containerapp', 'show', '--subscription', config.subscriptionId,
      '--resource-group', config.resourceGroup, '--name', state.outputs.gatewayName,
      '--query', '{provisioningState:properties.provisioningState,runningStatus:properties.runningStatus}', '-o', 'json']));
    const response = await fetch(new URL('/health/ready', state.outputs.gatewayUrl), { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`Readiness returned ${response.status}`);
    console.log(`Readiness passed. Last completed stage: ${state.stage}`);
    return;
  }
  if (command === 'schema') {
    await preflight(config, run);
    await withDeploymentLock(statePath(config), () => publishSchema(config, state.outputs, run));
    console.log('Schema published; destructive changes remain blocked.');
    return;
  }
  if (command === 'redirect') {
    await configureRedirect(config, state.outputs.gatewayUrl, run);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}
main().catch(error => {
  console.error(error instanceof DemoPreflightError ? `${error.stage}: ${error.code}: ${error.message}` :
    error instanceof Error ? error.message : 'Deployment command failed');
  process.exitCode = 1;
});
