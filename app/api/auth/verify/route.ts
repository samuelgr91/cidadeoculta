import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { authSecret, clientIp, cookieName, emailAuthEnabled } from '@/lib/email-auth';
import { verifyCode, AuthError } from '@/lib/email-auth-core';
import { body, checkOrigin, config, fail, HttpError } from '@/lib/access';
import { excludeThisBrowser } from '@/lib/analytics-server';
import { claimKiwifyPurchases } from '@/lib/kiwify-core';

export async function POST(request: Request) {
  try {
    if (!emailAuthEnabled()) throw new HttpError(404, 'Indisponível.');
    checkOrigin(request);
    const input = await body(request) as { email?: unknown; code?: unknown };
    const result = await verifyCode(db(), authSecret(), input.email, input.code, clientIp(request));
    (await cookies()).set(cookieName(), result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 86400 });
    if(config().admins.includes(result.user.email.toLowerCase())) {
      try { await excludeThisBrowser(); } catch { console.error('Exclusão de audiência será repetida no painel.'); }
    }
    try { await claimKiwifyPurchases(db(), result.user.userId, result.user.email); }
    catch { console.error('Falha ao vincular passe Kiwify após login.'); }
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error instanceof AuthError ? new HttpError(error.status, error.message) : error); }
}
