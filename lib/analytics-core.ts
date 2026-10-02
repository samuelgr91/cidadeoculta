import type { QueryDatabase } from './turso-db';
import { publicAnalyticsPath } from './analytics-routes.ts';

export const analyticsCookie = 'co_analytics_excluded';
export function internalAnalyticsTraffic(input:{userAgent?:string;testHeader?:string|null;nodeEnv?:string;context?:string}) {
  return input.testHeader==='1'
    || /\b(?:codex|playwright|puppeteer|hiddenatlas-[a-z-]*verification)\b/i.test(input.userAgent||'')
    || ['development','test'].includes(input.nodeEnv||'')
    || ['deploy-preview','branch-deploy','dev'].includes(input.context||'');
}
export function publicPath(input: string): string | null {
  return publicAnalyticsPath(input);
}
export function platform(ua: string) {
  const bot = /bot|crawler|spider|headless|lighthouse|preview|facebookexternalhit/i.test(ua);
  const os = /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /macintosh|mac os/i.test(ua) ? 'macOS' : /cros/i.test(ua) ? 'ChromeOS' : /linux/i.test(ua) ? 'Linux' : 'Outro';
  const device = /ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua)) ? 'Tablet' : /mobile|iphone|ipod/i.test(ua) ? 'Celular' : 'Computador';
  const browser = /instagram/i.test(ua) ? 'Instagram' : /fban|fbav/i.test(ua) ? 'Facebook' : /edg/i.test(ua) ? 'Edge' : /opr\/|opera/i.test(ua) ? 'Opera' : /firefox|fxios/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Outro';
  return { bot, device, os, browser };
}
export function sourceHost(input: string, origin: string): string {
  try { const url = new URL(input); return /^https?:$/.test(url.protocol) && url.origin !== new URL(origin).origin ? url.hostname.slice(0, 120) : 'Direto / interno'; }
  catch { return 'Direto / interno'; }
}
export async function visitorKey(sessionId: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('analytics-visitor:' + sessionId));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function excludeVisitor(database: QueryDatabase, visitorId: string) {
  const previous=await database.prepare(`SELECT COUNT(*) n FROM analytics_page_views p WHERE visitor_id=? AND NOT EXISTS(SELECT 1 FROM analytics_excluded_visitors x WHERE x.visitor_id=p.visitor_id)`).bind(visitorId).first<{n:number}>();
  await database.prepare('INSERT OR IGNORE INTO analytics_excluded_visitors(visitor_id,created_at) VALUES(?,?)').bind(visitorId, new Date().toISOString()).run();
  return previous?.n||0;
}
export type PageView = { id: string; visitorId: string; visitId: string; path: string; device: string; os: string; browser: string; source: string };
export async function savePageView(database: QueryDatabase, view: PageView, at = new Date()) {
  // The insert is idempotent; exclusions are checked again inside the write.
  await database.prepare(`INSERT OR IGNORE INTO analytics_page_views(id,visitor_id,visit_id,path,device,os,browser,source,created_at)
    SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM analytics_excluded_visitors WHERE visitor_id=?)`)
    .bind(view.id,view.visitorId,view.visitId,view.path,view.device,view.os,view.browser,view.source,at.toISOString(),view.visitorId).run();
}
export const brasiliaDay = (at = new Date()) => new Date(at.getTime() - 3 * 3600000).toISOString().slice(0, 10);
export function analyticsPeriod(input: string | undefined, at = new Date()) {
  const today = brasiliaDay(at);
  const valid = input && /^\d{4}-\d{2}-\d{2}$/.test(input) && Number.isFinite(Date.parse(input)) && new Date(input).toISOString().slice(0,10) === input && input <= today;
  const day = valid ? input : today;
  const start = day + 'T03:00:00.000Z';
  return { day, start, end: new Date(Date.parse(start) + 86400000).toISOString(), since: new Date(Date.parse(start) - 29 * 86400000).toISOString() };
}
type Count = { views: number; visitors: number; visits: number };
type Journey = { id: string; visitor_id: string; visit_id: string; path: string; device: string; os: string; browser: string; source: string; created_at: string };
export async function audienceReport(database: QueryDatabase, input?: string, at = new Date()) {
  const period = analyticsPeriod(input, at);
  const visible = `NOT EXISTS (SELECT 1 FROM analytics_excluded_visitors x WHERE x.visitor_id=p.visitor_id)`;
  const where = `FROM analytics_page_views p WHERE created_at>=? AND created_at<? AND ${visible}`;
  const [totals,hourly,daily,pages,platforms,sources,visitors] = await Promise.all([
    database.prepare(`SELECT COUNT(*) views,COUNT(DISTINCT visitor_id) visitors,COUNT(DISTINCT visitor_id || ':' || visit_id) visits ${where}`).bind(period.start,period.end).first<Count>(),
    database.prepare(`SELECT strftime('%H',created_at,'-3 hours') hour,COUNT(*) views,COUNT(DISTINCT visitor_id || ':' || visit_id) visits ${where} GROUP BY hour`).bind(period.start,period.end).all<{hour:string;views:number;visits:number}>(),
    database.prepare(`SELECT date(created_at,'-3 hours') day,COUNT(*) views,COUNT(DISTINCT visitor_id) visitors,COUNT(DISTINCT visitor_id || ':' || visit_id) visits ${where} GROUP BY day`).bind(period.since,period.end).all<Count & {day:string}>(),
    database.prepare(`SELECT path,COUNT(*) views,COUNT(DISTINCT visitor_id) visitors ${where} GROUP BY path ORDER BY views DESC LIMIT 100`).bind(period.start,period.end).all<{path:string;views:number;visitors:number}>(),
    database.prepare(`SELECT device,os,browser,COUNT(*) views,COUNT(DISTINCT visitor_id) visitors ${where} GROUP BY device,os,browser ORDER BY views DESC LIMIT 50`).bind(period.start,period.end).all<{device:string;os:string;browser:string;views:number;visitors:number}>(),
    database.prepare(`SELECT source,COUNT(*) views ${where} GROUP BY source ORDER BY views DESC LIMIT 30`).bind(period.start,period.end).all<{source:string;views:number}>(),
    database.prepare(`SELECT visitor_id,COUNT(*) views,MAX(created_at) last_seen ${where} GROUP BY visitor_id ORDER BY last_seen DESC LIMIT 50`).bind(period.start,period.end).all<{visitor_id:string;views:number;last_seen:string}>(),
  ]);
  // Bound the timeline independently per visitor, without truncating quiet visitors.
  const ids = visitors.results.map(row => row.visitor_id);
  const journeys = ids.length ? await database.prepare(`SELECT * FROM (SELECT p.*,ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY created_at,id) AS position ${where} AND visitor_id IN (${ids.map(()=>'?').join(',')})) WHERE position<=100 ORDER BY created_at,id`).bind(period.start,period.end,...ids).all<Journey>() : {results:[] as Journey[]};
  const byHour = new Map(hourly.results.map(row=>[Number(row.hour),row]));
  const byDay = new Map(daily.results.map(row=>[row.day,row]));
  return { period, totals: totals || {views:0,visitors:0,visits:0}, pages:pages.results, platforms:platforms.results, sources:sources.results,
    hours:Array.from({length:24},(_,hour)=>({hour,views:byHour.get(hour)?.views||0,visits:byHour.get(hour)?.visits||0})),
    days:Array.from({length:30},(_,i)=>{const day=new Date(Date.parse(period.since)+i*86400000).toISOString().slice(0,10);return byDay.get(day)||{day,views:0,visitors:0,visits:0};}),
    visitors:visitors.results.map(row=>({...row,journey:journeys.results.filter(view=>view.visitor_id===row.visitor_id)})) };
}
