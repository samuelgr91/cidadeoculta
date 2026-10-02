import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { claimKiwifyPurchases, kiwifyCheckoutUrl, parseKiwifyProducts, processKiwifyWebhook, verifyKiwifyWebhook } from '../lib/kiwify-core.ts';
import { adminDashboard } from '../lib/admin-dashboard.ts';

const client = createClient({ url: ':memory:' });
const database = createTursoDatabase(client);
const products = parseKiwifyProducts('{"ouro-preto":{"productId":"product-op","checkoutUrl":"https://pay.kiwify.com.br/AbCd123"}}');
const secret = 'testtoken11';
const localOrderId = 'bc1ada93-cf1f-4b12-b7b3-7773b3b71d09';
const base = { store_id: 'store-1', order_status: 'paid', webhook_event_type: 'order_approved', Product: { product_id: 'product-op' }, Customer: { email: 'buyer@example.com' }, Commissions: { charge_amount: '2990', currency: 'BRL', product_base_price: '2990', product_base_price_currency: 'BRL' } };
function request(payload, valid = true) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha1', valid ? secret : 'another-webhook-token-long-enough').update(body).digest('hex');
  return new Request(`https://example.com/api/payments/kiwify?signature=${signature}`, { method: 'POST', body });
}

try {
  for (const name of ['0000_special_frog_thor.sql', '0001_chunky_shard.sql', '0002_flowery_lady_mastermind.sql', '0003_conscious_revanche.sql', '0004_brave_morg.sql', '0005_demonic_marauders.sql', '0009_typical_madelyne_pryor.sql']) {
    const migration = await readFile(new URL(`../drizzle/${name}`, import.meta.url), 'utf8');
    for (const sql of migration.split('--> statement-breakpoint').map(part => part.trim()).filter(Boolean)) await database.prepare(sql).run();
  }
  await database.batch([
    database.prepare('INSERT INTO cities(id,slug,data,updated_at) VALUES(?,?,?,?)').bind('ouro-preto', 'ouro-preto', JSON.stringify({ name: 'Ouro Preto', slug: 'ouro-preto', priceCents: 2990 }), '2026-09-25'),
    database.prepare('INSERT INTO auth_users(id,email,created_at,verified_at) VALUES(?,?,?,?)').bind('account-1', 'buyer@example.com', '2026-09-25', '2026-09-25'),
    database.prepare('INSERT INTO orders(id,user_id,city_id,amount,currency,mode,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(localOrderId, 'account:account-1', 'ouro-preto', 2990, 'BRL', 'live', 'pending', '2026-09-25', '2026-09-25'),
    database.prepare('INSERT INTO events(id,name,city_id,story_id,locale,session_id,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)').bind('landing-1', 'landing_view', 'ouro-preto', null, 'pt-br', 'session-1', '{}', '2026-09-25T12:00:00Z'),
  ]);
  assert.match(kiwifyCheckoutUrl(products['ouro-preto'], 'BUYER@example.com', localOrderId), /src=cidadeoculta_/);
  const guestCheckout = new URL(kiwifyCheckoutUrl(products['ouro-preto']));
  assert.equal(guestCheckout.href, products['ouro-preto'].checkoutUrl);
  assert.equal(guestCheckout.searchParams.has('email'), false);
  assert.equal(guestCheckout.searchParams.has('src'), false);
  const signedInCheckout = new URL(kiwifyCheckoutUrl(products['ouro-preto'], 'BUYER@example.com'));
  assert.equal(signedInCheckout.searchParams.get('email'), 'buyer@example.com');
  assert.equal(signedInCheckout.searchParams.has('src'), false);
  assert.throws(() => parseKiwifyProducts('{"ouro-preto":{"productId":"x","checkoutUrl":"https://evil.example/AbCd123"}}'), /inválido/);
  await assert.rejects(verifyKiwifyWebhook(request(base, false), secret), /Assinatura/);
  const payload = { ...base, order_id: 'sale-1', TrackingParameters: { src: `cidadeoculta_${localOrderId}` } };
  assert.deepEqual(await verifyKiwifyWebhook(request(payload), secret), payload);
  assert.deepEqual(await verifyKiwifyWebhook(request(payload), ['another-webhook-token-long-enough', secret]), payload);
  await assert.rejects(processKiwifyWebhook(database, { ...payload, Commissions: { ...payload.Commissions, product_base_price: 999 } }, products, 'store-1'), /Valor/);
  await assert.rejects(processKiwifyWebhook(database, payload, products, 'another-store'), /configuração/);
  const settled = await processKiwifyWebhook(database, payload, products, 'store-1');
  assert.equal(settled.state, 'paid');
  assert.equal(settled.localOrderId, localOrderId);
  assert.equal(settled.notificationNeeded, true);
  assert.equal((await database.prepare('SELECT status FROM orders WHERE id=?').bind(localOrderId).first()).status, 'paid');
  assert.equal((await database.prepare('SELECT active FROM entitlements WHERE order_id=?').bind(localOrderId).first()).active, 1);
  await processKiwifyWebhook(database, payload, products, 'store-1');
  assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE order_id=?').bind(localOrderId).first()).n, 1);
  const refunded = { ...payload, order_status: 'refunded', webhook_event_type: 'order_refunded' };
  await processKiwifyWebhook(database, refunded, products, 'store-1');
  assert.equal((await database.prepare('SELECT active FROM entitlements WHERE order_id=?').bind(localOrderId).first()).active, 0);
  assert.equal((await processKiwifyWebhook(database, payload, products, 'store-1')).state, 'ignored');

  const direct = { ...base, order_id: 'sale-2', Customer: { email: 'new@example.com' } };
  const unclaimed = await processKiwifyWebhook(database, direct, products, 'store-1');
  assert.equal((await database.prepare('SELECT status FROM orders WHERE id=?').bind(unclaimed.localOrderId).first()).status, 'paid_unclaimed');
  assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE order_id=?').bind(unclaimed.localOrderId).first()).n, 0);
  const beforeClaim = await adminDashboard(database, new Date('2026-09-25T18:00:00Z'), true);
  assert.equal(beforeClaim.paidOrders, 1);
  assert.equal(beforeClaim.revenueCents, 2990);
  await database.prepare('INSERT INTO auth_users(id,email,created_at,verified_at) VALUES(?,?,?,?)').bind('account-2', 'new@example.com', '2026-09-25', '2026-09-25').run();
  assert.equal(await claimKiwifyPurchases(database, 'account-2', 'new@example.com'), 1);
  assert.equal(await claimKiwifyPurchases(database, 'account-2', 'new@example.com'), 0);
  assert.equal((await database.prepare('SELECT user_id,active FROM entitlements WHERE order_id=?').bind(unclaimed.localOrderId).first()).user_id, 'account:account-2');
  const dashboard = await adminDashboard(database, new Date('2026-09-25T18:00:00Z'), true);
  assert.equal(dashboard.days[0].visits, 1);
  assert.equal(dashboard.paidOrders, 1);
  assert.equal(dashboard.revenueCents, 2990);
  assert.equal(dashboard.activePasses, 1);
  assert.equal(dashboard.pendingNotices.length, 1);
  assert.equal(dashboard.orders.find(order => order.id === unclaimed.localOrderId).buyer_email, 'new@example.com');
  // Parcelamento pode acrescentar juros ao total pago, sem alterar o preco-base do produto.
  const installment = { ...base, order_id: 'sale-3', Commissions: { ...base.Commissions, charge_amount: '3490' } };
  const installmentResult = await processKiwifyWebhook(database, installment, products, 'store-1');
  assert.equal(installmentResult.state, 'paid');
  assert.equal((await database.prepare('SELECT amount FROM orders WHERE id=?').bind(installmentResult.localOrderId).first()).amount, 3490);
  // A guest payment must never grant access to another email or after a refund.
  const guest = { ...base, order_id: 'guest-refunded', Customer: { email: 'guest@example.com' } };
  const guestResult = await processKiwifyWebhook(database, guest, products, 'store-1');
  assert.equal(await claimKiwifyPurchases(database, 'account-1', 'buyer@example.com'), 0);
  assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE order_id=?').bind(guestResult.localOrderId).first()).n, 0);
  await processKiwifyWebhook(database, { ...guest, order_status: 'refunded', webhook_event_type: 'order_refunded' }, products, 'store-1');
  await database.prepare('INSERT INTO auth_users(id,email,created_at,verified_at) VALUES(?,?,?,?)').bind('guest-account', 'guest@example.com', '2026-09-25', '2026-09-25').run();
  assert.equal(await claimKiwifyPurchases(database, 'guest-account', 'guest@example.com'), 0);
  assert.equal((await database.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE order_id=?').bind(guestResult.localOrderId).first()).n, 0);
  console.log('Kiwify: signed webhook, price/product validation, release, email claim, refund, replay and dashboard passed.');
} finally { client.close(); }
