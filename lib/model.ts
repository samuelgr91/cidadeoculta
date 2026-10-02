import { z } from 'zod';
export type Locale='pt-br'|'en';
export const locales=['pt-br','en'] as const;
export const truthLabels={documented:{'pt-br':'Documentado',en:'Documented'},oral_tradition:{'pt-br':'Tradição oral',en:'Oral tradition'},disputed:{'pt-br':'Disputado',en:'Disputed'},original_fiction:{'pt-br':'Ficção original',en:'Original fiction'}};
const https=z.string().url().refine(s=>s.startsWith('https://'),'Use HTTPS');
export const blockSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('text'),text:z.string().max(20000)}),
 z.object({type:z.literal('heading'),text:z.string().max(180)}),
 z.object({type:z.literal('callout'),text:z.string().max(3000)}),
 z.object({type:z.literal('quote'),text:z.string().max(3000),attribution:z.string().max(300)}),
 z.object({type:z.literal('image'),url:https,alt:z.string().min(3),credit:z.string().min(3),license:z.string().min(3),sourceUrl:https,isAiGenerated:z.boolean().default(false)}),
 z.object({type:z.literal('audio'),url:https,transcript:z.string().min(3),credit:z.string().min(3)})
]);
const copySchema=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().min(3).max(180),hook:z.string().min(3).max(500),summary:z.string().min(3).max(4000),editorialNote:z.string().max(4000),blocks:z.array(blockSchema).max(60),status:z.enum(['draft','review','approved','published','archived']),seoTitle:z.string().max(180),seoDescription:z.string().max(400),shortScript:z.string().max(5000).default('')});
export const sourceSchema=z.object({title:z.string().min(3),url:https,institution:z.string().min(2),note:z.string().max(3000)});
export const storySchema=z.object({editorialCode:z.string().regex(/^OP-\d{3}$/).optional(),id:z.string().min(1).max(100),cityId:z.string().min(1),locationId:z.string().min(1),truthStatus:z.enum(['documented','oral_tradition','disputed','original_fiction']),accessLevel:z.enum(['open','lead','premium']),depth:z.enum(['quick_discovery','story','deep_file']),category:z.string().min(2).max(80),estimatedSeconds:z.number().int().min(20).max(3600),image:z.string().max(2000),imageCredit:z.string().max(600),mapImage:z.string().max(2000).optional(),mapImageCredit:z.string().max(600).optional(),sources:z.array(sourceSchema).max(30),localeContent:z.object({'pt-br':copySchema,en:copySchema})}).superRefine((s,ctx)=>{for(const l of locales){const c=s.localeContent[l];if(c.status==='published'){if(c.blocks.length===0)ctx.addIssue({code:'custom',message:'Adicione conteúdo antes de publicar.'});if(s.truthStatus==='documented'&&!s.sources.length)ctx.addIssue({code:'custom',message:'Documentado exige fonte.'});if(s.truthStatus!=='documented'&&c.editorialNote.length<15)ctx.addIssue({code:'custom',message:'Explique a origem e a classificação editorial.'});}}if(s.image&&!s.image.startsWith('/media/')&&!s.image.startsWith('https://'))ctx.addIssue({code:'custom',message:'Imagem deve usar HTTPS ou /media/.'});if(s.image&&!s.imageCredit)ctx.addIssue({code:'custom',message:'Informe o crédito da imagem.'});if(s.mapImage&&!s.mapImage.startsWith('/media/')&&!s.mapImage.startsWith('https://'))ctx.addIssue({code:'custom',message:'Imagem do mapa deve usar HTTPS ou /media/.'});if(s.mapImage&&!s.mapImageCredit)ctx.addIssue({code:'custom',message:'Informe o crédito da imagem do mapa.'});});
export type Story=z.infer<typeof storySchema>;
export type StoryBlock=z.infer<typeof blockSchema>;
export const citySchema=z.object({id:z.string().min(1).max(100),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),name:z.string().min(2),region:z.string().min(2),lat:z.number().min(-85).max(85),lng:z.number().min(-180).max(180),zoom:z.number().min(1).max(18),priceCents:z.number().int().min(100).max(100000),status:z.enum(['draft','published','archived']),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),headlinePt:z.string().min(3),headlineEn:z.string().min(3)});
export type City=z.infer<typeof citySchema>;
export const locationSchema=z.object({id:z.string().min(1).max(100),cityId:z.string().min(1),name:z.string().min(2),lat:z.number().min(-85).max(85),lng:z.number().min(-180).max(180),address:z.string().min(2),precision:z.enum(['approximate','verified']).default('approximate')});
export type Location=z.infer<typeof locationSchema>;
export type PublicStory=Omit<Story,'localeContent'> & {copy:Omit<Story['localeContent']['pt-br'],'blocks'|'shortScript'>;alternateSlug:string|null;location:Location;completed?:boolean};
export const storyPath=(locale:Locale,city:string,slug:string)=>`/${locale}/${city}/${locale==='en'?'stories':'historias'}/${slug}`;
export function publicStory(s:Story,locale:Locale,location:Location):PublicStory{const {localeContent,...rest}=s;const {blocks,shortScript,...copy}=localeContent[locale];void blocks;void shortScript;const alt=localeContent[locale==='en'?'pt-br':'en'];return {...rest,copy,location,alternateSlug:alt.status==='published'?alt.slug:null};}
export function canRead(level:string,lead:boolean,entitled:boolean){return level==='open'||entitled||(level==='lead'&&lead);}
export const price=(cents:number,locale:Locale)=>new Intl.NumberFormat(locale==='en'?'en-US':'pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
