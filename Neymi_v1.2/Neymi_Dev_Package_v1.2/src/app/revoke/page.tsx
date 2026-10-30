'use client';

import {useState} from 'react';
import Link from 'next/link';

export default function RevokePublicCardPage(){
  const [link,setLink]=useState('');
  const [token,setToken]=useState('');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  async function revoke(){
    const raw=link.trim();
    let id:string;
    try{
      const target=new URL(raw);
      const allowed=new Set([window.location.hostname,'swtpic.com','www.swtpic.com']);
      const match=target.pathname.match(/^\/p\/([A-Za-z0-9_-]{16,64})\/?$/);
      if(!allowed.has(target.hostname)||target.protocol!=='https:'||!match)throw new Error('Invalid public URL');
      id=match[1];
    }catch{setStatus('请输入以 https://swtpic.com/p/ 开头的有效公开名片链接。');return;}
    if(!token.trim()){setStatus('请输入之前保存的撤回码。');return;}
    if(!window.confirm('撤回后原链接将无法继续访问。聊天软件可能仍缓存旧预览。确定撤回吗？'))return;
    setBusy(true);setStatus('');
    try{
      const response=await fetch(`/v1/publications/${encodeURIComponent(id)}`,{
        method:'DELETE',cache:'no-store',
        headers:{authorization:`Bearer ${token.trim()}`},
      });
      if(!response.ok){setStatus('撤回失败：链接可能已过期，或撤回码不正确。');return;}
      setToken('');
      setStatus('公开名片已撤回。第三方应用可能仍保留旧的图片或文字缓存。');
    }catch{setStatus('网络请求失败，请稍后重试。');}
    finally{setBusy(false);}
  }
  return <main className="workspace" style={{maxWidth:640,margin:'0 auto',padding:'32px 16px'}}>
    <header className="site-header"><Link className="wordmark" href="/">neymi<span>.</span></Link></header>
    <section style={{display:'grid',gap:16,marginTop:28}}>
      <h1>撤回公开名片</h1>
      <p>如果换了手机或清除了原浏览器资料，可使用之前保存的公开名片链接与撤回码。无需登录，完整私人资料仍保存在你的设备。</p>
      <label style={{display:'grid',gap:6}}>公开名片链接
        <input value={link} onChange={event=>setLink(event.target.value)} type="url" autoComplete="off"
          placeholder="https://swtpic.com/p/..." maxLength={2048}/>
      </label>
      <label style={{display:'grid',gap:6}}>撤回码
        <input value={token} onChange={event=>setToken(event.target.value)} type="password" autoComplete="off"
          placeholder="粘贴之前保存的撤回码" maxLength={512}/>
      </label>
      <button type="button" disabled={busy||!link.trim()||!token.trim()} onClick={()=>void revoke()}>
        {busy?'正在撤回…':'确认撤回'}
      </button>
      {status&&<p role="status">{status}</p>}
      <p>注意：撤回仅让 Neymi 不再提供该名片，无法删除已经保存或转发到其他平台的副本。</p>
      <Link href="/">返回制作名片</Link>
    </section>
  </main>;
}
