import {notFound,redirect} from 'next/navigation';
import {locationCampaign,mapsUrl} from './location-campaign';
import {mapEntryPath} from './map-entry';
import {metadata} from './seo';
import type {Locale} from './model';
export type FunnelPageProps={params:Promise<{campaign:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function funnelMetadata(props:FunnelPageProps,locale:Locale){
 const {campaign:slug}=await props.params,c=await locationCampaign(slug,locale);if(!c)return {};
 const path=`${locale==='en'?'/en':''}/l/${c.slug}`;
 return {...metadata(locale==='en'?`Find ${c.story.location.name}`:`Encontre ${c.story.location.name}`,locale==='en'?'Get the location for free and discover the stories of Ouro Preto.':'Receba a localização gratuitamente e descubra as histórias de Ouro Preto.',locale,path,`${locale==='en'?'':'/en'}/l/${c.slug}`),robots:{index:false,follow:true}};
}
export async function LocationFunnelPage(props:FunnelPageProps,locale:Locale){
 const {campaign:slug}=await props.params,c=await locationCampaign(slug,locale);if(!c)notFound();
 redirect(mapEntryPath(locale,c.city.slug,c.story.id,await props.searchParams));
}
