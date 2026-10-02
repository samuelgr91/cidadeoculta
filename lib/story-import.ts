import type {QueryDatabase} from './turso-db';
import type {Story,Location} from './model';
export type EditorialBatch={id:string;locations:Location[];stories:Story[]};
export async function importEditorialBatch(database:QueryDatabase,batch:EditorialBatch,options:{preserveExisting?:boolean}={}){
 await database.batch([
  database.prepare('CREATE TABLE IF NOT EXISTS editorial_imports(id TEXT PRIMARY KEY,created_at TEXT NOT NULL)'),
  database.prepare('CREATE TABLE IF NOT EXISTS editorial_import_backups(batch_id TEXT NOT NULL,story_id TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(batch_id,story_id))')
 ]);
 if(await database.prepare('SELECT id FROM editorial_imports WHERE id=?').bind(batch.id).first())return {applied:false,count:0};
 const timestamp=new Date().toISOString(),writes=[];
 for(const location of batch.locations){
  const existing=await database.prepare('SELECT data FROM locations WHERE id=?').bind(location.id).first<{data:string}>();
  if(existing&&JSON.parse(existing.data).cityId!==location.cityId)throw new Error('Location belongs to another city');
  if(existing&&options.preserveExisting)continue;
  writes.push(database.prepare('INSERT INTO locations(id,city_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET city_id=excluded.city_id,data=excluded.data').bind(location.id,location.cityId,JSON.stringify(location)));
 }
 let imported=0;
 for(const item of batch.stories){
  const existing=await database.prepare('SELECT data FROM stories WHERE id=?').bind(item.id).first<{data:string}>();
  if(existing&&options.preserveExisting)continue;
  if(!await database.prepare('SELECT id FROM cities WHERE id=?').bind(item.cityId).first())throw new Error('City missing');
  for(const locale of ['pt-br','en'] as const){
   if(await database.prepare('SELECT story_id FROM story_translations WHERE city_id=? AND locale=? AND slug=? AND story_id<>?').bind(item.cityId,locale,item.localeContent[locale].slug,item.id).first())throw new Error('Existing slug conflict: '+item.id);
  }
  const story=structuredClone(item);
  if(existing){
   const previous=JSON.parse(existing.data) as Story;
   if(previous.cityId!==item.cityId)throw new Error('Story belongs to another city');
   // Keep the already published addresses and custom visuals of the existing story.
   story.image=previous.image;story.imageCredit=previous.imageCredit;
   story.mapImage=previous.mapImage;story.mapImageCredit=previous.mapImageCredit;
   for(const locale of ['pt-br','en'] as const)story.localeContent[locale]={...story.localeContent[locale],slug:previous.localeContent[locale].slug};
   writes.push(database.prepare('INSERT OR IGNORE INTO editorial_import_backups(batch_id,story_id,data,created_at) VALUES(?,?,?,?)').bind(batch.id,item.id,existing.data,timestamp));
  }
  writes.push(database.prepare('INSERT INTO stories(id,city_id,location_id,data,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET location_id=excluded.location_id,data=excluded.data,updated_at=excluded.updated_at').bind(story.id,story.cityId,story.locationId,JSON.stringify(story),timestamp));
  for(const locale of ['pt-br','en'] as const){const c=story.localeContent[locale];writes.push(database.prepare('INSERT INTO story_translations(story_id,city_id,locale,slug,status) VALUES(?,?,?,?,?) ON CONFLICT(story_id,locale) DO UPDATE SET slug=excluded.slug,status=excluded.status').bind(story.id,story.cityId,locale,c.slug,c.status));}
  writes.push(database.prepare('DELETE FROM sources WHERE story_id=?').bind(story.id));
  story.sources.forEach((source,i)=>writes.push(database.prepare('INSERT INTO sources(id,story_id,data) VALUES(?,?,?)').bind(story.id+'-'+i,story.id,JSON.stringify(source))));
  writes.push(database.prepare('INSERT INTO audit(id,actor,action,entity_id,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),'editorial-import:'+batch.id,'import_story',story.id,timestamp));
  imported++;
 }
 // Parallel first requests can both observe an unseen batch before either
 // transaction commits. Their identical imports remain safe and idempotent.
 writes.push(database.prepare('INSERT OR IGNORE INTO editorial_imports(id,created_at) VALUES(?,?)').bind(batch.id,timestamp));
 await database.batch(writes);
 return {applied:true,count:imported};
}
