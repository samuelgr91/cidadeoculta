import {readFile} from 'node:fs/promises';
import {createClient} from '@libsql/client/web';
import {createTursoDatabase} from '../lib/turso-db.ts';
import {storySchema,locationSchema} from '../lib/model.ts';
import {importEditorialBatch} from '../lib/story-import.ts';
const filename=process.argv.find(a=>a.startsWith('--batch='))?.slice(8)||'batch-op001-op006.json';
if(!/^batch-[a-z0-9-]+\.json$/.test(filename))throw new Error('Invalid batch filename');
const data=JSON.parse(await readFile(new URL('../content/ouro-preto/'+filename,import.meta.url),'utf8'));
const batch={id:data.id,stories:data.stories.map(s=>storySchema.parse(s)),locations:data.locations.map(l=>locationSchema.parse(l))};
if(!process.argv.includes('--apply')){console.log('Validated:',batch.stories.length,'stories. Pass --apply to import.');process.exit(0);}
const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
if(!url||!authToken||!/^libsql:\/\/|^https:\/\//.test(url))throw new Error('Configure private Turso credentials.');
const client=createClient({url,authToken});
try{const result=await importEditorialBatch(createTursoDatabase(client),batch);console.log(result.applied?'Editorial import applied: '+result.count+' stories, previous content backed up.':'Editorial import already applied; CMS edits preserved.');}finally{client.close();}
