import { db } from '@/lib/db';
import { authSecret, clientIp, emailAuthEnabled, sendLoginCode } from '@/lib/email-auth';
import { requestCode, AuthError } from '@/lib/email-auth-core';
import { body, checkOrigin, fail, HttpError } from '@/lib/access';

export async function POST(request: Request) {
  try {
    if (!emailAuthEnabled()) throw new HttpError(404, 'Indisponível.');
    checkOrigin(request);
    const input = await body(request) as { email?: unknown };
    await requestCode(db(), authSecret(), input.email, clientIp(request), sendLoginCode);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error instanceof AuthError ? new HttpError(error.status, error.message) : error); }
}
