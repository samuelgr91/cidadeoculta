import { config, fail, HttpError } from '@/lib/access';
import { db, ensureSeed } from '@/lib/db';
import { KiwifyError, processKiwifyWebhook, verifyKiwifyWebhook } from '@/lib/kiwify-core';
import { configuredKiwifyProducts, notifyKiwifyPurchase } from '@/lib/kiwify';
import { configuredEbookProduct, deliverEbookPurchase, processEbookWebhook } from '@/lib/ebook';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const settings = config();
    const payload = await verifyKiwifyWebhook(request, [settings.kiwifyWebhookToken, settings.kiwifyEbookWebhookToken]);
    const ebook = configuredEbookProduct();
    if (payload.Product?.product_id === ebook.productId) {
      const result = await processEbookWebhook(db(), payload, ebook, settings.kiwifyStoreId);
      if (result.deliveryNeeded && result.providerOrderId) {
        const delivery = await deliverEbookPurchase(db(), result.providerOrderId);
        if (delivery === 'not_ready') throw new Error('Entrega do e-book ainda não configurada.');
      }
      return Response.json({ received: true, state: result.state, product: 'ebook' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const products = configuredKiwifyProducts();
    await ensureSeed();
    const result = await processKiwifyWebhook(db(), payload, products, settings.kiwifyStoreId);
    if (result.notificationNeeded && result.providerOrderId) {
      try { await notifyKiwifyPurchase(result.providerOrderId); }
      catch (error) { console.error('Falha no e-mail de acesso Kiwify', error instanceof Error ? error.message : 'erro desconhecido'); }
    }
    return Response.json({ received: true, state: result.state }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return fail(error instanceof KiwifyError ? new HttpError(error.status, error.message) : error); }
}
