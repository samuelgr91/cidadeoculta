import { body, checkOrigin, fail, HttpError, requireAdmin } from '@/lib/access';
import { db } from '@/lib/db';
import { deliverEbookPurchase } from '@/lib/ebook';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const input = await body(request) as { orderId?: unknown };
    const orderId = typeof input.orderId === 'string' && input.orderId.length <= 100 ? input.orderId : '';
    if (!orderId) throw new HttpError(400, 'Pedido inválido.');
    const status = await deliverEbookPurchase(db(), orderId);
    if (status === 'not_ready') throw new HttpError(503, 'Compra não está paga ou o envio transacional não está configurado.');
    return Response.json({ status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error); }
}
