import type {QueryDatabase} from './turso-db';
export type Subscription={id:string;email:string;city_id:string;locale:'pt-br'|'en';campaign:string;consent_at:string;unsubscribed_at:string|null};
export type SequenceJob=Subscription&{message_id:string;step:number;attempts:number;first_attempt_at:string|null};
const day=86400000;
export async function subscribeToClues(database:QueryDatabase,input:{email:string;cityId:string;locale:'pt-br'|'en';campaign:string;consent:boolean},at=new Date()){
 const email=input.email.trim().toLowerCase(),timestamp=at.toISOString();
 const existing=await database.prepare('SELECT id FROM funnel_subscriptions WHERE email=? AND city_id=?').bind(email,input.cityId).first<{id:string}>();
 if(!input.consent){if(existing)await database.batch([database.prepare('UPDATE funnel_subscriptions SET unsubscribed_at=? WHERE id=?').bind(timestamp,existing.id),database.prepare("UPDATE funnel_messages SET status='canceled' WHERE subscription_id=? AND status IN ('pending','sending')").bind(existing.id)]);return 'no-consent';}
 if(existing)return 'duplicate';
 if(await database.prepare('SELECT email FROM funnel_suppressions WHERE email=?').bind(email).first())return 'suppressed';
 if(await database.prepare("SELECT p.provider_order_id FROM kiwify_purchases p JOIN orders o ON o.id=p.local_order_id WHERE p.buyer_email=? AND o.city_id=? AND p.status='paid' LIMIT 1").bind(email,input.cityId).first())return 'buyer';
 const id=crypto.randomUUID();
 await database.batch([
  database.prepare("INSERT OR IGNORE INTO funnel_subscriptions(id,email,city_id,locale,campaign,consent_at,consent_version) VALUES(?,?,?,?,?,?,'map-clues-v1')").bind(id,email,input.cityId,input.locale,input.campaign,timestamp),
  ...[1,3,5].map((days,index)=>database.prepare("INSERT OR IGNORE INTO funnel_messages(id,subscription_id,step,due_at,status) SELECT ?,?, ?,?,'pending' WHERE EXISTS(SELECT 1 FROM funnel_subscriptions WHERE id=?)").bind(crypto.randomUUID(),id,index+1,new Date(at.getTime()+days*day).toISOString(),id)),
 ]);
 return 'subscribed';
}
async function signature(secret:string,id:string){
 if(secret.length<32)throw new Error('Mail signing configuration unavailable');
 const encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode('funnel-unsubscribe-v1:'+id))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function unsubscribeToken(secret:string,id:string){return signature(secret,id);}
export async function validUnsubscribeToken(secret:string,id:string,token:string){
 if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9]{64}$/.test(token))return false;
 const expected=await signature(secret,id);let difference=0;for(let i=0;i<64;i++)difference|=expected.charCodeAt(i)^token.charCodeAt(i);return difference===0;
}
export async function unsubscribeFromClues(database:QueryDatabase,id:string,at=new Date()){
 const row=await database.prepare('SELECT email FROM funnel_subscriptions WHERE id=?').bind(id).first<{email:string}>();if(!row)return false;
 const timestamp=at.toISOString();
 await database.batch([
  database.prepare('INSERT OR IGNORE INTO funnel_suppressions(email,created_at) VALUES(?,?)').bind(row.email,timestamp),
  database.prepare('UPDATE funnel_subscriptions SET unsubscribed_at=? WHERE email=?').bind(timestamp,row.email),
  database.prepare("UPDATE funnel_messages SET status='canceled' WHERE subscription_id IN (SELECT id FROM funnel_subscriptions WHERE email=?) AND status IN ('pending','sending')").bind(row.email),
  database.prepare('UPDATE location_leads SET email_consent=0 WHERE email=?').bind(row.email),
  database.prepare('UPDATE leads SET consent=0 WHERE email=?').bind(row.email),
  database.prepare('UPDATE sessions SET consent=0 WHERE email=?').bind(row.email),
 ]);return true;
}
export async function processClues(database:QueryDatabase,send:(job:SequenceJob,key:string)=>Promise<string|null>,options:{at?:Date;limit?:number;dailyLimit?:number;adminEmails?:string[]}={}){
 const at=options.at||new Date(),timestamp=at.toISOString(),stale=new Date(at.getTime()-15*60000).toISOString();
 const count=await database.prepare("SELECT COUNT(*) n FROM funnel_messages WHERE status='sent' AND sent_at>=?").bind(timestamp.slice(0,10)+'T00:00:00.000Z').first<{n:number}>();
 const limit=Math.max(0,Math.min(options.limit||6,(options.dailyLimit||40)-(count?.n||0)));
 const totals={sent:0,skipped:0,failed:0,pending:0};if(!limit)return totals;
 const jobs=await database.prepare(`SELECT s.*,m.id AS message_id,m.step,m.attempts,m.first_attempt_at FROM funnel_messages m JOIN funnel_subscriptions s ON s.id=m.subscription_id WHERE m.status IN ('pending','sending') AND m.due_at<=? AND (m.claimed_at IS NULL OR m.claimed_at<?) AND NOT EXISTS(SELECT 1 FROM funnel_messages previous WHERE previous.subscription_id=m.subscription_id AND previous.step<m.step AND (previous.status IN ('pending','sending','review') OR previous.sent_at>?)) ORDER BY m.due_at LIMIT ?`).bind(timestamp,stale,new Date(at.getTime()-36*3600000).toISOString(),limit).all<SequenceJob>();
 // Small batches keep scheduled executions short and leave email quota for login.
 for(let index=0;index<jobs.results.length;index+=3)await Promise.all(jobs.results.slice(index,index+3).map(async job=>{
  const claim=await database.prepare("UPDATE funnel_messages SET status='sending',claimed_at=?,attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?) WHERE id=? AND status IN ('pending','sending') AND (claimed_at IS NULL OR claimed_at<?) RETURNING id").bind(timestamp,timestamp,job.message_id,stale).first();if(!claim)return;
  const suppressed=job.unsubscribed_at||options.adminEmails?.includes(job.email)||await database.prepare('SELECT email FROM funnel_suppressions WHERE email=?').bind(job.email).first();
  const buyer=await database.prepare("SELECT p.provider_order_id FROM kiwify_purchases p JOIN orders o ON o.id=p.local_order_id WHERE p.buyer_email=? AND o.city_id=? AND p.status='paid' LIMIT 1").bind(job.email,job.city_id).first();
  if(suppressed||buyer){await database.prepare("UPDATE funnel_messages SET status='skipped',claimed_at=NULL WHERE id=?").bind(job.message_id).run();totals.skipped++;return;}
  // Do not blindly retry an ambiguous delivery beyond the provider idempotency window.
  if(job.attempts>=3||(job.first_attempt_at&&at.getTime()-Date.parse(job.first_attempt_at)>23*3600000)){await database.prepare("UPDATE funnel_messages SET status='review',claimed_at=NULL WHERE id=?").bind(job.message_id).run();totals.failed++;return;}
  try{
   const receipt=await send(job,'clue-'+job.message_id);
   await database.prepare("UPDATE funnel_messages SET status=?,sent_at=?,provider_id=?,claimed_at=NULL WHERE id=? AND status='sending'").bind(receipt?'sent':'skipped',receipt?timestamp:null,receipt,job.message_id).run();
   if(receipt)totals.sent++;else totals.skipped++;
  }catch{
   await database.prepare("UPDATE funnel_messages SET status='pending',due_at=?,claimed_at=NULL WHERE id=? AND status='sending'").bind(new Date(at.getTime()+3600000).toISOString(),job.message_id).run();totals.pending++;
  }
 }));
 return totals;
}
