import { createHash, randomBytes } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { z } from 'zod';
import { run as execute, type Run } from './process.js';
import { readProtectedJson, saveProtectedJson } from './sql-endpoint.js';
import { createSqlPool, observeSqlPool } from './sql-pool.js';
import {
  personalFreeConfigSchema,
  protectedDeploymentStateSchema,
  staticWebAppRegions,
  type PersonalFreeConfig,
  type ProtectedDeploymentState,
} from './personal-free-config.js';
import { deploymentName } from './deployment-name.js';
import { verifyPersonalFreeArtifact } from './personal-free-build.js';
import { verifyPersonalFreeCostGuard } from './personal-free-cost-guard.js';
import { projectRoot, toolingRoot } from './runtime-roots.js';

export interface PersonalFreeInitOptions {
  name: string;
  subscriptionId: string;
  webLocation: string;
  dataLocation: string;
  resourceGroup: string;
  useExistingResourceGroup?: boolean;
  environment: 'dev' | 'test' | 'prod';
  sharing: 'personal' | 'team';
  deploymentClientIp?: string;
}

export async function initPersonalFreeConfig(
  options: PersonalFreeInitOptions,
  run: Run,
): Promise<PersonalFreeConfig> {
  if (!(staticWebAppRegions as readonly string[]).includes(options.webLocation)) {
    throw new Error(`Static Web Apps region must be one of: ${staticWebAppRegions.join(', ')}. Nothing was written.`);
  }
  const account = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(128).optional(),
    tenantId: z.string().uuid(),
    user: z.object({ name: z.string().min(1), type: z.literal('user') }),
  }).parse(JSON.parse(await run('az', ['account', 'show', '-o', 'json'])));
  if (account.id.toLowerCase() !== options.subscriptionId.toLowerCase()) {
    throw new Error(`Azure CLI is signed in to subscription ${account.name ?? ''} (${account.id}), not ${options.subscriptionId}. ` +
      `Run "az account set --subscription ${options.subscriptionId}" or pass the intended --subscription. Nothing was written.`);
  }
  const exists = (await run('az', ['group', 'exists', '--subscription', account.id,
    '--name', options.resourceGroup, '-o', 'tsv'])).trim() === 'true';
  if (exists && !options.useExistingResourceGroup) {
    throw new Error(`Resource group ${options.resourceGroup} already exists.     Choose a new name, or confirm reuse with --resource-group-mode existing. Nothing was written.`);
  }
  if (!exists && options.useExistingResourceGroup) {
        throw new Error(`Resource group ${options.resourceGroup} does not exist; use --resource-group-mode new to create it. Nothing was written.`);
  }
  const operator = (await run('az', ['ad', 'signed-in-user', 'show', '--query', 'id', '-o', 'tsv'])).trim();
  return personalFreeConfigSchema.parse({
    profile: 'personal-free',
    subscriptionId: account.id,
    ...(account.name ? { subscriptionName: account.name } : {}),
    tenantId: account.tenantId,
    sqlAdministratorObjectId: operator,
    sqlAdministratorName: account.user.name,
    resourceGroup: options.resourceGroup,
    existingResourceGroup: exists,
    webLocation: options.webLocation,
    dataLocation: options.dataLocation,
    sharing: options.sharing,
    ...(options.deploymentClientIp ? { deploymentClientIp: options.deploymentClientIp } : {}),
    environment: options.environment,
    name: deploymentName(options.name),
  });
}

export interface PersonalFreePlan {
  approval: string;
  summary: string;
}

export function planPersonalFreeDeployment(config: PersonalFreeConfig, sourceHash: string): PersonalFreePlan {
  if (!config.deploymentClientIp) {
    throw new Error('Set deploymentClientIp to the operator public IPv4 address in the config, or initialize with --client-ip, before planning');
  }
  const approval = createHash('sha256').update(JSON.stringify({ config, sourceHash })).digest('hex').slice(0, 12);
  const prefix = `${config.name}-${config.environment}`;
  const scope = `--subscription ${config.subscriptionId} --resource-group ${config.resourceGroup}`;
  const card = [
    ['Resource group', config.resourceGroup, config.existingResourceGroup ? '(existing, reused)' : config.dataLocation,
      'no charge', config.existingResourceGroup ? 'kept; delete the resources below individually'
        : `az group delete --subscription ${config.subscriptionId} --name ${config.resourceGroup}`],
    ['Static Web App', `${prefix}-<id>`, config.webLocation, 'Free SKU; $0 within allowances; no SLA',
      `az staticwebapp delete ${scope} --name <name>`],
    ['Azure SQL server', `${prefix}-<id>`, config.dataLocation, 'no charge for the server itself',
      `az sql server delete ${scope} --name <name> (also deletes the database)`],
    ['Azure SQL database', 'app', config.dataLocation, 'free tier (GP_S_Gen5_2, 32 GB, AutoPause on exhaustion); verify tier availability in this region',
      'deleted with the server'],
  ].map(([type, name, where, cost, undo]) => `- ${type}: ${name} | region: ${where} | cost: ${cost} | undo: ${undo}`);
  const regionNote = config.webLocation === config.dataLocation
    ? `Regions: web and data both in ${config.dataLocation}.`
    : `Regions: web in ${config.webLocation}, data in ${config.dataLocation}. Data stays in ${config.dataLocation}; API calls cross regions and add latency.`;
  return {
    approval,
    summary: [
      'Target: personal-free (Azure Static Web Apps Free; no SLA).',
      `Subscription: ${config.subscriptionName ? `${config.subscriptionName} ` : ''}(${config.subscriptionId}), tenant ${config.tenantId}. Environment: ${config.environment}.`,
      regionNote,
      'Creation card (<id> is assigned at deployment):',
      ...card,
      'Cost: potentially $0 only while Static Web Apps and Azure SQL remain inside current free allowances.',
      'Network: Azure SQL uses a public endpoint. The 0.0.0.0 firewall rule admits all resources inside the Azure boundary, including other subscriptions.',
      `Temporary SQL access: allow only deployment client ${config.deploymentClientIp}/32 while publishing SQL or rotating credentials; remove the deployment-owned rule afterward.`,
      config.sharing === 'team'
        ? 'Sharing: team. Invite owners and members (up to 25 invited people on Static Web Apps Free; each invitation expires within 168 hours); routes must declare member access.'
        : 'Sharing: personal. Only invited owners can use the app; switch to team later by re-running init with --sharing team.',
      'Authentication: generated least-privilege SQL credentials are stored outside source.',
      'Not created: DAB, Container Apps, ACR, VNet, private endpoint, private DNS, Log Analytics, Application Insights, or Key Vault.',
    ].join('\n'),
  };
}

function secret(): string {
  return randomBytes(32).toString('base64url');
}

export function createProtectedDeploymentState(approval: string): ProtectedDeploymentState {
  return protectedDeploymentStateSchema.parse({
    approval,
    stage: 'new',
    sqlAdministratorPassword: secret(),
    runtimePassword: secret(),
  });
}

export async function saveProtectedDeploymentState(path: string, state: ProtectedDeploymentState): Promise<void> {
  await saveProtectedJson(path, protectedDeploymentStateSchema.parse(state), execute);
}

export async function readProtectedDeploymentState(path: string): Promise<ProtectedDeploymentState> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 65536) {
    throw new Error('Deployment credentials require a protected regular file.');
  }
  const legacy = protectedDeploymentStateSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));
  if (legacy.success) {
    console.error('Protecting legacy plaintext deployment state; saved credentials are unchanged.');
    await saveProtectedDeploymentState(path, legacy.data);
    return legacy.data;
  }
  return protectedDeploymentStateSchema.parse(await readProtectedJson(path, execute));
}

export function approveProtectedDeploymentRevision(
  state: ProtectedDeploymentState,
  approval: string,
): ProtectedDeploymentState {
  return protectedDeploymentStateSchema.parse({
    ...state,
    approval,
    ...(state.approval === approval ? {} : { stage: 'new' }),
  });
}

export function personalFreeStatePath(config: PersonalFreeConfig): string {
    return join(projectRoot, '.sql-apps', 'deployments', `${config.name}-${config.environment}.json`);
  }

  export async function readPersonalFreeConfig(path: string): Promise<PersonalFreeConfig> {
    const parsed = personalFreeConfigSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));
    if (!parsed.success) {
      throw new Error(`${path} is not a valid personal-free config: ${parsed.error.issues.map(issue => issue.message).join('; ')}`);
    }
    return parsed.data;
  }

  const outputsSchema = z.object({
    staticWebAppName: z.string().min(1),
    staticWebAppHostname: z.string().min(1),
    sqlServer: z.string().regex(/\.database\.windows\.net$/),
    databaseName: z.literal('app'),
  });

  async function secureParametersFile(
    config: PersonalFreeConfig,
    state: ProtectedDeploymentState,
  ): Promise<string> {
    const parent = dirname(personalFreeStatePath(config));
    await mkdir(parent, { recursive: true });
    const directory = await mkdtemp(join(parent, 'parameters-'));
    const path = join(directory, 'parameters.json');
    const parameters = {
      parameters: {
        name: { value: config.name },
        environment: { value: config.environment },
        webLocation: { value: config.webLocation },
        dataLocation: { value: config.dataLocation },
        tenantId: { value: config.tenantId },
        sqlAdministratorObjectId: { value: config.sqlAdministratorObjectId },
        sqlAdministratorName: { value: config.sqlAdministratorName },
        sqlAdministratorPassword: { value: state.sqlAdministratorPassword },
        runtimePassword: { value: state.runtimePassword },
      },
    };
    try {
      if (process.platform === 'win32') {
        await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
          '$ErrorActionPreference="Stop";$path=[Console]::In.ReadToEnd();' +
          '$acl=New-Object Security.AccessControl.DirectorySecurity;$acl.SetAccessRuleProtection($true,$false);' +
          '$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;' +
          '$rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,"FullControl","ContainerInherit,ObjectInherit","None","Allow");' +
          '$acl.AddAccessRule($rule);[IO.Directory]::SetAccessControl($path,$acl);'],
        { input: directory, sensitiveOutput: true, timeoutMs: 15000 });
      }
      const handle = await open(path, 'wx', 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(parameters, null, 2)}\n`);
        await handle.sync();
      } finally {
        await handle.close();
      }
      return path;
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }

  function parseOutputs(text: string) {
    const envelope = z.record(z.string(), z.object({ value: z.unknown() })).parse(JSON.parse(text));
    return outputsSchema.parse(Object.fromEntries(Object.entries(envelope).map(([name, item]) => [name, item.value])));
  }

  export async function verifyPersonalFreeInfrastructure(
    config: PersonalFreeConfig,
    state: ProtectedDeploymentState,
    outputs: z.infer<typeof outputsSchema>,
    run: Run,
    persist: (prepared: ProtectedDeploymentState) => Promise<void>,
  ): Promise<ProtectedDeploymentState> {
    const infrastructureState = protectedDeploymentStateSchema.parse({
      ...state,
      stage: 'infrastructure',
      staticWebAppName: outputs.staticWebAppName,
      staticWebAppHostname: outputs.staticWebAppHostname,
      sqlServer: outputs.sqlServer,
    });
    await persist(infrastructureState);
    await verifyPersonalFreeCostGuard(config, infrastructureState, run);
    return infrastructureState;
  }

  async function requireProviders(config: PersonalFreeConfig, run: Run): Promise<void> {
    for (const namespace of ['Microsoft.Web', 'Microsoft.Sql']) {
      const state = (await run('az', ['provider', 'show', '--subscription', config.subscriptionId,
        '--namespace', namespace, '--query', 'registrationState', '-o', 'tsv'])).trim();
      if (state !== 'Registered') {
        throw new Error(`${namespace} is not registered in subscription ${config.subscriptionId}; register it explicitly before deployment`);
      }
    }
  }

  export async function createPersonalFreeResourceGroup(
    config: PersonalFreeConfig,
    run: Run,
  ): Promise<void> {
    if (!config.existingResourceGroup) {
      await run('az', ['group', 'create', '--subscription', config.subscriptionId,
        '--name', config.resourceGroup, '--location', config.dataLocation, '-o', 'none']);
    }
    await run('az', ['group', 'update', '--subscription', config.subscriptionId,
      '--name', config.resourceGroup,
      '--set',
      'tags.project=sql-apps',
      `tags.environment=${config.environment}`,
      'tags.deployment=personal-free',
      '-o', 'none']);
  }

  export async function verifyPersonalFreeReadiness(
    hostname: string,
    fetcher: typeof fetch = fetch,
  ): Promise<void> {
    const response = await fetcher(`https://${hostname}/api/health/ready`, {
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Personal-free readiness failed with HTTP ${response.status}`);
    if (response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      throw new Error('Personal-free readiness did not return application/json');
    }
    let body: unknown;
    try { body = await response.json(); }
    catch (cause) { throw new Error('Personal-free readiness returned invalid JSON', { cause }); }
    if (!z.object({ status: z.literal('ready') }).safeParse(body).success) {
      throw new Error('Personal-free readiness did not report ready');
    }
  }

  async function applyInfrastructure(
    config: PersonalFreeConfig,
    state: ProtectedDeploymentState,
    run: Run,
    artifact: string,
  ) {
    const parameters = await secureParametersFile(config, state);
    try {
      return parseOutputs(await run('az', [
        'deployment', 'group', 'create', '--subscription', config.subscriptionId,
        '--resource-group', config.resourceGroup,
        '--name', `${config.name}-${config.environment}-personal-free`,
        '--template-file', join(artifact, 'deployment', 'template.json'),
        '--parameters', `@${parameters}`, '--query', 'properties.outputs', '-o', 'json',
      ], { redact: [state.sqlAdministratorPassword, state.runtimePassword] }));
    } finally {
      await rm(dirname(parameters), { recursive: true, force: true });
    }
  }

  async function publishPersonalSchema(config: PersonalFreeConfig, server: string, run: Run, artifact: string): Promise<void> {
    await run('dotnet', ['tool', 'run', 'sqlpackage', '--',
      '/Action:Publish',
      `/SourceFile:${join(artifact, 'deployment', 'database.dacpac')}`,
      `/TargetConnectionString:Server=tcp:${server},1433;Database=app;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Default;`,
      '/p:BlockOnPossibleDataLoss=True',
      '/p:DropObjectsNotInSource=False',
    ], { env: { AZURE_TOKEN_CREDENTIALS: 'AzureCliCredential', AZURE_TENANT_ID: config.tenantId } });
  }

  async function configureRuntimeUser(
    config: PersonalFreeConfig,
    state: ProtectedDeploymentState,
    server: string,
    run: Run,
    artifact: string,
  ): Promise<void> {
    const token = z.object({ accessToken: z.string().min(1) }).parse(JSON.parse(await run('az', [
      'account', 'get-access-token', '--subscription', config.subscriptionId,
      '--resource', 'https://database.windows.net/', '-o', 'json',
    ]))).accessToken;
    const pool = createSqlPool({
      server,
      database: 'app',
      options: { encrypt: true, trustServerCertificate: false },
      authentication: { type: 'azure-active-directory-access-token', options: { token } },
      pool: { max: 1, min: 0, idleTimeoutMillis: 30_000 },
    });
    try {
      await pool.connect();
      observeSqlPool(pool)();
      const password = state.runtimePassword.replaceAll("'", "''");
      await pool.request().query(`
  IF USER_ID(N'sql_apps_runtime') IS NULL
    EXEC(N'CREATE USER [sql_apps_runtime] WITH PASSWORD = ''${password}''');
  ELSE
    EXEC(N'ALTER USER [sql_apps_runtime] WITH PASSWORD = ''${password}''');
  GRANT CONNECT TO [sql_apps_runtime];`);
      const api = z.object({ routes: z.array(z.object({
        procedure: z.object({ name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,127}$/) }),
      })) }).parse(JSON.parse(await readFile(join(artifact, 'deployment', 'api.json'), 'utf8')));
      for (const name of new Set(api.routes.map(route => route.procedure.name))) {
        await pool.request().query(
          `GRANT EXECUTE ON OBJECT::[dbo].[${name}] TO [sql_apps_runtime];\n` +
          `GRANT VIEW DEFINITION ON OBJECT::[dbo].[${name}] TO [sql_apps_runtime];`);
      }
    } finally {
      await pool.close();
    }
  }

async function withApprovedArtifact<T>(
  config: PersonalFreeConfig,
  approval: string,
  action: (artifact: string) => Promise<T>,
): Promise<T> {
  const directory = join(projectRoot, '.sql-apps', 'deployments');
  await mkdir(directory, { recursive: true });
  const snapshot = await mkdtemp(join(directory, `${config.name}-${config.environment}-deploy-`));
  try {
    try {
      await cp(join(directory, `${config.name}-${config.environment}-plan`), snapshot, { recursive: true });
    } catch (cause) {
      if (!(cause instanceof Error && 'code' in cause && cause.code === 'ENOENT')) throw cause;
      throw new Error('Approved personal-free artifact is missing; run plan and review its approval code before deployment', { cause });
    }
    const manifest = await verifyPersonalFreeArtifact(snapshot);
    if (planPersonalFreeDeployment(config, manifest.sourceHash).approval !== approval) {
      throw new Error('Deployment approval is stale; run plan again and review the current target and artifact');
    }
    return await action(snapshot);
  } finally {
    await rm(snapshot, { recursive: true, force: true });
  }
}

async function withPersonalFreeSqlAccess<T>(
  config: PersonalFreeConfig,
  server: string,
  run: Run,
  action: () => Promise<T>,
): Promise<T> {
  const address = config.deploymentClientIp;
  if (!address) throw new Error('Temporary SQL access requires deploymentClientIp in the approved config');
  const name = `sql-apps-deploy-${randomBytes(8).toString('hex')}`;
  const scope = [
    '--subscription', config.subscriptionId, '--resource-group', config.resourceGroup,
    '--server', server.replace(/\.database\.windows\.net$/, ''), '--name', name,
  ];
  let failure: unknown;
  try {
    await run('az', ['sql', 'server', 'firewall-rule', 'create', ...scope,
      '--start-ip-address', address, '--end-ip-address', address, '-o', 'none']);
    return await action();
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    try {
      await run('az', ['sql', 'server', 'firewall-rule', 'delete', ...scope]);
    } catch (cause) {
      const message = `Could not remove temporary SQL firewall rule ${name}; remove it explicitly with az sql server firewall-rule delete ${scope.join(' ')}`;
      if (failure) throw new AggregateError([failure, cause], message);
      throw new Error(message, { cause });
    }
  }
}

export async function deployPersonalFree(
    config: PersonalFreeConfig,
    approval: string,
    run: Run,
  ): Promise<ProtectedDeploymentState> {
  return withApprovedArtifact(config, approval, async artifact => {
    const statePath = personalFreeStatePath(config);
    let state: ProtectedDeploymentState;
    try {
      state = await readProtectedDeploymentState(statePath);
      const revised = approveProtectedDeploymentRevision(state, approval);
      if (revised.approval !== state.approval) await saveProtectedDeploymentState(statePath, revised);
      state = revised;
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      state = createProtectedDeploymentState(approval);
      await saveProtectedDeploymentState(statePath, state);
    }
    await requireProviders(config, run);
    await createPersonalFreeResourceGroup(config, run);
    {
      const outputs = await applyInfrastructure(config, state, run, artifact);
      state = await verifyPersonalFreeInfrastructure(
        config,
        state,
        outputs,
        run,
        prepared => saveProtectedDeploymentState(statePath, prepared),
      );
      await withPersonalFreeSqlAccess(config, outputs.sqlServer, run, async () => {
        await publishPersonalSchema(config, outputs.sqlServer, run, artifact);
        state = { ...state, stage: 'schema' };
        await saveProtectedDeploymentState(statePath, state);
        await configureRuntimeUser(config, state, outputs.sqlServer, run, artifact);
        state = { ...state, stage: 'runtime-user' };
        await saveProtectedDeploymentState(statePath, state);
      });
      const deploymentToken = (await run('az', ['staticwebapp', 'secrets', 'list',
        '--subscription', config.subscriptionId, '--resource-group', config.resourceGroup,
        '--name', outputs.staticWebAppName, '--query', 'properties.apiKey', '-o', 'tsv'],
      { sensitiveOutput: true })).trim();
      if (!deploymentToken) throw new Error('Static Web Apps deployment token was not returned');
      const require = createRequire(join(toolingRoot, 'package.json'));
      await run(process.execPath, [
        require.resolve('@azure/static-web-apps-cli/dist/cli/bin.js'),
        'deploy', join(artifact, 'static'), '--api-location', join(artifact, 'api'), '--env', 'production',
      ], { env: { SWA_CLI_DEPLOYMENT_TOKEN: deploymentToken }, sensitiveOutput: true });
      state = { ...state, stage: 'application' };
      await saveProtectedDeploymentState(statePath, state);
      await verifyPersonalFreeReadiness(outputs.staticWebAppHostname);
      state = { ...state, stage: 'ready' };
      await saveProtectedDeploymentState(statePath, state);
      return state;
    }
  });
}

export async function rotatePersonalFreeRuntimeSecret(
    config: PersonalFreeConfig,
    approval: string,
    run: Run,
): Promise<ProtectedDeploymentState> {
  return withApprovedArtifact(config, approval, async artifact => {
    const statePath = personalFreeStatePath(config);
    let state = await readProtectedDeploymentState(statePath);
    if (state.approval !== approval) throw new Error('Rotation approval does not match this deployment');
    if (!state.sqlServer || !state.staticWebAppName || !state.staticWebAppHostname) {
      throw new Error('Deploy the application before rotating its runtime secret');
    }
    const server = state.sqlServer;
    state = protectedDeploymentStateSchema.parse({
      ...state,
      runtimePassword: state.stage === 'ready' ? secret() : state.runtimePassword,
      stage: 'schema',
    });
    await saveProtectedDeploymentState(statePath, state);
    await withPersonalFreeSqlAccess(config, server, run, () => configureRuntimeUser(config, state, server, run, artifact));
    state = { ...state, stage: 'runtime-user' };
    await saveProtectedDeploymentState(statePath, state);
    const outputs = await applyInfrastructure(config, state, run, artifact);
    state = await verifyPersonalFreeInfrastructure(
      config,
      state,
      outputs,
      run,
      prepared => saveProtectedDeploymentState(statePath, prepared),
    );
    await verifyPersonalFreeReadiness(outputs.staticWebAppHostname);
    state = { ...state, stage: 'ready' };
    await saveProtectedDeploymentState(statePath, state);
    return state;
  });
}
