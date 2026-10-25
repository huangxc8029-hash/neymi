'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ZodError} from 'zod';
import type {LocalDraft,LocalProfile,ManualCardConfig,Motion} from '../domain/types';
import {CardEditor} from '../modules/card/editor';
import {ContactPanel} from '../modules/card/contact-panel';
import {DemoCard} from '../modules/card/demo-card';
import {CONTACT_MODULE_ID,contactItems} from '../modules/card/contacts';
import {CardRenderer} from '../modules/card/renderer';
import {createManualDraft} from '../modules/card/create';
import {SharePreview} from '../modules/sharing/preview';
import {TemplatePicker} from '../modules/card/template-picker';
import {DEFAULT_CARD_TEMPLATE,isCardTemplateId,type CardTemplateId} from '../modules/card/templates';
import {IndexedDbVaultStorage} from '../modules/vault/storage';
import {createVault} from '../modules/vault/vault';
import {PreparedStore} from '../modules/prepared/store';

const initial:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};
const templateStorageKey='neymi.card-template';
function getSavedTemplate():CardTemplateId{
  if(typeof window==='undefined')return DEFAULT_CARD_TEMPLATE;
  try{const saved=window.localStorage.getItem(templateStorageKey);return isCardTemplateId(saved)?saved:DEFAULT_CARD_TEMPLATE;}
  catch{return DEFAULT_CARD_TEMPLATE;}
}
function manualConfig(profile:LocalProfile,templateId:CardTemplateId,motion:Motion):ManualCardConfig{
  const now=new Date().toISOString();
  return {schemaVersion:1,id:'card_guest',kind:'manual',label:'我的名片',templateId,layout:'editorial',animation:motion,
    orderedModules:profile.modules.map(section=>({localModuleId:section.id,kind:section.kind,emphasis:'normal'})),createdAt:now,updatedAt:now};
}
export default function Home(){
  const [profile,setProfile]=useState<LocalProfile>(initial);
  const [draft,setDraft]=useState<LocalDraft|null>(null);
  const [selectedTemplate,setSelectedTemplate]=useState<CardTemplateId>(DEFAULT_CARD_TEMPLATE);
  const [motion,setMotion]=useState<Motion>('float');
  const [message,setMessage]=useState('');
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  useEffect(()=>{
    const templateId=getSavedTemplate();
    Promise.resolve().then(()=>setSelectedTemplate(templateId));
    vault.loadPublicProfile().then(saved=>{setProfile(saved);if(saved.identity.name?.trim())setDraft(createManualDraft(saved,manualConfig(saved,templateId,'float')));}).catch(()=>{});
  },[vault]);
  function updateProfile(next:LocalProfile){
    setProfile(next);setMessage('');
    if(!next.identity.name?.trim()){setDraft(null);return;}
    setDraft(createManualDraft(next,manualConfig(next,selectedTemplate,motion)));
  }
  async function chooseTemplate(templateId:CardTemplateId){
    setSelectedTemplate(templateId);
    try{window.localStorage.setItem(templateStorageKey,templateId);}catch{}
    if(!profile.identity.name?.trim())return;
    let next=createManualDraft(profile,manualConfig(profile,templateId,motion));
    if(vault.isUnlocked()){
      try{const contacts=contactItems(await vault.readContacts());if(contacts.length)next={...next,modules:[...next.modules.filter(section=>section.id!==CONTACT_MODULE_ID),{id:CONTACT_MODULE_ID,kind:'contact',title:'联系方式',items:contacts}]};}catch{}
    }
    setDraft(next);
  }
  async function preview(){
    try{
      await vault.saveOrdinaryProfile(profile);
      const saved=await vault.loadPublicProfile();
      await new PreparedStore(vault.storage).markStale(saved.revision);
      let next=createManualDraft(saved,manualConfig(saved,selectedTemplate,motion));
      if(vault.isUnlocked()){
        const contacts=contactItems(await vault.readContacts());
        if(contacts.length)next={...next,modules:[...next.modules.filter(section=>section.id!==CONTACT_MODULE_ID),{id:CONTACT_MODULE_ID,kind:'contact',title:'联系方式',items:contacts}]};
      }
      setProfile(saved);setDraft(next);setMessage(vault.isUnlocked()?'已保存在此浏览器。联系方式需逐项选择后才能分享。':'已保存在此浏览器。解锁加密区后可预览联系方式。');
    }catch(error){
      setMessage(error instanceof ZodError?'检测到联系方式。请在本地加密资料区保存这类信息。':
        error instanceof DOMException&&error.name==='QuotaExceededError'?'浏览器存储空间不足，当前资料仍在本页。':
        '保存失败，当前资料仍在本页。');
    }
  }
  return <main className="workspace">
    <header className="site-header"><Link className="wordmark" href="/" aria-label="Neymi 首页">neymi<span aria-hidden="true">.</span></Link>
      <nav className="site-nav" aria-label="主导航"><span className="local-status"><span/>资料保存在此浏览器</span><Link className="nav-ai" href="/prepare">AI 助手 <span aria-hidden="true">↗</span></Link></nav>
    </header>
    <section className="hero"><div><h1>把这次交流，<br className="hero-break"/>准备得更好。</h1>
      <p className="intro">一张清楚表达你是谁的名片。内容由你决定，分享也由你确认。</p></div>
      <a className="hero-action" href="#card-form">创建我的名片 <span aria-hidden="true">↓</span></a></section>
    <div className="studio" id="card-form">
      <div className="editor-column"><CardEditor profile={profile} onChange={updateProfile} onPreview={preview} motion={motion} onMotion={value=>{setMotion(value);if(profile.identity.name?.trim())setDraft(createManualDraft(profile,manualConfig(profile,selectedTemplate,value)));}}/><ContactPanel vault={vault} profile={profile} onSaved={saved=>{setProfile(saved);setDraft(createManualDraft(saved,manualConfig(saved,selectedTemplate,motion)));}}/></div>
      <aside className="preview-panel">
        {draft?<><div className="preview-heading"><div><h2>你的名片</h2><p>修改时实时更新，保存后留在此浏览器。</p></div><span className="example-tag live-tag">实时预览</span></div><CardRenderer draft={draft}/></>:<DemoCard templateId={selectedTemplate}/>}
        <TemplatePicker selected={selectedTemplate} onSelect={chooseTemplate}/>
        {draft&&<SharePreview key={`${draft.profileRevision}-${draft.config.templateId}`} draft={draft}/>}
        {message&&<p className="save-status" role="status">{message}</p>}
        <section className="assistant-panel" aria-labelledby="assistant-title"><div className="assistant-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3v6m0 14v6M3 16h6m14 0h6M6.8 6.8 11 11m10 10 4.2 4.2m0-19.4L21 11m-10 10-4.2 4.2"/><circle cx="16" cy="16" r="5"/></svg></div><div className="assistant-copy"><h2 id="assistant-title">为重要交流做更多准备</h2><p>和 AI 梳理你的特点，为具体对象准备表达重点。</p></div><Link className="assistant-link" href="/prepare">开始 AI 个性化准备 <span aria-hidden="true">→</span></Link><p className="assistant-config-note">AI 服务需配置 DeepSeek 密钥</p></section>
      </aside>
    </div>
    <footer className="site-footer"><span>免注册 · 本地优先 · 分享由你决定</span><nav aria-label="更多页面"><Link href="/activity">活动准备</Link><Link href="/cards">我的准备卡</Link><Link href="/receive">收到的名片</Link></nav></footer>
  </main>;
}
