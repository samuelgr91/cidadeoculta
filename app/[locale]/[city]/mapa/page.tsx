import {notFound} from 'next/navigation';
import {catalog} from '@/lib/catalog';
import {access,config} from '@/lib/access';
import {Header} from '@/components/cidade/shared';
import {CityMap} from '@/components/cidade/map';
import {Track} from '@/components/cidade/tracking';
import type {Locale} from '@/lib/model';
import {db} from '@/lib/db';

export const dynamic='force-dynamic';
export const metadata={title:'Explore o mapa — Cidade Oculta',robots:{index:false,follow:true}};

export default async function Page({params,searchParams}:{params:Promise<{locale:Locale;city:string}>;searchParams:Promise<{view?:string;story?:string;from?:string}>}){
  const [p,q]=await Promise.all([params,searchParams]);
  if(!['pt-br','en'].includes(p.locale))notFound();
  const c=await catalog(p.city,p.locale);
  if(!c)notFound();
  const a=await access(c.city.id);
  const progress=a.userId?await db().prepare('SELECT story_id FROM progress WHERE user_id=?').bind(a.userId).all<{story_id:string}>():{results:[]};
  const settings=config();
  const initialMapView=q.view==='simple'||q.view==='editorial'?q.view:settings.mapDefaultView;
  const initialStoryId=c.stories.some(story=>story.id===q.story)?q.story:undefined;
  return <>
    <Header locale={p.locale} city={c.city} alternate={`/${p.locale==='en'?'pt-br':'en'}/${p.city}/mapa${initialStoryId?'?'+new URLSearchParams({story:initialStoryId,...(q.from==='video'?{from:'video'}:{})}):''}`}/>
    <Track name="city_map_open" cityId={c.city.id} locale={p.locale}/>
    <CityMap city={c.city} locale={p.locale} stories={c.stories.map(s=>({...s,completed:progress.results.some(r=>r.story_id===s.id)}))} styleUrl={settings.mapStyle} entitled={a.entitled} initialLead={a.lead} directEntry={q.from==='video'&&!!initialStoryId} initialMapView={initialMapView} initialStoryId={initialStoryId}/>
  </>;
}
