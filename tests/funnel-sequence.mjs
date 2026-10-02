import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createClient} from '@libsql/client';
import {createTursoDatabase} from '../lib/turso-db.ts';
import {subscribeToClues,processClues,unsubscribeToken,validUnsubscribeToken,unsubscribeFromClues} from '../lib/funnel-sequence.ts';
import {clueEmail} from '../lib/funnel-sequence-email.ts';
import {mapEntryPath} from '../lib/map-entry.ts';
import {seedCity} from '../lib/seed.ts';
const client=createClient({url:':memory:'}),db=createTursoDatabase(client),day=86400000,at=new Date('2026-09-28T12:00:00Z'),secret='test-sequence-secret-at-least-32-characters';
const input={email:'clues@example.test',cityId:'ouro-preto',locale:'pt-br',campaign:'morro-da-queimada',consent:true};
try{
 for(const name of ['0000_special_frog_thor.sql','0001_chunky_shard.sql','0002_flowery_lady_mastermind.sql','0003_conscious_revanche.sql','0004_brave_morg.sql','0005_demonic_marauders.sql','0007_tranquil_clea.sql','0008_unusual_lilith.sql']){
  for(const sql of (await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 }
 assert.equal(await subscribeToClues(db,{...input,consent:false},at),'no-consent');
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM funnel_messages').first()).n,0);
 assert.equal(await subscribeToClues(db,input,at),'subscribed');
 assert.equal(await subscribeToClues(db,input,at),'duplicate');
 const messages=(await db.prepare('SELECT * FROM funnel_messages ORDER BY step').all()).results;
 assert.deepEqual(messages.map(m=>m.due_at),[1,3,5].map(days=>new Date(at.getTime()+days*day).toISOString()));
 let calls=[];const send=async(job,key)=>{calls.push({step:job.step,key});return 'mock-'+job.message_id;};
 assert.equal((await processClues(db,send,{at})).sent,0);
 const tomorrow=new Date(at.getTime()+day);
 const parallel=await Promise.all([processClues(db,send,{at:tomorrow}),processClues(db,send,{at:tomorrow})]);
 assert.equal(parallel.reduce((sum,r)=>sum+r.sent,0),1);assert.equal(calls.length,1,'Concurrent workers do not duplicate the email');
 assert.equal((await processClues(db,send,{at:tomorrow})).sent,0);
 const thirdDay=new Date(at.getTime()+3*day);
 const failure=await processClues(db,async()=>{throw new Error('provider offline');},{at:thirdDay});assert.equal(failure.pending,1);
 const retry=await processClues(db,send,{at:new Date(thirdDay.getTime()+3600000)});assert.equal(retry.sent,1);assert.equal(calls[1].key,'clue-'+messages[1].id);
 const sub=await db.prepare('SELECT * FROM funnel_subscriptions').first();
 const token=await unsubscribeToken(secret,sub.id);assert.equal(await validUnsubscribeToken(secret,sub.id,token),true);assert.equal(await validUnsubscribeToken(secret,sub.id,'0'.repeat(64)),false);
 assert.equal(await unsubscribeFromClues(db,sub.id,thirdDay),true);
 assert.equal((await processClues(db,send,{at:new Date(at.getTime()+6*day)})).sent,0);
 assert.equal(await subscribeToClues(db,{...input,cityId:'another-city'},at),'suppressed');
 assert.equal((await db.prepare("SELECT status FROM funnel_messages WHERE step=3").first()).status,'canceled');
 // A buyer after signup receives no further clues.
 const buyerInput={...input,email:'buyer@example.test'};await subscribeToClues(db,buyerInput,at);
 await db.batch([
  db.prepare('INSERT INTO orders(id,user_id,city_id,amount,currency,mode,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('paid-order','unclaimed:test','ouro-preto',2990,'BRL','live','paid',at.toISOString(),at.toISOString()),
  db.prepare('INSERT INTO kiwify_purchases(provider_order_id,local_order_id,product_id,buyer_email,status,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind('paid-provider','paid-order','product','buyer@example.test','paid',2990,at.toISOString(),at.toISOString()),
 ]);
 const buyerResult=await processClues(db,send,{at:tomorrow});assert.equal(buyerResult.sent,0);assert.equal(buyerResult.skipped,1);
 assert.equal(await subscribeToClues(db,{...buyerInput,cityId:'ouro-preto'},at),'duplicate');
 // Backlogs preserve spacing instead of sending three messages at once.
 await subscribeToClues(db,{...input,email:'late@example.test'},at);
 const late=new Date(at.getTime()+7*day);assert.equal((await processClues(db,send,{at:late})).sent,1);
 assert.equal((await processClues(db,send,{at:new Date(late.getTime()+3600000)})).sent,0);
 const batch=JSON.parse(await readFile(new URL('../content/ouro-preto/batch-op008.json',import.meta.url),'utf8'));
 for(const locale of ['pt-br','en']){
  const message=clueEmail(batch.stories[0],{...seedCity,priceCents:2990},locale,2,'https://hiddenatlas.site','https://hiddenatlas.site/sair-dos-emails?id=opaque');
  assert.ok(message.html.includes('/mapa?story=op-008'));assert.ok(message.text.includes('Cancelar')||message.text.includes('Unsubscribe'));
  assert.ok(!message.html.includes(batch.stories[0].localeContent[locale].blocks[0].text),'Email uses public hook only, never the premium text');
 }
 const path=mapEntryPath('pt-br','ouro-preto','op-008',{utm_source:'instagram',email:'do-not-forward@example.test',token:'secret',returnTo:'https://evil.test'});
 assert.ok(path.includes('story=op-008'));assert.ok(path.includes('utm_source=instagram'));assert.ok(!path.includes('secret'));assert.ok(!path.includes('email'));
 console.log('PASS: map link privacy; three scheduled clues; explicit consent; deduplication and concurrent claims; retry idempotency; opt-out tokens and suppression; buyers excluded; backlog spacing; premium text never emailed.');
}finally{client.close();}
