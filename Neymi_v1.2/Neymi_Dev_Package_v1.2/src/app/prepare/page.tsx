'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {AccountEntry} from '../../modules/auth/account-entry';
import type {CandidateSelfFact,ConfirmedSelfFact,InteractionContext,LocalProfile,RecipientResearch} from '../../domain/types';
import {IndexedDbVaultStorage} from '../../modules/vault/storage';
import {createVault} from '../../modules/vault/vault';
import {LocalFactsStore,buildCloudContext,confirmSelfFact,createContextApproval,detectSensitiveText} from '../../modules/self/facts';
import {useAssistant} from '../../modules/assistant/provider';
import {VoiceCapture} from '../../modules/content/voice-capture';
import {PreparedStore} from '../../modules/prepared/store';
import {ContentImportPanel} from '../../modules/content/import-panel';
import {ModuleProposalAssistant} from '../../modules/content/module-proposal-assistant';
import type {ContentImportDocument} from '../../modules/content/types';
import {ResearchPanel} from '../../modules/research/panel';
import {StrategyPanel} from '../../modules/strategy/panel';

const emptyProfile:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};

export default function PreparePage(){
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  const store=useMemo(()=>new LocalFactsStore(vault),[vault]);
  const [facts,setFacts]=useState<ConfirmedSelfFact[]>([]),[profile,setProfile]=useState<LocalProfile>(emptyProfile),[documents,setDocuments]=useState<ContentImportDocument[]>([]),[research,setResearch]=useState<RecipientResearch|null>(null),[researchContext,setResearchContext]=useState<InteractionContext|null>(null),[status,setStatus]=useState('');
  const {setAvailableFacts,registerSubmitHandler}=useAssistant();
  const [manualText,setManualText]=useState('');
  function addDocument(document?:ContentImportDocument){setDocuments(current=>document?[...current.filter(item=>item.sourceId!==document.sourceId),document]:current.filter(item=>item.sourceId!=='voice_note_local'));}
  function updateStoryText(value:string){
    setManualText(value);const sourceId='prepare_manual_text',createdAt=new Date().toISOString();
    setDocuments(current=>value.trim()?[...current.filter(item=>item.sourceId!==sourceId),{sourceId,fileName:'手动整理',mime:'text/plain',kind:'text',untrusted:true,text:value,segments:[{text:value,sourceRef:{kind:'user_text',sourceId,paragraph:1,createdAt}}]}]:current.filter(item=>item.sourceId!==sourceId));
  }
  const saveModuleProposal=useCallback(async(next:LocalProfile)=>{
    try{await vault.saveOrdinaryProfile(next);await new PreparedStore(vault.storage).markStale(next.revision);setProfile(next);setFacts(next.facts);setAvailableFacts(next.facts);setStatus('模块已保存在本地。');}
    catch(error){throw new Error(error instanceof Error?error.message:'模块保存失败；请检查本地资料库。');}
  },[setAvailableFacts,vault]);
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
  return <main className="workspace beyond-task-page story-page">
    <header className="prepare-header"><Link className="wordmark" href="/">neymi</Link><Link className="prepare-back" href="/beyond" aria-label="返回 Beyond 名片"><span aria-hidden="true">←</span> 返回 Beyond 名片</Link><AccountEntry className="secondary-account-entry"/></header>
    <section className="hero beyond-task-hero"><div><h1>关于自己的故事</h1><p className="intro">整理经历与特点。素材先成为候选，只有你确认的事实才会保存到本地。</p></div></section>
    <div className="beyond-task-layout">
      <section className="beyond-task-section" aria-labelledby="story-source-title"><div className="beyond-task-heading"><span>整理素材</span><h2 id="story-source-title">从一段真实经历开始</h2><p>可以先录音，也可以直接写下发生了什么、你做了什么、结果如何。</p></div>
        <ContentImportPanel onReady={addDocument} onClear={()=>setDocuments(current=>current.filter(item=>item.sourceId==='voice_note_local'||item.sourceId==='prepare_manual_text'))}/>
        <VoiceCapture onTranscript={document=>{setManualText(document?.text??'');addDocument(document);}}/>
        <label className="story-fact-label" htmlFor="manual-fact">手动整理一条本人事实</label><textarea id="manual-fact" value={manualText} onChange={event=>updateStoryText(event.target.value)} rows={4} placeholder="例如：我负责了什么，遇到什么问题，采取了哪些行动。"/>
        <ModuleProposalAssistant documents={documents} profile={profile} onApply={saveModuleProposal} purpose="从用户主动选择的材料中整理有原文依据的本人经历或项目候选。接收人和用途仅作为作者端筛选背景；不得推断敏感属性或补充来源未支持的事实。"/>
        {detectSensitiveText(manualText).length>0&&<p className="story-alert" role="alert">这段内容可能包含联系方式。联系方式请放在加密资料区，不要作为普通事实保存。</p>}
        <div className="story-save-row"><span>内容只保存在此浏览器；是否发送给 AI 由你决定。</span><button type="button" disabled={!manualText.trim()||detectSensitiveText(manualText).length>0} onClick={()=>{const id=`fact_${crypto.randomUUID().replaceAll('-','')}`;void saveFact({id,text:manualText,category:'experience',origin:'user_text'},manualText);updateStoryText('');}}>确认并保存事实</button></div>
        {status&&<p role="status" className="story-status">{status}</p>}
      </section>
      <section className="beyond-task-section story-confirmed" aria-labelledby="confirmed-facts-title"><div className="beyond-task-heading"><span>你的资料</span><h2 id="confirmed-facts-title">已确认的事实 <small>{facts.length}</small></h2><p>这些内容只在你确认后加入资料，可用于之后准备联系人。</p></div>
        {facts.length?<ul className="story-facts-list">{facts.map(fact=><li key={fact.id}><span aria-hidden="true">✓</span><p>{fact.text}</p></li>)}</ul>:<div className="story-empty"><p>还没有确认的事实。</p><span>从上方添加一段经历，确认后会出现在这里。</span></div>}
      </section>
      <section className="beyond-next-step"><div><h2>接下来，准备一位联系人或一场活动</h2><p>可使用已确认的本人事实，逐位整理交流重点。联系人身份与最终分享仍由你确认。</p></div><Link href="/activity">瞄准关键联系人 <span aria-hidden="true">→</span></Link></section>
    </div>
    <section className="beyond-task-section single-research-workflow" aria-label="单人接收人准备"><ResearchPanel onResearch={(next,context)=>{setResearch(next);setResearchContext(context);}}/>{research&&research.state==='ready'&&researchContext&&<StrategyPanel key={research.recipient.id} research={research} context={researchContext} facts={facts} profile={profile} deviceId="device_local" vault={vault}/>}</section>
    <footer>是否发送由你决定 · AI 建议不等于已确认事实 · <Link href="/cards">我的卡片库</Link></footer>
    <nav className="mobile-work-nav" aria-label="主要功能"><Link href="/"><span aria-hidden="true">✦</span>制作名片</Link><Link href="/beyond" aria-current="page"><span aria-hidden="true">◇</span>Beyond 名片</Link><Link href="/cards"><span aria-hidden="true">▤</span>我的卡片库</Link></nav>
  </main>;
}
