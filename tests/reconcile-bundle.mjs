import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { makeBundle, importBundle } from '../lib/migration-bundle.ts';
import { planReconciliation, applyReconciliation } from '../lib/reconcile-bundle.ts';

const sourceClient = createClient({ url: ':memory:' }), targetClient = createClient({ url: ':memory:' });
const source = createTursoDatabase(sourceClient), target = createTursoDatabase(targetClient);
try {
  for (const database of [source, target]) for (const name of ['0000_special_frog_thor.sql', '0001_chunky_shard.sql', '0002_flowery_lady_mastermind.sql']) {
    const migration = await readFile(new URL(`../drizzle/${name}`, import.meta.url), 'utf8');
    for (const sql of migration.split('--> statement-breakpoint').map(part => part.trim()).filter(Boolean)) await database.prepare(sql).run();
  }
  await source.batch([
    source.prepare('INSERT INTO cities(id,slug,data,updated_at) VALUES(?,?,?,?)').bind('ouro-preto', 'ouro-preto', '{}', '2026-09-23'),
    source.prepare('INSERT INTO locations(id,city_id,data) VALUES(?,?,?)').bind('l1', 'ouro-preto', '{}'),
    source.prepare('INSERT INTO stories(id,city_id,location_id,data,updated_at) VALUES(?,?,?,?,?)').bind('s1', 'ouro-preto', 'l1', '{"v":1}', '2026-09-23'),
    source.prepare('INSERT INTO story_translations(story_id,city_id,locale,slug,status) VALUES(?,?,?,?,?)').bind('s1', 'ouro-preto', 'pt-br', 'historia', 'published'),
    source.prepare('INSERT INTO orders(id,user_id,city_id,amount,currency,mode,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('o1', 'chatgpt:old', 'ouro-preto', 2490, 'BRL', 'demo', 'paid', '2026-09-23', '2026-09-23'),
    source.prepare('INSERT INTO entitlements(id,user_id,city_id,order_id,mode,active,created_at) VALUES(?,?,?,?,?,?,?)').bind('e1', 'chatgpt:old', 'ouro-preto', 'o1', 'demo', 1, '2026-09-23'),
    source.prepare('INSERT INTO progress(id,user_id,story_id,completed_at) VALUES(?,?,?,?)').bind('p1', 'chatgpt:old', 's1', '2026-09-23'),
  ]);
  const baseline = await makeBundle(source);
  await importBundle(target, baseline);
  await target.batch([
    target.prepare('INSERT INTO auth_users(id,email,created_at,verified_at) VALUES(?,?,?,?)').bind('new', 'owner@example.test', '2026-09-24', '2026-09-24'),
    target.prepare('INSERT INTO pass_transfers(legacy_user_id,account_user_id,nonce,created_at) VALUES(?,?,?,?)').bind('chatgpt:old', 'account:new', 'fixed-test-nonce', '2026-09-24'),
    target.prepare('UPDATE entitlements SET user_id=? WHERE id=?').bind('account:new', 'e1'),
    target.prepare('DELETE FROM progress WHERE id=?').bind('p1'),
    target.prepare('INSERT INTO progress(id,user_id,story_id,completed_at) VALUES(?,?,?,?)').bind('p2', 'account:new', 's1', '2026-09-23'),
  ]);
  await source.batch([
    source.prepare('UPDATE stories SET data=?,updated_at=? WHERE id=?').bind('{"v":2}', '2026-09-24', 's1'),
    source.prepare('INSERT INTO events(id,name,city_id,story_id,locale,session_id,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)').bind('event-new', 'story_open', 'ouro-preto', 's1', 'pt-br', null, '{}', '2026-09-24'),
  ]);
  const latest = await makeBundle(source);
  const plan = await planReconciliation(target, baseline, latest);
  assert.deepEqual(plan.conflicts, []);
  assert.equal(plan.mutations.length, 2);
  assert.deepEqual(plan.mutations.map(mutation => `${mutation.table}:${mutation.kind}`), ['stories:update', 'events:insert']);
  await target.prepare('UPDATE stories SET data=? WHERE id=?').bind('{"v":5}', 's1').run();
  await assert.rejects(applyReconciliation(target, plan), /destino mudou desde a prévia/);
  assert.equal((await target.prepare('SELECT COUNT(*) n FROM events WHERE id=?').bind('event-new').first()).n, 0);
  await target.prepare('UPDATE stories SET data=? WHERE id=?').bind('{"v":1}', 's1').run();
  await applyReconciliation(target, plan);
  assert.equal((await target.prepare('SELECT data FROM stories WHERE id=?').bind('s1').first()).data, '{"v":2}');
  assert.equal((await target.prepare('SELECT user_id FROM entitlements WHERE id=?').bind('e1').first()).user_id, 'account:new');
  assert.equal((await target.prepare('SELECT user_id FROM orders WHERE id=?').bind('o1').first()).user_id, 'chatgpt:old');
  assert.equal((await target.prepare('SELECT COUNT(*) n FROM auth_users').first()).n, 1);
  assert.equal((await planReconciliation(target, baseline, latest)).mutations.length, 0);

  await source.prepare('UPDATE stories SET data=? WHERE id=?').bind('{"v":3}', 's1').run();
  await target.prepare('UPDATE stories SET data=? WHERE id=?').bind('{"v":4}', 's1').run();
  assert.match((await planReconciliation(target, baseline, await makeBundle(source))).conflicts.join(' '), /dois bancos/);
  await source.prepare('UPDATE stories SET data=? WHERE id=?').bind('{"v":2}', 's1').run();
  await target.prepare('UPDATE stories SET data=? WHERE id=?').bind('{"v":2}', 's1').run();

  await source.prepare('INSERT INTO stories(id,city_id,location_id,data,updated_at) VALUES(?,?,?,?,?)').bind('s2', 'ouro-preto', 'l1', '{}', '2026-09-24').run();
  await source.prepare('INSERT INTO progress(id,user_id,story_id,completed_at) VALUES(?,?,?,?)').bind('p-new', 'chatgpt:old', 's2', '2026-09-24').run();
  const postTransfer = await makeBundle(source);
  const conflict = await planReconciliation(target, baseline, postTransfer);
  assert.match(conflict.conflicts.join(' '), /conta já transferida/);
  await assert.rejects(applyReconciliation(target, conflict), /nenhuma alteração/);
  await source.prepare('DELETE FROM progress WHERE id=?').bind('p-new').run();
  await source.prepare('DELETE FROM stories WHERE id=?').bind('s2').run();
  await source.prepare('DELETE FROM progress WHERE id=?').bind('p1').run();
  const deleted = await makeBundle(source);
  assert.match((await planReconciliation(target, baseline, deleted)).conflicts.join(' '), /removido na origem/);
  console.log('D1→Turso reconciliation: additions, edits, idempotency, transferred passes, conflicts and deletions passed.');
} finally { sourceClient.close(); targetClient.close(); }
