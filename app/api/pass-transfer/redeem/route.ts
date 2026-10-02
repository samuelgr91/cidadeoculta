import { env } from 'cloudflare:workers';
import { authenticatedUser } from '@/lib/email-auth';
import { body, checkOrigin, fail, HttpError } from '@/lib/access';
import { db } from '@/lib/db';
import { redeemPassTransfer, TransferError } from '@/lib/pass-transfer-core';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (env.DB) throw new HttpError(404, 'Abra a nova versão para usar o código.');
    const user = await authenticatedUser();
    if (!user) throw new HttpError(401, 'Entre na nova conta por e-mail.');
    const input = await body(request);
    if (typeof input?.code !== 'string') throw new HttpError(400, 'Informe o código de transferência.');
    const secret = process.env.PASS_TRANSFER_SECRET || '';
    const result = await redeemPassTransfer(db(), secret, input.code.trim(), `account:${user.userId}`, user.email);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof TransferError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    return fail(error);
  }
}
