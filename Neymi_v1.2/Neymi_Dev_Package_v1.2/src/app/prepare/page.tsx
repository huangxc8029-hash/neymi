'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {CandidateSelfFact,ConfirmedSelfFact} from '../../domain/types';
import {IndexedDbVaultStorage} from '../../modules/vault/storage';
import {createVault} from '../../modules/vault/vault';
import {LocalFactsStore,buildCloudContext,confirmSelfFact,createContextApproval,detectSensitiveText} from '../../modules/self/facts';
import {useAssistant} from '../../modules/assistant/provider';
import {VoiceCapture} from '../../modules/content/voice-capture';
import {PreparedStore} from '../../modules/prepared/store';

export default function PreparePage(){
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  const store=useMemo(()=>new LocalFactsStore(vault),[vault]);
  const [facts,setFacts]=useState<ConfirmedSelfFact[]>([]),[status,setStatus]=useState('');
  const {setAvailableFacts,registerSubmitHandler}=useAssistant();
  const [manualText,setManualText]=useState('');
  const saveFact=useCallback(async(value:CandidateSelfFact,copy:string)=>{
    try{const confirmed=confirmSelfFact(value,copy,new Date().toISOString());await store.add(confirmed);const updated=await vault.loadPublicProfile();await new PreparedStore(vault.storage).markStale(updated.revision);setFacts(updated.facts);setAvailableFacts(updated.facts);setStatus('已确认并保存在本地。');}
    catch(error){setStatus(error instanceof Error?error.message:'本地保存失败。请检查资料库是否已解锁。');}
  },[store,vault,setAvailableFacts]);
  useEffect(()=>{
    store.list().then(value=>{setFacts(value);setAvailableFacts(value);}).catch(()=>setStatus('本地资料暂不可读；请解锁本地资料库后重试。'));
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
  return <main className="workspace beyond-task-page story-page">
    <header className="prepare-header"><Link className="wordmark" href="/">neymi</Link><Link className="prepare-back" href="/beyond" aria-label="返回 Beyond 名片"><span aria-hidden="true">←</span> 返回 Beyond 名片</Link></header>
    <section className="hero beyond-task-hero"><div><h1>关于自己的故事</h1><p className="intro">整理经历与特点。素材先成为候选，只有你确认的事实才会保存到本地。</p></div></section>
    <div className="beyond-task-layout">
      <section className="beyond-task-section" aria-labelledby="story-source-title"><div className="beyond-task-heading"><span>整理素材</span><h2 id="story-source-title">从一段真实经历开始</h2><p>可以先录音，也可以直接写下发生了什么、你做了什么、结果如何。</p></div>
        <VoiceCapture onTranscript={document=>setManualText(document?.text??'')}/>
        <label className="story-fact-label" htmlFor="manual-fact">手动整理一条本人事实</label><textarea id="manual-fact" value={manualText} onChange={event=>setManualText(event.target.value)} rows={4} placeholder="例如：我负责了什么，遇到什么问题，采取了哪些行动。"/>
        {detectSensitiveText(manualText).length>0&&<p className="story-alert" role="alert">这段内容可能包含联系方式。联系方式请放在加密资料区，不要作为普通事实保存。</p>}
        <div className="story-save-row"><span>内容只保存在此浏览器；是否发送给 AI 由你决定。</span><button type="button" disabled={!manualText.trim()||detectSensitiveText(manualText).length>0} onClick={()=>{const id=`fact_${crypto.randomUUID().replaceAll('-','')}`;void saveFact({id,text:manualText,category:'experience',origin:'user_text'},manualText);setManualText('');}}>确认并保存事实</button></div>
        {status&&<p role="status" className="story-status">{status}</p>}
      </section>
      <section className="beyond-task-section story-confirmed" aria-labelledby="confirmed-facts-title"><div className="beyond-task-heading"><span>你的资料</span><h2 id="confirmed-facts-title">已确认的事实 <small>{facts.length}</small></h2><p>这些内容只在你确认后加入资料，可用于之后准备联系人。</p></div>
        {facts.length?<ul className="story-facts-list">{facts.map(fact=><li key={fact.id}><span aria-hidden="true">✓</span><p>{fact.text}</p></li>)}</ul>:<div className="story-empty"><p>还没有确认的事实。</p><span>从上方添加一段经历，确认后会出现在这里。</span></div>}
      </section>
      <section className="beyond-next-step"><div><h2>接下来，准备一位联系人或一场活动</h2><p>可使用已确认的本人事实，逐位整理交流重点。联系人身份与最终分享仍由你确认。</p></div><Link href="/activity">瞄准关键联系人 <span aria-hidden="true">→</span></Link></section>
    </div>
    <footer>是否发送由你决定 · AI 建议不等于已确认事实 · <Link href="/cards">我的卡片库</Link></footer>
    <nav className="mobile-work-nav" aria-label="主要功能"><Link href="/"><span aria-hidden="true">✦</span>制作名片</Link><Link href="/beyond" aria-current="page"><span aria-hidden="true">◇</span>Beyond 名片</Link><Link href="/vip"><span aria-hidden="true">✧</span>VIP 名片</Link><Link href="/cards"><span aria-hidden="true">▤</span>我的卡片库</Link></nav>
  </main>;
}
