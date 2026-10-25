'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {CandidateSelfFact,ConfirmedSelfFact,InteractionContext,LocalProfile,RecipientResearch} from '../../domain/types';
import {IndexedDbVaultStorage} from '../../modules/vault/storage';
import {createVault} from '../../modules/vault/vault';
import {LocalFactsStore,buildCloudContext,cloudContextText,confirmSelfFact,createContextApproval,detectSensitiveText} from '../../modules/self/facts';
import {ResearchPanel} from '../../modules/research/panel';
import {StrategyPanel} from '../../modules/strategy/panel';
import {PreparedStore} from '../../modules/prepared/store';

const emptyProfile:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};

export default function PreparePage(){
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  const store=useMemo(()=>new LocalFactsStore(vault),[vault]);
  const [text,setText]=useState(''),[facts,setFacts]=useState<ConfirmedSelfFact[]>([]),[candidate,setCandidate]=useState<CandidateSelfFact|null>(null);
  const [selectedFactIds,setSelectedFactIds]=useState<string[]>([]);
  const [edited,setEdited]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const [conversation,setConversation]=useState<Array<{role:'user'|'assistant';text:string}>>([]);
  const [profile,setProfile]=useState<LocalProfile>(emptyProfile);
  const deviceId='device_local';
  const [manualText,setManualText]=useState(''),[research,setResearch]=useState<RecipientResearch|null>(null),[interaction,setInteraction]=useState<InteractionContext|null>(null);
  const selectedFacts=facts.filter(fact=>selectedFactIds.includes(fact.id));
  const outgoing=cloudContextText(text,selectedFacts),sensitive=detectSensitiveText(outgoing);
  useEffect(()=>{
    store.list().then(setFacts).catch(()=>setStatus('本地资料暂不可读；请解锁本地资料库后重试。'));
    vault.loadPublicProfile().then(setProfile).catch(()=>{});
  },[store,vault]);
  async function askAi(){
    setBusy(true);setStatus('');
    try{
      const contextId='self_intro',now=new Date().toISOString(),approval=await createContextApproval(text,contextId,'对话了解本人职业事实',now,selectedFacts);
      const approvedContext=await buildCloudContext(text,selectedFacts,approval);
      const response=await fetch('/v1/session',{method:'POST'});
      if(!response.ok)throw new Error('匿名会话创建失败');
      const reply=await fetch('/v1/coach',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context:approvedContext})});
      const body=await reply.json();
      if(!reply.ok)throw new Error(body.error?.message??'AI 服务暂不可用');
      setConversation(current=>[...current,{role:'user',text},{role:'assistant',text:body.reply}]);setText('');
      setCandidate(body.facts[0]??null);setEdited(body.facts[0]?.text??'');setStatus(body.facts.length?'AI 提出了候选事实，确认后才会保存在本地。':'AI 已回复；你可以继续回答。');
    }catch(error){setStatus(error instanceof Error?error.message:'AI 服务暂不可用；你仍可手动整理并保存在本地。');}
    finally{setBusy(false);}
  }
  async function saveFact(value:CandidateSelfFact,copy:string){
    try{const confirmed=confirmSelfFact(value,copy,new Date().toISOString());await store.add(confirmed);const updated=await vault.loadPublicProfile();await new PreparedStore(vault.storage).markStale(updated.revision);setProfile(updated);setFacts(updated.facts);setCandidate(null);setEdited('');setStatus('已确认并保存在本地。');}
    catch(error){setStatus(error instanceof Error?error.message:'本地保存失败。请检查资料库是否已解锁。');}
  }
  return <main className="workspace">
    <header><Link className="wordmark" href="/">neymi</Link></header>
    <div className="hero"><p className="eyebrow">AI 名片准备</p><h1>先整理你想让人记住的特点。</h1>
      <p className="intro">对话只在你批准后发送。电话、邮箱和地址会提示你移除。候选内容需你确认，确认事实保存在此浏览器。</p></div>
    <section className="studio" style={{display:'block',maxWidth:760,margin:'0 auto'}}>
      <h2>与 AI 助手聊聊你的工作</h2><p>每次只发送当前输入和你选中的已确认事实；之前的对话留在本机，不会自动重传。请不要输入联系方式。</p>
      {conversation.length>0&&<ol aria-label="本次对话">{conversation.map((turn,index)=><li key={index}><strong>{turn.role==='user'?'你':'AI 助手'}：</strong>{turn.text}</li>)}</ol>}
      {facts.length>0&&<fieldset><legend>本轮可选的已确认事实（默认不发送）</legend>{facts.map(fact=><label key={fact.id} style={{display:'block'}}><input type="checkbox" checked={selectedFactIds.includes(fact.id)} onChange={event=>setSelectedFactIds(current=>event.target.checked?[...current,fact.id]:current.filter(id=>id!==fact.id))}/>{fact.text}</label>)}</fieldset>}
      <label htmlFor="self-intro">介绍你做过什么、擅长什么，或回答上一个问题</label>
      <textarea id="self-intro" value={text} onChange={event=>setText(event.target.value)} rows={8} maxLength={20000} style={{width:'100%',marginTop:12}} />
      {sensitive.length>0&&<p role="alert">检测到联系方式或地址。请先移除再发送。检测不是完整的隐私保护。</p>}
      <details><summary>查看本轮实际发送给 AI 的内容</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{outgoing}</pre></details>
      <button type="button" disabled={!text.trim()||sensitive.length>0||busy} onClick={askAi}>{busy?'处理中…':'同意发送当前文字，请 AI 继续提问'}</button>
      <p>点击按钮即批准发送上方预览内容，用于提问和提炼候选事实。加密资料、联系方式和此前对话不会随请求发送。</p>
      {candidate&&<div><p>AI 候选 · 未确认</p><label htmlFor="candidate-text">编辑后确认保存</label>
        <textarea id="candidate-text" value={edited} onChange={event=>setEdited(event.target.value)} rows={4} style={{width:'100%'}} />
        <button type="button" onClick={()=>saveFact(candidate,edited)}>确认并保存到本地</button>
      </div>}
      {status&&<p role="status">{status}</p>}
      <h2>已确认的事实（仅本地）</h2><ul>{facts.map(fact=><li key={fact.id}>{fact.text}</li>)}</ul>
      <label htmlFor="manual-fact">也可以手动整理一条本人事实（只保存在本地）</label>
      <textarea id="manual-fact" value={manualText} onChange={event=>setManualText(event.target.value)} rows={3} style={{width:'100%'}} />
      {detectSensitiveText(manualText).length>0&&<p role="alert">联系方式请保存到加密资料区，不要作为普通事实保存。</p>}
      <button type="button" disabled={!manualText.trim()||detectSensitiveText(manualText).length>0} onClick={()=>{const id=`fact_${crypto.randomUUID().replaceAll('-','')}`;void saveFact({id,text:manualText,category:'experience',origin:'user_text'},manualText);setManualText('');}}>确认并保存事实</button>
      <ResearchPanel onResearch={(value,context)=>{setResearch(value);setInteraction(context);}} />
      {research&&interaction&&<StrategyPanel key={research.recipient.id} research={research} context={interaction} facts={facts} profile={profile} deviceId={deviceId} vault={vault} />}
    </section>
    <footer>是否发送由你决定 · AI 建议不等于已确认事实 · <Link href="/cards">我的准备卡</Link></footer>
  </main>;
}
