'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {createSupabaseBrowserClient} from './browser';

export function AccountEntry({className=''}:{className?:string}){
  const [signedIn,setSignedIn]=useState(false);
  useEffect(()=>{
    const client=createSupabaseBrowserClient();
    if(!client)return;
    let active=true;
    void client.auth.getSession().then(({data})=>{if(active)setSignedIn(Boolean(data.session));});
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>setSignedIn(Boolean(session)));
    return()=>{active=false;subscription.unsubscribe();};
  },[]);
  return <Link className={`account-entry ${className}`.trim()} href={signedIn?'/account':'/auth'} aria-label={signedIn?'账户设置':'登录或注册'}>{signedIn?'我的账户':'登录 / 注册'}</Link>;
}
