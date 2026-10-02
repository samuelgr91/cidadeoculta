import {catalog} from './catalog';
import type {Locale,PublicStory,City} from './model';
export type LocationCampaign={slug:string;city:City;story:PublicStory;stories:PublicStory[]};
export async function locationCampaign(slug:string,locale:Locale):Promise<LocationCampaign|null>{
 const [data,pt]=await Promise.all([catalog('ouro-preto',locale),locale==='en'?catalog('ouro-preto','pt-br'):Promise.resolve(null)]);if(!data)return null;
 const source=pt||data;
 const aliases:Record<string,string>={oratorio:'oratorio-vira-saia','morro-da-queimada':'op-008','piso-escondido':'op-061','pinturas-escondidas':'op-062'};
 const original=source.stories.find(s=>aliases[slug]?s.id===aliases[slug]:s.copy.slug===slug)||data.stories.find(s=>s.copy.slug===slug);
 if(!original)return null;
 const story=data.stories.find(s=>s.id===original.id);if(!story)return null;
 const canonical=source.stories.find(s=>s.id===original.id);
 return {slug:Object.keys(aliases).find(key=>aliases[key]===story.id)||canonical?.copy.slug||slug,...data,story};
}
export {mapsUrl} from './location-links';
