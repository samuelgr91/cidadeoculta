'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { publicAnalyticsPath } from '@/lib/analytics-routes';

export function PageAnalytics({disabled=false}:{disabled?:boolean}){
  const path=usePathname();
  const sent=useRef('');
  useEffect(()=>{
    const trackedPath=path ? publicAnalyticsPath(path) : null;
    if(disabled || !trackedPath)return;
    let done=false;
    const send=()=>{
      if(done || sent.current===trackedPath)return;
      done=true;sent.current=trackedPath;
      try{
        try{if(localStorage.getItem('co_analytics_test_mode')==='1')return;}catch{/* Server exclusion remains authoritative. */}
        let visit:{id:string;at:number}|null=null;
        try{visit=JSON.parse(sessionStorage.getItem('co_visit')||'null');}catch{/* Storage can be unavailable. */}
        if(!visit || !/^[a-f0-9-]{36}$/.test(visit.id) || Date.now()-visit.at>30*60000)visit={id:crypto.randomUUID(),at:Date.now()};
        visit.at=Date.now();
        try{sessionStorage.setItem('co_visit',JSON.stringify(visit));}catch{/* Continue without persistence. */}
        let referrer='';try{referrer=new URL(document.referrer).origin;}catch{/* Direct visit. */}
        const payload=JSON.stringify({id:crypto.randomUUID(),visitId:visit.id,path:trackedPath,referrer,internalTest:navigator.webdriver===true});
        // No external tracker, fingerprinting or library. One small deferred request per page.
        if(!navigator.sendBeacon?.('/api/analytics',new Blob([payload],{type:'application/json'})))
          void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
      }catch{/* Analytics never interrupts navigation. */}
    };
    const timer=window.setTimeout(send,700);
    const hide=()=>{if(document.visibilityState==='hidden')send();};
    document.addEventListener('visibilitychange',hide);
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',hide);send();};
  },[path,disabled]);
  return null;
}
