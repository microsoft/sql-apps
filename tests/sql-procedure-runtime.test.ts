import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import sql from 'mssql';
import { Connection } from 'tedious';
import {
  createProcedureRuntime,
  sqlProcedureConnection,
  SqlConnectionDiscardedError,
  type SqlRuntimeDriver,
} from '../src/sql-procedure-runtime.js';

const env = {
  AZURE_SQL_SERVER: 'personal.database.windows.net',
  AZURE_SQL_DATABASE: 'app',
  AZURE_SQL_USER: 'sql_apps_runtime',
  AZURE_SQL_PASSWORD: 'test-only-not-a-real-password-123456',
};

for (const number of [40613, 18456]) {
  test(`SQL runtime handles the real driver's login error shape (${number})`, async t => {
    const { Login7TokenHandler } = createRequire(import.meta.url)('tedious/lib/token/handler.js');
    let connects = 0;
    const delays: number[] = [];
    const OriginalPool = sql.ConnectionPool;
    let driverConfig: sql.config;
    t.mock.method(sql, 'ConnectionPool', function (config: sql.config) {
      driverConfig = config;
      return new OriginalPool(config);
    });
    t.mock.method(sql.ConnectionPool.prototype, 'connect', async function (this: sql.ConnectionPool) {
      connects++;
      if (number === 40613 && connects === 3) return this;
      const connection = new Connection({ server: 'unused.test' });
      driverConfig.beforeConnect?.(connection);
      const handler = new Login7TokenHandler({
        emit: connection.emit.bind(connection),
        transientErrorLookup: { isTransientError: () => number === 40613 },
        curTransientRetryCount: 3, config: { options: { maxRetriesOnTransientErrors: 3 } },
      });
      handler.onErrorMessage({ number, message: 'login rejected by the driver' });
      connection.emit('connect', handler.loginError);
      throw new sql.ConnectionError(handler.loginError);
    });
    t.mock.method(sql.ConnectionPool.prototype, 'close', async () => {});
    t.mock.method(sql.Transaction.prototype, 'begin', async () => { throw new Error('connected without executing a write'); });
    const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }], {
      sleep: async delay => { delays.push(delay); },
    });
    await assert.rejects(runtime.ready(), number === 40613 ? /connected without/ : /login rejected/);
    assert.equal(connects, number === 40613 ? 3 : 1);
    assert.deepEqual(delays, number === 40613 ? [5000, 10000] : []);
    await runtime.close();
  });
}

test('out-of-request SQL pool errors are logged, closed and rejected before another transaction', async t => {
  const pool = new sql.ConnectionPool({ server: 'unused.test' });
  let closed = 0;
  const messages: string[] = [];
  t.mock.method(pool, 'close', async () => { closed++; });
  t.mock.method(console, 'error', (...args: unknown[]) => { messages.push(args.join(' ')); });
  t.mock.method(sql.Transaction.prototype, 'begin', async () => { assert.fail('An unhealthy pool must not start a transaction'); });
  const connection = sqlProcedureConnection(pool);
  assert.doesNotThrow(() => pool.emit('error', new Error('synthetic protocol failure containing a secret')));
  await assert.rejects(connection.execute('11111111-1111-5111-8111-111111111111', 'owner', 'AppReady', {},
    { name: 'AppReady', parameters: {} }), /SQL connection pool/);
  assert.equal(closed, 1);
  assert.ok(messages.some(message => /SQL connection pool/.test(message)));
  assert.equal(messages.some(message => message.includes('containing a secret')), false);
});

test('SQL runtime retries a paused free database with exponential delays and a fresh pool', async () => {
  const delays: number[] = [];
  let connects = 0;
  const driver: SqlRuntimeDriver = {
    async connect(config) {
      connects++;
      assert.equal(config.options.encrypt, true);
      assert.equal(config.options.trustServerCertificate, false);
      assert.equal(config.pool.max, 5);
      if (connects < 3) throw Object.assign(new Error('paused'), { number: 40613 });
      return { async execute() { return []; }, async close() {} };
    },
  };
  const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }], {
    driver, sleep: async milliseconds => { delays.push(milliseconds); },
  });
  assert.deepEqual(await runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'AppReady', {}), []);
  assert.equal(connects, 3);
  assert.deepEqual(delays, [5_000, 10_000]);
});

test('SQL runtime rejects undeclared procedures and does not retry credentials', async () => {
  let connects = 0;
  const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }], {
    driver: {
      async connect() {
        connects++;
        throw Object.assign(new Error('login failed'), { number: 18456 });
      },
    },
    sleep: async () => { throw new Error('must not sleep'); },
  });

  await assert.rejects(runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'Unknown', {}), /declared/);
  assert.equal(connects, 0);
  await assert.rejects(runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'AppReady', {}), /login failed/);
  assert.equal(connects, 1);
});

test('SQL runtime stops after its bounded transient connection retries without executing a write', async () => {
  let connects = 0;
  const waits: number[] = [];
  const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }], {
    driver: { async connect() { connects++; throw Object.assign(new Error('still paused'), { number: 40613 }); } },
    sleep: async delay => { waits.push(delay); },
  });
  await assert.rejects(runtime.ready(), /still paused/);
  assert.equal(connects, 6);
  assert.deepEqual(waits, [5000, 10000, 20000, 40000, 60000]);
});

test('SQL runtime replaces an errored cached pool on a subsequent call', async t => {
  const OriginalPool = sql.ConnectionPool;
  const pools: sql.ConnectionPool[] = [];
  t.mock.method(sql, 'ConnectionPool', function (config: sql.config) {
    const pool = new OriginalPool(config);
    pools.push(pool);
    return pool;
  });
  t.mock.method(OriginalPool.prototype, 'connect', async function (this: sql.ConnectionPool) { return this; });
  t.mock.method(OriginalPool.prototype, 'close', async () => {});
  t.mock.method(sql.Transaction.prototype, 'begin', async () => {});
  t.mock.method(sql.Transaction.prototype, 'commit', async () => {});
  t.mock.method(sql.Request.prototype, 'query', async () => ({ recordsets: [], recordset: [], rowsAffected: [], output: {} }));
  t.mock.method(sql.Request.prototype, 'execute', async () => ({ recordsets: [], recordset: [], rowsAffected: [], output: {} }));
  t.mock.method(console, 'error', () => {});
  const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }]);
  const execute = () => runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'AppReady', {});
  assert.deepEqual(await execute(), []);
  pools[0]!.emit('error', new Error('idle protocol failure'));
  await assert.rejects(execute(), /SQL connection pool/);
  assert.deepEqual(await execute(), []);
  assert.equal(pools.length, 2);
  await runtime.close();
});

test('SQL runtime requires exact declared parameters', async () => {
  let called = false;
  const runtime = createProcedureRuntime(env, [{
    name: 'UpdateItem', parameters: { id: 'uniqueidentifier', completed: 'bit' },
  }], {
    driver: {
      async connect() {
        return {
          async execute(ownerId, role, procedure, values, definition) {
            called = true;
            assert.equal(ownerId, '11111111-1111-5111-8111-111111111111');
            assert.equal(role, 'owner');
            assert.equal(procedure, 'UpdateItem');
            assert.deepEqual(values, { id: '22222222-2222-5222-8222-222222222222', completed: true });
            assert.deepEqual(definition.parameters, { id: 'uniqueidentifier', completed: 'bit' });
            return [{ outcome: 'ok' }];
          },
          async close() {},
        };
      },
    },
    sleep: async () => {},
  });
  await assert.rejects(runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'UpdateItem', { id: 'x' }), /parameters/);
  await assert.rejects(runtime.execute('11111111-1111-5111-8111-111111111111', 'admin' as 'owner', 'UpdateItem', {
    id: '22222222-2222-5222-8222-222222222222', completed: true,
  }), /application role/);
  assert.equal(called, false);
  assert.deepEqual(await runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'UpdateItem', {
    id: '22222222-2222-5222-8222-222222222222', completed: true,
  }), [{ outcome: 'ok' }]);
});

test('SQL runtime reconnects after a connection is discarded during cleanup', async () => {
  let connects = 0;
  const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }], {
    driver: {
      async connect() {
        connects++;
        const current = connects;
        return {
          async execute() {
            if (current === 1) {
              throw new SqlConnectionDiscardedError(new Error('session context cleanup failed'));
            }
            return [{ status: 'ready' }];
          },
          async close() {},
        };
      },
    },
    sleep: async () => {},
  });
  await assert.rejects(
    runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'AppReady', {}),
    /SQL owner context cleanup failed/,
  );
  assert.deepEqual(
    await runtime.execute('11111111-1111-5111-8111-111111111111', 'owner', 'AppReady', {}),
    [{ status: 'ready' }],
  );
  assert.equal(connects, 2);
});

test('SQL readiness executes its declared procedure with an isolated probe identity', async () => {
  const calls: unknown[] = [];
  const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }], {
    driver: {
      async connect() {
        return {
          async execute(subject, role, procedure, values) {
            calls.push({ subject, role, procedure, values });
            return [{ ready: true, database: 'app' }];
          },
          async close() {},
        };
      },
    },
  });
  await runtime.ready();
  assert.deepEqual(calls, [{
    subject: '00000000-0000-4000-8000-000000000000', role: 'owner', procedure: 'AppReady', values: {},
  }]);
  await runtime.close();
});

test('SQL readiness fails when the procedure fails or does not return a ready row', async () => {
  for (const result of [new Error('missing procedure'), [], [{ ready: false }], [{ ready: true }, { ready: true }]]) {
    const runtime = createProcedureRuntime(env, [{ name: 'AppReady', parameters: {} }], {
      driver: {
        async connect() {
          return {
            async execute() { if (result instanceof Error) throw result; return result; },
            async close() {},
          };
        },
      },
    });
    await assert.rejects(runtime.ready(), /missing procedure|readiness.*result/i);
    await runtime.close();
  }
});

test('SQL readiness rejects undeclared or parameterized probe procedures', async () => {
  for (const definitions of [[], [{ name: 'AppReady', parameters: { limit: 'int' as const } }]]) {
    const runtime = createProcedureRuntime(env, definitions, {
      driver: { async connect() { throw new Error('must reject before connecting'); } },
    });
    await assert.rejects(runtime.ready(), /readiness.*declared.*no parameters/i);
  }
});

test('SQL readiness uses the procedure selected by the artifact builder', async () => {
  const runtime = createProcedureRuntime(env, [{ name: 'CheckSchema', parameters: {} }], {
    readinessProcedure: 'CheckSchema',
    driver: {
      async connect() {
        return {
          async execute(_subject, _role, name) {
            assert.equal(name, 'CheckSchema');
            return [{ ready: true }];
          },
          async close() {},
        };
      },
    },
  });
  await runtime.ready();
  await runtime.close();
});
