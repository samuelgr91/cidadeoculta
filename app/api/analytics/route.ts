import { cookies } from 'next/headers';
import { z } from 'zod';
import { body, checkOrigin, config, fail, HttpError, isAdmin } from '@/lib/access';
import { db } from '@/lib/db';
import { analyticsCookie, internalAnalyticsTraffic, platform, publicPath, savePageView, sourceHost } from '@/lib/analytics-core';
import { analyticsVisitor, excludeThisBrowser } from '@/lib/analytics-server';

export const dynamic='force-dynamic';
const inputSchema=z.object({id:z.string().uuid(),visitId:z.string().uuid(),path:z.string().max(300),referrer:z.string().max(300).default(''),internalTest:z.boolean().default(false)});
export async function POST(request:Request) {
  try {
    checkOrigin(request);
    if(internalAnalyticsTraffic({userAgent:request.headers.get('user-agent')||'',testHeader:request.headers.get('x-co-internal-test'),nodeEnv:process.env.NODE_ENV,context:process.env.CONTEXT}))return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
    const agent=platform((request.headers.get('user-agent')||'').slice(0,1000));
    if(agent.bot || (await cookies()).get(analyticsCookie)?.value==='1')return new Response(null,{status:204});
    if(await isAdmin()){await excludeThisBrowser();return new Response(null,{status:204});}
    const parsed=inputSchema.safeParse(await body(request));
    if(!parsed.success)throw new HttpError(400,'Evento inválido.');
    if(parsed.data.internalTest){await excludeThisBrowser();return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});}
    const path=publicPath(parsed.data.path);
    if(!path)return new Response(null,{status:204});
    const visitorId=await analyticsVisitor();
    const recent=await db().prepare('SELECT COUNT(*) n FROM analytics_page_views WHERE visitor_id=? AND created_at>=?').bind(visitorId,new Date(Date.now()-60000).toISOString()).first<{n:number}>();
    if((recent?.n||0)>=30)throw new HttpError(429,'Aguarde um minuto.');
    await savePageView(db(),{...parsed.data,path,visitorId,...agent,source:sourceHost(parsed.data.referrer,config().origin||new URL(request.url).origin)});
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  }catch(error){return fail(error);}
}
