import { authenticatedUser } from '@/lib/email-auth';
import { checkOrigin, fail, HttpError } from '@/lib/access';
import { db } from '@/lib/db';
import { claimKiwifyPurchases } from '@/lib/kiwify-core';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await authenticatedUser();
    if (!user) throw new HttpError(401, 'Entre com o e-mail da compra para liberar o City Pass.');
    const claimed = await claimKiwifyPurchases(db(), user.userId, user.email);
    return Response.json({ claimed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error); }
}
