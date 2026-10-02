import { checkOrigin, fail, requireAdmin } from '@/lib/access';
import { excludeThisBrowser } from '@/lib/analytics-server';
export async function POST(request:Request){
  try{checkOrigin(request);await requireAdmin();await excludeThisBrowser();return Response.json({excluded:true},{headers:{'Cache-Control':'no-store'}});}
  catch(error){return fail(error);}
}
