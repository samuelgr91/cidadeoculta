import {body,checkOrigin,config,fail,HttpError,newSession} from '@/lib/access';
import {authSecret,clientIp} from '@/lib/email-auth';
import {throttle,AuthError} from '@/lib/email-auth-core';
import {db} from '@/lib/db';
import {locationCampaign} from '@/lib/location-campaign';
import {funnelInput,captureLocationLead,deliverLocationEmail,normalizePhone} from '@/lib/location-funnel';
import {sendLocationEmail} from '@/lib/location-email';
import {subscribeToClues} from '@/lib/funnel-sequence';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  checkOrigin(request);
  const parsed=funnelInput.safeParse(await body(request));
  if(!parsed.success)throw new HttpError(400,'Confira o e-mail e os dados informados.');
  const input=parsed.data;
  if(input.fax)throw new HttpError(400,'Não foi possível enviar esse formulário.');
  try{const phone=normalizePhone(input.phone);if(input.whatsappConsent&&!phone)throw new Error('Informe o WhatsApp ou desmarque essa autorização.');}catch(error){throw new HttpError(400,(error as Error).message);}
  const campaign=await locationCampaign(input.campaign,input.locale);if(!campaign)throw new HttpError(404,'Descoberta não encontrada.');
  const database=db(),secret=authSecret();
  await throttle(database,secret,'location-ip',clientIp(request),12);
  await throttle(database,secret,'location-email',input.email,3);
  const sid=await newSession();
  const lead=await captureLocationLead(database,{...input,campaign:campaign.slug},sid,campaign.story.id,campaign.city.id);
  await subscribeToClues(database,{email:lead.email,cityId:campaign.city.id,locale:input.locale,campaign:campaign.slug,consent:input.emailConsent});
  const origin=config().origin;if(!origin.startsWith('https://'))throw new HttpError(503,'Entrega temporariamente indisponível.');
  const emailStatus=input.flow==='map'?'not_requested':await deliverLocationEmail(database,lead,key=>sendLocationEmail(lead.email,campaign,input.locale,origin,key));
  return Response.json({unlocked:true,emailStatus},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){if(error instanceof AuthError)return fail(new HttpError(error.status,error.message));return fail(error);}
}
