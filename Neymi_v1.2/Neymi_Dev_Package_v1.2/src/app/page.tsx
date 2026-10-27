'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {FieldRef,LocalAsset,LocalDraft,LocalProfile,ManualCardConfig,Motion,ProfileItem,ShareSelection} from '../domain/types';
import {CardEditor} from '../modules/card/editor';
import {ContactPanel} from '../modules/card/contact-panel';
import {CONTACT_MODULE_ID,contactItems} from '../modules/card/contacts';
import {CardRenderer} from '../modules/card/renderer';
import {createManualDraft} from '../modules/card/create';
import {QuickShare} from '../modules/publication/quick-share';
import {TemplatePicker} from '../modules/card/template-picker';
import {DEFAULT_CARD_TEMPLATE,PRO_CARD_TEMPLATES,getCardTemplate,isCardTemplateId,type CardTemplateId} from '../modules/card/templates';
import {CardVisibilityPanel,type CardVisibilitySelection} from '../modules/card/visibility-panel';
import {IndexedDbVaultStorage} from '../modules/vault/storage';
import {createVault} from '../modules/vault/vault';
import {PreparedStore} from '../modules/prepared/store';
import {DemoCard} from '../modules/card/demo-card';

const initial:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};
const templateStorageKey='neymi.card-template',vipTemplateStorageKey='neymi.vip-card-template',vipModulesStorageKey='neymi.vip-visible-modules';
const freeVisibilityStorageKey='neymi.free-card-visibility.v1',vipVisibilityStorageKey='neymi.vip-card-visibility.v1';
type CardKind='free'|'vip';
function getSavedTemplate():CardTemplateId{
  if(typeof window==='undefined')return DEFAULT_CARD_TEMPLATE;
  try{const saved=window.localStorage.getItem(templateStorageKey);return isCardTemplateId(saved)?saved:DEFAULT_CARD_TEMPLATE;}
  catch{return DEFAULT_CARD_TEMPLATE;}
}
function getSavedVipTemplate():CardTemplateId{
  if(typeof window==='undefined')return PRO_CARD_TEMPLATES[0].id;
  try{const saved=window.localStorage.getItem(vipTemplateStorageKey);return isCardTemplateId(saved)&&PRO_CARD_TEMPLATES.some(template=>template.id===saved)?saved:PRO_CARD_TEMPLATES[0].id;}
  catch{return PRO_CARD_TEMPLATES[0].id;}
}
const fieldKey=(field:FieldRef)=>`${field.moduleId}/${field.itemId}`;
function defaultVisibility(profile:LocalProfile):CardVisibilitySelection{const fields=profile.modules.filter(module=>module.kind!=='contact').flatMap(module=>module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()).map(item=>({moduleId:module.id,itemId:item.id})));return{identity:['name','company','role'],modules:profile.modules.filter(module=>module.kind!=='contact'&&module.items.some(item=>item.sensitivity==='ordinary'&&item.value.trim())).map(module=>module.id),fields,contacts:[],logo:true};}
function readVisibility(key:string,fallback:CardVisibilitySelection):CardVisibilitySelection|null{
  try{const raw=window.localStorage.getItem(key);if(!raw)return null;const parsed:unknown=JSON.parse(raw);if(!parsed||typeof parsed!=='object')return null;const value=parsed as Partial<CardVisibilitySelection>;
    const allowedFields=new Set(fallback.fields.map(fieldKey)),savedFields=Array.isArray(value.fields)?value.fields.filter((field):field is FieldRef=>Boolean(field&&typeof field==='object'&&typeof (field as FieldRef).moduleId==='string'&&typeof (field as FieldRef).itemId==='string'&&allowedFields.has(fieldKey(field as FieldRef)))):null;
    return{identity:Array.isArray(value.identity)?value.identity.filter((field):field is 'name'|'company'|'role'=>field==='name'||field==='company'||field==='role'):fallback.identity,
      modules:Array.isArray(value.modules)?value.modules.filter((id):id is string=>typeof id==='string'):fallback.modules,
      fields:savedFields??fallback.fields.filter(field=>!Array.isArray(value.modules)||(value.modules as unknown[]).includes(field.moduleId)),
      contacts:Array.isArray(value.contacts)?value.contacts.filter((id):id is string=>typeof id==='string'):fallback.contacts,
      logo:typeof value.logo==='boolean'?value.logo:fallback.logo};
  }catch{return null;}
}
function readVipVisibility(profile:LocalProfile):CardVisibilitySelection{
  const fallback=defaultVisibility(profile),saved=readVisibility(vipVisibilityStorageKey,fallback);if(saved)return saved;
  try{const legacy=window.localStorage.getItem(vipModulesStorageKey);if(legacy){const parsed:unknown=JSON.parse(legacy);if(Array.isArray(parsed)){const modules=parsed.filter((id):id is string=>typeof id==='string');return{...fallback,modules,fields:fallback.fields.filter(field=>modules.includes(field.moduleId))};}}}catch{}
  return fallback;
}
function manualConfig(profile:LocalProfile,templateId:CardTemplateId,motion:Motion):ManualCardConfig{
  const now=new Date().toISOString();
  return {schemaVersion:1,id:'card_guest',kind:'manual',label:'我的名片',templateId,layout:getCardTemplate(templateId).layout,animation:motion,
    orderedModules:profile.modules.map(section=>({localModuleId:section.id,kind:section.kind,emphasis:'normal'})),createdAt:now,updatedAt:now};
}
function shareSelection(draft:LocalDraft,visibility:CardVisibilitySelection):ShareSelection{return{identity:visibility.identity,fields:[...visibility.fields,...draft.modules.filter(module=>module.kind==='contact').flatMap(module=>module.items.filter(item=>visibility.contacts.includes(item.id)).map(item=>({moduleId:module.id,itemId:item.id})))],assetIds:visibility.logo?draft.assets.map(asset=>asset.id):[]};}
export default function Home(){
  const [profile,setProfile]=useState<LocalProfile>(initial);
  const [selectedTemplate,setSelectedTemplate]=useState<CardTemplateId>(DEFAULT_CARD_TEMPLATE);
  const [selectedVipTemplate,setSelectedVipTemplate]=useState<CardTemplateId>(PRO_CARD_TEMPLATES[0].id);
  const [previewCard,setPreviewCard]=useState<CardKind>('free');
  const [freeVisibility,setFreeVisibility]=useState<CardVisibilitySelection>(()=>defaultVisibility(initial));
  const [vipVisibility,setVipVisibility]=useState<CardVisibilitySelection>(()=>defaultVisibility(initial));
  const [profileLoaded,setProfileLoaded]=useState(false);
  const [motion,setMotion]=useState<Motion>('float');
  const [demoReplayKey,setDemoReplayKey]=useState(0);
  const [saveStatus,setSaveStatus]=useState('');
  const [logo,setLogo]=useState<LocalAsset|null>(null);
  const [privateContacts,setPrivateContacts]=useState<ProfileItem[]>([]);
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  useEffect(()=>{
    let wasUnlocked=false;
    const timer=setInterval(()=>{
      const unlocked=vault.isUnlocked();
      if(unlocked===wasUnlocked)return;wasUnlocked=unlocked;
      if(!unlocked){setLogo(null);setPrivateContacts([]);return;}
      void Promise.all([vault.readCardLogo(),vault.readContacts()]).then(([asset,values])=>{if(vault.isUnlocked()){setLogo(asset);setPrivateContacts(contactItems(values));}}).catch(()=>{});
    },500);
    return()=>clearInterval(timer);
  },[vault]);
  useEffect(()=>{
    setSelectedTemplate(getSavedTemplate());setSelectedVipTemplate(getSavedVipTemplate());
    let active=true;
    vault.loadPublicProfile().then(saved=>{if(!active)return;setProfile(saved);const fallback=defaultVisibility(saved);setFreeVisibility(readVisibility(freeVisibilityStorageKey,fallback)??fallback);setVipVisibility(readVipVisibility(saved));setProfileLoaded(true);}).catch(()=>{if(active)setProfileLoaded(true);});
    return()=>{active=false;};
  },[vault]);
  useEffect(()=>{if(!profileLoaded)return;const timer=window.setTimeout(()=>{void vault.saveOrdinaryProfile(profile).then(async()=>{setSaveStatus('已自动保存在此浏览器。');try{await new PreparedStore(vault.storage).markStale(profile.revision);}catch{setSaveStatus('已保存到此浏览器；旧的专属卡片需要重新生成。');}}).catch(()=>setSaveStatus('自动保存失败；请保持此页面打开并重试。'));},700);return()=>window.clearTimeout(timer);},[profile,profileLoaded,vault]);
  const activeVisibility=previewCard==='free'?freeVisibility:vipVisibility,activeTemplate=previewCard==='free'?selectedTemplate:selectedVipTemplate;
  const visibleDraft=useMemo(()=>{
    if(!profile.identity.name?.trim())return null;
    const base=createManualDraft(profile,manualConfig(profile,activeTemplate,motion)),contactModule=privateContacts.length?{id:CONTACT_MODULE_ID,kind:'contact',title:'联系方式',items:privateContacts}:null;
    return{...base,modules:[...base.modules.filter(section=>section.id!==CONTACT_MODULE_ID),...(contactModule?[contactModule]:[])],assets:logo?[logo]:[]};
  },[profile,activeTemplate,motion,privateContacts,logo]);
  const activeShareSelection=useMemo(()=>visibleDraft?shareSelection(visibleDraft,activeVisibility):null,[visibleDraft,activeVisibility]);
  function updateProfile(next:LocalProfile){
    const existingModules=new Map(profile.modules.map(module=>[module.id,module])),currentIds=new Set(next.modules.filter(module=>module.kind!=='contact').map(module=>module.id));
    const hasContent=(module:LocalProfile['modules'][number]|undefined)=>Boolean(module?.items.some(item=>item.sensitivity==='ordinary'&&item.value.trim()));
    const addedFields=next.modules.filter(module=>module.kind!=='contact'&&currentIds.has(module.id)).flatMap(module=>module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()&&(!hasContent(existingModules.get(module.id))||!existingModules.get(module.id)?.items.some(previous=>previous.id===item.id&&previous.value.trim()))).map(item=>({moduleId:module.id,itemId:item.id})));
    const reconcile=(current:CardVisibilitySelection):CardVisibilitySelection=>{const fields=[...current.fields.filter(field=>next.modules.some(module=>module.id===field.moduleId&&module.items.some(item=>item.id===field.itemId))),...addedFields];const modules=next.modules.filter(module=>module.kind!=='contact'&&module.items.some(item=>item.sensitivity==='ordinary'&&item.value.trim())&&module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()).every(item=>fields.some(field=>field.moduleId===module.id&&field.itemId===item.id))).map(module=>module.id);return{...current,fields,modules};};
    setFreeVisibility(current=>reconcile(current));setVipVisibility(current=>reconcile(current));
    if(addedFields.length||profile.modules.filter(module=>module.kind!=='contact').some(module=>!currentIds.has(module.id)))try{const free=reconcile(freeVisibility),vip=reconcile(vipVisibility);window.localStorage.setItem(freeVisibilityStorageKey,JSON.stringify(free));window.localStorage.setItem(vipVisibilityStorageKey,JSON.stringify(vip));window.localStorage.setItem(vipModulesStorageKey,JSON.stringify(vip.modules));}catch{}
    setProfile(next);setSaveStatus('正在保存…');
  }
  async function chooseTemplate(templateId:CardTemplateId){
    setSelectedTemplate(templateId);
    try{window.localStorage.setItem(templateStorageKey,templateId);}catch{}
  }
  function updateVisibility(kind:CardKind,value:CardVisibilitySelection){
    if(kind==='free')setFreeVisibility(value);else setVipVisibility(value);
    try{window.localStorage.setItem(kind==='free'?freeVisibilityStorageKey:vipVisibilityStorageKey,JSON.stringify(value));if(kind==='vip')window.localStorage.setItem(vipModulesStorageKey,JSON.stringify(value.modules));}catch{}
  }
  return <main className="workspace">
    <header className="site-header"><Link className="wordmark" href="/" aria-label="Neymi 首页">neymi<span aria-hidden="true">.</span></Link>
      <nav className="site-nav" aria-label="账户与状态"><span className="local-status"><span/>本机保存 · 无需注册</span><Link href="/account">账户登录</Link></nav>
    </header>
    <section className="hero studio-hero"><div><h1>制作名片</h1>
      <p className="intro">先完成一张免费的基础名片，再按需要补充展示内容。分享前，你可以逐项确认公开信息。</p></div>
      <a className="hero-action" href="#card-form">{profile.identity.name?.trim()?'继续编辑':'开始填写'} <span aria-hidden="true">↓</span></a></section>
    <div className="home-example"><DemoCard templateId={selectedTemplate} motion={motion} replayKey={demoReplayKey} homeExample showReplay onReplay={()=>setDemoReplayKey(key=>key+1)}/></div>
    <div className="studio studio-workspace" id="card-form">
      <nav className="studio-nav" aria-label="工作区">
        <span className="studio-nav-label">工作区</span>
        <Link className="studio-nav-link current" href="/" aria-current="page"><span aria-hidden="true">✦</span> 制作名片</Link>
        <Link className="studio-nav-link" href="/beyond"><span aria-hidden="true">◇</span> Beyond 名片</Link>
        <Link className="studio-nav-link" href="/vip"><span aria-hidden="true">✧</span> VIP 名片</Link>
        <Link className="studio-nav-link" href="/cards"><span aria-hidden="true">▤</span> 我的卡片库</Link>
      </nav>
      <div className="editor-column"><CardEditor profile={profile} onChange={updateProfile} motion={motion} onMotion={setMotion}
        freeTemplateContent={<TemplatePicker selected={selectedTemplate} onSelect={chooseTemplate} mode="free"/>}
        baseContent={<ContactPanel vault={vault} profile={profile} onSaved={saved=>{setProfile(saved);void vault.readContacts().then(values=>setPrivateContacts(contactItems(values))).catch(()=>setPrivateContacts([]));}}/>}/></div>
      <aside className="preview-panel">
        <div className="preview-heading"><div><h2>实时预览</h2><p>{visibleDraft?`${previewCard==='free'?'Free':'VIP'} 卡片；更改显示选项会立即更新。`:'填写展示名称后，你的名片会显示在这里。'}</p></div>{visibleDraft&&<span className="example-tag live-tag">{previewCard==='free'?'Free':'VIP'} 预览</span>}</div>
        {visibleDraft?<CardRenderer draft={visibleDraft} visibleIdentityFields={activeVisibility.identity} visibleFieldIds={activeVisibility.fields.map(fieldKey)} visibleContactIds={activeVisibility.contacts} showLogo={activeVisibility.logo}/>:<div className="preview-empty"><span aria-hidden="true">✦</span><p>从左侧填写展示名称，开始制作。</p></div>}
      </aside>
      <CardVisibilityPanel profile={profile} contacts={privateContacts} logoAvailable={Boolean(logo)} activeCard={previewCard} freeSelection={freeVisibility} vipSelection={vipVisibility} onCardChange={setPreviewCard} onSelectionChange={updateVisibility}/>
    </div>
    <div className="step-intro share-step-intro"><h3 id="studio-finish-title">Step 4 分享名片</h3><p>右侧勾选的内容会用于预览、链接和下载；联系方式默认不公开。</p></div>
    <section className="studio-finish quick-share-step" aria-labelledby="studio-finish-title">
      {visibleDraft&&activeShareSelection?<QuickShare draft={visibleDraft} selection={activeShareSelection} cardKind={previewCard}/>:<p className="share-empty">填写展示名称后，即可分享或下载名片。</p>}
      {saveStatus&&<p className="save-status" role="status">{saveStatus}</p>}
    </section>
    <section className="assistant-panel studio-aftercare" aria-labelledby="assistant-title"><div className="assistant-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3v6m0 14v6M3 16h6m14 0h6M6.8 6.8 11 11m10 10 4.2 4.2m0-19.4L21 11m-10 10-4.2 4.2"/><circle cx="16" cy="16" r="5"/></svg></div><div className="assistant-copy"><h2 id="assistant-title">为具体的人做好准备</h2><p>梳理自己的故事，再为关键联系人准备交流重点。</p></div><Link className="assistant-link" href="/beyond">进入 Beyond 名片 <span aria-hidden="true">→</span></Link></section>
    <nav className="mobile-work-nav" aria-label="主要功能"><Link href="/" aria-current="page"><span aria-hidden="true">✦</span>制作名片</Link><Link href="/beyond"><span aria-hidden="true">◇</span>Beyond 名片</Link><Link href="/vip"><span aria-hidden="true">✧</span>VIP 名片</Link><Link href="/cards"><span aria-hidden="true">▤</span>我的卡片库</Link></nav>
    <footer className="site-footer"><span>免注册 · 本地优先 · 分享由你决定</span><Link href="/cards?tab=received">查看收到的卡片</Link></footer>
  </main>;
}
