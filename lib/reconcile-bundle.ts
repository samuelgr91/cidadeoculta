import { migrationTables } from './migration-tables.ts';
import { readTable, validateBundle, type MigrationBundle, type MigrationRow } from './migration-bundle.ts';
import type { QueryDatabase } from './turso-db.ts';

type TableName = (typeof migrationTables)[number]['name'];
type Mutation = { table: TableName; kind: 'insert' | 'update'; key: string; row: MigrationRow; expected: MigrationRow | null };
export type ReconciliationPlan = { baselineAt: string; latestAt: string; mutations: Mutation[]; conflicts: string[]; unchanged: number; destinationOnly: number };

function keyOf(name: TableName, row: MigrationRow): string {
  return name === 'story_translations' ? `${row.story_id}\u0000${row.locale}` : String(row.id);
}
function same(name: TableName, a: MigrationRow | undefined, b: MigrationRow | undefined): boolean {
  if (!a || !b) return a === b;
  const table = migrationTables.find(item => item.name === name)!;
  return table.columns.every(column => a[column] === b[column]);
}
function index(name: TableName, rows: MigrationRow[]): Map<string, MigrationRow> {
  const indexed = new Map<string, MigrationRow>();
  for (const row of rows) {
    const key = keyOf(name, row);
    if (indexed.has(key)) throw new Error(`Chave duplicada em ${name}.`);
    indexed.set(key, row);
  }
  return indexed;
}
function label(name: TableName, key: string): string { return `${name}:${key.replace('\u0000', '/')}`; }
function ownershipTransfer(name: TableName, source: MigrationRow, target: MigrationRow | undefined, transfers: Map<string, string>, targetProgress: Set<string>): boolean {
  const account = transfers.get(String(source.user_id));
  if (!account) return false;
  if (name === 'entitlements' && target) return target.user_id === account && migrationTables.find(item => item.name === name)!.columns.every(column => column === 'user_id' || source[column] === target[column]);
  if (name === 'progress') return targetProgress.has(`${account}\u0000${source.story_id}`);
  return false;
}

export async function planReconciliation(database: QueryDatabase, baselineInput: unknown, latestInput: unknown): Promise<ReconciliationPlan> {
  const baseline: MigrationBundle = await validateBundle(baselineInput);
  const latest: MigrationBundle = await validateBundle(latestInput);
  if (Date.parse(latest.exportedAt) < Date.parse(baseline.exportedAt)) throw new Error('A exportação atual é anterior à cópia inicial.');

  const transferRows = (await database.prepare('SELECT legacy_user_id,account_user_id FROM pass_transfers').all<{ legacy_user_id: string; account_user_id: string }>()).results;
  const transfers = new Map(transferRows.map(row => [row.legacy_user_id, row.account_user_id]));
  const targetProgress = new Set((await readTable(database, 'progress')).map(row => `${row.user_id}\u0000${row.story_id}`));
  const plan: ReconciliationPlan = { baselineAt: baseline.exportedAt, latestAt: latest.exportedAt, mutations: [], conflicts: [], unchanged: 0, destinationOnly: 0 };

  for (const table of migrationTables) {
    const name = table.name;
    const before = index(name, baseline.tables[name].rows);
    const after = index(name, latest.tables[name].rows);
    const destination = index(name, await readTable(database, name));
    for (const [key, previous] of before) if (!after.has(key)) plan.conflicts.push(`${label(name, key)} removido na origem; revise manualmente.`);
    for (const [key, current] of after) {
      const previous = before.get(key), target = destination.get(key);
      const transferred = (name === 'entitlements' || name === 'progress') && transfers.has(String(current.user_id));
      if (!previous) {
        if (transferred) plan.conflicts.push(`${label(name, key)} pertence a uma conta já transferida; revise manualmente.`);
        else if (!target) plan.mutations.push({ table: name, kind: 'insert', key, row: current, expected: null });
        else if (same(name, current, target)) plan.unchanged++;
        else plan.conflicts.push(`${label(name, key)} novo na origem, mas já existe diferente no destino.`);
      } else if (same(name, previous, current)) {
        if (same(name, previous, target) || ownershipTransfer(name, previous, target, transfers, targetProgress)) plan.unchanged++;
        else plan.conflicts.push(`${label(name, key)} divergiu no destino.`);
      } else if (transferred) {
        plan.conflicts.push(`${label(name, key)} mudou depois da transferência da conta; revise manualmente.`);
      } else if (same(name, current, target)) {
        plan.unchanged++;
      } else if (same(name, previous, target)) {
        plan.mutations.push({ table: name, kind: 'update', key, row: current, expected: previous });
      } else {
        plan.conflicts.push(`${label(name, key)} foi alterado nos dois bancos.`);
      }
    }
    for (const key of destination.keys()) if (!after.has(key)) plan.destinationOnly++;
  }
  return plan;
}

export async function applyReconciliation(database: QueryDatabase, plan: ReconciliationPlan): Promise<void> {
  if (plan.conflicts.length) throw new Error(`Existem ${plan.conflicts.length} conflitos; nenhuma alteração foi aplicada.`);
  if (plan.mutations.length > 500) throw new Error('Mais de 500 alterações pendentes. Divida a atualização em lotes revisados.');
  if (!plan.mutations.length) return;
  const current = new Map<TableName, Map<string, MigrationRow>>();
  for (const name of new Set(plan.mutations.map(mutation => mutation.table))) current.set(name, index(name, await readTable(database, name)));
  const pending = plan.mutations.filter(mutation => {
    const actual = current.get(mutation.table)!.get(mutation.key);
    if (same(mutation.table, actual, mutation.row)) return false;
    if (!same(mutation.table, actual, mutation.expected || undefined)) throw new Error(`O destino mudou desde a prévia (${label(mutation.table, mutation.key)}). Gere outra prévia antes de aplicar.`);
    return true;
  });
  const statements = pending.map(mutation => {
    const table = migrationTables.find(item => item.name === mutation.table)!;
    const columns = table.columns;
    if (mutation.kind === 'insert') {
      const sql = `INSERT INTO "${table.name}" (${columns.map(column => `"${column}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
      return database.prepare(sql).bind(...columns.map(column => mutation.row[column]));
    }
    const expected = mutation.expected!;
    const sql = `UPDATE "${table.name}" SET ${columns.map(column => `"${column}"=?`).join(',')} WHERE ${columns.map(column => `"${column}" IS ?`).join(' AND ')}`;
    return database.prepare(sql).bind(...columns.map(column => mutation.row[column]), ...columns.map(column => expected[column]));
  });
  if (statements.length) await database.batch(statements);
  const tables = new Set(plan.mutations.map(mutation => mutation.table));
  for (const name of tables) {
    const actual = index(name, await readTable(database, name));
    for (const mutation of plan.mutations.filter(item => item.table === name)) {
      if (!same(name, actual.get(mutation.key), mutation.row)) throw new Error(`Falha na conferência de ${label(name, mutation.key)}. Interrompa e revise o destino.`);
    }
  }
}
