'use client';
import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {ArrowRight,Check,Mail,ShieldCheck} from 'lucide-react';
import {price,type City,type Locale,type PublicStory} from '@/lib/model';
import {acquisition,BuyLink,track} from './tracking';
export default function MapAccess({city,story,locale,freeCount,premiumCount,action,onClose,onUnlocked}:{city:City;story:PublicStory;locale:Locale;freeCount:number;premiumCount:number;action:'lead'|'pass';onClose:()=>void;onUnlocked:()=>void}){
 const en=locale==='en',base=`/${locale}/${city.slug}`;
 const [mode,setMode]=useState(action),[email,setEmail]=useState(''),[consent,setConsent]=useState(false),[fax,setFax]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
  const response=await fetch('/api/location-lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaign:story.copy.slug,email,emailConsent:consent,flow:'map',locale,fax,acquisition:acquisition()})});
  const data=await response.json() as {unlocked?:boolean;error?:string};if(!response.ok||!data.unlocked)throw new Error(data.error||(en?'Please try again.':'Tente novamente.'));
  track('map_free_unlock',city.id,locale,story.id);onUnlocked();
 }catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="map-access-dialog">
  <p className="eyebrow">{mode==='lead'?(en?'KEEP EXPLORING, FOR FREE':'CONTINUE EXPLORANDO, DE GRAÇA'):'OURO PRETO CITY PASS'}</p>
  <DialogTitle>{mode==='lead'?(en?'One email. More discoveries.':'Um e-mail. Mais descobertas.'):(en?'The video was only the beginning.':'O vídeo foi só o começo.')}</DialogTitle>
  <DialogDescription>{mode==='lead'?(en?`Unlock ${freeCount} free stories in this browser. The location you came for is already available on the map.`:`Libere ${freeCount} histórias gratuitas neste navegador. A localização que você pediu já está aberta no mapa.`):(en?`You found the place and confirmed the discovery. Open “${story.copy.title}” in full and explore the premium collection of Ouro Preto.`:`Você encontrou o lugar e confirmou a descoberta. Abra “${story.copy.title}” por inteiro e explore a coleção premium de Ouro Preto.`)}</DialogDescription>
  {mode==='lead'?<form onSubmit={submit} className="map-access-form"><label className="field">{en?'Your email':'Seu e-mail'}<input name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label className="funnel-honeypot" aria-hidden="true">Website<input name="fax" tabIndex={-1} autoComplete="off" value={fax} onChange={e=>setFax(e.target.value)}/></label><button className="button wide" disabled={busy}>{busy?(en?'Unlocking…':'Liberando…'):(en?'Unlock free stories':'Liberar histórias gratuitas')}<ArrowRight size={17}/></button><label className="map-sequence-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{en?'Send me 3 mystery clues over the next few days, with the City Pass offer. Optional.':'Quero receber 3 pistas de mistérios nos próximos dias, com a oferta do City Pass. Opcional.'}</span></label><p className="small-note">{en?'No password. Unsubscribe from clues at any time.':'Sem senha. Você pode cancelar as pistas a qualquer momento.'} <a href={base+'/privacidade'}>{en?'Privacy':'Privacidade'}</a></p>{error&&<p className="error" role="alert">{error}</p>}</form>:<>
   <div className="map-pass-benefits"><p><Check size={16}/>{en?'The complete story that brought you here':'A história completa que trouxe você até aqui'}</p><p><Check size={16}/>{en?`${premiumCount} premium dossiers with sources and context`:`${premiumCount} arquivos premium com fontes e contexto`}</p><p><Check size={16}/>{en?'Explore the city from anywhere':'Explore a cidade de qualquer lugar'}</p></div>
   <div className="map-pass-price"><strong>{price(city.priceCents,locale)}</strong><span>{en?'One payment. No subscription.':'Compra única. Sem assinatura.'}</span></div>
   <BuyLink cityId={city.id} locale={locale} className="button wide" href={base+`/comprar?method=pix&returnTo=${encodeURIComponent(base+'/mapa?story='+story.id)}`}>{en?'Pay with Pix':'Pagar com Pix'}<ArrowRight size={17}/></BuyLink>
   <div className="map-pass-note"><ShieldCheck size={14}/>{en?'Kiwify checkout. Access after payment confirmation.':'Checkout Kiwify. Acesso após confirmação do pagamento.'}</div>
   <p className="map-pass-free-note">{en?'The map and this location remain free even if you do not buy.':'O mapa e esta localização continuam gratuitos mesmo se você não comprar.'}</p>
   <BuyLink cityId={city.id} locale={locale} className="map-access-secondary" href={base+'/comprar'}>{en?'Prefer card? Pay here':'Prefere cartão? Pague aqui'}</BuyLink>
   {freeCount>0&&<button className="map-access-secondary" onClick={()=>setMode('lead')}>{en?'Explore the free stories first':'Quero explorar as histórias gratuitas primeiro'}</button>}
  </>}
 </DialogContent></Dialog>;
}
