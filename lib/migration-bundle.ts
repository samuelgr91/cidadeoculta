import { migrationTables } from './migration-tables.ts';
import type { QueryDatabase } from './turso-db';

export type MigrationRow = Record<string, string | number | null>;
export type MigrationBundle = { format: 'cidade-oculta-d1'; version: 1; exportedAt: string; tables: Record<string, { count: number; sha256: string; rows: MigrationRow[] }> };

function canonical(name: string, rows: MigrationRow[]): string {
  const table = migrationTables.find(table => table.name === name);
  if (!table) throw new Error('Tabela de migração desconhecida.');
  return JSON.stringify(rows.map(row => table.columns.map(column => row[column])));
}
async function digest(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function readTable(database: QueryDatabase, name: string): Promise<MigrationRow[]> {
  if (!migrationTables.some(table => table.name === name)) throw new Error('Tabela inválida.');
  const rows: MigrationRow[] = [];
  while (true) {
    const page = (await database.prepare(`SELECT * FROM "${name}" ORDER BY rowid LIMIT ? OFFSET ?`).bind(500, rows.length).all<MigrationRow>()).results;
    rows.push(...page);
    if (page.length < 500) return rows;
    if (rows.length > 100_000) throw new Error(`Exportação de ${name} excede o limite seguro.`);
  }
}
async function exportRows(database: QueryDatabase, name: string): Promise<MigrationRow[]> {
  const rows = await readTable(database, name);
  if (name !== 'leads' && name !== 'events') return rows;
  return Promise.all(rows.map(async row => ({ ...row, session_id: row.session_id === null ? null : `legacy:${await digest(`session:${row.session_id}`)}` })));
}
export async function makeBundle(database: QueryDatabase): Promise<MigrationBundle> {
  const tables: MigrationBundle['tables'] = {};
  for (const table of migrationTables) {
    const rows = await exportRows(database, table.name);
    tables[table.name] = { count: rows.length, sha256: await digest(canonical(table.name, rows)), rows };
  }
  for (const table of migrationTables) {
    const rows = await exportRows(database, table.name);
    if (rows.length !== tables[table.name].count || await digest(canonical(table.name, rows)) !== tables[table.name].sha256) throw new Error(`O banco mudou durante a exportação (${table.name}). Tente novamente em uma janela sem edições.`);
  }
  return { format: 'cidade-oculta-d1', version: 1, exportedAt: new Date().toISOString(), tables };
}
export async function validateBundle(value: unknown): Promise<MigrationBundle> {
  if (!value || typeof value !== 'object') throw new Error('Arquivo de migração inválido.');
  const bundle = value as MigrationBundle;
  if (bundle.format !== 'cidade-oculta-d1' || bundle.version !== 1 || !Number.isFinite(Date.parse(bundle.exportedAt)) || !bundle.tables) throw new Error('Formato de migração desconhecido.');
  if (Object.keys(bundle.tables).sort().join('|') !== migrationTables.map(table => table.name).sort().join('|')) throw new Error('O arquivo não contém o conjunto exato de tabelas esperado.');
  for (const table of migrationTables) {
    const part = bundle.tables[table.name];
    if (!part || !Array.isArray(part.rows) || part.count !== part.rows.length || !Number.isSafeInteger(part.count) || part.count > 100_000) throw new Error(`Contagem inválida em ${table.name}.`);
    for (const row of part.rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).sort().join('|') !== [...table.columns].sort().join('|') || table.columns.some(column => row[column] !== null && typeof row[column] !== 'string' && (typeof row[column] !== 'number' || !Number.isSafeInteger(row[column])))) throw new Error(`Colunas ou valores inválidos em ${table.name}.`);
    }
    if (await digest(canonical(table.name, part.rows)) !== part.sha256) throw new Error(`Integridade inválida em ${table.name}.`);
  }
  const ids = (name: string) => new Set(bundle.tables[name].rows.map(row => String(row.id)));
  const cities = ids('cities'), locations = ids('locations'), stories = ids('stories'), orders = ids('orders');
  const valid = (name: string, field: string, target: Set<string>) => bundle.tables[name].rows.every(row => target.has(String(row[field])));
  if (!valid('locations', 'city_id', cities) || !valid('stories', 'city_id', cities) || !valid('stories', 'location_id', locations) || !valid('story_translations', 'story_id', stories) || !valid('sources', 'story_id', stories) || !valid('orders', 'city_id', cities) || !valid('entitlements', 'city_id', cities) || !valid('entitlements', 'order_id', orders) || !valid('progress', 'story_id', stories)) throw new Error('Referências inválidas entre tabelas.');
  const sessionId = (value: unknown) => typeof value === 'string' && /^legacy:[a-f0-9]{64}$/.test(value);
  if (!bundle.tables.leads.rows.every(row => sessionId(row.session_id)) || !bundle.tables.events.rows.every(row => row.session_id === null || sessionId(row.session_id))) throw new Error('IDs de sessão não foram protegidos.');
  const orderRows = new Map(bundle.tables.orders.rows.map(row => [row.id, row]));
  if (!bundle.tables.entitlements.rows.every(row => { const order = orderRows.get(row.order_id); return order && order.city_id === row.city_id && order.user_id === row.user_id && order.mode === row.mode; })) throw new Error('Passe sem pedido correspondente.');
  return bundle;
}
export async function importBundle(database: QueryDatabase, input: unknown): Promise<Record<string, number>> {
  const bundle = await validateBundle(input);
  for (const table of migrationTables) {
    const count = await database.prepare(`SELECT COUNT(*) AS n FROM "${table.name}"`).first<{ n: number }>();
    if (Number(count?.n) !== 0) throw new Error(`O banco de destino já contém dados em ${table.name}. Use um banco novo.`);
  }
  const result: Record<string, number> = {};
  for (const table of migrationTables) {
    const name = table.name, part = bundle.tables[name];
    const insert = `INSERT INTO "${name}" (${table.columns.map(column => `"${column}"`).join(',')}) VALUES (${table.columns.map(() => '?').join(',')})`;
    for (let start = 0; start < part.rows.length; start += 100) {
      await database.batch(part.rows.slice(start, start + 100).map(row => database.prepare(insert).bind(...table.columns.map(column => row[column]))));
    }
    const imported = await readTable(database, name);
    if (imported.length !== part.count || await digest(canonical(name, imported)) !== part.sha256) throw new Error(`Falha na conferência de ${name}. Descarte o banco de destino.`);
    result[name] = part.count;
  }
  return result;
}
