import {authSecret} from '@/lib/email-auth';
import {validUnsubscribeToken} from '@/lib/funnel-sequence';
import {UnsubscribeClues} from '@/components/cidade/unsubscribe-clues';
export const dynamic='force-dynamic';
export const metadata={title:'Cancelar e-mails — Cidade Oculta',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{id?:string;token?:string}>}){
 const {id='',token=''}=await searchParams;
 if(!await validUnsubscribeToken(authSecret(),id,token))return <main className="page"><h1>Link inválido / Invalid link</h1><p>Use o link de cancelamento recebido no e-mail. / Use the unsubscribe link from your email.</p></main>;
 return <UnsubscribeClues id={id} token={token}/>;
}
