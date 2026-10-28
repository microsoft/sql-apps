import { Connection, Request, TYPES } from 'tedious';
import tarn from 'tarn';
import { guid, required } from './config.js';

type SqlParameter = [string, Parameters<Request['addParameter']>[1], string];
type DatabaseRow = Record<string, unknown>;
type SqlAuthentication =
  | { type: 'default'; options: { userName: string; password: string } }
  | {
    type: 'azure-active-directory-service-principal-secret';
    options: { tenantId: string; clientId: string; clientSecret: string };
  };

export function sqlConfiguration(env: NodeJS.ProcessEnv) {
  const server = required(env, 'SQL_SERVER');
  const local = ['localhost', '127.0.0.1', '::1'].includes(server);
  let authentication: SqlAuthentication;
  if (env.SQL_USER || env.SQL_PASSWORD) {
    if (!local || env.WEBSITE_INSTANCE_ID || env.WEBSITE_HOSTNAME ||
        env.SQL_CLIENT_ID || env.SQL_CLIENT_SECRET || env.SQL_TENANT_ID) throw new Error('SQL passwords are local-only.');
    const userName = required(env, 'SQL_USER');
    if (userName.toLowerCase() === 'sa') throw new Error('Use a restricted application login.');
    authentication = { type: 'default', options: { userName, password: required(env, 'SQL_PASSWORD') } };
  } else {
    const tenantId = required(env, 'SQL_TENANT_ID');
    const clientId = required(env, 'SQL_CLIENT_ID');
    if (!guid.test(tenantId) || !guid.test(clientId)) throw new Error('Invalid SQL service principal.');
    authentication = {
      type: 'azure-active-directory-service-principal-secret',
      options: { tenantId, clientId, clientSecret: required(env, 'SQL_CLIENT_SECRET') },
    };
  }
  const port = Number(env.SQL_PORT || 1433);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SQL_PORT.');
  return {
    server, authentication,
    options: {
      database: required(env, 'SQL_DATABASE'), port,
      encrypt: true, trustServerCertificate: local && authentication.type === 'default',
      connectTimeout: 10000, requestTimeout: 15000, maxRetriesOnTransientErrors: 0,
      connectionRetryInterval: 1000, rowCollectionOnRequestCompletion: true,
    },
  };
}

export function execute(connection: Connection, text: string, parameters: SqlParameter[] = []): Promise<DatabaseRow[]> {
  return new Promise((resolve, reject) => {
    const request = new Request(text, (error, _count, rows: Array<Array<{ metadata: { colName: string }; value: unknown }>> | undefined) => {
      if (error) reject(error);
      else resolve((rows ?? []).map(row => {
        const result: DatabaseRow = {};
        for (const column of row) result[column.metadata.colName] = column.value;
        return result;
      }));
    });
    for (const [name, type, value] of parameters) request.addParameter(name, type, value);
    connection.execSql(request);
  });
}

export function createDatabase(
  env: NodeJS.ProcessEnv,
  { run = execute, connect }: { run?: typeof execute; connect?: () => Promise<Connection> } = {},
) {
  const config = sqlConfiguration(env);
  const discarded = new WeakSet<Connection>();
  const discard = (connection: Connection): void => {
    discarded.add(connection);
    connection.close();
  };
  const establish = connect || (() => new Promise<Connection>((resolve, reject) => {
    const connection = new Connection(config);
    connection.on('error', () => { discard(connection); });
    connection.connect(error => {
      if (error) { discard(connection); reject(error); }
      else resolve(connection);
    });
  }));
  const pool = new tarn.Pool<Connection>({
    min: 0, max: 4, acquireTimeoutMillis: 10000, createTimeoutMillis: 12000,
    destroyTimeoutMillis: 5000, idleTimeoutMillis: 30000, propagateCreateError: true,
    create: async () => {
      const connection = await establish();
      if (connect) connection.on?.('error', () => { discard(connection); });
      return connection;
    },
    validate: connection => !discarded.has(connection) && !connection.closed,
    destroy: discard,
  });
  async function operation(oid: string, text: string, parameters: SqlParameter[]): Promise<DatabaseRow[]> {
    if (!guid.test(oid)) throw new Error('Invalid oid.');
    if (pool.numPendingAcquires() >= 8) throw new Error('Database is busy.');
    const connection = await pool.acquire().promise;
    try {
      // The physical connection stays leased until context is cleared AND commit succeeds.
      await run(connection, "BEGIN TRANSACTION; EXEC sys.sp_set_session_context @key=N'oid', @value=@oid;",
        [['oid', TYPES.NVarChar, oid]]);
      const rows = await run(connection, text, parameters);
      await run(connection, "EXEC sys.sp_set_session_context @key=N'oid', @value=NULL; COMMIT TRANSACTION;");
      pool.release(connection);
      return rows;
    } catch (error) {
      // Session context is not transactional. Never return an uncertain connection to the pool:
      // closing the socket also rolls back any open transaction, including an aborted procedure.
      try { discard(connection); }
      finally { pool.release(connection); }
      throw error;
    }
  }
  return {
    list: (oid: string, label?: string) => operation(oid,
      `SELECT TOP (100) Id, Label, CreatedAt FROM api.Items${label === undefined ? '' : ' WHERE Label = @Label'} ORDER BY CreatedAt DESC, Id DESC;`,
      label === undefined ? [] : [['Label', TYPES.NVarChar, label]]),
    create: (oid: string, label: string) => operation(oid, 'EXEC api.CreateItem @Label=@Label;', [['Label', TYPES.NVarChar, label]]),
    close: () => pool.destroy(),
  };
}
