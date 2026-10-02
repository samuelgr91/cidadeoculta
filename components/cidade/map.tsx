'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useRouter} from 'next/navigation';
import type {Map as LibreMap,Marker} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {ArrowUpRight,Check,Compass,LockKeyhole,MapPin,Search} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {storyPath,truthLabels,type City,type Locale,type PublicStory} from '@/lib/model';
import {Badge} from './shared';
import {groupMapStories,mapPinOffset} from '@/lib/map-groups';
import {track,Track} from './tracking';
import {mapsUrl,locationGuidance} from '@/lib/location-links';
const MapAccess=dynamic(()=>import('./map-access'),{ssr:false});

const illustrationSize={width:1672,height:941};
const illustrationPins:Record<string,[number,number]>={
  'oratorio-vira-saia':[.51,.55],
  'vira-saia':[.51,.55],
  'sobrado-vira-saia':[.535,.565],
  'praca-tiradentes':[.36,.30],
  'teto-sao-francisco':[.43,.27],
  'casa-dos-contos':[.31,.50],
};

// Both presentations use the same geographic tiles and story coordinates.
// These paint changes only affect the appearance of known OpenFreeMap layers.
function setMapPalette(instance:LibreMap,mode:'editorial'|'simple'){
  const colors:[string,'background-color'|'fill-color'|'fill-outline-color'|'line-color'|'text-color',string,string][]=[
    ['background','background-color','#171512','#172027'],
    ['water','fill-color','#141d22','#22313a'],
    ['landuse_residential','fill-color','#2a241d','#253039'],
    ['landcover_wood','fill-color','#262b22','#24342f'],
    ['landuse_park','fill-color','#252c23','#26372f'],
    ['building','fill-color','#33291f','#2d3941'],
    ['building','fill-outline-color','#6f5439','#61727c'],
    ['highway_path','line-color','#a17d55','#78909e'],
    ['highway_minor','line-color','#65513d','#637782'],
    ['highway_major_casing','line-color','#b88752','#8ca3ae'],
    ['highway_major_inner','line-color','#6b4d33','#556c79'],
    ['highway_major_subtle','line-color','#6b5037','#5f7682'],
    ['highway_motorway_casing','line-color','#ac7c4c','#8da1aa'],
    ['highway_motorway_inner','line-color','#60452f','#5c7480'],
    ['highway_name_other','text-color','#c3a480','#c3d0d4'],
    ['highway_name_motorway','text-color','#d8b58c','#d3dfe2'],
    ['place_suburb','text-color','#b7a68f','#bdccd1'],
    ['place_village','text-color','#d4b991','#d4dfe1'],
    ['place_town','text-color','#e1c8a5','#dce7e9'],
    ['place_city','text-color','#e1c8a5','#dce7e9'],
  ];
  for(const [layer,property,editorial,simple] of colors){
    if(instance.getLayer(layer))instance.setPaintProperty(layer,property,mode==='editorial'?editorial:simple);
  }
}

function illustratedPoint(story:PublicStory,size:{width:number;height:number}){
  const point=illustrationPins[story.id]||illustrationPins[story.locationId];
  if(!point||!size.width||!size.height)return null;
  const scale=Math.max(size.width/illustrationSize.width,size.height/illustrationSize.height);
  const width=illustrationSize.width*scale;
  const height=illustrationSize.height*scale;
  return {x:(size.width-width)/2+point[0]*width,y:(size.height-height)/2+point[1]*height};
}

function Filter({value,onChange,items,label}:{value:string;onChange:(value:string)=>void;items:[string,string][];label:string}) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className="filter-select"><SelectValue/></SelectTrigger>
    <SelectContent>{items.map(([itemValue,itemLabel])=><SelectItem key={itemValue} value={itemValue}>{itemLabel}</SelectItem>)}</SelectContent>
  </Select>;
}

export function CityMap({city,stories,locale,compact=false,styleUrl='https://tiles.openfreemap.org/styles/dark',entitled=false,initialLead=false,directEntry=false,initialMapView='editorial',initialStoryId}:{city:City;stories:PublicStory[];locale:Locale;compact?:boolean;styleUrl?:string;entitled?:boolean;initialLead?:boolean;directEntry?:boolean;initialMapView?:'editorial'|'simple';initialStoryId?:string}) {
  const en=locale==='en';
  const router=useRouter();
  const [hasLead,setHasLead]=useState(initialLead);
  const [accessAction,setAccessAction]=useState<'lead'|'pass'|null>(null);
  const freeCount=stories.filter(s=>s.accessLevel==='lead').length,premiumCount=stories.filter(s=>s.accessLevel==='premium').length;
  const hasIllustration=city.slug==='ouro-preto';
  const container=useRef<HTMLDivElement>(null);
  const surface=useRef<HTMLDivElement>(null);
  const preview=useRef<HTMLElement>(null);
  const map=useRef<LibreMap|null>(null);
  const markers=useRef<Marker[]>([]);
  const ambientMarkers=useRef<Marker[]>([]);
  const firstFilterPass=useRef(true);
  const presentationRef=useRef(initialMapView);
  const [ready,setReady]=useState(false);
  const [failure,setFailure]=useState(false);
  const [viewMode,setViewMode]=useState<'illustrated'|'map'>(compact&&hasIllustration?'illustrated':'map');
  const [mapPresentation,setMapPresentation]=useState<'editorial'|'simple'>(initialMapView);
  const [activated,setActivated]=useState(!compact);
  const [illustratedSize,setIllustratedSize]=useState({width:0,height:0});
  const [perspective,setPerspective]=useState(false);
  const [perspectiveAvailable,setPerspectiveAvailable]=useState(false);
  const [selected,setSelected]=useState<string|null>(initialStoryId||stories[0]?.id||null);
  const [connectorPath,setConnectorPath]=useState('');
  const [query,setQuery]=useState('');
  const [truth,setTruth]=useState('all');
  const [level,setLevel]=useState('all');
  const [category,setCategory]=useState('all');
  const [duration,setDuration]=useState('all');
  const [discovery,setDiscovery]=useState('all');

  const visible=useMemo(()=>stories.filter(story=>(truth==='all'||story.truthStatus===truth)
    &&(level==='all'||story.accessLevel===level)
    &&(category==='all'||story.category===category)
    &&(duration==='all'||(duration==='short'?story.estimatedSeconds<=90:story.estimatedSeconds>90))
    &&(discovery==='all'||(discovery==='seen'?story.completed:!story.completed))
    &&(story.copy.title+' '+story.copy.hook+' '+story.location.name).toLowerCase().includes(query.toLowerCase())),[stories,truth,level,category,duration,discovery,query]);
  const groups=useMemo(()=>groupMapStories(visible),[visible]);
  const selectedStory=visible.find(story=>story.id===selected)||visible[0];
  const missingIllustratedPlaces=groups.filter(group=>!illustrationPins[group[0].id]&&!illustrationPins[group[0].locationId]).length;
  const directLocked=!!selectedStory&&directEntry&&!entitled&&selectedStory.accessLevel==='premium';
  const selectedGroup=groups.find(group=>group.some(story=>story.id===selectedStory?.id))||[];
  const legacyMapImages:Record<string,string>={
    'oratorio-vira-saia':'/media/landing/oratorio-evening.webp',
    'teto-sao-francisco':'/media/landing/sao-francisco-dusk.webp',
    'casa-dos-contos':'/media/landing/casa-dos-contos-evening.webp',
  };
  const selectedMapImage=selectedStory?.mapImage||legacyMapImages[selectedStory?.id||'']||selectedStory?.image;
  const selectedImageIsEditorial=!!(selectedStory?.mapImage||legacyMapImages[selectedStory?.id||'']);
  const selectedImageCredit=selectedStory?.mapImageCredit||(selectedImageIsEditorial?'Reconstrução visual por IA · Cidade Oculta':selectedStory?.imageCredit);
  const filterKey=[query,truth,level,category,duration,discovery].join('|');

  function frameStories(items:PublicStory[],animate=true,presentation=mapPresentation){
    const instance=map.current;
    if(!instance||!items.length)return;
    // MapLibre keeps camera padding between moves; applying it again would
    // progressively zoom out and bunch nearby places into one small cluster.
    const currentPadding=instance.getPadding();
    if(currentPadding.top||currentPadding.right||currentPadding.bottom||currentPadding.left){
      instance.jumpTo({padding:{top:0,right:0,bottom:0,left:0}});
    }
    const west=Math.min(...items.map(story=>story.location.lng));
    const east=Math.max(...items.map(story=>story.location.lng));
    const south=Math.min(...items.map(story=>story.location.lat));
    const north=Math.max(...items.map(story=>story.location.lat));
    const duration=animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?650:0;
    const mobile=window.matchMedia('(max-width: 650px)').matches;
    const cardHeight=preview.current?.getBoundingClientRect().height||290;
    const cardWidth=preview.current?.getBoundingClientRect().width||330;
    const mapHeight=surface.current?.clientHeight||740;
    const mapWidth=surface.current?.clientWidth||1000;
    const padding=mobile
      ?{top:90,right:25,bottom:Math.min(cardHeight+30,mapHeight-210),left:25}
      :{top:90,right:Math.min(cardWidth+45,mapWidth-220),bottom:60,left:40};
    if(Math.abs(east-west)<.00005&&Math.abs(north-south)<.00005){
      instance.easeTo({center:[west,south],zoom:15.4,padding,duration,essential:false});
      return;
    }
    instance.fitBounds([[west,south],[east,north]],{
      padding:!compact?padding:mobile?{top:105,right:36,bottom:presentation==='editorial'?185:95,left:36}:{top:105,right:presentation==='editorial'?345:65,bottom:95,left:65},
      maxZoom:Math.min(city.zoom-0.9,14.5),duration,essential:false,
    });
  }

  function choose(id:string) {
    setSelected(id);
    const item=stories.find(story=>story.id===id);
    if(item) {
      if(viewMode==='illustrated'&&!illustrationPins[id]&&!illustrationPins[item.locationId])setViewMode('map');
      else if(viewMode==='map')requestAnimationFrame(()=>frameStories([item]));
      track('map_pin_open',city.id,locale,id);
      if(!compact){const url=new URL(window.location.href);url.searchParams.set('story',id);window.history.replaceState(null,'',url.pathname+url.search+url.hash);}
    }
  }

  useEffect(()=>{
    if(!hasIllustration||!surface.current)return;
    const update=()=>setIllustratedSize({width:surface.current?.clientWidth||0,height:surface.current?.clientHeight||0});
    update();
    const observer=new ResizeObserver(update);
    observer.observe(surface.current);
    return()=>observer.disconnect();
  },[hasIllustration]);

  useEffect(()=>{
    if(viewMode!=='map'||activated||!surface.current)return;
    if(!compact){setActivated(true);return;}
    if(!('IntersectionObserver' in window)){setActivated(true);return;}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setActivated(true);observer.disconnect();}
    },{rootMargin:'180px'});
    observer.observe(surface.current);
    return()=>observer.disconnect();
  },[compact,activated,viewMode]);

  useEffect(()=>{
    if(viewMode==='map'&&ready)map.current?.resize();
  },[viewMode,ready]);

  function changeView(next:'illustrated'|'map'){
    setViewMode(next);
    track('map_view_toggle',city.id,locale,next);
  }

  function changeMapPresentation(next:'editorial'|'simple'){
    if(next===mapPresentation)return;
    presentationRef.current=next;
    setMapPresentation(next);
    const url=new URL(window.location.href);
    url.searchParams.set('view',next);
    window.history.replaceState(null,'',url.pathname+url.search+url.hash);
    frameStories(visible,true,next);
    track('map_presentation_toggle',city.id,locale,next);
  }

  useEffect(()=>{
    if(!ready||!map.current||compact)return;
    if(map.current.isStyleLoaded())setMapPalette(map.current,mapPresentation);
    if(mapPresentation==='simple'){
      map.current.easeTo({pitch:0,bearing:0,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:350,essential:false});
      if(map.current.getLayer('co-3d-buildings'))map.current.setLayoutProperty('co-3d-buildings','visibility','none');
      setPerspective(false);
    }
  },[mapPresentation,ready,compact]);

  function togglePerspective(){
    const instance=map.current;
    if(!instance)return;
    const next=!perspective;
    instance.easeTo({pitch:next?48:0,bearing:next?-18:0,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:450,essential:false});
    if(instance.getLayer('co-3d-buildings'))instance.setLayoutProperty('co-3d-buildings','visibility',next?'visible':'none');
    setPerspective(next);
    track('map_perspective_toggle',city.id,locale,next?'3d':'2d');
  }

  function showAllPlaces(){
    const instance=map.current;
    if(!instance)return;
    if(perspective){
      instance.jumpTo({pitch:0,bearing:0});
      if(instance.getLayer('co-3d-buildings'))instance.setLayoutProperty('co-3d-buildings','visibility','none');
      setPerspective(false);
    }
    frameStories(visible);
  }

  useEffect(()=>{
    if(!activated)return;
    let disposed=false;
    void import('maplibre-gl').then(lib=>{
      if(disposed||!container.current)return;
      try {
        lib.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
        const compactMobile=compact&&window.matchMedia('(max-width: 650px)').matches;
        const initialCenter:[number,number]=compact?(compactMobile?[city.lng,city.lat]:[city.lng+.0055,city.lat-.0015]):[city.lng,city.lat];
        const initialZoom=compact?city.zoom-(compactMobile?.6:.2):city.zoom;
        const instance=new lib.Map({container:container.current,style:styleUrl,center:initialCenter,zoom:initialZoom,attributionControl:{compact:true},cooperativeGestures:compact});
        instance.setMissingStyleImageResolver(id=>{
          if(!instance.hasImage(id))instance.addImage(id,{width:1,height:1,data:new Uint8Array([0,0,0,0])});
        });
        map.current=instance;
        setReady(true);
        if(!compact)instance.once('load',()=>{
          if(disposed)return;
          setMapPalette(instance,presentationRef.current);
          const focused=stories.find(story=>story.id===initialStoryId);
          if(focused)frameStories([focused],false);
          else frameStories(stories,false);
        });
        instance.addControl(new lib.NavigationControl({showCompass:false}),'top-right');
        instance.on('error',event=>{
          console.error('Map error',event.error);
          if(!instance.isStyleLoaded())setFailure(true);
        });
        if(!compact)instance.on('load',()=>{
          if(disposed||!instance.getSource('openmaptiles'))return;
          const firstLabel=instance.getStyle().layers.find(layer=>layer.type==='symbol')?.id;
          instance.addLayer({
            id:'co-3d-buildings',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:14.5,
            layout:{visibility:'none'},
            paint:{
              'fill-extrusion-color':'#79644e',
              'fill-extrusion-height':['coalesce',['get','render_height'],8],
              'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
              'fill-extrusion-opacity':0.82,
              'fill-extrusion-vertical-gradient':true,
            },
          },firstLabel);
          setPerspectiveAvailable(true);
          const connection=(navigator as Navigator & {connection?:{saveData?:boolean;effectiveType?:string};deviceMemory?:number}).connection;
          const lowPower=connection?.saveData||/2g/.test(connection?.effectiveType||'')||((navigator as Navigator & {deviceMemory?:number}).deviceMemory||4)<4;
          if(presentationRef.current==='simple'||lowPower||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
          instance.once('idle',()=>{
            if(disposed||presentationRef.current==='simple')return;
            instance.setLayoutProperty('co-3d-buildings','visibility','visible');
            instance.jumpTo({pitch:48,bearing:-18});
            setPerspective(true);
            if(!initialStoryId)frameStories(stories,false);
          });
        });
      } catch(error) {
        console.error('Map initialization failed',error);
        setFailure(true);
      }
    }).catch(()=>setFailure(true));
    return()=>{
      disposed=true;
      map.current?.remove();
      map.current=null;
    };
  },[activated,city.id,city.lat,city.lng,city.zoom,compact,styleUrl]);

  useEffect(()=>{
    if(!ready||compact)return;
    if(firstFilterPass.current){firstFilterPass.current=false;return;}
    frameStories(visible);
  },[filterKey,ready,compact]);

  useEffect(()=>{
    if(!ready||!map.current)return;
    let disposed=false;
    void import('maplibre-gl').then(lib=>{
      if(disposed)return;
      markers.current.forEach(marker=>marker.remove());
      markers.current=groups.map((group,index)=>{
        const story=group.find(item=>item.id===selectedStory?.id)||group[0];
        const element=document.createElement('button');
        element.className='story-pin '+story.accessLevel+(story.id===selectedStory?.id?' selected':'');
        element.textContent=String(index+1).padStart(2,'0');
        if(group.length>1){const count=document.createElement('sup');count.className='pin-count';count.textContent=String(group.length);element.appendChild(count);}
        element.setAttribute('aria-label',`${story.location.name}, ${group.length} ${en?(group.length===1?'story':'stories'):(group.length===1?'história':'histórias')}`);
        element.onclick=()=>choose(story.id);
        element.title=`${story.location.name} · ${group.length} ${en?(group.length===1?'story':'stories'):(group.length===1?'história':'histórias')}`;
        return new lib.Marker({element,offset:mapPinOffset(groups,story.locationId)}).setLngLat([story.location.lng,story.location.lat]).addTo(map.current!);
      });
    });
    return()=>{disposed=true;};
  },[ready,visible,selectedStory?.id,entitled]);

  useEffect(()=>{
    if(!ready||city.slug!=='ouro-preto'||(!compact&&mapPresentation==='simple')||!map.current)return;
    let disposed=false;
    const lights:[number,number][]=[
      [-43.5064,-20.3840],[-43.5047,-20.3878],[-43.5025,-20.3828],
      [-43.5008,-20.3890],[-43.4961,-20.3838],[-43.4928,-20.3885],
      [-43.4899,-20.3854],[-43.4987,-20.3868],[-43.4939,-20.3860],
    ];
    void import('maplibre-gl').then(lib=>{
      if(disposed||!map.current)return;
      ambientMarkers.current=lights.map(([lng,lat])=>{
        const element=document.createElement('span');
        element.className='map-glow-point';
        element.setAttribute('aria-hidden','true');
        return new lib.Marker({element,anchor:'center'}).setLngLat([lng,lat]).addTo(map.current!);
      });
    });
    return()=>{
      disposed=true;
      ambientMarkers.current.forEach(marker=>marker.remove());
      ambientMarkers.current=[];
    };
  },[ready,compact,city.slug,mapPresentation]);

  useEffect(()=>{
    if((!compact&&!directEntry)||!selectedStory||(viewMode==='map'&&(!ready||!map.current))) {
      setConnectorPath('');
      return;
    }
    const instance=map.current;
    let frame=0;
    const update=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if(!surface.current||!preview.current)return;
        const projected=viewMode==='map'?instance?.project([selectedStory.location.lng,selectedStory.location.lat]):null;
        const [offsetX,offsetY]=mapPinOffset(groups,selectedStory.locationId);
        const point=viewMode==='illustrated'
          ?illustratedPoint(selectedStory,illustratedSize)
          :projected?{x:projected.x+offsetX,y:projected.y+offsetY}:null;
        if(!point){setConnectorPath('');return;}
        const surfaceBox=surface.current.getBoundingClientRect();
        const cardBox=preview.current.getBoundingClientRect();
        if(surfaceBox.width<=650){
          const endX=cardBox.left-surfaceBox.left+cardBox.width*.5;
          const endY=cardBox.top-surfaceBox.top+2;
          setConnectorPath(`M ${point.x} ${point.y} C ${point.x} ${point.y+48}, ${endX} ${endY-48}, ${endX} ${endY}`);
        } else {
          const endX=cardBox.left-surfaceBox.left+2;
          const endY=cardBox.top-surfaceBox.top+cardBox.height*.52;
          const bend=Math.max(34,(endX-point.x)*.48);
          setConnectorPath(`M ${point.x} ${point.y} C ${point.x+bend} ${point.y}, ${endX-bend*.42} ${endY}, ${endX} ${endY}`);
        }
      });
    };
    update();
    if(viewMode==='map'){
      instance?.on('move',update);
      instance?.on('resize',update);
    }
    window.addEventListener('resize',update);
    return()=>{
      cancelAnimationFrame(frame);
      if(viewMode==='map'){
        instance?.off('move',update);
        instance?.off('resize',update);
      }
      window.removeEventListener('resize',update);
    };
  },[compact,directEntry,ready,viewMode,illustratedSize,groups,selectedStory]);

  useEffect(()=>{
    const context=(document as any).modelContext;
    if(!context?.registerTool||compact)return;
    const controller=new AbortController();
    try {
      Promise.resolve(context.registerTool({
        name:'filter_city_stories',title:'Filter city stories',description:'Filter the visible city map and story list by a search phrase.',
        inputSchema:{type:'object',properties:{query:{type:'string',maxLength:100}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false},
        execute(input:unknown) {
          const nextQuery=(input as {query?:unknown})?.query;
          if(typeof nextQuery!=='string'||nextQuery.length>100)throw new Error('query must be a string up to 100 characters');
          setQuery(nextQuery);
          return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({query:nextQuery,matches:stories.filter(story=>(story.copy.title+' '+story.copy.hook+' '+story.location.name).toLowerCase().includes(nextQuery.toLowerCase())).map(story=>({id:story.id,title:story.copy.title}))}))));
        },
      },{signal:controller.signal})).catch(()=>{});
    } catch {}
    return()=>controller.abort();
  },[stories,compact]);

  return <div className={compact?'map-component compact':`explorer map-discovery is-${mapPresentation}${directEntry?' direct-entry':''}`}>
    {directEntry&&initialStoryId&&<Track name="map_direct_entry" cityId={city.id} locale={locale} storyId={initialStoryId}/>}
    {!compact&&accessAction&&selectedStory&&<MapAccess key={selectedStory.id+accessAction} city={city} story={selectedStory} locale={locale} freeCount={freeCount} premiumCount={premiumCount} action={accessAction} onClose={()=>setAccessAction(null)} onUnlocked={()=>{setHasLead(true);setAccessAction(null);router.refresh();}}/>}
    {!compact&&<aside className="explore-sidebar">
      <p className="eyebrow">CITY FILE / {city.name.toUpperCase()}</p>
      <h2>{en?'Choose a place.\nFind a story.':'Escolha um lugar.\nDescubra uma história.'}</h2>
      <label className="search-box"><Search size={18}/><input placeholder={en?'Search stories or places':'Buscar histórias ou lugares'} aria-label={en?'Search stories':'Buscar histórias'} value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <div className="filters">
        <Filter label={en?'Classification':'Classificação'} value={truth} onChange={setTruth} items={[["all",en?'All classifications':'Todas as classificações'],...Object.entries(truthLabels).map(([key,value])=>[key,value[locale]] as [string,string])]}/>
        <Filter label={en?'Access':'Acesso'} value={level} onChange={setLevel} items={[["all",en?'All access':'Todos os acessos'],['open',en?'Open':'Aberto'],['lead',en?'With email':'Com email'],['premium','City Pass']]}/>
        <Filter label={en?'Category':'Categoria'} value={category} onChange={setCategory} items={[["all",en?'All categories':'Todas as categorias'],...Array.from(new Set(stories.map(story=>story.category))).map(item=>[item,item] as [string,string])]}/>
        <Filter label={en?'Duration':'Duração'} value={duration} onChange={setDuration} items={[["all",en?'Any duration':'Qualquer duração'],['short',en?'Up to 90 seconds':'Até 90 segundos'],['long',en?'Over 90 seconds':'Mais de 90 segundos']]}/>
        <Filter label={en?'Discovered':'Descobertas'} value={discovery} onChange={setDiscovery} items={[["all",en?'All stories':'Todas as histórias'],['new',en?'Not discovered':'Não descobertas'],['seen',en?'Discovered':'Descobertas']]}/>
      </div>
      <div className="list-count">{groups.length} {en?'places':'lugares'} · {visible.length} {en?'stories':'histórias'}</div>
      <div className="map-list">{visible.length===0?<p className="muted">{en?'No stories match. Try clearing a filter.':'Nenhuma história encontrada. Experimente remover um filtro.'}</p>:groups.map((group,index)=>{
        const place=group[0].location;
        const expanded=selectedStory?.locationId===place.id;
        return <section className={'map-place-group'+(expanded?' active':'')} key={place.id}>
          <button type="button" className="map-place-header" aria-expanded={expanded} onClick={()=>choose(expanded?selectedStory?.id||group[0].id:group[0].id)}>
            <span className="list-num">{String(index+1).padStart(2,'0')}</span>
            <span><strong>{place.name}</strong><small>{group.length} {en?(group.length===1?'story':'stories'):(group.length===1?'história':'histórias')}{place.precision==='approximate'?' · '+(en?'approximate':'aproximado'):''}</small></span>
            <MapPin size={15}/>
          </button>
          {expanded&&<div className="map-place-stories">{group.map(story=><button className={'map-place-story'+(selectedStory?.id===story.id?' active':'')} key={story.id} onClick={()=>choose(story.id)}>
            <span><strong>{story.copy.title}</strong><small>{Math.ceil(story.estimatedSeconds/60)} min · {truthLabels[story.truthStatus][locale]}</small></span>
            {story.completed?<Check size={15}/>:story.accessLevel==='premium'&&!entitled?<LockKeyhole size={15}/>:<ArrowUpRight size={15}/>}
          </button>)}</div>}
        </section>;
      })}</div>
      <p className="map-note">{en?'Pan and zoom freely. Pins mark approximate real-world locations; editorial scenes are visual reconstructions.':'Arraste e amplie o mapa. Os pontos indicam locais reais aproximados; as cenas editoriais são reconstruções visuais.'}</p>
    </aside>}
    <div className={'map-surface '+(viewMode==='illustrated'?'is-illustrated':'')} ref={surface}>
      <div className={'map-canvas '+(viewMode==='illustrated'?'map-canvas-hidden':'')} ref={container} aria-label={en?'Interactive street map of Ouro Preto':'Mapa de ruas interativo de Ouro Preto'}/>
      {viewMode==='illustrated'&&<div className="illustrated-scene" role="group" aria-label={en?'Illustrated view of Ouro Preto, approximate story positions':'Vista ilustrada de Ouro Preto, posições aproximadas das histórias'}>
        <img src="/media/landing/ouro-preto-illustrated-map.webp" alt="" aria-hidden="true" fetchPriority={compact?'high':'auto'}/>
        {groups.map((group,index)=>{
          const story=group.find(item=>item.id===selectedStory?.id)||group[0];
          const point=illustratedPoint(story,illustratedSize);
          return point&&<button key={story.id} className={'illustrated-pin '+(selectedStory?.id===story.id?'selected':'')} type="button" style={{left:point.x,top:point.y}} aria-label={`${group.length>1?group.length+' '+(en?'stories':'histórias'):story.copy.title} — ${en?'illustrated position':'posição ilustrativa'}`} onClick={()=>choose(story.id)}><span>{group.length>1?group.length:String(index+1).padStart(2,'0')}</span></button>;
        })}
        {missingIllustratedPlaces>0&&<a className="illustrated-outside" href={`/${locale}/${city.slug}/mapa`}>+ {missingIllustratedPlaces} {en?'places beyond this illustration · see all on the map':'locais fora desta ilustração · ver todos no mapa'} <ArrowUpRight size={13}/></a>}
        <a className="illustrated-caption" href={`/${locale}/${city.slug}/editorial`}>{en?'EDITORIAL RECONSTRUCTION · APPROXIMATE POSITIONS':'RECONSTRUÇÃO EDITORIAL · POSIÇÕES APROXIMADAS'}</a>
      </div>}
      {!compact&&viewMode==='map'&&mapPresentation==='editorial'&&<div className="map-atmosphere" aria-hidden="true"/>}
      {viewMode==='map'&&!ready&&!failure&&<div className="map-loading overlay"><Compass size={42}/>{en?'Opening the map…':'Abrindo o mapa…'}</div>}
      {viewMode==='map'&&failure&&!ready&&<div className="map-loading overlay"><p>{en?'The map could not load. Explore using the story list.':'O mapa não carregou. Explore pela lista de histórias.'}</p></div>}
      {compact&&hasIllustration&&<div className="map-view-switch" role="group" aria-label={en?'Map view':'Visualização do mapa'}>
        <button type="button" aria-pressed={viewMode==='illustrated'} onClick={()=>changeView('illustrated')}>{en?'Illustrated city':'Cidade ilustrada'}</button>
        <button type="button" aria-pressed={viewMode==='map'} onClick={()=>changeView('map')}>{en?'Street map':'Mapa de ruas'}</button>
      </div>}
      {!compact&&<>
        <div className="map-view-switch" role="group" aria-label={en?'Map presentation':'Apresentação do mapa'}>
          <button type="button" aria-pressed={mapPresentation==='editorial'} onClick={()=>changeMapPresentation('editorial')}>{en?'Editorial view':'Vista editorial'}</button>
          <button type="button" aria-pressed={mapPresentation==='simple'} onClick={()=>changeMapPresentation('simple')}>{en?'Simple map':'Mapa simples'}</button>
        </div>
        <button className="map-frame-button" type="button" onClick={showAllPlaces} disabled={!ready||visible.length===0}>{en?'Show all places':'Ver todos os locais'}</button>
      </>}
      {!compact&&viewMode==='map'&&mapPresentation==='editorial'&&ready&&perspectiveAvailable&&<button className="map-perspective-toggle" type="button" onClick={togglePerspective} aria-pressed={perspective}><Compass size={16}/>{perspective?(en?'3D view':'Vista 3D'):(en?'Enable 3D':'Ativar 3D')}</button>}
      {(compact||directEntry)&&connectorPath&&<svg className="map-connector" aria-hidden="true"><path d={connectorPath}/></svg>}
      {selectedStory&&<article className="map-preview" ref={preview}>
        {(compact||mapPresentation==='editorial')&&selectedMapImage&&<img src={selectedMapImage} alt={selectedImageIsEditorial?(en?'Editorial visual reconstruction':'Reconstrução visual editorial'):(en?'Present-day photograph':'Fotografia atual')} loading={compact?'eager':'lazy'}/>}
        <div className="map-preview-content">
          {!compact&&mapPresentation==='editorial'&&selectedImageIsEditorial&&<span className="map-image-credit">{selectedImageCredit}</span>}
          {selectedGroup.length>1&&<label className="map-story-choice">{en?'Stories at this location':'Histórias neste local'} ({selectedGroup.length})<select value={selectedStory.id} onChange={event=>choose(event.target.value)}>{selectedGroup.map(story=><option key={story.id} value={story.id}>{story.copy.title}</option>)}</select></label>}
          <Badge status={selectedStory.truthStatus} locale={locale}/>
          <h3>{selectedStory.copy.title}</h3>
          <p>{selectedStory.copy.hook}</p>
          {!compact&&<div className="map-free-location"><small>{en?'FREE LOCATION':'LOCALIZAÇÃO GRATUITA'}</small><p><MapPin size={14}/>{selectedStory.location.address}</p><a href={mapsUrl(selectedStory)} target="_blank" rel="noreferrer" onClick={()=>track('location_maps_click',city.id,locale,selectedStory.id)}>{en?'Open the location in Google Maps':'Abrir localização no Google Maps'}<ArrowUpRight size={14}/></a>{locationGuidance(selectedStory,locale)&&<details><summary>{en?'Visiting information':'Orientação de visita'}</summary><p>{locationGuidance(selectedStory,locale)}</p></details>}<span>{selectedStory.location.precision==='approximate'?(en?'Approximate reference for the heritage site.':'Referência aproximada do patrimônio.'):(en?'Verified heritage location.':'Localização do patrimônio verificada.')}</span></div>}
          {directLocked&&<div className="map-reveal-path" aria-label={en?'Your discovery progress':'Seu progresso na descoberta'}><div className="map-reveal-head"><span>{en?'2 OF 3 REVEALED':'2 DE 3 REVELADOS'}</span><i><b/><b/><b/></i></div><ol><li className="done"><Check size={14}/><span><strong>{en?'Place found':'Lugar encontrado'}</strong><small>{selectedStory.location.name}</small></span></li><li className="done"><Check size={14}/><span><strong>{en?'Discovery confirmed':'Descoberta confirmada'}</strong><small>{truthLabels[selectedStory.truthStatus][locale]} · {en?'real sources':'fontes reais'}</small></span></li><li className="locked"><LockKeyhole size={14}/><span><strong>{en?'The complete dossier':'O arquivo completo'}</strong><small>{en?'Context, timeline and everything the sources reveal':'Contexto, linha do tempo e tudo o que as fontes revelam'}</small></span></li></ol></div>}
          <div className="card-bottom"><span><MapPin size={13}/>{selectedStory.location.name}</span><span>{Math.ceil(selectedStory.estimatedSeconds/60)} min</span></div>
          {compact&&<div className="audio-teaser"><span className="audio-play">▶</span><span className="audio-wave">▂▅▃▆▂▇▃▅▂▆▃▅</span><span>00:00 / {String(Math.ceil(selectedStory.estimatedSeconds/60)).padStart(2,'0')}:00</span></div>}
          {compact?<a className="map-detail-link" href={storyPath(locale,city.slug,selectedStory.copy.slug)}>{en?'See details →':'Ver detalhes →'}</a>:entitled||selectedStory.accessLevel==='open'||(selectedStory.accessLevel==='lead'&&hasLead)?<a className="button wide" href={storyPath(locale,city.slug,selectedStory.copy.slug)}>{en?'Read the full story':'Ler história completa'}<ArrowUpRight size={17}/></a>:<button className="button wide" onClick={()=>{const action=selectedStory.accessLevel==='lead'?'lead':'pass';setAccessAction(action);track(action==='lead'?'lead_gate_view':'paywall_view',city.id,locale,selectedStory.id);}}>{selectedStory.accessLevel==='lead'?(en?'Unlock this free story':'Liberar história gratuita'):directLocked?(en?'Open the complete dossier':'Abrir o arquivo completo'):(en?'Read the full story':'Ler história completa')}<ArrowUpRight size={17}/></button>}
          {!compact&&!entitled&&!hasLead&&freeCount>0&&selectedStory.accessLevel!=='lead'&&<button className="map-free-discovery" onClick={()=>{setAccessAction('lead');track('lead_gate_view',city.id,locale,selectedStory.id);}}>{en?`Unlock ${freeCount} free stories with email`:`Liberar ${freeCount} histórias grátis com e-mail`}</button>}
        </div>
      </article>}
      {viewMode==='map'&&<div className="map-legend"><span><i/> {en?'Open':'Aberto'}</span><span><i className="purple"/> {en?'Email':'Email'}</span><span><LockKeyhole size={12}/> City Pass</span></div>}
    </div>
  </div>;
}
