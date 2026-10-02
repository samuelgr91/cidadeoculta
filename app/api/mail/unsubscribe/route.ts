import {db} from '@/lib/db';
import {authSecret} from '@/lib/email-auth';
import {unsubscribeFromClues,validUnsubscribeToken} from '@/lib/funnel-sequence';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const q=new URL(request.url).searchParams,id=q.get('id')||'',token=q.get('token')||'';
 if(!await validUnsubscribeToken(authSecret(),id,token))return Response.json({error:'Link de cancelamento inválido.'},{status:400});
 await unsubscribeFromClues(db(),id);
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
