import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createClient} from '@libsql/client';
import {createTursoDatabase} from '../lib/turso-db.ts';
import {importEditorialBatch} from '../lib/story-import.ts';
import {seedStories,seedLocations,seedCity} from '../lib/seed.ts';
import {storySchema,publicStory,canRead} from '../lib/model.ts';
import {groupMapStories} from '../lib/map-groups.ts';
const batch=JSON.parse(await readFile(new URL('../content/ouro-preto/batch-op001-op006.json',import.meta.url),'utf8'));
const original=await readFile(new URL('../content/ouro-preto/OP001-OP006.pt-br.md',import.meta.url),'utf8');
assert.equal(batch.stories.length,6);
assert.deepEqual(batch.stories.map(s=>s.accessLevel),['open','premium','premium','premium','premium','lead']);
assert.deepEqual(batch.stories.map(s=>s.truthStatus),['oral_tradition','oral_tradition','disputed','oral_tradition','oral_tradition','documented']);
for(const story of batch.stories){
 storySchema.parse(story);
 const section=original.split('# '+story.editorialCode+' — ')[1];
 const paragraphs=section.split('## História completa\n')[1].split('\n## ')[0].trim().split(/\n\s*\n/);
 assert.deepEqual(story.localeContent['pt-br'].blocks.slice(0,paragraphs.length).map(b=>b.text),paragraphs);
 assert.ok(story.sources.length>=2);
 assert.equal(story.localeContent.en.blocks.filter(b=>b.type==='heading').length,2);
 assert.ok(story.localeContent.en.blocks.length>=paragraphs.length+6);
 const preview=publicStory(story,'pt-br',seedLocations[0]);
 assert.equal(preview.copy.blocks,undefined);assert.equal(preview.localeContent,undefined);
 assert.equal(canRead(story.accessLevel,false,false),story.accessLevel==='open');
 assert.equal(canRead(story.accessLevel,true,false),story.accessLevel!=='premium');
 assert.equal(canRead(story.accessLevel,false,true),true);
}
const client=createClient({url:':memory:'}),db=createTursoDatabase(client);
try{
 const migration=await readFile(new URL('../drizzle/0000_special_frog_thor.sql',import.meta.url),'utf8');
 for(const sql of migration.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 await db.prepare('INSERT INTO cities VALUES(?,?,?,?)').bind(seedCity.id,seedCity.slug,JSON.stringify(seedCity),'before').run();
 for(const location of seedLocations)await db.prepare('INSERT INTO locations VALUES(?,?,?)').bind(location.id,location.cityId,JSON.stringify(location)).run();
 for(const story of seedStories){
  await db.prepare('INSERT INTO stories VALUES(?,?,?,?,?)').bind(story.id,story.cityId,story.locationId,JSON.stringify(story),'before').run();
  for(const locale of ['pt-br','en'])await db.prepare('INSERT INTO story_translations VALUES(?,?,?,?,?)').bind(story.id,story.cityId,locale,story.localeContent[locale].slug,'published').run();
 }
 const inputBefore=JSON.stringify(batch);
 assert.deepEqual(await importEditorialBatch(db,batch),{applied:true,count:6});
 assert.equal(JSON.stringify(batch),inputBefore,'import must not mutate input');
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM stories').first()).n,8);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM story_translations').first()).n,16);
 const updated=JSON.parse((await db.prepare("SELECT data FROM stories WHERE id='oratorio-vira-saia'").first()).data);
 assert.equal(updated.localeContent['pt-br'].slug,'oratorio-vira-saia');
 assert.equal(updated.image,seedStories[0].image);
 assert.equal(updated.editorialCode,'OP-001');
 const backup=JSON.parse((await db.prepare('SELECT data FROM editorial_import_backups').first()).data);
 assert.deepEqual(backup,seedStories[0]);
 updated.localeContent['pt-br'].title='CMS edit';
 await db.prepare('UPDATE stories SET data=? WHERE id=?').bind(JSON.stringify(updated),updated.id).run();
 assert.deepEqual(await importEditorialBatch(db,batch),{applied:false,count:0});
 assert.equal(JSON.parse((await db.prepare('SELECT data FROM stories WHERE id=?').bind(updated.id).first()).data).localeContent['pt-br'].title,'CMS edit');
 const backfill=structuredClone(batch);backfill.id='legacy-map-backfill';
 await db.prepare("DELETE FROM sources WHERE story_id='op-005'").run();
 await db.prepare("DELETE FROM story_translations WHERE story_id='op-005'").run();
 await db.prepare("DELETE FROM stories WHERE id='op-005'").run();
 assert.deepEqual(await importEditorialBatch(db,backfill,{preserveExisting:true}),{applied:true,count:1});
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM stories').first()).n,8);
 assert.equal(JSON.parse((await db.prepare('SELECT data FROM stories WHERE id=?').bind(updated.id).first()).data).localeContent['pt-br'].title,'CMS edit');
 const collision=structuredClone(batch);collision.id='collision';collision.stories[0].id='other-story';
 await assert.rejects(importEditorialBatch(db,collision),/slug conflict/);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM stories').first()).n,8);
 assert.equal(await db.prepare("SELECT id FROM editorial_imports WHERE id='collision'").first(),null);
 // A write failure rolls back earlier writes and leaves the batch eligible to retry.
 const invalid=structuredClone(batch);invalid.id='rollback';invalid.stories[5].locationId='missing-location';
 await assert.rejects(importEditorialBatch(db,invalid));
 assert.equal(await db.prepare("SELECT id FROM editorial_imports WHERE id='rollback'").first(),null);
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM editorial_import_backups WHERE batch_id='rollback'").first()).n,0);
 const locations=[...seedLocations,...batch.locations];
 const groups=groupMapStories(batch.stories.map(s=>publicStory(s,'pt-br',locations.find(l=>l.id===s.locationId))));
 assert.equal(groups.length,3,'the Oratory and the house are distinct places even with shared approximate coordinates');
 assert.deepEqual(groups.map(group=>group.length).sort((a,b)=>a-b),[1,2,3]);
 assert.equal(new Set(groups.flat().map(s=>s.id)).size,6);
 const next=JSON.parse(await readFile(new URL('../content/ouro-preto/batch-op008.json',import.meta.url),'utf8'));
 const op=storySchema.parse(next.stories[0]);
 assert.equal(op.accessLevel,'premium');assert.equal(op.truthStatus,'documented');
 for(const locale of ['pt-br','en']){
  const body=op.localeContent[locale].blocks.map(b=>b.text).join('\n');
  assert.ok(body.length>6500,'Complete long-form narrative, evidence and timeline');
  assert.ok(op.localeContent[locale].blocks.filter(b=>b.type==='heading').length>=12);
  assert.ok(!body.includes('OP-006'));assert.ok(!body.includes('produto pago'));
  assert.equal(publicStory(op,locale,next.locations[0]).copy.blocks,undefined);
 }
 assert.equal(canRead(op.accessLevel,true,false),false,'Free location capture does not unlock the premium story');
 assert.equal(next.locations[0].precision,'approximate');
 assert.deepEqual(await importEditorialBatch(db,next),{applied:true,count:1});
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM stories').first()).n,9);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM story_translations').first()).n,18);
 assert.deepEqual(await importEditorialBatch(db,next),{applied:false,count:0});
 assert.equal(JSON.parse((await db.prepare('SELECT data FROM stories WHERE id=?').bind(updated.id).first()).data).localeContent['pt-br'].title,'CMS edit');
 const recent=JSON.parse(await readFile(new URL('../content/ouro-preto/batch-op061.json',import.meta.url),'utf8'));
 const floor=storySchema.parse(recent.stories[0]);
 assert.equal(floor.id,'op-061');assert.equal(floor.accessLevel,'premium');assert.equal(floor.truthStatus,'documented');
 assert.equal(recent.locations[0].precision,'verified');assert.equal(floor.sources[0].institution,'Prefeitura de Ouro Preto');
 for(const locale of ['pt-br','en']){
  const body=floor.localeContent[locale].blocks.map(b=>b.text).join('\n');
  assert.ok(body.length>5000,'OP-061 has the complete long-form narrative in both languages');
  assert.ok(floor.localeContent[locale].blocks.filter(b=>b.type==='heading').length>=8);
 }
 assert.equal(canRead(floor.accessLevel,true,false),false,'The free map location does not unlock the premium narrative');
 assert.deepEqual(await importEditorialBatch(db,recent),{applied:true,count:1});
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM stories').first()).n,10);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM story_translations').first()).n,20);
 const paintingsBatch=JSON.parse(await readFile(new URL('../content/ouro-preto/batch-op062.json',import.meta.url),'utf8'));
 const paintings=storySchema.parse(paintingsBatch.stories[0]);
 assert.equal(paintings.id,'op-062');assert.equal(paintings.editorialCode,'OP-062');
 assert.equal(paintings.accessLevel,'premium');assert.equal(paintings.truthStatus,'documented');
 assert.equal(paintings.locationId,'casa-contos');assert.equal(paintingsBatch.locations[0].precision,'verified');
 for(const locale of ['pt-br','en']){
  const body=paintings.localeContent[locale].blocks.map(b=>b.text).join('\n');
  assert.ok(body.length>7000,'OP-062 has the complete long-form narrative in both languages');
  assert.ok(paintings.localeContent[locale].blocks.filter(b=>b.type==='heading').length>=8);
  assert.equal(publicStory(paintings,locale,paintingsBatch.locations[0]).copy.blocks,undefined);
 }
 assert.equal(canRead(paintings.accessLevel,true,false),false,'The free map location does not unlock the premium narrative');
 assert.deepEqual(await importEditorialBatch(db,paintingsBatch),{applied:true,count:1});
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM stories').first()).n,11);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM story_translations').first()).n,22);
 const updatedCasa=JSON.parse((await db.prepare("SELECT data FROM locations WHERE id='casa-contos'").first()).data);
 assert.equal(updatedCasa.precision,'verified');assert.match(updatedCasa.address,/Rua São José, 12/);
 assert.deepEqual(await importEditorialBatch(db,paintingsBatch),{applied:false,count:0});
 console.log('PASS: complete PT narratives, bilingual validation, access gates, preservation, backups, atomic rollback, idempotence and grouped map locations.');
}finally{client.close();}
