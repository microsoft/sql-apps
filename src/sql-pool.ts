import sql from 'mssql';

const loginNumbers = new WeakMap<Error, number>();
const observers = new WeakMap<sql.ConnectionPool, () => void>();

export class SqlPoolError extends Error {
  constructor() {
    super('SQL connection pool failed; a new pool is required');
    this.name = 'SqlPoolError';
  }
}

export function observeSqlPool(pool: sql.ConnectionPool): () => void {
  const existing = observers.get(pool);
  if (existing) return existing;
  let failed = false;
  const check = () => { if (failed) throw new SqlPoolError(); };
  observers.set(pool, check);
  pool.on('error', () => {
    console.error('SQL connection pool error; discarding its connections.');
    if (failed) return;
    failed = true;
    void pool.close().catch(() => {
      console.error('Failed to close the SQL connection pool after an error.');
    });
  });
  return check;
}

export function createSqlPool(config: sql.config): sql.ConnectionPool {
  const pool = new sql.ConnectionPool({
    ...config,
    beforeConnect(connection) {
      let number: number | undefined;
      connection.on('errorMessage', token => { number = token.number; });
      // Tedious drops the SQL number when it creates an ELOGIN error.
      connection.on('connect', error => {
        if (error && number !== undefined) loginNumbers.set(error, number);
      });
      config.beforeConnect?.(connection);
    },
  });
  observeSqlPool(pool);
  return pool;
}

export function sqlErrorNumber(error: unknown): number | undefined {
  const seen = new Set<object>();
  while (typeof error === 'object' && error !== null && !seen.has(error)) {
    seen.add(error);
    if ('number' in error && typeof error.number === 'number') return error.number;
    if (error instanceof Error && loginNumbers.has(error)) return loginNumbers.get(error);
    error = 'originalError' in error ? error.originalError : undefined;
  }
  return undefined;
}
