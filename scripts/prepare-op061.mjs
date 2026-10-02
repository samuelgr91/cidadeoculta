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

const pt=await readFile(new URL('OP061.pt-br.md',root),'utf8');
const en=await readFile(new URL('OP061.en.md',root),'utf8');
const imageCredit='Marília Mesquita / Prefeitura de Ouro Preto · registro oficial da descoberta em 18/06/2025.';

const localeContent={
 'pt-br':{
  slug:'piso-original-escondido-igreja-matozinhos',
  title:'O piso de quase 250 anos escondido sob concreto',
  hook:'Durante uma restauração, retiraram o concreto ao lado desta igreja. Embaixo dele reapareceu o piso do século XVIII.',
  summary:'Em junho de 2025, a retirada de uma camada de concreto na lateral direita da Igreja Bom Jesus de Matozinhos revelou antigas lajes identificadas como o piso original do período de fundação do templo. A descoberta será preservada e mantida aparente.',
  editorialNote:'A descoberta, a posição externa do piso, a cobertura por concreto e a identificação das lajes foram divulgadas oficialmente pela Prefeitura de Ouro Preto. O mapa marca o edifício, não cada laje. As fontes não sustentam túmulos, tesouros, passagens ou a afirmação de que cada pedra permanece exatamente na mesma posição desde o século XVIII. Fotografias oficiais de Marília Mesquita/PMOP.',
  blocks:blocks(pt),status:'published',
  seoTitle:'Piso original é descoberto durante restauração de igreja em Ouro Preto',
  seoDescription:'Em 2025, restauradores removeram concreto ao lado da Igreja Bom Jesus de Matozinhos e encontraram antigas lajes do período de fundação do templo.',
  shortScript:''
 },
 en:{
  slug:'original-floor-hidden-beneath-concrete-matozinhos-church',
  title:'The nearly 250-year-old floor hidden beneath concrete',
  hook:'During restoration, concrete beside this church was removed. Beneath it, an eighteenth-century floor reappeared.',
  summary:'In June 2025, workers removing concrete along the right side of the Church of Bom Jesus de Matozinhos uncovered old stone slabs identified as the original floor from the church’s founding period. The find is to be preserved and left visible.',
  editorialNote:'The discovery, its exterior position, the concrete covering and the identification of the slabs were officially reported by the Ouro Preto municipal government. The map marks the church building, not each slab. The sources do not support claims about graves, treasure, passages or every stone remaining in exactly the same position since the eighteenth century. Official photographs by Marília Mesquita/PMOP.',
  blocks:blocks(en),status:'published',
  seoTitle:'Original floor discovered during restoration of an Ouro Preto church',
  seoDescription:'In 2025, workers removed concrete beside the Church of Bom Jesus de Matozinhos and uncovered stone slabs from the building’s founding period.',
  shortScript:''
 }
};

const story={
 editorialCode:'OP-061',id:'op-061',cityId:'ouro-preto',locationId:'igreja-bom-jesus-matozinhos',
 truthStatus:'documented',accessLevel:'premium',depth:'deep_file',category:'Descoberta recente e patrimônio',estimatedSeconds:560,
 image:'/media/stories/op-061/source-4.jpg',imageCredit,
 mapImage:'/media/stories/op-061/source-1.jpg',mapImageCredit:imageCredit,
 sources:[
  {title:'Arqueólogos descobrem piso original da parte externa da Igreja Bom Jesus de Matozinhos',url:'https://www.ouropreto.mg.gov.br/noticia/4897',institution:'Prefeitura de Ouro Preto',note:'Fonte principal da descoberta: posição externa na lateral direita, lajes cobertas por concreto, visita de 18/06/2025, identificação arqueológica, preservação e andamento da restauração. Consultada em 30/09/2026.'},
  {title:'Igreja Bom Jesus de Matosinhos e São Miguel e Almas',url:'https://www.ouropreto.mg.gov.br/turismo/atrativo-item/594',institution:'Secretaria Municipal de Cultura e Turismo de Ouro Preto',note:'Construção entre 1771 e 1793, devoções, atribuições artísticas e situação de fechamento para restauração. Consultada em 30/09/2026.'},
  {title:'Patrimônio Cultural: andamento das obras e restaurações históricas',url:'https://www.ouropreto.mg.gov.br/noticia/5756',institution:'Prefeitura de Ouro Preto',note:'Atualização de 02/09/2026: primeira etapa civil em fase final, previsão de novembro de 2026 e continuidade da restauração dos elementos artísticos. Consultada em 30/09/2026.'}
 ],
 localeContent
};

const batch={
 id:'ouro-preto-op061-v1',
 locations:[{
  id:'igreja-bom-jesus-matozinhos',cityId:'ouro-preto',name:'Igreja Bom Jesus de Matozinhos, São Miguel e Almas',
  lat:-20.38219775,lng:-43.51618978,address:'Rua Alvarenga, s/n · Cabeças · Ouro Preto',precision:'verified'
 }],
 stories:[story]
};

await writeFile(new URL('batch-op061.json',root),JSON.stringify(batch,null,2)+'\n');
console.log('OP-061 prepared with complete bilingual text, official photographs, primary sources and verified church coordinates.');
