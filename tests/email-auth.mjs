import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { requestCode, verifyCode, userForToken, revokeToken } from '../lib/email-auth-core.ts';

const client = createClient({ url: ':memory:' });
const database = createTursoDatabase(client);
const secret = 'test-only-secret-with-more-than-32-characters';
try {
  for (const name of ['0000_special_frog_thor.sql', '0001_chunky_shard.sql']) {
    const migration = await readFile(new URL(`../drizzle/${name}`, import.meta.url), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean)) await database.prepare(statement).run();
  }
  let sent;
  await requestCode(database, secret, '  TEST@Example.com ', '127.0.0.1', async (email, code) => { sent = { email, code }; });
  assert.equal(sent.email, 'test@example.com');
  assert.equal(sent.code.length, 8);
  assert.equal(await userForToken(database, 'not-a-token'), null);
  await assert.rejects(verifyCode(database, secret, sent.email, '0000000x', '127.0.0.1'));
  const { token, user } = await verifyCode(database, secret, sent.email, sent.code, '127.0.0.1');
  assert.equal(user.email, sent.email);
  assert.equal((await userForToken(database, token)).userId, user.userId);
  await assert.rejects(verifyCode(database, secret, sent.email, sent.code, '127.0.0.1'));
  await revokeToken(database, token);
  assert.equal(await userForToken(database, token), null);
  await database.prepare('UPDATE auth_challenges SET created_at=? WHERE email=?').bind('2000-01-01T00:00:00.000Z', sent.email).run();
  await requestCode(database, secret, sent.email, '127.0.0.2', async (_, code) => { sent.code = code; });
  const again = await verifyCode(database, secret, sent.email, sent.code, '127.0.0.2');
  assert.equal(again.user.userId, user.userId);
  let lockedCode;
  await requestCode(database, secret, 'locked@example.com', '127.0.0.3', async (_, code) => { lockedCode = code; });
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(verifyCode(database, secret, 'locked@example.com', lockedCode === '99999999' ? '88888888' : '99999999', '127.0.0.3'));
  await assert.rejects(verifyCode(database, secret, 'locked@example.com', lockedCode, '127.0.0.3'));
  let expiredCode;
  await requestCode(database, secret, 'expired@example.com', '127.0.0.4', async (_, code) => { expiredCode = code; });
  await database.prepare('UPDATE auth_challenges SET expires_at=? WHERE email=?').bind('2000-01-01T00:00:00.000Z', 'expired@example.com').run();
  await assert.rejects(verifyCode(database, secret, 'expired@example.com', expiredCode, '127.0.0.4'));
  console.log('Email auth: verification, session, replay protection, revocation and account recovery passed.');
} finally { client.close(); }
