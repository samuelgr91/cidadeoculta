import {readFile,writeFile} from 'node:fs/promises';

const root=new URL('../content/ouro-preto/',import.meta.url);
const clean=value=>value.trim();

function blocks(markdown){
 const result=[];let paragraphs=[];
 const flush=()=>{if(paragraphs.length)result.push({type:'text',text:clean(paragraphs.join('\n\n'))});paragraphs=[];};
 const body=markdown.replace(/^# [^\n]+\n/,'').replace(/^(## [^\n]+)\n/gm,'$1\n\n').trim();
 for(const paragraph of body.split(/\n\s*\n/)){
  if(paragraph.startsWith('## ')){flush();result.push({type:'heading',text:clean(paragraph.slice(3))});}
  else paragraphs.push(paragraph);
 }
 flush();return result;
}

const pt=await readFile(new URL('OP062.pt-br.md',root),'utf8');
const en=await readFile(new URL('OP062.en.md',root),'utf8');
const imageCredit='Halley Pacheco de Oliveira · CC BY-SA 4.0 · Wikimedia Commons. Fotografia atual; recorte editorial.';

const localeContent={
 'pt-br':{
  slug:'pinturas-escondidas-casa-dos-contos',
  title:'As pinturas escondidas da Casa dos Contos',
  hook:'Durante uma restauração completa, pinturas reapareceram debaixo de forros e em paredes de um dos casarões mais famosos de Ouro Preto.',
  summary:'A restauração da Casa dos Contos revelou pinturas sob forros e paredes, além de estruturas e detalhes arquitetônicos antes perdidos. O próprio edifício preservava, em suas camadas, vestígios invisíveis de sua história.',
  editorialNote:'A descoberta de algumas pinturas sob forros e em paredes, assim como a recuperação de estruturas e detalhes arquitetônicos, é informada pela Secretaria Municipal de Cultura e Turismo de Ouro Preto. A fonte não identifica todos os cômodos, datas ou autores das pinturas; por isso, esses detalhes não são inferidos. A fotografia mostra a fachada atual da Casa dos Contos.',
  blocks:blocks(pt),status:'published',
  seoTitle:'Pinturas escondidas são reveladas na Casa dos Contos em Ouro Preto',
  seoDescription:'Durante a restauração da Casa dos Contos, pinturas foram encontradas sob forros e paredes, junto a detalhes arquitetônicos antes perdidos.',
  shortScript:''
 },
 en:{
  slug:'hidden-paintings-casa-dos-contos',
  title:'The hidden paintings of Casa dos Contos',
  hook:'During a complete restoration, paintings reappeared beneath ceilings and on walls inside one of Ouro Preto’s most famous mansions.',
  summary:'The restoration of Casa dos Contos revealed paintings beneath ceilings and on walls, together with structures and architectural details that had been lost. The building itself preserved invisible traces of its history within its layers.',
  editorialNote:'Ouro Preto’s Municipal Department of Culture and Tourism documents the discovery of paintings beneath ceilings and on walls, as well as the recovery of structures and architectural details. The source does not identify every room, date or artist, so those details are not inferred. The photograph shows the present-day façade of Casa dos Contos.',
  blocks:blocks(en),status:'published',
  seoTitle:'Hidden paintings revealed at Casa dos Contos in Ouro Preto',
  seoDescription:'Restoration at Casa dos Contos uncovered paintings beneath ceilings and on walls, along with architectural details that had been lost.',
  shortScript:''
 }
};

const story={
 editorialCode:'OP-062',id:'op-062',cityId:'ouro-preto',locationId:'casa-contos',
 truthStatus:'documented',accessLevel:'premium',depth:'deep_file',category:'Descoberta em restauração',estimatedSeconds:520,
 image:'/media/stories/op-062/casa-dos-contos.webp',imageCredit,
 mapImage:'/media/landing/casa-dos-contos-evening.webp',mapImageCredit:'Reconstrução visual por IA · Cidade Oculta',
 sources:[
  {title:'Museu Casa dos Contos',url:'https://www.ouropreto.mg.gov.br/turismo/atrativo-item/571',institution:'Secretaria Municipal de Cultura e Turismo de Ouro Preto',note:'Fonte principal da descoberta: construção, usos históricos, restauração, pinturas sob forros e paredes, detalhes arquitetônicos recuperados, tombamento, visitação e endereço. Consultada em 02/10/2026.'},
  {title:'Casa dos Contos',url:'https://bndigital.bn.gov.br/dossies/rede-da-memoria-virtual-brasileira/administracao/casa-dos-contos/',institution:'Fundação Biblioteca Nacional — BNDigital',note:'Contexto sobre João Rodrigues de Macedo, a administração fazendária, a Inconfidência e o acervo documental reunido no edifício. Consultada em 02/10/2026.'},
  {title:'Casa dos Contos.jpg',url:'https://commons.wikimedia.org/wiki/File:Casa_dos_Contos.jpg',institution:'Wikimedia Commons',note:'Fotografia atual da fachada por Halley Pacheco de Oliveira, licenciada sob CC BY-SA 4.0; coordenadas da câmera próximas ao edifício. Consultada em 02/10/2026.'}
 ],
 localeContent
};

const batch={
 id:'ouro-preto-op062-v1',
 locations:[{
  id:'casa-contos',cityId:'ouro-preto',name:'Museu Casa dos Contos',
  lat:-20.38432,lng:-43.50599,address:'Rua São José, 12 · Centro · Ouro Preto',precision:'verified'
 }],
 stories:[story]
};

await writeFile(new URL('batch-op062.json',root),JSON.stringify(batch,null,2)+'\n');
console.log('OP-062 prepared with complete bilingual text, verified location and documented sources.');
