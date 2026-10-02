import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { cookieName, emailAuthEnabled } from '@/lib/email-auth';
import { revokeToken } from '@/lib/email-auth-core';
import { checkOrigin, fail, HttpError } from '@/lib/access';

export async function POST(request: Request) {
  try {
    if (!emailAuthEnabled()) throw new HttpError(404, 'Indisponível.');
    checkOrigin(request);
    const jar = await cookies();
    await revokeToken(db(), jar.get(cookieName())?.value);
    jar.delete(cookieName());
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error); }
}
