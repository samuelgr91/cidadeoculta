import type {City,Location,Story} from './model';
export const seedCity:City={id:'ouro-preto',slug:'ouro-preto',name:'Ouro Preto',region:'Minas Gerais, Brasil',lat:-20.3854,lng:-43.5026,zoom:14.9,priceCents:2990,status:'published',accent:'#ec9b46',headlinePt:'Descubra o que Ouro Preto esconde.',headlineEn:'Discover what Ouro Preto hides.'};
export const seedLocations:Location[]=[
{id:'vira-saia',cityId:'ouro-preto',name:'Oratório do Vira-Saia',lat:-20.3875,lng:-43.49806,address:'Rua Santa Efigênia, Antônio Dias',precision:'approximate'},
{id:'sao-francisco',cityId:'ouro-preto',name:'Igreja de São Francisco de Assis',lat:-20.38673,lng:-43.50276,address:'Largo de Coimbra, Centro',precision:'approximate'},
{id:'casa-contos',cityId:'ouro-preto',name:'Museu Casa dos Contos',lat:-20.38432,lng:-43.50599,address:'Rua São José, 12 · Centro · Ouro Preto',precision:'verified'}];
const panorama='/media/ouro-preto.jpg',church='/media/sao-francisco.jpg';
const pc='Alisson Jonas Cardoso Gontijo · CC BY-SA 4.0 · Wikimedia Commons. Fotografia atual de Ouro Preto; recorte editorial.';
const cc='Leandro Neumann Ciuffo · CC BY 2.0 · Wikimedia Commons. Fotografia atual; recorte editorial.';
function copy(slug:string,title:string,hook:string,summary:string,editorialNote:string,texts:string[]){return {slug,title,hook,summary,editorialNote,blocks:texts.map(text=>({type:'text' as const,text})),status:'published' as const,seoTitle:title,seoDescription:hook,shortScript:''};}
export const seedStories:Story[]=[
{id:'oratorio-vira-saia',cityId:'ouro-preto',locationId:'vira-saia',truthStatus:'oral_tradition',accessLevel:'open',depth:'story',category:'Segredos e símbolos',estimatedSeconds:100,image:panorama,imageCredit:pc,mapImage:'/media/landing/oratorio-evening.webp',mapImageCredit:'Reconstrução visual por IA · Cidade Oculta',sources:[{title:'O Vira-Saia na memória de Ouro Preto',institution:'Prefeitura de Ouro Preto',url:'https://www.ouropreto.mg.gov.br/noticia/4476',note:'Registra a narrativa sobre Antônio Francisco Alves, carregamentos de ouro e o sinal religioso.'},{title:'Relação de bens inventariados',institution:'Prefeitura de Ouro Preto',url:'https://ouropreto.mg.gov.br/static/arquivos/menus_areas/rela-o-de-bens-inventariados.pdf',note:'Identifica o oratório na Rua Santa Efigênia e a Casa do Vira-Saia.'}],localeContent:{
'pt-br':copy('oratorio-vira-saia','Um santo. Um sinal. O caminho do ouro.','Um santo teria servido de código para ladrões de ouro.','Na Rua Santa Efigênia, um pequeno oratório guarda uma grande história. Segundo a tradição local, a posição da imagem indicava o caminho de carregamentos de ouro.','A existência do oratório é registrada no inventário municipal. O uso como código pertence à tradição oral; não apresentamos o roubo ou o mecanismo como fatos comprovados.',[
'A história associa Antônio Francisco Alves, o Vira-Saia, a um grupo que interceptaria carregamentos. A informação decisiva não viria em uma carta: estaria na direção para a qual a imagem religiosa era virada.',
'Olhar para o santo seria suficiente para reconhecer o sinal. O detalhe transforma uma peça discreta da rua em parte de uma narrativa sobre circulação de ouro, observação e segredo.',
'O inventário municipal identifica o Oratório do Vira-Saia e a casa associada ao personagem. Esse registro confirma o patrimônio; não confirma cada episódio contado sobre ele.',
'Ao explorar o lugar, separe duas perguntas: o que ainda existe e o que a memória local conta. Essa diferença faz parte da descoberta. A fotografia desta página mostra a cidade, não o oratório.'
]),
en:copy('vira-saia-oratory','A saint. A signal. A trail of gold.','A saint’s image was supposedly a code for gold thieves.','On Santa Efigênia Street, a small roadside shrine holds a striking local tale. Tradition says the direction of its religious image signaled the route of gold shipments.','The municipal inventory records the shrine. Its use as a code is oral tradition, not a proven account of robbery.',[
'The tale connects Antônio Francisco Alves, known as Vira-Saia, with a group said to intercept gold shipments. The crucial message supposedly came through the direction of a religious image.',
'A glance at the saint would reveal the signal. This small street feature becomes part of a story about gold, observation and secrecy.',
'The municipal inventory identifies the shrine and a house associated with Vira-Saia. That documents the heritage sites, not every episode told about them.',
'Keep two questions separate: what still exists, and what local memory says. That distinction is part of the discovery. The photograph shows Ouro Preto, not the shrine.'
])}},
{id:'teto-sao-francisco',cityId:'ouro-preto',locationId:'sao-francisco',truthStatus:'documented',accessLevel:'lead',depth:'quick_discovery',category:'Arte e arquitetura',estimatedSeconds:60,image:church,imageCredit:cc,mapImage:'/media/landing/sao-francisco-dusk.webp',mapImageCredit:'Reconstrução visual por IA · Cidade Oculta',sources:[{title:'São Francisco de Assis',institution:'Paróquia de Nossa Senhora da Conceição / Museu Aleijadinho',url:'https://paroquiaconceicaoop.com.br/sao-francisco/',note:'História da construção e autoria da arquitetura, escultura e pintura do teto.'}],localeContent:{
'pt-br':copy('um-ceu-pintado','O céu que começa no teto.','A fachada chama a atenção. A descoberta continua quando você olha para cima.','Na Igreja de São Francisco de Assis, arquitetura, escultura e pintura se encontram. A construção começou em 1766.','A autoria e o tema são registrados pela paróquia responsável pelo monumento.',[
'Aleijadinho está ligado ao projeto arquitetônico e à escultura. No teto, Manoel da Costa Athaíde representa a Assunção de Nossa Senhora.',
'A visita pode começar pela fachada, mas a pintura amplia a experiência do interior. Observe como a composição conduz o olhar para o alto.',
'A foto mostra a fachada atual. Ela não é uma reprodução do teto. Consulte a fonte para aprofundar a história da obra.'
]),
en:copy('a-painted-sky','A sky that begins on the ceiling.','The facade catches your eye. The discovery continues when you look up.','At Saint Francis of Assisi Church, architecture, sculpture and painting meet. Construction began in 1766.','The responsible parish records the artists and the subject of the ceiling.',[
'Aleijadinho is associated with the architectural design and sculpture. On the ceiling, Manoel da Costa Athaíde depicts the Assumption of Our Lady.',
'The facade is only the beginning. Inside, the painted composition draws the eye upward.',
'The photograph shows the present-day facade, not the ceiling. Follow the source to explore the work further.'
])}},
{id:'casa-dos-contos',cityId:'ouro-preto',locationId:'casa-contos',truthStatus:'documented',accessLevel:'premium',depth:'story',category:'Poder e memória',estimatedSeconds:70,image:panorama,imageCredit:pc,mapImage:'/media/landing/casa-dos-contos-evening.webp',mapImageCredit:'Reconstrução visual por IA · Cidade Oculta',sources:[{title:'Casa dos Contos',institution:'Biblioteca Nacional — BNDigital',url:'https://bndigital.bn.gov.br/dossies/rede-da-memoria-virtual-brasileira/administracao/casa-dos-contos/',note:'Residência de João Rodrigues de Macedo, prisão e administração fazendária.'}],localeContent:{
'pt-br':copy('casa-dos-contos','Uma casa. Várias faces do poder.','Por trás da fachada, moradia, prisão e controle fiscal.','A Casa dos Contos foi residência do contratador João Rodrigues de Macedo. Sua história se cruza com a administração fiscal e a Inconfidência Mineira.','Síntese do registro da Biblioteca Nacional. Não atribuímos uma causa à morte de Cláudio Manoel da Costa.',[
'A Real Fazenda tomou posse da casa. O edifício, antes privado, passou a integrar a estrutura de poder da cidade.',
'O lugar também abrigou presos ligados à Inconfidência. Cláudio Manoel da Costa morreu ali; esta síntese não resolve as discussões sobre as circunstâncias.',
'A história posterior inclui funções de administração fiscal. Observar a fachada é também pensar nas diferentes instituições que ocuparam o mesmo espaço.'
]),
en:copy('house-of-accounts','One house. Many faces of power.','Behind the facade: a home, a prison and a fiscal institution.','Casa dos Contos was the home of tax contractor João Rodrigues de Macedo. Its history intersects with fiscal administration and the Inconfidência movement.','Based on the National Library’s account. This summary does not assign a cause to Cláudio Manoel da Costa’s death.',[
'The royal treasury took possession of the house. A private residence became part of the city’s machinery of power.',
'Prisoners linked to the Inconfidência were held here. Cláudio Manoel da Costa died in the building; this summary does not settle debates about the circumstances.',
'Later uses included fiscal administration. Looking at the facade is also a way to consider how different institutions can occupy the same space.'
])}}
];
