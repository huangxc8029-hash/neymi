'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {CandidateSelfFact,ConfirmedSelfFact,InteractionContext,LocalProfile,RecipientResearch} from '../../domain/types';
import {IndexedDbVaultStorage} from '../../modules/vault/storage';
import {createVault} from '../../modules/vault/vault';
import {LocalFactsStore,buildCloudContext,confirmSelfFact,createContextApproval,detectSensitiveText} from '../../modules/self/facts';
import {ResearchPanel} from '../../modules/research/panel';
import {StrategyPanel} from '../../modules/strategy/panel';
import {PreparedStore} from '../../modules/prepared/store';
import {useAssistant} from '../../modules/assistant/provider';

const emptyProfile:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};

export default function PreparePage(){
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  const store=useMemo(()=>new LocalFactsStore(vault),[vault]);
  const [facts,setFacts]=useState<ConfirmedSelfFact[]>([]),[status,setStatus]=useState('');
  const {setAvailableFacts,registerSubmitHandler,appendMessage}=useAssistant();
  const [profile,setProfile]=useState<LocalProfile>(emptyProfile);
  const deviceId='device_local';
  const [manualText,setManualText]=useState(''),[research,setResearch]=useState<RecipientResearch|null>(null),[interaction,setInteraction]=useState<InteractionContext|null>(null);
  const saveFact=useCallback(async(value:CandidateSelfFact,copy:string)=>{
    try{const confirmed=confirmSelfFact(value,copy,new Date().toISOString());await store.add(confirmed);const updated=await vault.loadPublicProfile();await new PreparedStore(vault.storage).markStale(updated.revision);setProfile(updated);setFacts(updated.facts);setAvailableFacts(updated.facts);setStatus('已确认并保存在本地。');}
    catch(error){setStatus(error instanceof Error?error.message:'本地保存失败。请检查资料库是否已解锁。');}
  },[store,vault,setAvailableFacts]);
  useEffect(()=>{
    store.list().then(value=>{setFacts(value);setAvailableFacts(value);}).catch(()=>setStatus('本地资料暂不可读；请解锁本地资料库后重试。'));
    vault.loadPublicProfile().then(setProfile).catch(()=>{});
  },[store,vault,setAvailableFacts]);
  useEffect(()=>registerSubmitHandler(async(text,selectedFacts)=>{
    try{
      const contextId='self_intro',now=new Date().toISOString(),approval=await createContextApproval(text,contextId,'对话了解本人职业事实',now,selectedFacts);
      const approvedContext=await buildCloudContext(text,selectedFacts,approval);
      const response=await fetch('/v1/session',{method:'POST'});
      if(!response.ok)throw new Error('匿名会话创建失败');
      const reply=await fetch('/v1/coach',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context:approvedContext})});
      const body=await reply.json();
      if(!reply.ok)throw new Error(body.error?.message??'AI 服务暂不可用');
      const candidate=body.facts[0] as CandidateSelfFact|undefined;
      return{reply:String(body.reply),...(candidate?{action:{label:'确认并保存到本地',run:()=>saveFact(candidate,candidate.text)}}:{})};
    }catch(error){throw new Error(error instanceof Error?error.message:'AI 服务暂不可用；你仍可手动整理并保存在本地。');}
  }),[registerSubmitHandler,saveFact]);
  return <main className="workspace">
    <header><Link className="wordmark" href="/">neymi</Link></header>
    <div className="hero"><p className="eyebrow">AI 名片准备</p><h1>先整理你想让人记住的特点。</h1>
      <p className="intro">对话只在你批准后发送。电话、邮箱和地址会提示你移除。候选内容需你确认，确认事实保存在此浏览器。</p></div>
    <section className="studio" style={{display:'block',maxWidth:760,margin:'0 auto'}}>
      <h2>本人事实与接收人准备</h2><p>使用右下角全局助手梳理经历；AI 候选由你确认后才保存在本地。接收人研究与策略沿用下方流程。</p>
      {status&&<p role="status">{status}</p>}
      <h2>已确认的事实（仅本地）</h2><ul>{facts.map(fact=><li key={fact.id}>{fact.text}</li>)}</ul>
      <label htmlFor="manual-fact">也可以手动整理一条本人事实（只保存在本地）</label>
      <textarea id="manual-fact" value={manualText} onChange={event=>setManualText(event.target.value)} rows={3} style={{width:'100%'}} />
      {detectSensitiveText(manualText).length>0&&<p role="alert">联系方式请保存到加密资料区，不要作为普通事实保存。</p>}
      <button type="button" disabled={!manualText.trim()||detectSensitiveText(manualText).length>0} onClick={()=>{const id=`fact_${crypto.randomUUID().replaceAll('-','')}`;void saveFact({id,text:manualText,category:'experience',origin:'user_text'},manualText);setManualText('');}}>确认并保存事实</button>
      <ResearchPanel onResearch={(value,context)=>{setResearch(value);setInteraction(context);}} />
      {research&&interaction&&<StrategyPanel key={research.recipient.id} research={research} context={interaction} facts={facts} profile={profile} deviceId={deviceId} vault={vault} onAssistantUpdate={appendMessage} />}
    </section>
    <footer>是否发送由你决定 · AI 建议不等于已确认事实 · <Link href="/cards">我的准备卡</Link></footer>
  </main>;
}
