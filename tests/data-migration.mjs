import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { makeBundle, validateBundle, importBundle } from '../lib/migration-bundle.ts';

const sourceClient = createClient({ url: ':memory:' });
const targetClient = createClient({ url: ':memory:' });
const source = createTursoDatabase(sourceClient), target = createTursoDatabase(targetClient);
try {
  for (const database of [source, target]) for (const name of ['0000_special_frog_thor.sql', '0001_chunky_shard.sql']) {
    const migration = await readFile(new URL(`../drizzle/${name}`, import.meta.url), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean)) await database.prepare(statement).run();
  }
  const longStory = JSON.stringify({ title: 'História integral', blocks: [{ text: 'Ouro Preto e suas histórias. '.repeat(1000) }] });
  await source.batch([
    source.prepare('INSERT INTO cities(id,slug,data,updated_at) VALUES(?,?,?,?)').bind('ouro-preto', 'ouro-preto', '{}', '2026-09-23'),
    source.prepare('INSERT INTO locations(id,city_id,data) VALUES(?,?,?)').bind('l1', 'ouro-preto', '{}'),
    source.prepare('INSERT INTO stories(id,city_id,location_id,data,updated_at) VALUES(?,?,?,?,?)').bind('s1', 'ouro-preto', 'l1', longStory, '2026-09-23'),
    source.prepare('INSERT INTO story_translations(story_id,city_id,locale,slug,status) VALUES(?,?,?,?,?)').bind('s1', 'ouro-preto', 'pt-br', 'historia', 'published'),
    source.prepare('INSERT INTO sources(id,story_id,data) VALUES(?,?,?)').bind('ref1', 's1', '{}'),
    source.prepare('INSERT INTO orders(id,user_id,city_id,amount,currency,mode,status,provider_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('o1', 'chatgpt:old', 'ouro-preto', 2490, 'BRL', 'demo', 'paid', null, '2026-09-23', '2026-09-23'),
    source.prepare('INSERT INTO entitlements(id,user_id,city_id,order_id,mode,active,created_at) VALUES(?,?,?,?,?,?,?)').bind('e1', 'chatgpt:old', 'ouro-preto', 'o1', 'demo', 1, '2026-09-23'),
    source.prepare('INSERT INTO progress(id,user_id,story_id,completed_at) VALUES(?,?,?,?)').bind('p1', 'chatgpt:old', 's1', '2026-09-23'),
    source.prepare('INSERT INTO leads(id,session_id,email,city_id,locale,consent,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)').bind('lead1', 'sensitive-session', 'visitor@example.test', 'ouro-preto', 'pt-br', 0, '{}', '2026-09-23'),
    source.prepare('INSERT INTO events(id,name,city_id,story_id,locale,session_id,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)').bind('event1', 'story_open', 'ouro-preto', 's1', 'pt-br', 'sensitive-session', '{}', '2026-09-23'),
    source.prepare('INSERT INTO sessions(id,created_at,expires_at) VALUES(?,?,?)').bind('sensitive-session', '2026-09-23', '2027-01-01'),
    source.prepare('INSERT INTO auth_users(id,email,created_at,verified_at) VALUES(?,?,?,?)').bind('u1', 'private@example.test', '2026-09-23', '2026-09-23'),
  ]);
  const bundle = await makeBundle(source);
  assert.equal(bundle.tables.stories.rows[0].data, longStory);
  assert.equal(bundle.tables.sessions, undefined);
  assert.equal(bundle.tables.auth_users, undefined);
  assert.equal(bundle.tables.leads.rows[0].session_id, bundle.tables.events.rows[0].session_id);
  assert.notEqual(bundle.tables.leads.rows[0].session_id, 'sensitive-session');
  await validateBundle(bundle);
  const tampered = structuredClone(bundle);
  tampered.tables.stories.rows[0].data = '{}';
  await assert.rejects(validateBundle(tampered), /Integridade/);
  const counts = await importBundle(target, bundle);
  assert.equal(counts.stories, 1);
  assert.equal((await target.prepare('SELECT data FROM stories WHERE id=?').bind('s1').first()).data, longStory);
  assert.equal((await target.prepare('SELECT user_id FROM entitlements WHERE id=?').bind('e1').first()).user_id, 'chatgpt:old');
  assert.equal((await target.prepare('SELECT COUNT(*) n FROM auth_users').first()).n, 0);
  await assert.rejects(importBundle(target, bundle), /já contém dados/);
  console.log('D1→Turso bundle: full text, digests, references, import verification and legacy-pass isolation passed.');
} finally { sourceClient.close(); targetClient.close(); }
