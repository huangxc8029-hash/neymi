'use client';
import {useEffect} from 'react';
export function ServiceWorkerRegister(){
  useEffect(()=>{
    if(!('serviceWorker'in navigator))return;
    if(process.env.NODE_ENV==='development'){
      void Promise.all([
        navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.filter(registration=>registration.scope===`${location.origin}/`).map(registration=>registration.unregister()))),
        'caches'in window?caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('neymi-shell-')).map(key=>caches.delete(key)))):Promise.resolve([]),
      ]).then(([registrations,keys])=>{if((registrations.length||keys.length)&&navigator.serviceWorker.controller)location.reload();}).catch(()=>{});
      return;
    }
    void navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
  },[]);
  return null;
}
