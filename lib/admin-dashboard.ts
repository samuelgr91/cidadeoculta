import type { QueryDatabase } from './turso-db';

export type DailyActivity = { day: string; visits: number; sessions: number; mapOpens: number; storyStarts: number; leads: number };
export type PassHolder = { id: string; user_id: string; city_id: string; mode: string; created_at: string; email: string | null; amount: number; order_status: string };
export type AdminOrder = { id: string; city_id: string; mode: string; status: string; amount: number; created_at: string; email: string | null; user_id: string; buyer_email?: string };
export type PendingNotice = { provider_order_id: string; buyer_email: string; city_id: string; created_at: string };
export type EbookPurchase = { provider_order_id: string; buyer_email: string; status: string; amount: number; created_at: string; delivered_at: string | null; delivery_attempts: number; delivery_error: string | null };

export async function adminDashboard(database: QueryDatabase, at = new Date(), kiwifyEnabled = false) {
  const since = new Date(at.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const [daily, passes, passCount, holderCount, sales, orders, pendingNotices, purchases, ebookSales, ebookPurchases] = await Promise.all([
    database.prepare(`SELECT substr(created_at,1,10) AS day,
      SUM(CASE WHEN name='landing_view' THEN 1 ELSE 0 END) AS visits,
      COUNT(DISTINCT CASE WHEN name='landing_view' THEN session_id END) AS sessions,
      SUM(CASE WHEN name='city_map_open' THEN 1 ELSE 0 END) AS mapOpens,
      SUM(CASE WHEN name='story_start' THEN 1 ELSE 0 END) AS storyStarts,
      SUM(CASE WHEN name='lead_submit' THEN 1 ELSE 0 END) AS leads
      FROM events WHERE created_at>=? GROUP BY substr(created_at,1,10) ORDER BY day DESC`).bind(since).all<DailyActivity>(),
    database.prepare(`SELECT e.id,e.user_id,e.city_id,e.mode,e.created_at,a.email,o.amount,o.status AS order_status
      FROM entitlements e JOIN orders o ON o.id=e.order_id
      LEFT JOIN auth_users a ON e.user_id='account:' || a.id
      WHERE e.active=1 ORDER BY e.created_at DESC LIMIT 200`).all<PassHolder>(),
    database.prepare('SELECT COUNT(*) AS n FROM entitlements WHERE active=1').first<{ n: number }>(),
    database.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM entitlements WHERE active=1').first<{ n: number }>(),
    database.prepare("SELECT COUNT(*) AS orders,COALESCE(SUM(amount),0) AS cents FROM orders WHERE status IN ('paid','paid_unclaimed') AND mode='live'").first<{ orders: number; cents: number }>(),
    database.prepare(`SELECT o.id,o.city_id,o.mode,o.status,o.amount,o.created_at,o.user_id,a.email
      FROM orders o LEFT JOIN auth_users a ON o.user_id='account:' || a.id
      ORDER BY o.created_at DESC LIMIT 200`).all<AdminOrder>(),
    kiwifyEnabled ? database.prepare(`SELECT p.provider_order_id,p.buyer_email,o.city_id,p.created_at
      FROM kiwify_purchases p JOIN orders o ON o.id=p.local_order_id
      WHERE p.status='paid' AND p.notified_at IS NULL ORDER BY p.created_at DESC LIMIT 100`).all<PendingNotice>() : Promise.resolve({ results: [] as PendingNotice[] }),
    kiwifyEnabled ? database.prepare('SELECT local_order_id,buyer_email FROM kiwify_purchases ORDER BY created_at DESC LIMIT 200').all<{ local_order_id: string; buyer_email: string }>() : Promise.resolve({ results: [] as { local_order_id: string; buyer_email: string }[] }),
    kiwifyEnabled ? database.prepare("SELECT COUNT(*) AS orders,COALESCE(SUM(amount),0) AS cents FROM ebook_purchases WHERE status='paid'").first<{ orders: number; cents: number }>() : Promise.resolve({ orders: 0, cents: 0 }),
    kiwifyEnabled ? database.prepare('SELECT provider_order_id,buyer_email,status,amount,created_at,delivered_at,delivery_attempts,delivery_error FROM ebook_purchases ORDER BY created_at DESC LIMIT 200').all<EbookPurchase>() : Promise.resolve({ results: [] as EbookPurchase[] }),
  ]);
  const byDay = new Map(daily.results.map(row => [row.day, row]));
  const days: DailyActivity[] = [];
  for (let offset = 0; offset < 30; offset++) {
    const day = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() - offset)).toISOString().slice(0, 10);
    days.push(byDay.get(day) || { day, visits: 0, sessions: 0, mapOpens: 0, storyStarts: 0, leads: 0 });
  }
  const buyerByOrder = new Map(purchases.results.map(row => [row.local_order_id, row.buyer_email]));
  return { days, passes: passes.results, orders: orders.results.map(order => ({ ...order, buyer_email: buyerByOrder.get(order.id) })), pendingNotices: pendingNotices.results, ebookPurchases: ebookPurchases.results, activePasses: Number(passCount?.n || 0), holders: Number(holderCount?.n || 0), paidOrders: Number(sales?.orders || 0), revenueCents: Number(sales?.cents || 0), ebookPaidOrders: Number(ebookSales?.orders || 0), ebookRevenueCents: Number(ebookSales?.cents || 0) };
}
