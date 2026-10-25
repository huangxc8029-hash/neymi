'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {CandidateSelfFact,ConfirmedSelfFact} from '../../domain/types';
import {IndexedDbVaultStorage} from '../../modules/vault/storage';
import {createVault} from '../../modules/vault/vault';
import {LocalFactsStore,confirmSelfFact,createContextApproval,detectSensitiveText} from '../../modules/self/facts';
import {ResearchPanel} from '../../modules/research/panel';

export default function PreparePage(){
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  const store=useMemo(()=>new LocalFactsStore(vault),[vault]);
  const [text,setText]=useState(''),[facts,setFacts]=useState<ConfirmedSelfFact[]>([]),[candidate,setCandidate]=useState<CandidateSelfFact|null>(null);
  const [edited,setEdited]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const sensitive=detectSensitiveText(text);
  useEffect(()=>{store.list().then(setFacts).catch(()=>setStatus('本地资料暂不可读；请解锁本地资料库后重试。'));},[store]);
  async function askAi(){
    setBusy(true);setStatus('');
    try{
      const contextId='self_intro',now=new Date().toISOString(),approval=await createContextApproval(text,contextId,'提炼本人职业事实',now);
      const response=await fetch('/v1/session',{method:'POST'});
      if(!response.ok)throw new Error('匿名会话创建失败');
      const reply=await fetch('/v1/facts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context:{approval,text,factIds:[],moduleMetadata:[]}})});
      const body=await reply.json();
      if(!reply.ok)throw new Error(body.error?.message??'AI 服务暂不可用');
      setCandidate(body.facts[0]??null);setEdited(body.facts[0]?.text??'');setStatus(body.facts.length?'AI 建议已生成。确认后才会保存在本地。':'AI 没有提取到事实。');
    }catch(error){setStatus(error instanceof Error?error.message:'AI 服务暂不可用；你仍可手动整理并保存在本地。');}
    finally{setBusy(false);}
  }
  async function saveFact(value:CandidateSelfFact,copy:string){
    try{const confirmed=confirmSelfFact(value,copy,new Date().toISOString());await store.add(confirmed);setFacts(await store.list());setCandidate(null);setEdited('');setStatus('已确认并保存在本地。');}
    catch(error){setStatus(error instanceof Error?error.message:'本地保存失败。请检查资料库是否已解锁。');}
  }
  return <main className="workspace">
    <header><Link className="wordmark" href="/">neymi</Link></header>
    <div className="hero"><p className="eyebrow">AI 名片准备</p><h1>先整理你想让人记住的特点。</h1>
      <p className="intro">对话只在你批准后发送。电话、邮箱和地址会提示你移除。候选内容需你确认，确认事实保存在此浏览器。</p></div>
    <section className="studio" style={{display:'block',maxWidth:760,margin:'0 auto'}}>
      <label htmlFor="self-intro">介绍你做过什么、擅长什么，或希望建立怎样的联系</label>
      <textarea id="self-intro" value={text} onChange={event=>setText(event.target.value)} rows={8} maxLength={20000} style={{width:'100%',marginTop:12}} />
      {sensitive.length>0&&<p role="alert">检测到联系方式或地址。请先移除再发送。检测不是完整的隐私保护。</p>}
      <button type="button" disabled={!text.trim()||sensitive.length>0||busy} onClick={askAi}>{busy?'处理中…':'同意发送以上文字，请 AI 提炼'}</button>
      <p>点击按钮即批准仅发送文本框中的当前内容，用于提炼候选事实。本地事实、加密资料和联系方式不会随请求发送。</p>
      {candidate&&<div><p>AI 候选 · 未确认</p><label htmlFor="candidate-text">编辑后确认保存</label>
        <textarea id="candidate-text" value={edited} onChange={event=>setEdited(event.target.value)} rows={4} style={{width:'100%'}} />
        <button type="button" onClick={()=>saveFact(candidate,edited)}>确认并保存到本地</button>
      </div>}
      {status&&<p role="status">{status}</p>}
      <h2>已确认的事实（仅本地）</h2><ul>{facts.map(fact=><li key={fact.id}>{fact.text}</li>)}</ul>
      <ResearchPanel />
    </section>
    <footer>是否发送由你决定 · AI 建议不等于已确认事实</footer>
  </main>;
}
