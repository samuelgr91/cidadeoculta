import {cookies} from 'next/headers';
import {analyticsCookie} from '@/lib/analytics-core';
import {safeReturnTo} from '@/lib/email-auth';
import {AnalyticsTestMode} from '@/components/cidade/analytics-test-mode';
export const dynamic='force-dynamic';
export const metadata={title:'Modo de testes — Cidade Oculta',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{returnTo?:string}>}){
 const requested=safeReturnTo((await searchParams).returnTo);
 const returnTo=requested==='/'||requested.startsWith('/nao-contar-visitas')?'/pt-br/ouro-preto/mapa':requested;
 return <AnalyticsTestMode initialExcluded={(await cookies()).get(analyticsCookie)?.value==='1'} returnTo={returnTo}/>;
}
