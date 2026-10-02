import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { configuredEbookProduct, deliverEbookPurchase, processEbookWebhook } from '../lib/ebook.ts';

const client = createClient({ url: ':memory:' });
const database = createTursoDatabase(client);
const product = configuredEbookProduct();
const base = {
  store_id: 'store-1', order_status: 'paid', webhook_event_type: 'order_approved',
  Product: { product_id: product.productId }, Customer: { email: 'reader@example.com' },
  Commissions: { charge_amount: '2990', currency: 'BRL', product_base_price: '2990', product_base_price_currency: 'BRL' },
};

try {
  const migration = await readFile(new URL('../drizzle/0009_typical_madelyne_pryor.sql', import.meta.url), 'utf8');
  for (const sql of migration.split('--> statement-breakpoint').map(part => part.trim()).filter(Boolean)) await database.prepare(sql).run();
  await database.prepare('CREATE TABLE events(id TEXT PRIMARY KEY,name TEXT NOT NULL,city_id TEXT,story_id TEXT,locale TEXT,session_id TEXT,acquisition TEXT NOT NULL,created_at TEXT NOT NULL)').run();

  const paid = { ...base, order_id: 'ebook-order-1' };
  await assert.rejects(processEbookWebhook(database, { ...paid, Commissions: { ...paid.Commissions, product_base_price: '2490' } }, product, 'store-1'), /Valor/);
  const accepted = await processEbookWebhook(database, paid, product, 'store-1');
  assert.equal(accepted.matched, true);
  assert.equal(accepted.deliveryNeeded, true);
  assert.equal((await database.prepare('SELECT status FROM ebook_purchases WHERE provider_order_id=?').bind('ebook-order-1').first()).status, 'paid');

  const attachment = Buffer.concat([Buffer.from('%PDF-1.6\n'), Buffer.alloc(100_100, 65)]);
  const messages = [];
  const fetcher = async (_url, init) => {
    messages.push(init);
    return new Response(JSON.stringify({ id: 'resend-email-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  assert.equal(await deliverEbookPurchase(database, 'ebook-order-1', { fetcher, attachment, resendKey: 're_test', from: 'Cidade Oculta <acesso@hiddenatlas.site>', origin: 'https://hiddenatlas.site' }), 'sent');
  assert.equal(messages.length, 1);
  const email = JSON.parse(messages[0].body);
  assert.deepEqual(email.to, ['reader@example.com']);
  assert.equal(email.attachments[0].filename, 'livro-das-assombracoes-de-ouro-preto.pdf');
  assert.ok(Buffer.from(email.attachments[0].content, 'base64').subarray(0, 5).equals(Buffer.from('%PDF-')));
  assert.equal(messages[0].headers['Idempotency-Key'], 'hiddenatlas-ebook-ebook-order-1');
  assert.equal(await deliverEbookPurchase(database, 'ebook-order-1', { fetcher, attachment, resendKey: 're_test', from: 'Cidade Oculta <acesso@hiddenatlas.site>' }), 'already_sent');
  assert.equal(messages.length, 1);

  await processEbookWebhook(database, { ...paid, order_status: 'refunded', webhook_event_type: 'order_refunded' }, product, 'store-1');
  assert.equal((await database.prepare('SELECT status FROM ebook_purchases WHERE provider_order_id=?').bind('ebook-order-1').first()).status, 'refunded');
  assert.equal((await processEbookWebhook(database, paid, product, 'store-1')).state, 'ignored');

  const failed = { ...base, order_id: 'ebook-order-2', Customer: { email: 'retry@example.com' } };
  await processEbookWebhook(database, failed, product, 'store-1');
  await assert.rejects(deliverEbookPurchase(database, 'ebook-order-2', { fetcher: async () => new Response('fail', { status: 503 }), attachment, resendKey: 're_test', from: 'Cidade Oculta <acesso@hiddenatlas.site>' }), /503/);
  const failedRow = await database.prepare('SELECT delivered_at,delivery_attempts,delivery_error FROM ebook_purchases WHERE provider_order_id=?').bind('ebook-order-2').first();
  assert.equal(failedRow.delivered_at, null);
  assert.equal(failedRow.delivery_attempts, 1);
  assert.match(failedRow.delivery_error, /503/);
  console.log('E-book: product/price validation, private PDF attachment, Resend idempotency, delivery audit, retry and refund passed.');
} finally { client.close(); }
