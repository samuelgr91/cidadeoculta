import type { QueryDatabase } from './turso-db';

const lifetimeMs = 15 * 60 * 1000;
const encoder = new TextEncoder();

type Proof = { version: 1; legacyUserId: string; emailDigest: string; nonce: string; expiresAt: number };

function secretKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error('Configure PASS_TRANSFER_SECRET com pelo menos 32 caracteres.');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new TransferError(400, 'Código de transferência inválido.');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function emailDigest(email: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(email.trim().toLowerCase()))));
}

export class TransferError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function issuePassTransfer(database: QueryDatabase, secret: string, legacyUserId: string, email: string, at = Date.now()): Promise<string> {
  if (!legacyUserId.startsWith('chatgpt:') || !email.trim()) throw new TransferError(403, 'Entre na conta original para criar o código.');
  const owned = await database.prepare('SELECT id FROM entitlements WHERE user_id=? AND active=1 LIMIT 1').bind(legacyUserId).first();
  if (!owned) throw new TransferError(404, 'Nenhum City Pass ativo foi encontrado nesta conta.');
  const payload: Proof = { version: 1, legacyUserId, emailDigest: await emailDigest(email), nonce: crypto.randomUUID(), expiresAt: at + lifetimeMs };
  const data = encoder.encode(JSON.stringify(payload));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await secretKey(secret), data));
  return `${base64url(data)}.${base64url(signature)}`;
}

export async function redeemPassTransfer(database: QueryDatabase, secret: string, code: string, accountUserId: string, verifiedEmail: string, at = Date.now()): Promise<{ transferred: number; alreadyLinked: boolean }> {
  if (!accountUserId.startsWith('account:') || !verifiedEmail.trim()) throw new TransferError(401, 'Entre na nova conta por e-mail para continuar.');
  if (code.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(code)) throw new TransferError(400, 'Código de transferência inválido.');
  const [encoded, signature] = code.split('.');
  let payload: Proof;
  try {
    const data = fromBase64url(encoded);
    const valid = await crypto.subtle.verify('HMAC', await secretKey(secret), fromBase64url(signature), data);
    if (!valid) throw new Error('bad signature');
    payload = JSON.parse(new TextDecoder().decode(data));
  } catch (error) {
    if (error instanceof TransferError && error.status === 500) throw error;
    throw new TransferError(400, 'Código de transferência inválido.');
  }
  if (payload.version !== 1 || typeof payload.legacyUserId !== 'string' || !payload.legacyUserId.startsWith('chatgpt:') || typeof payload.nonce !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.nonce) || typeof payload.expiresAt !== 'number') throw new TransferError(400, 'Código de transferência inválido.');
  if (payload.expiresAt <= at || payload.expiresAt > at + lifetimeMs) throw new TransferError(410, 'O código expirou. Gere outro na conta original.');
  if (payload.emailDigest !== await emailDigest(verifiedEmail)) throw new TransferError(403, 'Entre com o mesmo e-mail da conta original.');

  const existing = await database.prepare('SELECT account_user_id FROM pass_transfers WHERE legacy_user_id=?').bind(payload.legacyUserId).first<{ account_user_id: string }>();
  if (existing && existing.account_user_id !== accountUserId) throw new TransferError(409, 'Este passe já foi transferido para outra conta.');
  if (existing) return { transferred: 0, alreadyLinked: true };
  const owned = await database.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE user_id=? AND active=1').bind(payload.legacyUserId).first<{ n: number }>();
  if (!owned?.n) throw new TransferError(404, 'O passe antigo não está no banco de destino.');

  await database.batch([
    database.prepare('INSERT OR IGNORE INTO pass_transfers(legacy_user_id,account_user_id,nonce,created_at) VALUES(?,?,?,?)').bind(payload.legacyUserId, accountUserId, payload.nonce, new Date(at).toISOString()),
    database.prepare('UPDATE entitlements SET user_id=? WHERE user_id=? AND EXISTS (SELECT 1 FROM pass_transfers WHERE legacy_user_id=? AND account_user_id=?)').bind(accountUserId, payload.legacyUserId, payload.legacyUserId, accountUserId),
    database.prepare('INSERT OR IGNORE INTO progress(id,user_id,story_id,completed_at) SELECT lower(hex(randomblob(16))),?,story_id,completed_at FROM progress WHERE user_id=? AND EXISTS (SELECT 1 FROM pass_transfers WHERE legacy_user_id=? AND account_user_id=?)').bind(accountUserId, payload.legacyUserId, payload.legacyUserId, accountUserId),
    database.prepare('DELETE FROM progress WHERE user_id=? AND EXISTS (SELECT 1 FROM pass_transfers WHERE legacy_user_id=? AND account_user_id=?)').bind(payload.legacyUserId, payload.legacyUserId, accountUserId),
  ]);
  const linked = await database.prepare('SELECT account_user_id FROM pass_transfers WHERE legacy_user_id=?').bind(payload.legacyUserId).first<{ account_user_id: string }>();
  if (linked?.account_user_id !== accountUserId) throw new TransferError(409, 'Este passe já foi transferido para outra conta.');
  return { transferred: owned.n, alreadyLinked: false };
}
