import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client/web';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
if (!url.startsWith('libsql://') && !url.startsWith('https://')) throw new Error('Use uma URL remota segura do Turso.');

const client = createClient({ url, authToken });
try {
  await client.execute('CREATE TABLE IF NOT EXISTS _co_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7);
  if(only&&!journal.entries.some(entry=>`${entry.tag}.sql`===only))throw new Error('Migração selecionada não existe no journal.');
  for (const entry of journal.entries) {
    const name = `${entry.tag}.sql`;
    if(only&&name!==only)continue;
    const applied = await client.execute({ sql: 'SELECT name FROM _co_migrations WHERE name=?', args: [name] });
    if (applied.rows.length) { console.log(`Migração ${name} já aplicada.`); continue; }
    if (!process.argv.includes('--apply')) { console.log(`Migração ${name} pendente. Execute com --apply para aplicar.`); continue; }
    const sql = await readFile(new URL(`../drizzle/${name}`, import.meta.url), 'utf8');
    const statements = sql.split('--> statement-breakpoint').map(part => part.trim()).filter(Boolean);
    await client.batch([...statements, { sql: 'INSERT INTO _co_migrations(name,applied_at) VALUES(?,?)', args: [name, new Date().toISOString()] }], 'write');
    console.log(`Migração ${name} aplicada (${statements.length} comandos).`);
  }
} finally {
  client.close();
}
