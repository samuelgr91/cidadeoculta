import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client/web';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { validateBundle, importBundle } from '../lib/migration-bundle.ts';
import { migrationTables } from '../lib/migration-tables.ts';

const file = process.argv[2];
if (!file || file.startsWith('--')) throw new Error('Uso: npm run db:import:turso -- caminho/arquivo.json [--apply]');
const bundle = await validateBundle(JSON.parse(await readFile(file, 'utf8')));
console.log(`Exportação validada: ${bundle.exportedAt}.`);
for (const table of migrationTables) console.log(`${table.name}: ${bundle.tables[table.name].count} registros`);

if (!process.argv.includes('--apply')) {
  console.log('Somente conferência. Para importar em um banco Turso novo e vazio, repita com --apply.');
  process.exit(0);
}
const url = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken || (!url.startsWith('libsql://') && !url.startsWith('https://'))) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para um banco remoto seguro.');
const client = createClient({ url, authToken });
try {
  const database = createTursoDatabase(client);
  const migrations = await client.execute("SELECT name FROM _co_migrations ORDER BY name");
  const applied = new Set(migrations.rows.map(row => String(row.name)));
  for (const name of ['0000_special_frog_thor.sql', '0001_chunky_shard.sql']) if (!applied.has(name)) throw new Error(`A migração ${name} ainda não foi aplicada. Execute npm run db:migrate:turso primeiro.`);
  const counts = await importBundle(database, bundle);
  console.log(`Importação e conferência concluídas: ${Object.values(counts).reduce((a, b) => a + b, 0)} registros.`);
  console.log('Passes antigos continuam com user_id chatgpt:*; nenhum foi associado automaticamente a uma conta por e-mail.');
} finally { client.close(); }
