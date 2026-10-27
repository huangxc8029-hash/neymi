'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {publicAuthAvailability,safeAuthReturnTo} from './config';
import {createSupabaseBrowserClient} from './browser';

export function SignInForm(){
  const params=useSearchParams(),next=safeAuthReturnTo(params.get('next')),[email,setEmail]=useState(''),[code,setCode]=useState(''),[waiting,setWaiting]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[seconds,setSeconds]=useState(0);
  const callbackError=params.get('error')==='verification'?'登录验证失败或已过期，请重新开始。':params.get('error')==='configuration'?'账户服务尚未配置。':'';
  useEffect(()=>{if(!seconds)return;const timer=window.setTimeout(()=>setSeconds(value=>Math.max(0,value-1)),1000);return()=>window.clearTimeout(timer);},[seconds]);
  async function requestCode(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');setNotice('');try{const client=createSupabaseBrowserClient();if(!client)throw new Error('账户服务尚未配置。');const result=await client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,shouldCreateUser:true}});if(result.error)throw result.error;setWaiting(true);setSeconds(60);setNotice('如果该邮箱可用，验证码邮件很快会送达。请检查收件箱和垃圾邮件。');}catch{setError('暂时无法发送验证码，请检查邮箱格式或稍后重试。');}finally{setBusy(false);}}
  async function verifyCode(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const client=createSupabaseBrowserClient();if(!client)throw new Error();const result=await client.auth.verifyOtp({email:email.trim(),token:code.trim(),type:'email'});if(result.error)throw result.error;window.location.assign(next);}catch{setError('验证码无效或已过期，请检查后重试。');}finally{setBusy(false);}}
  async function signIn(provider:'google'|'apple'){
    setBusy(true);setError('');try{const client=createSupabaseBrowserClient();if(!client)throw new Error();const result=await client.auth.signInWithOAuth({provider,options:{redirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`}});if(result.error)throw result.error;}catch{setError('暂时无法使用此登录方式，请检查服务配置或改用邮箱。');setBusy(false);}
  }
  const configured=publicAuthAvailability.configured;
  return <section className="auth-card" aria-labelledby="auth-title">
    <p className="auth-eyebrow">NEYMI ACCOUNT</p><h1 id="auth-title">登录或创建账户</h1><p className="auth-intro">邮箱验证码免密码。账户用于身份会话；名片仍保存在当前浏览器，不会自动上传或跨设备同步。</p>
    {!configured?<div className="auth-setup" role="status"><strong>账户服务尚未配置</strong><p>配置 Supabase URL 和 publishable key，并设置邮箱验证后，此处才会显示可用登录方式。当前仍可免注册制作和保存名片。</p><Link href="/">返回制作名片</Link></div>:<>
      <div className="auth-providers">{publicAuthAvailability.providers.google&&<button type="button" disabled={busy} onClick={()=>void signIn('google')}>使用 Google 继续</button>}{publicAuthAvailability.providers.apple&&<button type="button" disabled={busy} onClick={()=>void signIn('apple')}>使用 Apple 继续</button>}</div>
      {(publicAuthAvailability.providers.google||publicAuthAvailability.providers.apple)&&<div className="auth-divider"><span>或使用邮箱</span></div>}
      {!waiting?<form onSubmit={event=>void requestCode(event)}><label htmlFor="auth-email">邮箱地址</label><input id="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com"/><button type="submit" disabled={busy}>{busy?'正在发送…':'发送邮箱验证码'}</button><p className="auth-hint">首次使用该邮箱会创建账户；已注册邮箱则用于登录。页面不会透露邮箱是否已注册。</p></form>:<form onSubmit={event=>void verifyCode(event)}><p className="auth-code-destination">验证码已发送至 <strong>{email}</strong></p><label htmlFor="auth-code">6 位验证码</label><input id="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/><button type="submit" disabled={busy}>{busy?'正在验证…':'验证并登录'}</button><button type="button" className="auth-secondary" disabled={busy||seconds>0} onClick={()=>{setWaiting(false);setCode('');}}>{seconds?`${seconds} 秒后可重新发送`:'重新发送验证码'}</button></form>}
      {(error||callbackError)&&<p className="auth-error" role="alert">{error||callbackError}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
    </>}
    <p className="auth-legal-note">登录后仍可在本机管理或删除名片资料。登录不等于公开分享，也不会自动同步名片。</p>
  </section>;
}
