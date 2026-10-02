import { body, checkOrigin, fail, HttpError, requireAdmin } from '@/lib/access';
import { notifyKiwifyPurchase } from '@/lib/kiwify';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const input = await body(request) as { orderId?: unknown };
    const orderId = typeof input.orderId === 'string' && input.orderId.length <= 100 ? input.orderId : '';
    if (!orderId) throw new HttpError(400, 'Pedido inválido.');
    const status = await notifyKiwifyPurchase(orderId);
    if (status === 'not_ready') throw new HttpError(503, 'E-mail transacional ainda não configurado ou compra indisponível.');
    return Response.json({ status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error); }
}
