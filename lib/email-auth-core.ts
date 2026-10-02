import type { QueryDatabase } from './turso-db';

const encoder = new TextEncoder();
const minute = 60_000;
const sessionDays = 30;
export const authCookieName = '__Host-co_auth';
export type AuthUser = { userId: string; email: string; displayName: string; fullName: string | null };

export function normalEmail(value: unknown): string {
  if (typeof value !== 'string') throw new AuthError(400, 'E-mail inválido.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError(400, 'E-mail inválido.');
  return email;
}
export class AuthError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
function hex(bytes: Uint8Array): string { return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(value: string): Promise<string> { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
async function hmac(secret: string, value: string): Promise<string> {
  if (secret.length < 32) throw new Error('AUTH_HASH_SECRET precisa ter ao menos 32 caracteres.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}
function randomString(size: number): string { const bytes = crypto.getRandomValues(new Uint8Array(size)); return hex(bytes); }
function date(offset: number): string { return new Date(Date.now() + offset).toISOString(); }

export async function throttle(database: QueryDatabase, secret: string, kind: string, value: string, limit: number): Promise<void> {
  const key = await hmac(secret, `${kind}:${value}`);
  const expires = date(15 * minute);
  await database.prepare(`INSERT INTO auth_rate_limits(key_hash,count,expires_at) VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END`).bind(key, expires, new Date().toISOString(), new Date().toISOString()).run();
  const row = await database.prepare('SELECT count FROM auth_rate_limits WHERE key_hash=?').bind(key).first<{ count: number }>();
  if ((row?.count ?? limit + 1) > limit) throw new AuthError(429, 'Muitas tentativas. Aguarde alguns minutos.');
}

export async function requestCode(database: QueryDatabase, secret: string, emailInput: unknown, ip: string, send: (email: string, code: string) => Promise<void>): Promise<void> {
  const email = normalEmail(emailInput);
  await throttle(database, secret, 'request-email', email, 3);
  await throttle(database, secret, 'request-ip', ip, 12);
  const current = new Date().toISOString();
  const last = await database.prepare('SELECT created_at FROM auth_challenges WHERE email=? ORDER BY created_at DESC LIMIT 1').bind(email).first<{ created_at: string }>();
  if (last && Date.now() - Date.parse(last.created_at) < minute) throw new AuthError(429, 'Aguarde um minuto antes de pedir outro código.');
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 100_000_000).padStart(8, '0');
  const id = crypto.randomUUID();
  const tokenHash = await hmac(secret, `${id}:${code}`);
  await database.prepare('UPDATE auth_challenges SET consumed_at=? WHERE email=? AND consumed_at IS NULL').bind(current, email).run();
  await database.prepare('INSERT INTO auth_challenges(id,email,token_hash,attempts,created_at,expires_at) VALUES(?,?,?,?,?,?)').bind(id, email, tokenHash, 0, current, date(10 * minute)).run();
  try { await send(email, code); }
  catch (error) { await database.prepare('UPDATE auth_challenges SET consumed_at=? WHERE id=?').bind(date(0), id).run(); throw error; }
}

export async function verifyCode(database: QueryDatabase, secret: string, emailInput: unknown, codeInput: unknown, ip: string): Promise<{ token: string; user: AuthUser }> {
  const email = normalEmail(emailInput);
  if (typeof codeInput !== 'string' || !/^\d{8}$/.test(codeInput)) throw new AuthError(400, 'Código inválido.');
  await throttle(database, secret, 'verify-email', email, 10);
  await throttle(database, secret, 'verify-ip', ip, 30);
  const challenge = await database.prepare('SELECT id,attempts FROM auth_challenges WHERE email=? AND consumed_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1').bind(email, date(0)).first<{ id: string; attempts: number }>();
  if (!challenge || challenge.attempts >= 5) throw new AuthError(400, 'Código inválido ou expirado. Peça outro.');
  const hash = await hmac(secret, `${challenge.id}:${codeInput}`);
  const consumed = await database.prepare('UPDATE auth_challenges SET consumed_at=? WHERE id=? AND token_hash=? AND consumed_at IS NULL AND expires_at>? AND attempts<5 RETURNING id').bind(date(0), challenge.id, hash, date(0)).first<{ id: string }>();
  if (!consumed) { await database.prepare('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL').bind(challenge.id).run(); throw new AuthError(400, 'Código inválido ou expirado.'); }
  const timestamp = date(0);
  const id = crypto.randomUUID();
  await database.prepare('INSERT INTO auth_users(id,email,created_at,verified_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET verified_at=excluded.verified_at').bind(id, email, timestamp, timestamp).run();
  const row = await database.prepare('SELECT id,email FROM auth_users WHERE email=?').bind(email).first<{ id: string; email: string }>();
  if (!row) throw new Error('Usuário verificado não encontrado.');
  const token = randomString(32);
  await database.prepare('INSERT INTO auth_sessions(id_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await sha256(token), row.id, timestamp, date(sessionDays * 86400000)).run();
  return { token, user: { userId: row.id, email: row.email, displayName: row.email, fullName: null } };
}

export async function userForToken(database: QueryDatabase, token: string | undefined): Promise<AuthUser | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await database.prepare('SELECT u.id,u.email FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.id_hash=? AND s.revoked_at IS NULL AND s.expires_at>? LIMIT 1').bind(await sha256(token), date(0)).first<{ id: string; email: string }>();
  return row ? { userId: row.id, email: row.email, displayName: row.email, fullName: null } : null;
}
export async function revokeToken(database: QueryDatabase, token: string | undefined): Promise<void> {
  if (token && /^[a-f0-9]{64}$/.test(token)) await database.prepare('UPDATE auth_sessions SET revoked_at=? WHERE id_hash=? AND revoked_at IS NULL').bind(date(0), await sha256(token)).run();
}
