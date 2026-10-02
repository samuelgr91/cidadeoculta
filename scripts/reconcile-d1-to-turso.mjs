import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client/web';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { validateBundle } from '../lib/migration-bundle.ts';
import { planReconciliation, applyReconciliation } from '../lib/reconcile-bundle.ts';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const paths = args.filter(argument => argument !== '--apply');
if (paths.length !== 2 || args.length !== 2 + Number(apply) || paths.some(path => path.startsWith('--'))) throw new Error('Uso: npm run db:reconcile:turso -- exportacao-inicial.json exportacao-atual.json [--apply]');
const [baselinePath, latestPath] = paths;
const baseline = await validateBundle(JSON.parse(await readFile(baselinePath, 'utf8')));
const latest = await validateBundle(JSON.parse(await readFile(latestPath, 'utf8')));
const url = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken || (!url.startsWith('libsql://') && !url.startsWith('https://'))) throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para um banco remoto seguro.');
const client = createClient({ url, authToken });
try {
  const applied = new Set((await client.execute('SELECT name FROM _co_migrations')).rows.map(row => String(row.name)));
  if (!applied.has('0002_flowery_lady_mastermind.sql')) throw new Error('Aplique as migrações do Turso antes de reconciliar.');
  const database = createTursoDatabase(client);
  const plan = await planReconciliation(database, baseline, latest);
  const counts = new Map();
  for (const mutation of plan.mutations) counts.set(`${mutation.table}:${mutation.kind}`, (counts.get(`${mutation.table}:${mutation.kind}`) || 0) + 1);
  console.log(`Cópia inicial: ${plan.baselineAt}; exportação atual: ${plan.latestAt}.`);
  console.log(`Sem alteração: ${plan.unchanged}; presentes só no Turso: ${plan.destinationOnly}; pendentes: ${plan.mutations.length}; conflitos: ${plan.conflicts.length}.`);
  for (const [name, count] of counts) console.log(`${name}: ${count}`);
  for (const conflict of plan.conflicts.slice(0, 30)) console.log(`CONFLITO ${conflict}`);
  if (plan.conflicts.length > 30) console.log(`... e mais ${plan.conflicts.length - 30} conflitos.`);
  if (!apply) console.log('Prévia apenas. Revise os números e repita com --apply para atualizar o Turso.');
  else {
    await applyReconciliation(database, plan);
    console.log(`Atualização concluída e conferida: ${plan.mutations.length} registros.`);
  }
} finally { client.close(); }
