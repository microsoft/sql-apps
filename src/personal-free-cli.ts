import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { run, type Run } from './process.js';
import { buildPersonalFreeArtifact } from './personal-free-build.js';
import {
  deployPersonalFree,
  initPersonalFreeConfig,
  personalFreeStatePath,
  planPersonalFreeDeployment,
  readPersonalFreeConfig,
  readProtectedDeploymentState,
  rotatePersonalFreeRuntimeSecret,
} from './personal-free-deployment.js';
import type { ProtectedDeploymentState } from './personal-free-config.js';
import { verifyPersonalFreeCostGuard } from './personal-free-cost-guard.js';
import { projectRoot } from './runtime-roots.js';

const defaultConfig = join(projectRoot, 'sql-apps.personal-free.json');

function usage(): string {
  return [
    'Usage:',
    '  sql-apps publish init --name <name> --subscription <id> --web-location <westus2|centralus|eastus2|westeurope|eastasia>',
    '      --data-location <region|same> --resource-group <name> --resource-group-mode <new|existing>',
    '      --environment <dev|test|prod> --sharing <personal|team> --client-ip <public-ipv4>',
    '  sql-apps publish plan [--config <path>]',
    '  sql-apps publish deploy --approve <code> [--config <path>]',
    '  sql-apps publish invite --role <owner|member> --provider <aad|github> --user <email-or-handle> [--config <path>]',
    '  sql-apps publish invite-owner --provider <aad|github> --user <email-or-handle> [--config <path>]',
    '  sql-apps publish rotate-secret --approve <current-deployment-code> [--config <path>]',
    '  sql-apps publish status [--config <path>]',
    '',
    'This personal-project profile targets Static Web Apps Free, managed Functions, and the Azure SQL Database free tier.',
    'It is potentially $0 only while usage stays within current allowances, and Static Web Apps Free has no SLA.',
  ].join('\n');
}

function flags(args: readonly string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value || value.startsWith('--')) throw new Error(`Invalid option near "${key ?? ''}"`);
    if (values.has(key)) throw new Error(`Duplicate option ${key}`);
    values.set(key, value);
  }
  return values;
}

function take(values: Map<string, string>, name: string, fallback?: string): string {
  const value = values.get(name) ?? fallback;
  values.delete(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function rejectUnknown(values: Map<string, string>): void {
  if (values.size) throw new Error(`Unknown option ${[...values.keys()][0]}`);
}

async function init(args: readonly string[], command: Run): Promise<string> {
  const values = flags(args);
  if (values.has('--location')) {
    throw new Error('--location was replaced: pass --web-location <Static Web Apps region> and --data-location <region|same>');
  }
  const name = take(values, '--name');
  const subscriptionId = take(values, '--subscription');
  const webLocation = take(values, '--web-location');
  const dataChoice = take(values, '--data-location');
  const dataLocation = dataChoice === 'same' ? webLocation : dataChoice;
  const environment = z.enum(['dev', 'test', 'prod']).parse(take(values, '--environment'));
  const sharing = z.enum(['personal', 'team']).parse(take(values, '--sharing'));
  const deploymentClientIp = take(values, '--client-ip');
  const resourceGroup = take(values, '--resource-group');
  const resourceGroupMode = z.enum(['new', 'existing']).parse(take(values, '--resource-group-mode'));
  const configPath = resolve(take(values, '--config', defaultConfig));
  rejectUnknown(values);
  const config = await initPersonalFreeConfig({
    name,
    subscriptionId,
    webLocation,
    dataLocation,
    resourceGroup,
    useExistingResourceGroup: resourceGroupMode === 'existing',
    environment,
    sharing,
    deploymentClientIp,
  }, command);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: 'wx' });
  return [
    `Created ${configPath}. No Azure resources were changed.`,
    `Subscription: ${config.subscriptionName ?? config.subscriptionId}; web: ${config.webLocation}; data: ${config.dataLocation}; resource group: ${config.resourceGroup} (${config.existingResourceGroup ? 'existing' : 'new'}); environment: ${config.environment}; sharing: ${config.sharing}.`,
    'Run "sql-apps publish plan" to review the creation card.',
  ].join('\n');
}

async function plan(args: readonly string[], command: Run): Promise<string> {
  const values = flags(args);
  const configPath = resolve(take(values, '--config', defaultConfig));
  rejectUnknown(values);
  const config = await readPersonalFreeConfig(configPath);
  const artifact = join(projectRoot, '.sql-apps', 'deployments', `${config.name}-${config.environment}-plan`);
  const manifest = await buildPersonalFreeArtifact(projectRoot, artifact, command);
  const result = planPersonalFreeDeployment(config, manifest.sourceHash);
  return `${result.summary}\n\nApproval: ${result.approval}\nDeploy with: sql-apps publish deploy --approve ${result.approval} --config ${JSON.stringify(configPath)}`;
}

async function deploy(args: readonly string[], command: Run): Promise<string> {
  const values = flags(args);
  const approval = take(values, '--approve');
  const configPath = resolve(take(values, '--config', defaultConfig));
  rejectUnknown(values);
  const config = await readPersonalFreeConfig(configPath);
  const state = await deployPersonalFree(config, approval, command);
  return `Deployment stage: ${state.stage}\nApplication: https://${state.staticWebAppHostname}`;
}

async function invite(args: readonly string[], command: Run, fixedRole?: 'owner'): Promise<string> {
  const values = flags(args);
  const role = fixedRole ?? take(values, '--role');
  if (!['owner', 'member'].includes(role)) throw new Error('--role must be owner or member');
  const provider = take(values, '--provider').toLowerCase();
  if (!['aad', 'github'].includes(provider)) throw new Error('--provider must be aad or github');
  const user = take(values, '--user');
  const configPath = resolve(take(values, '--config', defaultConfig));
  rejectUnknown(values);
  const config = await readPersonalFreeConfig(configPath);
  const state = await readProtectedDeploymentState(personalFreeStatePath(config));
  if (!state.staticWebAppName || !state.staticWebAppHostname) throw new Error('Deploy the application before inviting people');
  const invitation = await command('az', [
    'staticwebapp', 'users', 'invite',
    '--subscription', config.subscriptionId,
    '--resource-group', config.resourceGroup,
    '--name', state.staticWebAppName,
    '--authentication-provider', provider,
    '--user-details', user,
    '--roles', role,
    '--domain', state.staticWebAppHostname,
    '--invitation-expiration-in-hours', '168',
    '--query', 'invitationUrl', '-o', 'tsv',
  ]);
  return `${role === 'owner' ? 'Owner' : 'Member'} invitation for ${user} (expires in 7 days; Static Web Apps Free allows invited roles for up to 25 people):\n${invitation.trim()}`;
}

async function status(args: readonly string[], command: Run): Promise<string> {
  const values = flags(args);
  const configPath = resolve(take(values, '--config', defaultConfig));
  rejectUnknown(values);
  const config = await readPersonalFreeConfig(configPath);
  let state: ProtectedDeploymentState;
  try {
    state = await readProtectedDeploymentState(personalFreeStatePath(config));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 'Stage: not started';
    throw error;
  }
  const report = await verifyPersonalFreeCostGuard(config, state, command);
  return [
    `Profile: ${config.profile}`,
    `Target: ${config.subscriptionId}/${config.resourceGroup}`,
    `Stage: ${state.stage}`,
    state.staticWebAppHostname ? `Application: https://${state.staticWebAppHostname}` : undefined,
    'Cost guard: verified',
    `Static Web Apps: ${report.staticWebApp}`,
    'Azure SQL: free tier, AutoPause at monthly limit',
    'Cost posture: configured to stop rather than bill at free limits; personal-project tier; no Static Web Apps Free SLA.',
  ].filter(Boolean).join('\n');
}

async function rotateSecret(args: readonly string[], command: Run): Promise<string> {
  const values = flags(args);
  const approval = take(values, '--approve');
  const configPath = resolve(take(values, '--config', defaultConfig));
  rejectUnknown(values);
  const config = await readPersonalFreeConfig(configPath);
  const state = await rotatePersonalFreeRuntimeSecret(config, approval, command);
  return `Runtime secret rotated. Deployment stage: ${state.stage}`;
}

export async function main(
  args = process.argv.slice(2),
  log: (message: string) => void = console.log,
  command: Run = run,
): Promise<void> {
  const [action, ...rest] = args;
  if (!action || ['help', '--help', '-h'].includes(action)) {
    log(usage());
    return;
  }
  const handlers: Record<string, () => Promise<string>> = {
    init: () => init(rest, command),
    plan: () => plan(rest, command),
    deploy: () => deploy(rest, command),
    invite: () => invite(rest, command),
    'invite-owner': () => invite(rest, command, 'owner'),
    'rotate-secret': () => rotateSecret(rest, command),
    status: () => status(rest, command),
  };
  const handler = handlers[action];
  if (!handler) throw new Error(`Unknown publish action "${action}".\n${usage()}`);
  log(await handler());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Personal-free publishing failed.');
    process.exitCode = 1;
  });
}
