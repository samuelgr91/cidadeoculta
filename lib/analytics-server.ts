import { cookies } from 'next/headers';
import { db } from './db';
import { analyticsCookie, excludeVisitor, visitorKey } from './analytics-core';

export async function analyticsVisitor() {
  const jar = await cookies();
  let id = jar.get('co_visitor')?.value;
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    jar.set('co_visitor',id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:90*86400});
  }
  return visitorKey(id);
}
export async function excludeThisBrowser() {
  const excludedViews=await excludeVisitor(db(),await analyticsVisitor());
  (await cookies()).set(analyticsCookie,'1',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:90*86400});
  return excludedViews;
}
