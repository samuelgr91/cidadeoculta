import {body,checkOrigin,fail,HttpError} from '@/lib/access';
import {excludeThisBrowser} from '@/lib/analytics-server';
export const dynamic='force-dynamic';
// Opt out this browser only. No visitor ID input, report access or admin privilege.
export async function POST(request:Request){
 try{
  checkOrigin(request);
  if(!request.headers.get('origin')||!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(403,'Solicitação inválida.');
  const input=await body(request);if(!input||input.enabled!==true)throw new HttpError(400,'Confirme a exclusão deste navegador.');
  const excludedViews=await excludeThisBrowser();
  return Response.json({excluded:true,excludedViews},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return fail(error);}
}
