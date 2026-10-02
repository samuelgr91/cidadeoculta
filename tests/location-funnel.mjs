import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createClient} from '@libsql/client';
import {createTursoDatabase} from '../lib/turso-db.ts';
import {captureLocationLead,deliverLocationEmail,funnelInput,normalizePhone} from '../lib/location-funnel.ts';
import {locationEmail} from '../lib/location-email.ts';
import {publicStory} from '../lib/model.ts';
import {seedCity,seedLocations,seedStories} from '../lib/seed.ts';
assert.equal(normalizePhone('(31) 99621-5276'),'+5531996215276');
assert.equal(normalizePhone(''),null);assert.equal(normalizePhone('+1 415 555 0100'),'+14155550100');
assert.throws(()=>normalizePhone('123'));assert.throws(()=>normalizePhone('999999999'));assert.throws(()=>normalizePhone('not-a-phone'));
assert.equal(funnelInput.safeParse({campaign:'//evil',email:'bad'}).success,false);
const client=createClient({url:':memory:'}),db=createTursoDatabase(client);
try{
 for(const name of ['0000_special_frog_thor.sql','0007_tranquil_clea.sql']){
  const migration=await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8');
  for(const sql of migration.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 }
 await db.prepare('INSERT INTO sessions(id,created_at,expires_at) VALUES(?,?,?)').bind('test-session','2026-09-28','2027-09-28').run();
 const input=funnelInput.parse({campaign:'oratorio',email:' TEST@Example.com ',phone:'(31) 99999-9999',emailConsent:false,whatsappConsent:true,acquisition:{utm_source:'instagram',utm_content:'reel-01',password:'do-not-keep'}});
 const lead=await captureLocationLead(db,input,'test-session','oratorio-vira-saia','ouro-preto');
 assert.equal(lead.phone,'+5531999999999');assert.equal(lead.email,'test@example.com');assert.equal(lead.email_consent,0);assert.equal(lead.whatsapp_consent,1);
 assert.equal(JSON.parse((await db.prepare('SELECT acquisition FROM location_leads').first()).acquisition).password,undefined);
 assert.equal((await db.prepare('SELECT email FROM sessions').first()).email,'test@example.com');
 const repeated=await captureLocationLead(db,{...input,emailConsent:true},'test-session','oratorio-vira-saia','ouro-preto');
 assert.equal(repeated.id,lead.id);assert.equal(repeated.email_consent,1);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM location_leads').first()).n,1);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM events').first()).n,1);
 let sent=0;
 const send=async key=>{assert.equal(key,'location-'+lead.id);sent++;return 'resend-test';};
 assert.equal(await deliverLocationEmail(db,repeated,async()=>{throw new Error('offline')}),'failed');
 assert.equal((await db.prepare('SELECT send_claimed_at FROM location_leads').first()).send_claimed_at,null);
 assert.equal(await deliverLocationEmail(db,repeated,send),'sent');
 assert.equal(await deliverLocationEmail(db,repeated,send),'sending'); // stale row cannot claim an already sent delivery
 const after=await captureLocationLead(db,input,'test-session','oratorio-vira-saia','ouro-preto');
 assert.equal(await deliverLocationEmail(db,after,send),'sent');assert.equal(sent,1);
 const changed=await captureLocationLead(db,{...input,email:'another@example.com',phone:'',whatsappConsent:false},'test-session','oratorio-vira-saia','ouro-preto');
 assert.notEqual(changed.id,lead.id);assert.equal(changed.email_sent_at,null);assert.equal(changed.phone,null);assert.equal(changed.whatsapp_consent,0);
 await assert.rejects(captureLocationLead(db,{...input,phone:''},'test-session','oratorio-vira-saia','ouro-preto'),/WhatsApp/);
 const stories=seedStories.map(s=>publicStory(s,'pt-br',seedLocations.find(l=>l.id===s.locationId)));
 const campaign={slug:'oratorio',city:seedCity,story:stories[0],stories};
 const email=locationEmail(campaign,'pt-br','https://hiddenatlas.site');
 assert.ok(email.text.includes('Google Maps'));assert.ok(email.text.includes('R$'));assert.ok(email.text.includes('/mapa?story='));
 assert.ok(!email.html.includes('test@example.com'));assert.ok(!email.html.includes('/entrar'));
 const escaped=locationEmail({...campaign,story:{...campaign.story,location:{...campaign.story.location,name:'<script>alert(1)</script>'}}},'en','https://hiddenatlas.site');
 assert.ok(!escaped.html.includes('<script>'));assert.ok(escaped.html.includes('&lt;script&gt;'));
 const next=JSON.parse(await readFile(new URL('../content/ouro-preto/batch-op008.json',import.meta.url),'utf8'));
 const morro=publicStory(next.stories[0],'pt-br',next.locations[0]);
 const morroMail=locationEmail({...campaign,slug:'morro-da-queimada',story:morro,stories:[...stories,morro]},'pt-br','https://hiddenatlas.site');
 assert.ok(morroMail.text.includes('Morro de São Sebastião'));assert.ok(morroMail.html.includes('/mapa?story=op-008'));
 assert.ok(!morroMail.text.includes('Casas foram demolidas.'));
 console.log('PASS: email/phone validation, separate consent, source minimization, free-session access, deduplication, delivery failure/retry, idempotent send, contact changes and safe email content.');
}finally{client.close();}
