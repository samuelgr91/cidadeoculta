import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';

const client = createClient({ url: ':memory:' });
const database = createTursoDatabase(client);

try {
  const migration = await readFile(new URL('../drizzle/0000_special_frog_thor.sql', import.meta.url), 'utf8');
  for (const statement of migration.split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean)) {
    await database.prepare(statement).run();
  }

  assert.equal(await database.prepare('SELECT id FROM cities WHERE id=?').bind('ouro-preto').first(), null);
  await database.batch([
    database.prepare('INSERT INTO cities(id,slug,data,updated_at) VALUES(?,?,?,?)').bind('ouro-preto', 'ouro-preto', '{}', '2026-09-23'),
    database.prepare('INSERT INTO locations(id,city_id,data) VALUES(?,?,?)').bind('loc-1', 'ouro-preto', '{}'),
    database.prepare('INSERT INTO stories(id,city_id,location_id,data,updated_at) VALUES(?,?,?,?,?)').bind('story-1', 'ouro-preto', 'loc-1', '{}', '2026-09-23'),
    database.prepare('INSERT INTO story_translations(story_id,city_id,locale,slug,status) VALUES(?,?,?,?,?)').bind('story-1', 'ouro-preto', 'pt-br', 'primeira-historia', 'published'),
  ]);
  const rows = await database.prepare(
    "SELECT s.id FROM stories s JOIN story_translations t ON t.story_id=s.id WHERE t.locale=? AND t.status='published'"
  ).bind('pt-br').all();
  assert.deepEqual(rows.results, [{ id: 'story-1' }]);

  await database.prepare('UPDATE cities SET updated_at=? WHERE id=?').bind('2026-09-24', 'ouro-preto').run();
  assert.equal((await database.prepare('SELECT updated_at FROM cities WHERE id=?').bind('ouro-preto').first()).updated_at, '2026-09-24');

  await assert.rejects(database.batch([
    database.prepare('INSERT INTO locations(id,city_id,data) VALUES(?,?,?)').bind('rollback-me', 'ouro-preto', '{}'),
    database.prepare('INSERT INTO cities(id,slug,data,updated_at) VALUES(?,?,?,?)').bind('duplicate', 'ouro-preto', '{}', '2026-09-23'),
  ]));
  assert.equal(await database.prepare('SELECT id FROM locations WHERE id=?').bind('rollback-me').first(), null);

  console.log('Turso adapter: migration, bind, join, update and atomic batch passed.');
} finally {
  client.close();
}
