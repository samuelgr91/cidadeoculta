import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { QueryDatabase } from './turso-db';
import { normalEmail } from './email-auth-core.ts';
import { KiwifyError, type KiwifyOrder } from './kiwify-core.ts';

export const ebookFileName = 'livro-das-assombracoes-de-ouro-preto.pdf';

export type EbookProduct = {
  productId: string;
  checkoutUrl: string;
  priceCents: number;
};

export function configuredEbookProduct(): EbookProduct {
  const productId = process.env.EBOOK_KIWIFY_PRODUCT_ID?.trim() || 'ac1905e0-bc2c-11f1-8789-a3baa1622882';
  const checkoutUrl = process.env.EBOOK_KIWIFY_CHECKOUT_URL?.trim() || 'https://pay.kiwify.com.br/1hCCgo6';
  const priceCents = Number(process.env.EBOOK_PRICE_CENTS || 2990);
  let url: URL;
  try { url = new URL(checkoutUrl); } catch { throw new Error('Checkout do e-book inválido.'); }
  if (!/^[0-9a-f-]{36}$/i.test(productId) || url.protocol !== 'https:' || url.hostname !== 'pay.kiwify.com.br' || !/^\/[A-Za-z0-9]+\/?$/.test(url.pathname) || !Number.isSafeInteger(priceCents) || priceCents <= 0) {
    throw new Error('Configuração do e-book inválida.');
  }
  return { productId, checkoutUrl: url.toString(), priceCents };
}

const terminal = new Set(['refunded', 'charged_back']);
const cleanText = (value: unknown, max = 100) => typeof value === 'string' && value.length <= max ? value.trim() : '';
const cents = (value: unknown) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : -1;
};

function state(payload: KiwifyOrder): 'paid' | 'refunded' | 'charged_back' | 'ignored' {
  const event = cleanText(payload.webhook_event_type);
  const status = cleanText(payload.order_status);
  if (event === 'order_refunded' || status === 'refunded') return 'refunded';
  if (event === 'chargeback' || status === 'chargedback' || status === 'charged_back') return 'charged_back';
  return event === 'order_approved' && status === 'paid' ? 'paid' : 'ignored';
}

type ExistingPurchase = { product_id: string; buyer_email: string; status: string; delivered_at: string | null };

export async function processEbookWebhook(database: QueryDatabase, payload: KiwifyOrder, product: EbookProduct, expectedStoreId = '') {
  const eventState = state(payload);
  if (eventState === 'ignored') return { state: eventState, matched: cleanText(payload.Product?.product_id) === product.productId };
  const providerOrderId = cleanText(payload.order_id);
  const productId = cleanText(payload.Product?.product_id);
  const storeId = cleanText(payload.store_id);
  let buyerEmail: string;
  try { buyerEmail = normalEmail(payload.Customer?.email); } catch { throw new KiwifyError(400, 'E-mail do comprador ausente.'); }
  if (productId !== product.productId) return { state: eventState, matched: false };
  if (!providerOrderId || expectedStoreId && storeId !== expectedStoreId) throw new KiwifyError(409, 'Pedido Kiwify do e-book não corresponde à configuração.');
  const basePrice = cents(payload.Commissions?.product_base_price);
  const charged = cents(payload.Commissions?.charge_amount);
  if (eventState === 'paid' && (payload.Commissions?.currency !== 'BRL' || payload.Commissions?.product_base_price_currency !== 'BRL' || basePrice !== product.priceCents || charged <= 0)) {
    throw new KiwifyError(409, 'Valor ou moeda Kiwify não corresponde ao e-book.');
  }
  const existing = await database.prepare('SELECT product_id,buyer_email,status,delivered_at FROM ebook_purchases WHERE provider_order_id=?').bind(providerOrderId).first<ExistingPurchase>();
  if (existing && (existing.product_id !== productId || existing.buyer_email !== buyerEmail)) throw new KiwifyError(409, 'Venda do e-book diverge da entrega anterior.');
  if (existing && terminal.has(existing.status) && eventState === 'paid') return { state: 'ignored' as const, matched: true, providerOrderId };
  const timestamp = new Date().toISOString();
  const amount = charged > 0 ? charged : product.priceCents;
  await database.batch([
    database.prepare(`INSERT INTO ebook_purchases(provider_order_id,product_id,buyer_email,status,amount,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(provider_order_id) DO UPDATE SET status=excluded.status,amount=excluded.amount,updated_at=excluded.updated_at`)
      .bind(providerOrderId, productId, buyerEmail, eventState, amount, timestamp, timestamp),
    database.prepare('INSERT OR IGNORE INTO events(id,name,city_id,story_id,locale,session_id,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind(`ebook:${providerOrderId}:${eventState}`, eventState === 'paid' ? 'ebook_payment_success' : 'ebook_payment_revoked', null, null, 'pt-br', null, JSON.stringify({ provider: 'kiwify', product: 'livro-assombracoes' }), timestamp),
  ]);
  return { state: eventState, matched: true, providerOrderId, buyerEmail, deliveryNeeded: eventState === 'paid' && !existing?.delivered_at };
}

type DeliveryRow = { buyer_email: string; status: string; delivered_at: string | null };
type DeliveryDependencies = {
  fetcher?: typeof fetch;
  attachment?: Uint8Array;
  resendKey?: string;
  from?: string;
  origin?: string;
};

export async function deliverEbookPurchase(database: QueryDatabase, providerOrderId: string, dependencies: DeliveryDependencies = {}): Promise<'sent' | 'already_sent' | 'not_ready'> {
  const purchase = await database.prepare('SELECT buyer_email,status,delivered_at FROM ebook_purchases WHERE provider_order_id=?').bind(providerOrderId).first<DeliveryRow>();
  if (!purchase || purchase.status !== 'paid') return 'not_ready';
  if (purchase.delivered_at) return 'already_sent';
  const key = dependencies.resendKey || process.env.RESEND_API_KEY;
  const from = dependencies.from || process.env.AUTH_FROM_EMAIL;
  if (!key || !from) return 'not_ready';
  const file = dependencies.attachment || await readFile(path.join(process.cwd(), 'content', 'ebook', ebookFileName));
  if (file.byteLength < 100_000 || file.byteLength > 8_000_000 || Buffer.from(file.subarray(0, 5)).toString('ascii') !== '%PDF-') throw new Error('Arquivo privado do e-book inválido.');
  const origin = dependencies.origin || process.env.APP_ORIGIN || 'https://hiddenatlas.site';
  const html = `<div style="margin:0;background:#0c0e10;color:#f4ecdf;padding:32px;font-family:Georgia,serif"><div style="max-width:620px;margin:auto;border:1px solid #8b6336;padding:30px;background:#121416"><p style="color:#d9a85c;letter-spacing:2px;font:11px Arial,sans-serif">HIDDEN ATLAS · CIDADE OCULTA</p><h1 style="font-size:34px;line-height:1.05">Seu livro chegou.</h1><p style="font:16px/1.7 Arial,sans-serif;color:#c8c3bb">A compra do <strong>Livro das Assombrações de Ouro Preto</strong> foi confirmada. O PDF completo está anexado a este e-mail.</p><p style="font:14px/1.7 Arial,sans-serif;color:#a9aaa7">Guarde esta mensagem para consultar o livro novamente. O conteúdo é digital e não inclui ingresso, visita guiada ou acesso a imóveis.</p><p><a href="${origin}/pt-br/ouro-preto" style="color:#efbd70">Explorar o mapa da Cidade Oculta</a></p><hr style="border:0;border-top:1px solid #4e3b27;margin:25px 0"><p style="font:11px/1.6 Arial,sans-serif;color:#858985">Problemas com o anexo? Responda a este e-mail ou fale com o suporte: +55 31 99621-5276.</p></div></div>`;
  const body = {
    from,
    to: [purchase.buyer_email],
    subject: 'Seu Livro das Assombrações de Ouro Preto chegou',
    html,
    text: `Sua compra do Livro das Assombrações de Ouro Preto foi confirmada. O PDF completo está anexado a este e-mail. Guarde esta mensagem para consultar o livro novamente. Suporte: +55 31 99621-5276.`,
    attachments: [{ filename: ebookFileName, content: Buffer.from(file).toString('base64') }],
  };
  let response: Response;
  try {
    response = await (dependencies.fetcher || fetch)('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `hiddenatlas-ebook-${providerOrderId}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Resend recusou a entrega do e-book (${response.status}).`);
  } catch (error) {
    const message = (error instanceof Error ? error.message : 'Falha desconhecida').slice(0, 300);
    await database.prepare("UPDATE ebook_purchases SET delivery_attempts=delivery_attempts+1,delivery_error=?,updated_at=? WHERE provider_order_id=? AND status='paid' AND delivered_at IS NULL")
      .bind(message, new Date().toISOString(), providerOrderId).run();
    throw error;
  }
  const result = await response.json().catch(() => ({})) as { id?: string };
  await database.prepare("UPDATE ebook_purchases SET delivered_at=?,email_provider_id=?,delivery_attempts=delivery_attempts+1,delivery_error=NULL,updated_at=? WHERE provider_order_id=? AND status='paid' AND delivered_at IS NULL")
    .bind(new Date().toISOString(), cleanText(result.id) || null, new Date().toISOString(), providerOrderId).run();
  return 'sent';
}
