import { env } from 'cloudflare:workers';
import { authenticatedUser } from '@/lib/email-auth';
import { checkOrigin, fail, HttpError } from '@/lib/access';
import { db } from '@/lib/db';
import { issuePassTransfer, TransferError } from '@/lib/pass-transfer-core';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!env.DB) throw new HttpError(404, 'Use o Site original para gerar o código.');
    const user = await authenticatedUser();
    if (!user) throw new HttpError(401, 'Entre na conta original.');
    const secret = (env as unknown as Record<string, string>).PASS_TRANSFER_SECRET || process.env.PASS_TRANSFER_SECRET || '';
    const code = await issuePassTransfer(db(), secret, `chatgpt:${user.userId}`, user.email);
    return Response.json({ code, expiresInMinutes: 15 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof TransferError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    return fail(error);
  }
}
