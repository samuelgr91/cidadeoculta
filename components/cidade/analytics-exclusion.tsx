'use client';
import {useEffect,useState} from 'react';
export function AnalyticsExclusion({excluded}:{excluded:boolean}){
  const [active,setActive]=useState(excluded),[error,setError]=useState(false);
  async function exclude(){try{const r=await fetch('/api/analytics/exclude',{method:'POST'});if(!r.ok)throw new Error();setActive(true);setError(false);}catch{setError(true);}}
  useEffect(()=>{if(!excluded)void exclude();},[excluded]);
  return <div className="analytics-exclusion"><strong>{active?'Suas visitas estão excluídas neste navegador.':'Excluindo suas visitas deste navegador…'}</strong><p>Administradores autenticados são ignorados automaticamente. A exclusão continua após sair da conta por até 90 dias. Revisões e testes também podem ativar a exclusão sem login em <a href="/nao-contar-visitas">Não contar visitas</a>. Vale para as visitas anteriores identificáveis deste navegador.</p>{error&&<button className="button secondary" onClick={exclude}>Tentar excluir este navegador novamente</button>}</div>;
}
