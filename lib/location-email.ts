import type {LocationCampaign} from './location-campaign';
import type {Locale} from './model.ts';
import {price} from './model.ts';
import {mapsUrl,locationGuidance} from './location-links.ts';
import {mapEntryPath} from './map-entry.ts';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function locationEmail(c:LocationCampaign,locale:Locale,origin:string){
 const en=locale==='en',name=c.story.location.name,guidance=locationGuidance(c.story,locale);
 const destination=new URL(mapEntryPath(locale,c.city.slug,c.story.id),origin).toString();
 const buy=new URL(`/${locale}/${c.city.slug}/comprar?utm_source=email&utm_medium=location&utm_campaign=${c.slug}`,origin).toString();
 const amount=price(c.city.priceCents,locale),count=c.stories.filter(s=>s.accessLevel==='premium').length;
 const subject=en?`Your map to ${name} · Cidade Oculta`:`Seu mapa para ${name} · Cidade Oculta`;
 const heading=en?'The story has a place. Here it is.':'A história tem um lugar. Aqui está ele.';
 const precision=c.story.location.precision==='verified'?(en?'Verified location.':'Localização verificada.'):(en?'The heritage location is an approximate reference; it does not prove where every narrated event happened.':'A localização do patrimônio é uma referência aproximada; não comprova o ponto de cada acontecimento narrado.');
 const text=`Cidade Oculta\n\n${heading}\n${name}\n${c.story.location.address}\n${precision}\n${guidance}\n\n${en?'Open in Google Maps':'Abrir no Google Maps'}: ${mapsUrl(c.story)}\n${en?'Your free discovery':'Sua descoberta gratuita'}: ${destination}\n\n${en?'Keep exploring Ouro Preto':'Continue descobrindo Ouro Preto'}\n${en?`${count} premium stories, their sources and the city map. One payment, no subscription.`:`${count} histórias premium, suas fontes e o mapa da cidade. Compra única, sem assinatura.`}\n${amount}: ${buy}\n\n${en?'You requested this location on Hidden Atlas.':'Você solicitou esta localização na Hidden Atlas.'}`;
 const button=(url:string,label:string)=>`<a href="${escape(url)}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#efaf58;color:#211507;text-decoration:none;font:bold 15px Arial,sans-serif">${escape(label)}</a>`;
 const html=`<!doctype html><html><body style="margin:0;background:#080c10"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:580px;background:#10171d;border:1px solid #33404b;border-radius:12px;color:#f1ebdf" cellpadding="28"><tr><td><p style="color:#e6aa56;letter-spacing:3px;font:12px Arial">CIDADE OCULTA · OURO PRETO</p><h1 style="font:normal 32px Georgia,serif">${escape(heading)}</h1><h2 style="font:normal 24px Georgia,serif">${escape(name)}</h2><p style="font:16px/1.6 Arial">${escape(c.story.location.address)}</p><p style="font:12px/1.6 Arial;color:#aab6bd">${escape(precision)}</p>${guidance?`<p style="font:14px/1.7 Arial;color:#c9d1d6">${escape(guidance)}</p>`:''}${button(mapsUrl(c.story),en?'Open the location':'Abrir a localização')}<p><a style="color:#e6aa56" href="${escape(destination)}">${en?'Return to your free discovery':'Voltar à sua descoberta gratuita'} →</a></p><hr style="border:0;border-top:1px solid #33404b;margin:28px 0"><h2 style="font:normal 28px Georgia,serif">${en?'This is where your curiosity begins.':'A curiosidade começa aqui.'}</h2><p style="font:15px/1.7 Arial">${en?`Go beyond one video: unlock ${count} premium stories, explore their sources and find each place on the city map.`:`Vá além de um vídeo: libere ${count} histórias premium, explore suas fontes e encontre cada lugar no mapa da cidade.`}</p><p style="font:22px Georgia;color:#efaf58">${escape(amount)} <span style="font:12px Arial;color:#aab6bd">· ${en?'One payment. No subscription.':'Compra única. Sem assinatura.'}</span></p>${button(buy,en?'Unlock Ouro Preto':'Liberar Ouro Preto')}<p style="font:11px/1.6 Arial;color:#aab6bd;margin-top:28px">${en?'You requested this location on Hidden Atlas. This message delivers your free discovery.':'Você solicitou esta localização na Hidden Atlas. Esta mensagem entrega sua descoberta gratuita.'}</p></td></tr></table></td></tr></table></body></html>`;
 return {subject,html,text};
}
export async function sendLocationEmail(email:string,c:LocationCampaign,locale:Locale,origin:string,idempotencyKey:string){
 const key=process.env.RESEND_API_KEY,from=process.env.AUTH_FROM_EMAIL;
 if(!key||!from)throw new Error('Delivery configuration unavailable');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from,to:[email],...locationEmail(c,locale,origin)}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Delivery unavailable');
 const result=await response.json() as {id:string};if(!result.id)throw new Error('Missing delivery receipt');return result.id;
}
