'use client';
import {useEffect} from 'react';import type {Locale} from '@/lib/model';
export function BuyLink({cityId,locale,children,...props}:{cityId:string;locale:Locale;children:React.ReactNode;href:string;className?:string}){
  return <a {...props} onClick={()=>track('checkout_start',cityId,locale)}>{children}</a>;
}
export function acquisition(){const p=new URLSearchParams(location.search);let old:Record<string,string>={};try{const saved=JSON.parse(sessionStorage.getItem('co_acquisition')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))old=saved;}catch{}for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','ref']){const value=p.get(key);if(value)old[key]=value.slice(0,200);}try{sessionStorage.setItem('co_acquisition',JSON.stringify(old));}catch{}return old;}
export function track(name:string,cityId:string,locale:Locale,storyId?:string){try{void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,cityId,locale,storyId,acquisition:acquisition()}),keepalive:true}).catch(()=>{});}catch{/* Analytics must not interrupt exploration. */}}
export function Track({name,cityId,locale,storyId}:{name:string;cityId:string;locale:Locale;storyId?:string}){useEffect(()=>{document.documentElement.lang=locale==='en'?'en':'pt-BR';track(name,cityId,locale,storyId);},[name,cityId,locale,storyId]);return null;}
