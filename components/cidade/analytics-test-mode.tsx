'use client';
import {useState} from 'react';
export function AnalyticsTestMode({initialExcluded,returnTo}:{initialExcluded:boolean;returnTo:string}){
 const [active,setActive]=useState(initialExcluded),[removed,setRemoved]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function activate(){setBusy(true);setError('');try{
  const response=await fetch('/api/analytics/test-mode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true})});
  if(!response.ok)throw new Error('Não foi possível ativar. Tente novamente.');
  const result=await response.json() as {excluded:boolean;excludedViews:number};if(!result.excluded)throw new Error('Tente novamente.');
  try{localStorage.setItem('co_analytics_test_mode','1');}catch{/* The HttpOnly exclusion cookie still applies. */}
  setActive(true);setRemoved(result.excludedViews);
 }catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return <main className="page" style={{maxWidth:720}}><a className="brand" href="/pt-br/ouro-preto">Cidade Oculta</a><section className="panel" style={{marginTop:36}}><p className="eyebrow">REVISÃO E TESTES</p><h1 style={{fontSize:40,lineHeight:1.1}}>{active?'Este navegador não entra nas visitas.':'Não contar visitas de testes.'}</h1><p className="muted">A exclusão vale para este navegador, mesmo sem login, por até 90 dias. Também retira dos gráficos as visitas anteriores ligadas ao mesmo identificador, sem apagar dados.</p>{removed!==null&&<p className="notice" role="status">{removed} {removed===1?'página anterior retirada':'páginas anteriores retiradas'} dos relatórios.</p>}{active?<><p className="notice" role="status">Modo de testes ativo. Você pode navegar e revisar o site sem aumentar a audiência.</p><a className="button" href={returnTo}>Continuar no site ↗</a></>:<button className="button" disabled={busy} onClick={activate}>{busy?'Ativando…':'Excluir visitas deste navegador'}</button>}{error&&<p className="error" role="alert">{error}</p>}<p className="small-note" style={{marginTop:20}}>Não altera login, compras ou acesso às histórias. Em outro navegador, ative o modo novamente.</p></section></main>;
}
