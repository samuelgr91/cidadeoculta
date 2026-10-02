import {price,truthLabels,type City,type Story,type Locale} from './model.ts';
import {mapEntryPath} from './map-entry.ts';
import {unsubscribeToken,type SequenceJob} from './funnel-sequence.ts';
import type {QueryDatabase} from './turso-db';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const clueStories:Record<string,string[]>={'ouro-preto':['op-003','op-008','op-005']};
export function clueEmail(story:Story,city:City,locale:Locale,step:number,origin:string,unsubscribeUrl:string){
 const en=locale==='en',copy=story.localeContent[locale],amount=price(city.priceCents,locale);
 const subject=(en?['A head vanished from this square','The fire left more than a name','A lost treasure, according to local tradition']:['Uma cabeça desapareceu desta praça','O fogo deixou mais que um nome','Um tesouro perdido, segundo a tradição local'])[step-1];
 const intro=(en?['You have already found one place. Here is another mystery on the map.','Above Ouro Preto, ruins preserve the memory of a mining settlement and the repression of 1720.','Some stories are documented. Others survive through local memory. This one belongs to oral tradition.']:['Você já encontrou um lugar. Agora há outro mistério no mapa.','Acima de Ouro Preto, ruínas preservam a memória de um assentamento minerador e da repressão de 1720.','Algumas histórias têm documentos. Outras sobrevivem na memória local. Esta pertence à tradição oral.'])[step-1];
 const map=new URL(mapEntryPath(locale,city.slug,story.id,{utm_source:'email',utm_medium:'pistas',utm_campaign:'map-first',utm_content:'dia-'+[1,3,5][step-1]}),origin).toString();
 const buy=new URL(`/${locale}/${city.slug}/comprar?method=pix`,origin).toString();
 const label=truthLabels[story.truthStatus][locale];
 const text=`Cidade Oculta · ${city.name}\n\n${subject}\n\n${intro}\n\n${copy.title}\n${label}\n${copy.hook}\n\n${en?'The location is free. The full story and its sources are in City Pass.':'A localização é gratuita. O texto completo e suas fontes estão no City Pass.'}\n${map}\n\n${en?'Unlock Ouro Preto':'Liberar Ouro Preto'} · ${amount}\n${en?'One payment. No subscription. Pix via Kiwify.':'Compra única. Sem assinatura. Pix pela Kiwify.'}\n${buy}\n\n${en?'You opted in to three mystery clues. Unsubscribe':'Você escolheu receber três pistas de mistérios. Cancelar os e-mails'}: ${unsubscribeUrl}`;
 const html=`<!doctype html><html><body style="margin:0;background:#0a1015"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:580px;background:#131c23;border:1px solid #475148;border-radius:12px;color:#eee9df" cellpadding="28"><tr><td><p style="font:12px Arial;letter-spacing:2px;color:#eab768">CIDADE OCULTA · PISTA ${step}/3</p><h1 style="font:32px/1.1 Georgia">${escape(subject)}</h1><p style="font:15px/1.7 Arial;color:#c2cdd5">${escape(intro)}</p><p style="font:11px Arial;color:#eab768">${escape(label)}</p><h2 style="font:26px Georgia">${escape(copy.title)}</h2><p style="font:17px/1.6 Georgia">${escape(copy.hook)}</p><p style="font:13px/1.7 Arial;color:#b6c4ce">${en?'The location is free. The full story and its sources are in City Pass.':'A localização é gratuita. O texto completo e suas fontes estão no City Pass.'}</p><a href="${escape(map)}" style="display:inline-block;background:#efb45e;color:#20170e;padding:14px 20px;border-radius:8px;font:bold 15px Arial;text-decoration:none">${en?'Open this point on the map':'Abrir este ponto no mapa'} →</a><hr style="border:0;border-top:1px solid #475148;margin:28px 0"><p style="font:22px Georgia;color:#efb45e">${escape(amount)}</p><p style="font:13px Arial">${en?'One payment. No subscription.':'Compra única. Sem assinatura.'}</p><a href="${escape(buy)}" style="color:#efb45e;font:15px Arial">${en?'Unlock the city with Pix':'Liberar a cidade com Pix'} →</a><p style="font:11px/1.7 Arial;color:#aebcc6;margin-top:28px">${en?'You opted in to three mystery clues.':'Você escolheu receber três pistas de mistérios.'} <a style="color:#d4c3a7" href="${escape(unsubscribeUrl)}">${en?'Unsubscribe':'Cancelar os e-mails'}</a></p></td></tr></table></td></tr></table></body></html>`;
 return {subject,html,text};
}
export function sequenceSender(database:QueryDatabase,settings:{origin:string;secret:string;key:string;from:string}){
 return async(job:SequenceJob,idempotencyKey:string)=>{
  const id=clueStories[job.city_id]?.[job.step-1];if(!id)return null;
  const [storyRow,cityRow,current]=await Promise.all([
   database.prepare("SELECT s.data FROM stories s JOIN story_translations t ON t.story_id=s.id WHERE s.id=? AND s.city_id=? AND t.locale=? AND t.status='published'").bind(id,job.city_id,job.locale).first<{data:string}>(),
   database.prepare('SELECT data FROM cities WHERE id=?').bind(job.city_id).first<{data:string}>(),
   database.prepare('SELECT unsubscribed_at FROM funnel_subscriptions WHERE id=?').bind(job.id).first<{unsubscribed_at:string|null}>(),
  ]);
  if(!storyRow||!cityRow||current?.unsubscribed_at)return null;
  const story=JSON.parse(storyRow.data) as Story,city=JSON.parse(cityRow.data) as City;
  if(story.accessLevel!=='premium'||city.status!=='published')return null;
  const token=await unsubscribeToken(settings.secret,job.id),query=new URLSearchParams({id:job.id,token});
  const unsubscribeUrl=new URL('/sair-dos-emails?'+query,settings.origin).toString(),oneClickUrl=new URL('/api/mail/unsubscribe?'+query,settings.origin).toString();
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+settings.key,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:settings.from,to:[job.email],...clueEmail(story,city,job.locale,job.step,settings.origin,unsubscribeUrl),headers:{'List-Unsubscribe':`<${oneClickUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}),signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw new Error('Clue delivery unavailable');const receipt=await response.json() as {id:string};if(!receipt.id)throw new Error('Missing mail receipt');return receipt.id;
 };
}
