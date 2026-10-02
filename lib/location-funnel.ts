import {z} from 'zod';
import type {QueryDatabase} from './turso-db';
export const funnelInput=z.object({campaign:z.string().regex(/^[a-z0-9-]{1,100}$/),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),phone:z.string().trim().max(30).default(''),emailConsent:z.boolean().default(false),whatsappConsent:z.boolean().default(false),locale:z.enum(['pt-br','en']).default('pt-br'),flow:z.enum(['location','map']).default('location'),fax:z.string().max(100).default(''),acquisition:z.record(z.string().max(200)).default({})});
export function normalizePhone(input:string){
 if(!input.trim())return null;
 const digits=input.replace(/\D/g,'');
 const phone=input.startsWith('+')?digits:digits.length===10||digits.length===11?'55'+digits:/^55\d{10,11}$/.test(digits)?digits:'';
 if(!/^[1-9]\d{7,14}$/.test(phone))throw new Error('Informe um telefone válido com DDD.');
 return '+'+phone;
}
export type FunnelLead={id:string;session_id:string;campaign:string;email:string;phone:string|null;email_consent:number;whatsapp_consent:number;email_sent_at:string|null;send_claimed_at:string|null;locale:string};
export function safeFunnelAcquisition(input:Record<string,string>){return Object.fromEntries(Object.entries(input).filter(([key])=>['utm_source','utm_medium','utm_campaign','utm_content','ref'].includes(key)).slice(0,5));}
export async function captureLocationLead(database:QueryDatabase,input:z.infer<typeof funnelInput>,sessionId:string,storyId:string,cityId:string){
 const phone=normalizePhone(input.phone);
 if(input.whatsappConsent&&!phone)throw new Error('Informe o WhatsApp ou desmarque essa autorização.');
 const existing=await database.prepare('SELECT id,email FROM location_leads WHERE session_id=? AND campaign=?').bind(sessionId,input.campaign).first<{id:string;email:string}>();
 const id=existing?.email===input.email?existing.id:crypto.randomUUID(),at=new Date().toISOString();
 const acquisition=JSON.stringify(safeFunnelAcquisition(input.acquisition));
 await database.batch([
  database.prepare(`INSERT INTO location_leads(id,session_id,campaign,story_id,city_id,email,phone,locale,email_consent,whatsapp_consent,consent_version,acquisition,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(session_id,campaign) DO UPDATE SET id=excluded.id,email=excluded.email,phone=excluded.phone,locale=excluded.locale,email_consent=excluded.email_consent,whatsapp_consent=excluded.whatsapp_consent,consent_version=excluded.consent_version,acquisition=excluded.acquisition,updated_at=excluded.updated_at,email_sent_at=CASE WHEN location_leads.email=excluded.email THEN location_leads.email_sent_at ELSE NULL END,email_provider_id=CASE WHEN location_leads.email=excluded.email THEN location_leads.email_provider_id ELSE NULL END,send_claimed_at=CASE WHEN location_leads.email=excluded.email THEN location_leads.send_claimed_at ELSE NULL END`).bind(id,sessionId,input.campaign,storyId,cityId,input.email,phone,input.locale,input.emailConsent?1:0,input.whatsappConsent?1:0,input.flow==='map'?'map-v2':'location-v1',acquisition,at,at),
  database.prepare('UPDATE sessions SET email=?,consent=? WHERE id=?').bind(input.email,input.emailConsent?1:0,sessionId),
  database.prepare(`INSERT INTO leads(id,session_id,email,city_id,locale,consent,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(session_id,city_id) DO UPDATE SET email=excluded.email,consent=excluded.consent`).bind(crypto.randomUUID(),sessionId,input.email,cityId,input.locale,input.emailConsent?1:0,acquisition,at),
 ]);
 if(!existing)await database.prepare('INSERT INTO events(id,name,city_id,story_id,locale,session_id,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'location_lead_submit',cityId,storyId,input.locale,sessionId,acquisition,at).run();
 return (await database.prepare('SELECT * FROM location_leads WHERE session_id=? AND campaign=?').bind(sessionId,input.campaign).first<FunnelLead>())!;
}
export async function deliverLocationEmail(database:QueryDatabase,lead:FunnelLead,send:(idempotencyKey:string)=>Promise<string>){
 if(lead.email_sent_at)return 'sent' as const;
 const claimed=await database.prepare('UPDATE location_leads SET send_claimed_at=? WHERE id=? AND email_sent_at IS NULL AND (send_claimed_at IS NULL OR send_claimed_at<?) RETURNING id').bind(new Date().toISOString(),lead.id,new Date(Date.now()-5*60000).toISOString()).first();
 if(!claimed)return 'sending' as const;
 try{
  const providerId=await send('location-'+lead.id);
  await database.prepare('UPDATE location_leads SET email_sent_at=?,email_provider_id=?,send_claimed_at=NULL WHERE id=?').bind(new Date().toISOString(),providerId,lead.id).run();
  return 'sent' as const;
 }catch{
  await database.prepare('UPDATE location_leads SET send_claimed_at=NULL WHERE id=?').bind(lead.id).run();
  return 'failed' as const;
 }
}
