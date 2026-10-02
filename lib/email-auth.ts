import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { db } from './db';
import { authCookieName, userForToken, type AuthUser } from './email-auth-core';
import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';

export function emailAuthEnabled(): boolean { return !env.DB; }
export function safeReturnTo(input: string | null | undefined): string {
  if (!input || !input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return '/';
  try { const url = new URL(input, 'https://cidade-oculta.local'); return url.origin === 'https://cidade-oculta.local' && !url.pathname.startsWith('/api/') && url.pathname !== '/entrar' ? url.pathname + url.search + url.hash : '/'; }
  catch { return '/'; }
}
export function signInPath(returnTo: string): string {
  return emailAuthEnabled() ? `/entrar?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}` : chatGPTSignInPath(returnTo);
}
export async function authenticatedUser(): Promise<AuthUser | null> {
  if (!emailAuthEnabled()) return getChatGPTUser();
  return userForToken(db(), (await cookies()).get(cookieName())?.value);
}
export function cookieName(): string { return process.env.NODE_ENV === 'production' ? authCookieName : 'co_auth'; }
export function authSecret(): string { const secret = process.env.AUTH_HASH_SECRET; if (!secret) throw new Error('Configure AUTH_HASH_SECRET no servidor.'); return secret; }
export function clientIp(request: Request): string {
  const header = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for');
  return header?.split(',')[0]?.trim().slice(0, 64) || 'local';
}
export async function sendLoginCode(email: string, code: string): Promise<void> {
  const key = process.env.RESEND_API_KEY, from = process.env.AUTH_FROM_EMAIL;
  if (!key || !from) throw new Error('Configure RESEND_API_KEY e AUTH_FROM_EMAIL no servidor.');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [email], subject: 'Seu código de acesso · Cidade Oculta', html: `<div style="font-family:Georgia,serif;background:#111;color:#f5eee3;padding:32px"><h1>Cidade Oculta</h1><p>Seu código de acesso é:</p><p style="font-size:36px;letter-spacing:8px;color:#e8ad62">${code}</p><p>Válido por 10 minutos. Se você não pediu este código, ignore a mensagem.</p></div>` }) });
  if (!response.ok) throw new Error(`Resend recusou o envio (${response.status}).`);
}
