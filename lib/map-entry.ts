import type {Locale} from './model';
export function mapEntryPath(locale:Locale,city:string,storyId:string,query:Record<string,string|string[]|undefined>={}){
 const params=new URLSearchParams({story:storyId,from:'video'});
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','ref']){const value=query[key];if(typeof value==='string')params.set(key,value.slice(0,200));}
 return `/${locale}/${city}/mapa?${params}`;
}
