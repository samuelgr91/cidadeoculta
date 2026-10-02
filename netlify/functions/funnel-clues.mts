import {tursoDatabase} from '../../lib/turso-db';
import {processClues} from '../../lib/funnel-sequence';
import {sequenceSender} from '../../lib/funnel-sequence-email';
export default async()=>{
 const origin=process.env.APP_ORIGIN||'',secret=process.env.AUTH_HASH_SECRET||'',key=process.env.RESEND_API_KEY||'',from=process.env.AUTH_FROM_EMAIL||'';
 if(!origin.startsWith('https://')||secret.length<32||!key||!from)throw new Error('Clue delivery configuration unavailable');
 const database=tursoDatabase();
 const result=await processClues(database,sequenceSender(database,{origin,secret,key,from}),{adminEmails:(process.env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase())});
 console.log('Clue schedule:',JSON.stringify(result));
};
export const config={schedule:'0 * * * *'};
