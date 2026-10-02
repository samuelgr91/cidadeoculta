import { config, HttpError } from './access';
import { db } from './db';
import { parseKiwifyProducts, type KiwifyProducts } from './kiwify-core';
import { emailAuthEnabled } from './email-auth';

export function configuredKiwifyProducts(): KiwifyProducts {
  const settings = config();
  if (!emailAuthEnabled() || settings.paymentProvider !== 'kiwify' || settings.mode !== 'live' || !settings.kiwifyProducts || !settings.kiwifyWebhookToken || !settings.origin.startsWith('https://')) {
    throw new HttpError(503, 'Pagamento Kiwify ainda não configurado. Nenhuma cobrança foi iniciada.');
  }
  try { return parseKiwifyProducts(settings.kiwifyProducts); }
  catch { throw new HttpError(503, 'Configuração do produto Kiwify inválida. Nenhuma cobrança foi iniciada.'); }
}

type PurchaseForEmail = { buyer_email: string; status: string; notified_at: string | null; city_id: string; city_data: string };

export async function notifyKiwifyPurchase(providerOrderId: string): Promise<'sent' | 'already_sent' | 'not_ready'> {
  const settings = config();
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_FROM_EMAIL;
  if (!key || !from || !settings.origin.startsWith('https://')) return 'not_ready';
  const purchase = await db().prepare(`SELECT p.buyer_email,p.status,p.notified_at,o.city_id,c.data AS city_data
    FROM kiwify_purchases p JOIN orders o ON o.id=p.local_order_id JOIN cities c ON c.id=o.city_id
    WHERE p.provider_order_id=?`).bind(providerOrderId).first<PurchaseForEmail>();
  if (!purchase || purchase.status !== 'paid') return 'not_ready';
  if (purchase.notified_at) return 'already_sent';
  const city = JSON.parse(purchase.city_data) as { name: string; slug: string };
  const destination = `/pt-br/${encodeURIComponent(city.slug)}/biblioteca`;
  const login = new URL('/entrar', settings.origin);
  login.searchParams.set('returnTo', destination);
  const safeCity = city.name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [purchase.buyer_email], subject: `Seu City Pass ${city.name} está pronto · Cidade Oculta`,
      html: `<div style="font-family:Georgia,serif;background:#101012;color:#f5eee3;padding:32px"><h1>Cidade Oculta</h1><p>Sua compra do City Pass ${safeCity} foi confirmada.</p><p>Entre usando o e-mail da compra para liberar suas histórias. Se ainda não tem conta, ela será criada após confirmar o código recebido por e-mail.</p><p><a style="color:#e8ad62" href="${login.toString()}">Acessar minhas histórias</a></p></div>`,
      text: `Sua compra do City Pass ${city.name} foi confirmada. Entre com o e-mail da compra para acessar: ${login.toString()}`,
    }),
  });
  if (!response.ok) throw new Error(`Resend recusou o envio da confirmação (${response.status}).`);
  await db().prepare("UPDATE kiwify_purchases SET notified_at=? WHERE provider_order_id=? AND status='paid' AND notified_at IS NULL").bind(new Date().toISOString(), providerOrderId).run();
  return 'sent';
}
