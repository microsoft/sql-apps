import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { run } from './process.js';
import { smoke } from './smoke.js';
import { deployStatic, setSecret, updateImage } from './maintenance.js';
import { buildArtifacts } from './artifacts.js';
import { preflightDemo, DemoPreflightError } from './azure-preflight.js';
import { reviewDemoCost } from './demo-cost.js';
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
    return;
  }
  if (command === 'demo-cost') {
    if (process.argv.length !== 4) throw new Error('Provide an explicit public-demo cost configuration; no billing choice or spending consent is inferred.');
    const input: unknown = JSON.parse(await readFile(resolve(configPath), 'utf8'));
    const report = reviewDemoCost(input);
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
  if (!['validate', 'artifacts', 'identity', 'plan', 'provision', 'deploy', 'status', 'schema', 'static', 'redirect', 'smoke', 'gateway', 'functions', 'secret-set'].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }
  const config = await readConfig(resolve(configPath));
  if (command === 'validate') { console.log('Configuration valid'); return; }
  if (command === 'artifacts') {
    await withDeploymentLock(statePath(config), async () => {
      const pinned = await buildArtifacts(config, run);
      if (JSON.stringify(await readConfig(resolve(configPath))) !== JSON.stringify(config)) {
        throw new Error('Configuration changed during artifact builds; images were published but configuration was not overwritten');
      }
      await saveJson(resolve(configPath), pinned);
    });
    console.log('Three images published to ACR; configuration atomically updated to immutable digests.');
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
      appRoles: [{
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
      console.log(`Infrastructure provisioned. Configure private runner connectivity to ${state.outputs.networkId}, then run deploy.`);
    });
    return;
  }
  const state = await readState(config);
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
