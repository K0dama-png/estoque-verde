import oracledb, { type BindParameters, type Connection, type ExecuteOptions, type Result } from 'oracledb';
import { env } from '../config/env.js';

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let initialized = false;

export async function initializeDatabase(): Promise<void> {
  if (initialized) return;

  await oracledb.createPool({
    user: env.ORACLE_USER,
    password: env.ORACLE_PASSWORD,
    connectString: env.ORACLE_CONNECT_STRING,
    poolMin: env.ORACLE_POOL_MIN,
    poolMax: env.ORACLE_POOL_MAX,
    poolIncrement: env.ORACLE_POOL_INCREMENT,
    poolAlias: 'lotecerto',
  });
  initialized = true;
}

export async function closeDatabase(): Promise<void> {
  if (!initialized) return;
  const pool = oracledb.getPool('lotecerto');
  await pool.close(10);
  initialized = false;
}

export async function getConnection(): Promise<Connection> {
  return oracledb.getConnection('lotecerto');
}

export async function withConnection<T>(work: (connection: Connection) => Promise<T>): Promise<T> {
  const connection = await getConnection();
  try {
    return await work(connection);
  } finally {
    await connection.close();
  }
}

export async function withTransaction<T>(work: (connection: Connection) => Promise<T>): Promise<T> {
  const connection = await getConnection();
  try {
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function execute(
  connection: Connection,
  sql: string,
  binds: BindParameters = {},
  options: ExecuteOptions = {},
): Promise<Result<unknown>> {
  return connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, ...options });
}

export function rowsOf<T>(result: Result<unknown>): T[] {
  return (result.rows ?? []).map((row) => camelizeRecord(row as Record<string, unknown>)) as T[];
}

export function firstRow<T>(result: Result<unknown>): T | undefined {
  return rowsOf<T>(result)[0];
}

export function insertedId(result: Result<unknown>, bindName = 'id'): number {
  const outBinds = result.outBinds as Record<string, unknown[]> | undefined;
  const value = outBinds?.[bindName]?.[0];
  if (typeof value !== 'number') throw new Error('O Oracle não retornou o identificador criado.');
  return value;
}

export const outNumber = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } as const;

function camelizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      const camelKey = normalizedKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      const booleanKeys = new Set(['active', 'must_change_password', 'is_default']);
      const normalizedValue = booleanKeys.has(normalizedKey) && (value === 0 || value === 1) ? value === 1 : value;
      return [camelKey, normalizedValue];
    }),
  );
}

export function isOracleUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /ORA-00001|unique constraint/i.test(error.message);
}
