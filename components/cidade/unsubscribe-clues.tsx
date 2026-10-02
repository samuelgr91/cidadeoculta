'use client';
import {useState} from 'react';
export function UnsubscribeClues({id,token}:{id:string;token:string}){
 const[done,setDone]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function unsubscribe(){setBusy(true);try{const response=await fetch('/api/mail/unsubscribe?'+new URLSearchParams({id,token}),{method:'POST'});if(!response.ok)throw new Error('Não foi possível cancelar. Tente novamente.');setDone(true);}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return <main className="page" style={{maxWidth:620}}><p className="eyebrow">CIDADE OCULTA · HIDDEN ATLAS</p><h1>{done?'E-mails cancelados.':'Cancelar as pistas por e-mail'}</h1><p>{done?'Você não receberá novas pistas ou ofertas desta sequência. Seu acesso às histórias permanece disponível. / You will no longer receive clues or offers from this sequence.':'Clique abaixo para parar de receber as pistas e ofertas. Isso não altera seu acesso à plataforma. / Stop the mystery clues and offers without changing your access.'}</p>{!done&&<button className="button" disabled={busy} onClick={unsubscribe}>{busy?'Cancelando…':'Cancelar e-mails / Unsubscribe'}</button>}{error&&<p className="error" role="alert">{error}</p>}<p><a href="/pt-br/ouro-preto/mapa">Voltar ao mapa / Back to the map →</a></p></main>;
}
