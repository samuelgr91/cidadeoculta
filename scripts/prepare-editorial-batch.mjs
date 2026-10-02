import {readFile,writeFile} from 'node:fs/promises';
import {storySchema,locationSchema} from '../lib/model.ts';
const root=new URL('../content/ouro-preto/',import.meta.url);
const input=await readFile(new URL('OP001-OP006.pt-br.md',root),'utf8');
const english=JSON.parse(await readFile(new URL('OP001-OP006.en.json',root),'utf8'));
const sections=input.split(/^# (OP-\d{3}) — (.+)$/m);
const locations=[
 {id:'sobrado-vira-saia',cityId:'ouro-preto',name:'Sobrado do Vira-Saia',lat:-20.3875,lng:-43.49806,address:'Ladeira de Santa Efigênia, em frente ao oratório · referência aproximada do entorno',precision:'approximate'},
 {id:'praca-tiradentes',cityId:'ouro-preto',name:'Praça Tiradentes',lat:-20.3854,lng:-43.5035,address:'Praça Tiradentes, Centro · referência aproximada; não indica o destino da cabeça',precision:'approximate'}
].map(l=>locationSchema.parse(l));
const notes={
 'OP-001':'O oratório é um patrimônio documentado. O uso da imagem como código pertence à tradição oral, sem comprovação documental do mecanismo. As fotografias contextualizam Ouro Preto; cenas por IA são ilustrações editoriais.',
 'OP-002':'O sobrado e a placa de 1741 são documentados; a biografia de bandoleiro, a comparação com Robin Hood e o bando pertencem à tradição local. O ponto no mapa é uma referência patrimonial aproximada, não um local de crime comprovado.',
 'OP-003':'A execução e a exposição pública formam o núcleo histórico. As versões sobre a retirada e o destino da cabeça permanecem disputadas. O mapa usa a Praça Tiradentes como referência; não situa um esconderijo no bairro Cabeças.',
 'OP-004':'Os dossiês registram tradições, não comprovam aparições sobrenaturais nem que os vultos fossem salteadores disfarçados. O oratório é a referência geográfica desta narrativa, sem indicar um ponto comprovado de aparição.',
 'OP-005':'As fontes registram a tradição de um tesouro, não uma fortuna comprovada. Não há localização conhecida de esconderijo. O sobrado é a referência patrimonial da narrativa, não um ponto de busca ou escavação.',
 'OP-006':'Documentado com contexto tradicional: a placa e sua transcrição não comprovam os relatos de roubos, códigos ou tesouros. Não atribuímos significado às abreviações sem fonte específica. A página municipal informa que o sobrado está fechado aguardando reformas estruturais; este conteúdo não pressupõe visitação ao interior.'
};
const hooks={
 'OP-001':'Um santo teria servido de código para ladrões de ouro.',
 'OP-002':'Um morador do século XVIII virou um dos fora-da-lei mais lendários da cidade.',
 'OP-003':'A cabeça de Tiradentes foi exposta em Vila Rica. Para onde ela foi depois?',
 'OP-004':'Vultos noturnos e um bando lendário dividem a mesma paisagem de medo.',
 'OP-005':'Uma traição. Uma casa saqueada. E a lenda de uma fortuna que ninguém encontrou.',
 'OP-006':'Um nome e uma data gravados na pedra atravessam o universo das lendas.'
};
function section(body,name){return body.split('## '+name+'\n')[1]?.split('\n## ')[0].replace(/\n---\s*$/,'').trim()||'';}
const bullets=text=>text.split('\n').filter(line=>line.startsWith('- ')).map(line=>line.slice(2));
function blocks(paragraphs,documented,uncertain,en=false){return [
 ...paragraphs.map(text=>({type:'text',text})),
 {type:'heading',text:en?'Documented core':'Núcleo documentado'},...documented.map(text=>({type:'text',text})),
 {type:'heading',text:en?'Tradition and unresolved questions':'Tradição e pontos não estabelecidos'},...uncertain.map(text=>({type:'text',text}))
];}
const stories=[];
for(let i=1;i<sections.length;i+=3){
 const [code,title,body]=sections.slice(i,i+3),en=english.find(item=>item.code===code);
 if(!en)throw new Error('Missing English content for '+code);
 const slug=body.match(/\*\*Slug sugerido:\*\* `([^`]+)`/)[1];
 const summary=body.match(/\*\*Resumo curto:\*\* ([^\n]+)/)[1].trim();
 const paragraphs=section(body,'História completa').split(/\n\s*\n/);
 if(paragraphs.length<5)throw new Error('Incomplete narrative '+code);
 const ptBlocks=blocks(paragraphs,bullets(section(body,'Núcleo documentado')),bullets(section(body,'Tradição, lenda ou ponto não estabelecido')));
 const sources=[...section(body,'Fontes-base').matchAll(/^- \[([^\]]+)\]\((https:[^)]+)\)/gm)].map(([,title,url])=>({title,url,institution:title.includes('Bernardo')?'Bernardo Guimarães · Wikisource':'Prefeitura de Ouro Preto',note:title.includes('Bernardo')?'Registro literário da tradição, escrito décadas depois dos fatos. Não constitui prova do destino do crânio.':'Fonte-base indicada no documento editorial OP-001 a OP-006. Distingue o registro do patrimônio ou da tradição da comprovação dos episódios narrados.'}));
 const truthStatus=code==='OP-003'?'disputed':code==='OP-006'?'documented':'oral_tradition';
 const copy={slug:code==='OP-001'?'oratorio-vira-saia':slug,title,hook:hooks[code],summary,editorialNote:notes[code],blocks:ptBlocks,status:'published',seoTitle:title,seoDescription:summary,shortScript:''};
 const story={id:code==='OP-001'?'oratorio-vira-saia':code.toLowerCase(),editorialCode:code,cityId:'ouro-preto',locationId:['OP-001','OP-004'].includes(code)?'vira-saia':code==='OP-003'?'praca-tiradentes':'sobrado-vira-saia',truthStatus,accessLevel:code==='OP-001'?'open':code==='OP-006'?'lead':'premium',depth:'story',category:code==='OP-003'?'Poder e memória':code==='OP-006'?'Arte e arquitetura':'Segredos e símbolos',estimatedSeconds:Math.ceil(ptBlocks.map(b=>b.text).join(' ').split(/\s+/).length/170*60),image:'/media/ouro-preto.jpg',imageCredit:'Alisson Jonas Cardoso Gontijo · CC BY-SA 4.0 · Wikimedia Commons. Fotografia panorâmica de Ouro Preto, não do local específico.',mapImage:code==='OP-001'?'/media/landing/oratorio-evening.webp':'/media/landing/ouro-preto-night.webp',mapImageCredit:'Ilustração contextual de Ouro Preto por IA · Cidade Oculta · não retrata o local exato',sources,localeContent:{'pt-br':copy,en:{slug:en.slug,title:en.title,hook:en.hook,summary:en.summary,editorialNote:en.editorialNote,blocks:blocks(en.paragraphs,en.documented,en.uncertain,true),status:'published',seoTitle:en.title,seoDescription:en.summary,shortScript:''}}};
 stories.push(storySchema.parse(story));
}
if(stories.length!==6)throw new Error('Expected six complete stories');
const queueInput=await readFile(new URL('editorial-queue.md',root),'utf8');
const queue=[...queueInput.matchAll(/^\d+\. (OP-\d{3}) — (.+)$/gm)].filter(([,code])=>code!=='OP-008').map(([,code,title])=>({code,title,status:'planned'}));
await writeFile(new URL('batch-op001-op006.json',root),JSON.stringify({id:'ouro-preto-op001-op006-v1',locations,stories},null,2)+'\n');
await writeFile(new URL('editorial-queue.json',root),JSON.stringify({items:queue,note:'Sequência editorial recebida no documento do usuário. São pautas, sem narrativa completa ou classificação aprovada. OP-007 não foi fornecida.'},null,2)+'\n');
console.log('Prepared',stories.length,'complete bilingual stories and',queue.length,'unpublished editorial topics.');
