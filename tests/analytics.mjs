import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/turso-db.ts';
import { analyticsPeriod, audienceReport, excludeVisitor, internalAnalyticsTraffic, platform, publicPath, savePageView, sourceHost, visitorKey } from '../lib/analytics-core.ts';
const client=createClient({url:':memory:'}),db=createTursoDatabase(client);
try{
  const sql=await readFile(new URL('../drizzle/0006_omniscient_thor.sql',import.meta.url),'utf8');
  for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
  assert.equal(publicPath('/pt-br/ouro-preto/mapa?email=private@example.com#code'),'/pt-br/ouro-preto/mapa');
  for(const path of ['/admin','/api/auth/verify','/entrar?code=123','https://other.site','//other.site'])assert.equal(publicPath(path),null);
  for(const [input,expected] of [
    ['/livro-das-assombracoes?src=instagram','/livro-das-assombracoes'],
    ['/l/oratorio?email=private@example.com','/l/oratorio'],
    ['/en/l/oratorio?entrega=1','/en/l/oratorio'],
    ['/pt-br/ouro-preto/comprar?email=private@example.com','/pt-br/ouro-preto/comprar'],
  ]) assert.equal(publicPath(input),expected);
  assert.deepEqual(platform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile Safari'),{bot:false,device:'Celular',os:'iOS',browser:'Safari'});
  assert.equal(platform('Mozilla Android Mobile Instagram').browser,'Instagram');
  assert.equal(platform('Googlebot').bot,true);
  for(const userAgent of ['HiddenAtlas-Funnel-Verification/1.0','HiddenAtlas-Map-Verification/1.0','Mozilla/5.0 Playwright','Codex Desktop'])assert.equal(internalAnalyticsTraffic({userAgent}),true);
  assert.equal(internalAnalyticsTraffic({userAgent:'Mozilla/5.0 (iPhone) Mobile Safari',nodeEnv:'production',context:'production'}),false,'Real visitors remain eligible');
  assert.equal(internalAnalyticsTraffic({testHeader:'1'}),true);
  for(const nodeEnv of ['development','test'])assert.equal(internalAnalyticsTraffic({nodeEnv}),true);
  for(const context of ['deploy-preview','branch-deploy'])assert.equal(internalAnalyticsTraffic({nodeEnv:'production',context}),true);
  assert.equal(internalAnalyticsTraffic({testHeader:'0'}),false);
  assert.equal(platform('Mozilla Android Chrome').device,'Tablet');
  assert.equal(sourceHost('https://www.google.com/search?q=private','https://hiddenatlas.site'),'www.google.com');
  assert.equal(sourceHost('https://hiddenatlas.site/entrar?code=private','https://hiddenatlas.site'),'Direto / interno');
  assert.equal(publicPath('/en/ouro-preto/stories/vira-saia-oratory'),'/en/ouro-preto/stories/vira-saia-oratory');
  const at=new Date('2026-09-28T02:00:00Z');
  assert.equal(analyticsPeriod(undefined,at).day,'2026-09-27');
  assert.equal(analyticsPeriod('2026-02-31',at).day,'2026-09-27');
  const visitor=await visitorKey('visitor-cookie');
  assert.equal(visitor.length,64);assert.notEqual(visitor,'visitor-cookie');
  const view={id:'a',visitorId:visitor,visitId:'visit-a',path:'/pt-br/ouro-preto',device:'Celular',os:'Android',browser:'Chrome',source:'www.google.com'};
  await savePageView(db,view,new Date('2026-09-27T03:00:00Z'));
  await savePageView(db,view,new Date('2026-09-27T03:00:00Z')); // repeated network delivery
  await savePageView(db,{...view,id:'b',path:'/pt-br/ouro-preto/mapa'},new Date('2026-09-27T03:04:00Z'));
  await savePageView(db,{...view,id:'c',visitId:'visit-b'},new Date('2026-09-28T02:59:59Z'));
  await savePageView(db,{...view,id:'next-day'},new Date('2026-09-28T03:00:00Z'));
  await savePageView(db,{...view,id:'admin',visitorId:'admin'},new Date('2026-09-27T10:00:00Z'));
  let report=await audienceReport(db,'2026-09-27',new Date('2026-09-28T12:00:00Z'));
  assert.deepEqual(report.totals,{views:4,visitors:2,visits:3});
  assert.equal(await excludeVisitor(db,'admin'),1);
  await savePageView(db,{...view,id:'admin-after',visitorId:'admin'},at);
  report=await audienceReport(db,'2026-09-27',new Date('2026-09-28T12:00:00Z'));
  assert.deepEqual(report.totals,{views:3,visitors:1,visits:2});
  assert.equal(report.hours.length,24);assert.equal(report.hours[0].views,2);assert.equal(report.hours[0].visits,1);assert.equal(report.hours[23].views,1);
  assert.equal(report.days.length,30);assert.equal(report.days.at(-1).views,3);
  assert.equal(report.pages.find(p=>p.path.endsWith('/mapa')).views,1);
  assert.equal(report.visitors.length,1);assert.deepEqual(report.visitors[0].journey.map(v=>v.id),['a','b','c']);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM analytics_page_views WHERE id='admin-after'").first()).n,0);
  // Retroactive exclusion removes a reviewer's entire history from every chart,
  // while retaining the raw events and other genuine visitors.
  await savePageView(db,{...view,id:'reviewer-today',visitorId:'reviewer',visitId:'qa-a'},new Date('2026-09-27T08:00:00Z'));
  await savePageView(db,{...view,id:'reviewer-yesterday',visitorId:'reviewer',visitId:'qa-b'},new Date('2026-09-26T08:00:00Z'));
  assert.equal((await audienceReport(db,'2026-09-27',at)).totals.views,4);
  assert.equal(await excludeVisitor(db,'reviewer'),2);
  assert.equal(await excludeVisitor(db,'reviewer'),0,'Reactivation is idempotent');
  await savePageView(db,{...view,id:'reviewer-after',visitorId:'reviewer'},at);
  report=await audienceReport(db,'2026-09-27',at);
  assert.deepEqual(report.totals,{views:3,visitors:1,visits:2});
  assert.equal(report.days.find(d=>d.day==='2026-09-26').views,0);
  assert.equal(report.hours[5].views,0);
  assert.equal(report.pages[0].views+report.pages[1].views,3);
  assert.equal(report.platforms[0].views,3);
  assert.equal(report.visitors.length,1);
  assert.equal((await db.prepare("SELECT COUNT(*) n FROM analytics_page_views WHERE visitor_id='reviewer'").first()).n,2,'Historical records are preserved');
  console.log('PASS: internal test traffic excluded; real visitors retained; retroactive exclusion across all charts; no data deletion; idempotency; Brasília boundaries; URL sanitization.');
}finally{client.close();}
