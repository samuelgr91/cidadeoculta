import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { issuePassTransfer, redeemPassTransfer } from '../lib/pass-transfer-core.ts';

const client = createClient({ url: ':memory:' });
const database = createTursoDatabase(client);
const secret = 'a-test-secret-with-at-least-thirty-two-characters';
const timestamp = Date.parse('2026-09-24T12:00:00.000Z');
try {
  for (const name of ['0000_special_frog_thor.sql', '0001_chunky_shard.sql', '0002_flowery_lady_mastermind.sql']) {
    const migration = await readFile(new URL(`../drizzle/${name}`, import.meta.url), 'utf8');
    for (const sql of migration.split('--> statement-breakpoint').map(part => part.trim()).filter(Boolean)) await database.prepare(sql).run();
  }
  await database.batch([
    database.prepare('INSERT INTO cities(id,slug,data,updated_at) VALUES(?,?,?,?)').bind('ouro-preto', 'ouro-preto', '{}', '2026-09-24'),
    database.prepare('INSERT INTO locations(id,city_id,data) VALUES(?,?,?)').bind('l1', 'ouro-preto', '{}'),
    database.prepare('INSERT INTO stories(id,city_id,location_id,data,updated_at) VALUES(?,?,?,?,?)').bind('s1', 'ouro-preto', 'l1', '{}', '2026-09-24'),
    database.prepare('INSERT INTO orders(id,user_id,city_id,amount,currency,mode,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('o1', 'chatgpt:old', 'ouro-preto', 2490, 'BRL', 'demo', 'paid', '2026-09-24', '2026-09-24'),
    database.prepare('INSERT INTO entitlements(id,user_id,city_id,order_id,mode,active,created_at) VALUES(?,?,?,?,?,?,?)').bind('e1', 'chatgpt:old', 'ouro-preto', 'o1', 'demo', 1, '2026-09-24'),
    database.prepare('INSERT INTO progress(id,user_id,story_id,completed_at) VALUES(?,?,?,?)').bind('p1', 'chatgpt:old', 's1', '2026-09-24'),
    database.prepare('INSERT INTO progress(id,user_id,story_id,completed_at) VALUES(?,?,?,?)').bind('p2', 'account:new', 's1', '2026-09-24'),
  ]);
  const code = await issuePassTransfer(database, secret, 'chatgpt:old', ' Test@Example.com ', timestamp);
  await assert.rejects(redeemPassTransfer(database, secret, code, 'account:new', 'other@example.com', timestamp), /mesmo e-mail/);
  await assert.rejects(redeemPassTransfer(database, secret, code + 'x', 'account:new', 'test@example.com', timestamp), /inválido/);
  await assert.rejects(redeemPassTransfer(database, secret, code, 'account:new', 'test@example.com', timestamp + 16 * 60000), /expirou/);
  assert.deepEqual(await redeemPassTransfer(database, secret, code, 'account:new', 'test@example.com', timestamp + 1000), { transferred: 1, alreadyLinked: false });
  assert.equal((await database.prepare('SELECT user_id FROM entitlements WHERE id=?').bind('e1').first()).user_id, 'account:new');
  assert.equal((await database.prepare('SELECT user_id FROM orders WHERE id=?').bind('o1').first()).user_id, 'chatgpt:old');
  assert.equal((await database.prepare('SELECT COUNT(*) n FROM progress WHERE user_id=?').bind('account:new').first()).n, 1);
  assert.equal((await database.prepare('SELECT COUNT(*) n FROM progress WHERE user_id=?').bind('chatgpt:old').first()).n, 0);
  assert.deepEqual(await redeemPassTransfer(database, secret, code, 'account:new', 'test@example.com', timestamp + 1000), { transferred: 0, alreadyLinked: true });
  await assert.rejects(redeemPassTransfer(database, secret, code, 'account:other', 'test@example.com', timestamp + 1000), /outra conta/);
  console.log('Pass transfer: proof, email match, expiry, replay, order audit and progress merge passed.');
} finally { client.close(); }
