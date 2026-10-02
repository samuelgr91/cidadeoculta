import type { QueryDatabase } from './turso-db';
import { normalEmail } from './email-auth-core.ts';

export type KiwifyProduct = { productId: string; checkoutUrl: string };
export type KiwifyProducts = Record<string, KiwifyProduct>;
export type KiwifyOrder = {
  order_id?: unknown; order_status?: unknown; webhook_event_type?: unknown; store_id?: unknown;
  Product?: { product_id?: unknown }; Customer?: { email?: unknown };
  Commissions?: { charge_amount?: unknown; currency?: unknown; product_base_price?: unknown; product_base_price_currency?: unknown };
  TrackingParameters?: { src?: unknown };
};
export class KiwifyError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

const encoder = new TextEncoder();
const terminal = new Set(['refunded', 'charged_back']);

function text(value: unknown, max = 100): string {
  return typeof value === 'string' && value.length <= max ? value.trim() : '';
}
function cents(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : -1;
}
function bytesFromHex(value: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index++) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}
async function emailMarker(email: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(email)));
  return `unclaimed:${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function parseKiwifyProducts(raw: string): KiwifyProducts {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('KIWIFY_PRODUCTS_JSON deve conter um objeto JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('KIWIFY_PRODUCTS_JSON inválido.');
  const products: KiwifyProducts = {};
  for (const [cityId, item] of Object.entries(value)) {
    if (!/^[a-z0-9-]{2,80}$/.test(cityId) || !item || typeof item !== 'object') throw new Error('Cidade Kiwify inválida.');
    const row = item as Record<string, unknown>;
    const productId = text(row.productId);
    const checkoutUrl = text(row.checkoutUrl, 300);
    let url: URL;
    try { url = new URL(checkoutUrl); } catch { throw new Error(`Link Kiwify inválido para ${cityId}.`); }
    if (!productId || url.protocol !== 'https:' || url.hostname !== 'pay.kiwify.com.br' || !/^\/[A-Za-z0-9]+\/?$/.test(url.pathname)) throw new Error(`Produto ou checkout Kiwify inválido para ${cityId}.`);
    products[cityId] = { productId, checkoutUrl: url.toString() };
  }
  if (new Set(Object.values(products).map(product => product.productId)).size !== Object.keys(products).length) throw new Error('Cada produto Kiwify deve pertencer a uma só cidade.');
  return products;
}

export function kiwifyCheckoutUrl(product: KiwifyProduct, email?: string, localOrderId?: string): string {
  const url = new URL(product.checkoutUrl);
  if (email) url.searchParams.set('email', normalEmail(email));
  if (localOrderId) url.searchParams.set('src', `cidadeoculta_${localOrderId}`);
  return url.toString();
}

export async function verifyKiwifyWebhook(request: Request, secret: string | string[]): Promise<KiwifyOrder> {
  const secrets = (Array.isArray(secret) ? secret : [secret]).map(value => value.trim()).filter(Boolean);
  if (!secrets.length) throw new KiwifyError(503, 'Webhook Kiwify não configurado.');
  const signature = new URL(request.url).searchParams.get('signature') || '';
  if (!/^[a-f0-9]{40}$/i.test(signature)) throw new KiwifyError(401, 'Assinatura Kiwify ausente ou inválida.');
  if (Number(request.headers.get('content-length') || 0) > 200_000) throw new KiwifyError(413, 'Webhook muito grande.');
  const raw = await request.text();
  if (raw.length > 200_000) throw new KiwifyError(413, 'Webhook muito grande.');
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { throw new KiwifyError(400, 'Webhook JSON inválido.'); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new KiwifyError(400, 'Webhook inválido.');
  const signedPayload = encoder.encode(JSON.stringify(payload));
  let valid = false;
  for (const candidate of secrets) {
    const key = await crypto.subtle.importKey('raw', encoder.encode(candidate), { name: 'HMAC', hash: 'SHA-1' }, false, ['verify']);
    valid ||= await crypto.subtle.verify('HMAC', key, bytesFromHex(signature), signedPayload);
  }
  if (!valid) throw new KiwifyError(401, 'Assinatura Kiwify inválida.');
  return payload as KiwifyOrder;
}

function eventState(payload: KiwifyOrder): 'paid' | 'refunded' | 'charged_back' | 'ignored' {
  const event = text(payload.webhook_event_type), status = text(payload.order_status);
  if (event === 'order_refunded' || status === 'refunded') return 'refunded';
  if (event === 'chargeback' || status === 'chargedback' || status === 'charged_back') return 'charged_back';
  return event === 'order_approved' && status === 'paid' ? 'paid' : 'ignored';
}

type ExistingOrder = { id: string; user_id: string; city_id: string; amount: number; status: string; provider_id: string | null };
type ExistingPurchase = { local_order_id: string; product_id: string; buyer_email: string; status: string; notified_at: string | null };

export async function processKiwifyWebhook(database: QueryDatabase, payload: KiwifyOrder, products: KiwifyProducts, expectedStoreId = ''): Promise<{ state: 'paid' | 'refunded' | 'charged_back' | 'ignored'; localOrderId?: string; providerOrderId?: string; buyerEmail?: string; notificationNeeded?: boolean; cityId?: string }> {
  const state = eventState(payload);
  if (state === 'ignored') return { state };
  const providerOrderId = text(payload.order_id);
  const productId = text(payload.Product?.product_id);
  const storeId = text(payload.store_id);
  let buyerEmail: string;
  try { buyerEmail = normalEmail(payload.Customer?.email); } catch { throw new KiwifyError(400, 'E-mail do comprador ausente.'); }
  if (!providerOrderId || !productId || expectedStoreId && storeId !== expectedStoreId) throw new KiwifyError(409, 'Pedido Kiwify não corresponde à configuração.');
  const product = Object.entries(products).find(([, item]) => item.productId === productId);
  if (!product) throw new KiwifyError(409, 'Produto Kiwify não reconhecido.');
  const cityId = product[0];
  const cityRow = await database.prepare('SELECT data FROM cities WHERE id=?').bind(cityId).first<{ data: string }>();
  if (!cityRow) throw new KiwifyError(409, 'Cidade do produto não encontrada.');
  const city = JSON.parse(cityRow.data) as { priceCents: number };
  const basePrice = cents(payload.Commissions?.product_base_price);
  const charged = cents(payload.Commissions?.charge_amount);
  if (state === 'paid' && (payload.Commissions?.currency !== 'BRL' || payload.Commissions?.product_base_price_currency !== 'BRL' || basePrice !== city.priceCents || charged <= 0)) throw new KiwifyError(409, 'Valor ou moeda Kiwify não corresponde ao City Pass.');
  const existing = await database.prepare('SELECT local_order_id,product_id,buyer_email,status,notified_at FROM kiwify_purchases WHERE provider_order_id=?').bind(providerOrderId).first<ExistingPurchase>();
  if (existing && (existing.product_id !== productId || existing.buyer_email !== buyerEmail)) throw new KiwifyError(409, 'Venda Kiwify divergente da entrega anterior.');
  if (existing && terminal.has(existing.status) && state === 'paid') return { state: 'ignored', localOrderId: existing.local_order_id };
  if (existing?.status === state && state !== 'paid') return { state, localOrderId: existing.local_order_id };

  let order: ExistingOrder | null = existing ? await database.prepare('SELECT id,user_id,city_id,amount,status,provider_id FROM orders WHERE id=?').bind(existing.local_order_id).first<ExistingOrder>() : null;
  if (existing && !order) throw new KiwifyError(409, 'Pedido local da venda Kiwify não encontrado.');
  if (!order) {
    const source = text(payload.TrackingParameters?.src, 80);
    const localId = source.match(/^cidadeoculta_([0-9a-f-]{36})$/i)?.[1];
    if (localId) {
      const candidate = await database.prepare("SELECT id,user_id,city_id,amount,status,provider_id FROM orders WHERE id=? AND city_id=? AND mode='live' AND status='pending' AND provider_id IS NULL").bind(localId, cityId).first<ExistingOrder>();
      if (candidate) order = candidate;
    }
  }
  const account = await database.prepare('SELECT id FROM auth_users WHERE email=?').bind(buyerEmail).first<{ id: string }>();
  const accountUserId = account ? `account:${account.id}` : await emailMarker(buyerEmail);
  const timestamp = new Date().toISOString();
  const localOrderId = order?.id || crypto.randomUUID();
  const userId = state === 'paid' ? accountUserId : order?.user_id || accountUserId;
  const orderStatus = state === 'paid' ? (account ? 'paid' : 'paid_unclaimed') : state;
  const amount = state === 'paid' ? charged : order?.amount || (charged > 0 ? charged : city.priceCents);
  const statements = [
    order
      ? database.prepare('UPDATE orders SET user_id=?,amount=?,status=?,provider_id=?,updated_at=? WHERE id=?').bind(userId, amount, orderStatus, providerOrderId, timestamp, localOrderId)
      : database.prepare('INSERT INTO orders(id,user_id,city_id,amount,currency,mode,status,provider_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(localOrderId, userId, cityId, amount, 'BRL', 'live', orderStatus, providerOrderId, timestamp, timestamp),
    database.prepare('INSERT INTO kiwify_purchases(provider_order_id,local_order_id,product_id,buyer_email,status,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(provider_order_id) DO UPDATE SET status=excluded.status,amount=excluded.amount,updated_at=excluded.updated_at').bind(providerOrderId, localOrderId, productId, buyerEmail, state, amount, timestamp, timestamp),
    state === 'paid' && account
      ? database.prepare('INSERT INTO entitlements(id,user_id,city_id,order_id,mode,active,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET user_id=excluded.user_id,active=1').bind(crypto.randomUUID(), userId, cityId, localOrderId, 'live', 1, timestamp)
      : database.prepare('UPDATE entitlements SET active=0 WHERE order_id=?').bind(localOrderId),
    database.prepare('INSERT OR IGNORE INTO events(id,name,city_id,story_id,locale,session_id,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(`kiwify:${providerOrderId}:${state}`, state === 'paid' ? 'payment_success' : 'payment_revoked', cityId, null, null, null, JSON.stringify({ provider: 'kiwify' }), timestamp),
  ];
  await database.batch(statements);
  return { state, localOrderId, providerOrderId, buyerEmail, cityId, notificationNeeded: state === 'paid' && !existing?.notified_at };
}

export async function claimKiwifyPurchases(database: QueryDatabase, userId: string, emailInput: string): Promise<number> {
  const email = normalEmail(emailInput);
  const rows = (await database.prepare("SELECT p.provider_order_id,p.local_order_id,o.city_id FROM kiwify_purchases p JOIN orders o ON o.id=p.local_order_id WHERE p.buyer_email=? AND p.status='paid' AND o.status='paid_unclaimed'").bind(email).all<{ provider_order_id: string; local_order_id: string; city_id: string }>()).results;
  for (const row of rows) {
    const timestamp = new Date().toISOString();
    await database.batch([
      database.prepare("UPDATE orders SET user_id=?,status='paid',updated_at=? WHERE id=? AND status='paid_unclaimed'").bind(`account:${userId}`, timestamp, row.local_order_id),
      database.prepare("INSERT INTO entitlements(id,user_id,city_id,order_id,mode,active,created_at) SELECT ?,user_id,city_id,id,'live',1,? FROM orders WHERE id=? AND status='paid' AND user_id=? ON CONFLICT(order_id) DO UPDATE SET user_id=excluded.user_id,active=1").bind(crypto.randomUUID(), timestamp, row.local_order_id, `account:${userId}`),
    ]);
  }
  return rows.length;
}
