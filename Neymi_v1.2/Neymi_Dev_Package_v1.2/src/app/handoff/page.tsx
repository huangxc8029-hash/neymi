'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';

export default function HandoffPage(){
  const [status,setStatus]=useState('若名片没有打开，请回到原浏览器重新创建交接链接，或打开对方的公开名片链接。');
  const consumed=useRef(false);
  useEffect(()=>{
    const ticket=new URLSearchParams(window.location.hash.slice(1)).get('ticket');
    if(!ticket||consumed.current)return;
    consumed.current=true;
    window.history.replaceState(null,'',window.location.pathname);
    void fetch('/v1/messaging/handoffs/consume',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ticket})})
      .then(async response=>{const body=await response.json();if(!response.ok||typeof body.publicationId!=='string')throw new Error('该链接已过期、已使用或暂时无法验证。');window.location.replace(`/p/${encodeURIComponent(body.publicationId)}`);})
      .catch(error=>setStatus(error instanceof Error?error.message:'交接链接暂不可用。'));
  },[]);
  return <main className="workspace"><header><Link className="wordmark" href="/">neymi</Link></header>
    <section className="hero"><p className="eyebrow">一次性交接</p><h1>打开已发布的名片</h1><p role="status" className="intro">{status}</p>
      <p>私有资料和未发布草稿保存在创建它们的浏览器里，不会自动同步到聊天应用的内置浏览器。要继续编辑，请回到原浏览器；在这里可重新打开有效的公开名片链接。</p>
      <Link href="/">回到 Neymi</Link>
    </section>
  </main>;
}
