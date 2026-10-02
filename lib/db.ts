import { env } from 'cloudflare:workers';
import {seedCity,seedLocations,seedStories} from './seed';
import type {City} from './model';
import {tursoDatabase,type QueryDatabase} from './turso-db';
import op001to006Batch from '../content/ouro-preto/batch-op001-op006.json';
import op008Batch from '../content/ouro-preto/batch-op008.json';
import op061Batch from '../content/ouro-preto/batch-op061.json';
import op062Batch from '../content/ouro-preto/batch-op062.json';
import {importEditorialBatch,type EditorialBatch} from './story-import';
export function db():QueryDatabase {
  if(env.DB)return env.DB as unknown as QueryDatabase;
  if(process.env.TURSO_DATABASE_URL)return tursoDatabase();
  throw new Error('Banco indisponível. Configure D1 ou Turso.');
}
export const now=()=>new Date().toISOString();
export async function ensureSeed(){
 const d=db();
 const exists=await d.prepare('SELECT data FROM cities WHERE id = ?').bind(seedCity.id).first<{data:string}>();
 if(exists){
  const city=JSON.parse(exists.data) as City;
  if(city.accent==='#d7ff63'&&city.headlinePt==='Você já viu Ouro Preto. Mas não tudo.'){
   await d.prepare('UPDATE cities SET data=?,updated_at=? WHERE id=?').bind(JSON.stringify({...city,accent:seedCity.accent,headlinePt:seedCity.headlinePt,headlineEn:seedCity.headlineEn}),now(),seedCity.id).run();
  }
 }else{
  const t=now();
  await d.batch([
   d.prepare('INSERT OR IGNORE INTO cities(id,slug,data,updated_at) VALUES(?,?,?,?)').bind(seedCity.id,seedCity.slug,JSON.stringify(seedCity),t),
   ...seedLocations.map(l=>d.prepare('INSERT OR IGNORE INTO locations(id,city_id,data) VALUES(?,?,?)').bind(l.id,l.cityId,JSON.stringify(l))),
   ...seedStories.flatMap(s=>[
    d.prepare('INSERT OR IGNORE INTO stories(id,city_id,location_id,data,updated_at) VALUES(?,?,?,?,?)').bind(s.id,s.cityId,s.locationId,JSON.stringify(s),t),
    ...(['pt-br','en'] as const).map(l=>d.prepare('INSERT OR IGNORE INTO story_translations(story_id,city_id,locale,slug,status) VALUES(?,?,?,?,?)').bind(s.id,s.cityId,l,s.localeContent[l].slug,s.localeContent[l].status)),
    ...s.sources.map((source,i)=>d.prepare('INSERT OR IGNORE INTO sources(id,story_id,data) VALUES(?,?,?)').bind(s.id+'-'+i,s.id,JSON.stringify(source)))
   ])
  ]);
 }
 // Restore earlier editorial batches if this database only has the starter
 // content. Existing CMS stories and location edits stay untouched.
 await importEditorialBatch(d,op001to006Batch as EditorialBatch,{preserveExisting:true});
 await importEditorialBatch(d,op008Batch as EditorialBatch,{preserveExisting:true});
 // Newer batches are idempotent and self-contained for the first request.
 await importEditorialBatch(d,op061Batch as EditorialBatch);
 await importEditorialBatch(d,op062Batch as EditorialBatch);
}
export async function record(name:string,cityId:string|null,storyId:string|null,locale:string|null,sessionId:string|null,acquisition:Record<string,string>={}){await db().prepare('INSERT INTO events(id,name,city_id,story_id,locale,session_id,acquisition,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),name,cityId,storyId,locale,sessionId,JSON.stringify(acquisition),now()).run();}
