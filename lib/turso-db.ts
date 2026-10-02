import { createClient, type Client, type InValue } from '@libsql/client/web';

export interface PreparedQuery {
  bind(...values: unknown[]): PreparedQuery;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface QueryDatabase {
  prepare(sql: string): PreparedQuery;
  batch(statements: PreparedQuery[]): Promise<unknown>;
}

type BoundQuery = PreparedQuery & { sql: string; args: InValue[] };
type SqlClient = Pick<Client, 'execute' | 'batch'>;

function value(input: unknown): InValue {
  if (input === null || typeof input === 'string' || typeof input === 'number' ||
      typeof input === 'bigint' || input instanceof Uint8Array) return input;
  if (typeof input === 'boolean') return input ? 1 : 0;
  throw new TypeError('Tipo de parâmetro SQL não suportado.');
}

export function createTursoDatabase(client: SqlClient): QueryDatabase {
  function prepare(sql: string, args: InValue[] = []): BoundQuery {
    const statement = { sql, args };
    return {
      ...statement,
      bind(...values) { return prepare(sql, values.map(value)); },
      async first<T>() {
        const result = await client.execute(statement);
        return result.rows[0] ? { ...result.rows[0] } as T : null;
      },
      async all<T>() {
        const result = await client.execute(statement);
        return { results: result.rows.map(row => ({ ...row } as T)) };
      },
      async run() { return client.execute(statement); },
    };
  }

  return {
    prepare,
    batch(statements) {
      const commands = statements.map(statement => {
        const bound = statement as BoundQuery;
        return { sql: bound.sql, args: bound.args };
      });
      return client.batch(commands, 'write');
    },
  };
}

let remote: QueryDatabase | undefined;

export function tursoDatabase(): QueryDatabase {
  if (remote) return remote;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no servidor.');
  if (!url.startsWith('libsql://') && !url.startsWith('https://')) {
    throw new Error('TURSO_DATABASE_URL deve apontar para um banco remoto seguro.');
  }
  remote = createTursoDatabase(createClient({ url, authToken }));
  return remote;
}
