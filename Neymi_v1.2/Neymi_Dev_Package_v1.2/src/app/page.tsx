'use client';
import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {AccountEntry} from '../modules/auth/account-entry';
import type {FieldRef,LocalAsset,LocalDraft,LocalProfile,ManualCardConfig,Motion,ProfileItem,ShareSelection} from '../domain/types';
import {CardEditor,type StudioStep} from '../modules/card/editor';
import {LogoPanel} from '../modules/card/logo-panel';
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
import {useAssistant} from '../modules/assistant/provider';
import {createGuidedDraft} from '../modules/card/guided-draft';
import {GuidedCardStore,type GuidedCardRecord} from '../modules/card/guided-store';
import type {StudioNavigationRequest} from '../modules/card/studio-bridge';

const initial:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};
const templateStorageKey='neymi.card-template',vipTemplateStorageKey='neymi.vip-card-template',vipModulesStorageKey='neymi.vip-visible-modules';
const freeVisibilityStorageKey='neymi.free-card-visibility.v1',vipVisibilityStorageKey='neymi.vip-card-visibility.v1';
const templateChangeEvent='neymi:template-change';
type CardKind='free'|'vip';
function subscribeTemplateChanges(onChange:()=>void){window.addEventListener('storage',onChange);window.addEventListener(templateChangeEvent,onChange);return()=>{window.removeEventListener('storage',onChange);window.removeEventListener(templateChangeEvent,onChange);};}
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
function purposeLabel(value:string|undefined){const labels:Record<string,string>={job:'求职展示',partner:'商务合作',sales:'业务拓展',fundraise:'项目融资',research:'专业交流',social:'日常社交',general:'通用名片',other:'其他用途'};return labels[value??'']??'个人名片';}
function audienceLabel(value:string|undefined){const labels:Record<string,string>={person:'具体联系人',group:'一类联系人',general:'通用受众'};return labels[value??'']??'联系人';}
export default function Home(){
  const [profile,setProfile]=useState<LocalProfile>(initial);
  const [guidedDraft,setGuidedDraft]=useState<LocalDraft|null>(null);
  const selectedTemplate=useSyncExternalStore(subscribeTemplateChanges,getSavedTemplate,()=>DEFAULT_CARD_TEMPLATE);
  const selectedVipTemplate=useSyncExternalStore(subscribeTemplateChanges,getSavedVipTemplate,()=>PRO_CARD_TEMPLATES[0].id);
  const [previewCard,setPreviewCard]=useState<CardKind>('free');
  const [previewDevice,setPreviewDevice]=useState<'desktop'|'mobile'>('desktop');
  const [activeEditorStep,setActiveEditorStep]=useState<StudioStep>('content');
  const [freeVisibility,setFreeVisibility]=useState<CardVisibilitySelection>(()=>defaultVisibility(initial));
  const [vipVisibility,setVipVisibility]=useState<CardVisibilitySelection>(()=>defaultVisibility(initial));
  const [guidedVisibility,setGuidedVisibility]=useState<CardVisibilitySelection>(()=>defaultVisibility(initial));
  const [profileLoaded,setProfileLoaded]=useState(false);
  const [motion,setMotion]=useState<Motion>('float');
  const [mobilePane,setMobilePane]=useState<'edit'|'preview'>('edit');
  const {openAssistant,registerStudioApply,registerStudioNavigate}=useAssistant();
  const editorColumnRef=useRef<HTMLDivElement>(null),shareSectionRef=useRef<HTMLDivElement>(null);
  const [saveStatus,setSaveStatus]=useState('');
  const [shareNavigation,setShareNavigation]=useState(0);
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
    let active=true;
    vault.loadPublicProfile().then(saved=>{if(!active)return;setProfile(saved);const fallback=defaultVisibility(saved),selection=readVisibility(freeVisibilityStorageKey,fallback)??fallback;setFreeVisibility(selection);setVipVisibility(readVipVisibility(saved));setProfileLoaded(true);}).catch(()=>{if(active)setProfileLoaded(true);});
    return()=>{active=false;};
  },[vault]);
  useEffect(()=>{if(!profileLoaded)return;const timer=window.setTimeout(()=>{void vault.saveOrdinaryProfile(profile).then(async()=>{setSaveStatus('已自动保存在此浏览器。');try{await new PreparedStore(vault.storage).markStale(profile.revision);}catch{setSaveStatus('已保存到此浏览器；旧的专属卡片需要重新生成。');}}).catch(()=>setSaveStatus('自动保存失败；请保持此页面打开并重试。'));},700);return()=>window.clearTimeout(timer);},[profile,profileLoaded,vault]);
  const activeVisibility=guidedDraft?guidedVisibility:previewCard==='free'?freeVisibility:vipVisibility,activeTemplate=previewCard==='free'?selectedTemplate:selectedVipTemplate;
  const previewProfile:LocalProfile=guidedDraft?{...profile,identity:{...profile.identity,...guidedDraft.identity},modules:guidedDraft.modules,assets:guidedDraft.assets}:profile;
  const visibleDraft=useMemo(()=>{
    if(guidedDraft)return guidedDraft;
    if(!profile.identity.name?.trim())return null;
    const base=createManualDraft(profile,manualConfig(profile,activeTemplate,motion)),contactModule=privateContacts.length?{id:CONTACT_MODULE_ID,kind:'contact',title:'联系方式',items:privateContacts}:null;
    return{...base,modules:[...base.modules.filter(section=>section.id!==CONTACT_MODULE_ID),...(contactModule?[contactModule]:[])],assets:logo?[logo]:[]};
  },[guidedDraft,profile,activeTemplate,motion,privateContacts,logo]);
  const activeShareSelection=useMemo(()=>visibleDraft?shareSelection(visibleDraft,activeVisibility):null,[visibleDraft,activeVisibility]);
  const updateProfile=useCallback((next:LocalProfile)=>{
    const existingModules=new Map(profile.modules.map(module=>[module.id,module])),currentIds=new Set(next.modules.filter(module=>module.kind!=='contact').map(module=>module.id));
    const hasContent=(module:LocalProfile['modules'][number]|undefined)=>Boolean(module?.items.some(item=>item.sensitivity==='ordinary'&&item.value.trim()));
    const addedFields=next.modules.filter(module=>module.kind!=='contact'&&currentIds.has(module.id)).flatMap(module=>module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()&&(!hasContent(existingModules.get(module.id))||!existingModules.get(module.id)?.items.some(previous=>previous.id===item.id&&previous.value.trim()))).map(item=>({moduleId:module.id,itemId:item.id})));
    const reconcile=(current:CardVisibilitySelection):CardVisibilitySelection=>{const fields=[...current.fields.filter(field=>next.modules.some(module=>module.id===field.moduleId&&module.items.some(item=>item.id===field.itemId))),...addedFields];const modules=next.modules.filter(module=>module.kind!=='contact'&&module.items.some(item=>item.sensitivity==='ordinary'&&item.value.trim())&&module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()).every(item=>fields.some(field=>field.moduleId===module.id&&field.itemId===item.id))).map(module=>module.id);return{...current,fields,modules};};
    setFreeVisibility(current=>reconcile(current));setVipVisibility(current=>reconcile(current));
    if(addedFields.length||profile.modules.filter(module=>module.kind!=='contact').some(module=>!currentIds.has(module.id)))try{const free=reconcile(freeVisibility),vip=reconcile(vipVisibility);window.localStorage.setItem(freeVisibilityStorageKey,JSON.stringify(free));window.localStorage.setItem(vipVisibilityStorageKey,JSON.stringify(vip));window.localStorage.setItem(vipModulesStorageKey,JSON.stringify(vip.modules));}catch{}
    setProfile(next);setSaveStatus('正在保存…');
  },[freeVisibility,profile,vipVisibility]);
  useEffect(()=>registerStudioApply(async({proposal,slots,evidence,confirmedRewriteKeys})=>{
    if(!slots.displayName?.trim())throw new Error('请先确认名片显示名称。');
    const draft=createGuidedDraft(profile,proposal,slots,evidence,confirmedRewriteKeys),projected:LocalProfile={...profile,identity:{...profile.identity,...draft.identity},modules:draft.modules,assets:draft.assets};
    const selection=defaultVisibility(projected),record:GuidedCardRecord={id:draft.id,draft,purposeLabel:slots.desiredOutcome?.trim()||purposeLabel(slots.purposeType),audienceLabel:slots.audienceRole?.trim()||audienceLabel(slots.audienceMode),selection:{identity:selection.identity,fields:selection.fields,assetIds:selection.logo?draft.assets.map(asset=>asset.id):[]},createdAt:new Date().toISOString()};
    await new GuidedCardStore(vault.storage).save(record);
    setGuidedDraft(draft);setGuidedVisibility(selection);
    try{window.localStorage.setItem(templateStorageKey,proposal.templateId);window.dispatchEvent(new Event(templateChangeEvent));}catch{}
    setPreviewCard('free');setActiveEditorStep('visibility');setMobilePane('preview');
  }),[registerStudioApply,profile,vault]);
  const navigateStudio=useCallback((request:StudioNavigationRequest)=>{
    setActiveEditorStep(request.step);
    if(request.target==='share'){setMobilePane('preview');setShareNavigation(value=>value+1);return;}
    setMobilePane('edit');requestAnimationFrame(()=>editorColumnRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
  },[]);
  useEffect(()=>registerStudioNavigate(navigateStudio),[navigateStudio,registerStudioNavigate]);
  useEffect(()=>{if(!shareNavigation)return;requestAnimationFrame(()=>shareSectionRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'}));},[shareNavigation,mobilePane]);
  const showShare=useCallback(()=>{setMobilePane('preview');setShareNavigation(value=>value+1);},[]);
  async function chooseTemplate(templateId:CardTemplateId){
    try{window.localStorage.setItem(templateStorageKey,templateId);window.dispatchEvent(new Event(templateChangeEvent));setPreviewCard('free');}catch{}
  }
  async function chooseVipTemplate(templateId:CardTemplateId){try{window.localStorage.setItem(vipTemplateStorageKey,templateId);window.dispatchEvent(new Event(templateChangeEvent));setPreviewCard('vip');}catch{}}
  function updateVisibility(kind:CardKind,value:CardVisibilitySelection){
    void kind;if(guidedDraft){setGuidedVisibility(value);void new GuidedCardStore(vault.storage).list().then(records=>{const existing=records.find(record=>record.id===guidedDraft.id);if(existing)return new GuidedCardStore(vault.storage).save({...existing,selection:{identity:value.identity,fields:value.fields,assetIds:value.logo?guidedDraft.assets.map(asset=>asset.id):[]}});}).catch(()=>setSaveStatus('展示设置未能保存到 AI 名片草稿。'));return;}
    setFreeVisibility(value);setVipVisibility(value);
    try{window.localStorage.setItem(freeVisibilityStorageKey,JSON.stringify(value));window.localStorage.setItem(vipVisibilityStorageKey,JSON.stringify(value));window.localStorage.setItem(vipModulesStorageKey,JSON.stringify(value.modules));}catch{}
  }
  return <main className="workspace">
    <header className="site-header studio-app-header"><Link className="wordmark" href="/" aria-label="Neymi 首页">neymi<span aria-hidden="true">.</span></Link>
      <nav className="site-nav studio-global-nav" aria-label="主要功能"><Link href="/" aria-current="page">制作名片</Link><Link href="/beyond">Beyond</Link><Link href="/cards">我的卡片库</Link></nav>
      <nav className="site-nav studio-account-nav" aria-label="账户与助手"><span className="local-status"><span/>本机已保存</span><button type="button" className="studio-ai-open" onClick={()=>openAssistant()}>✦ AI 名片助理</button><AccountEntry/></nav>
    </header>
    <div className={`studio studio-workspace${mobilePane==='preview'?' mobile-preview-active':''}`} id="card-form" data-active-step={activeEditorStep} data-mobile-pane={mobilePane}>
      <div className="mobile-studio-view-switch" role="group" aria-label="切换名片编辑或预览"><button type="button" aria-pressed={mobilePane==='edit'} onClick={()=>setMobilePane('edit')}>编辑</button><button type="button" aria-pressed={mobilePane==='preview'} onClick={()=>setMobilePane('preview')}>预览</button></div>
      <div className="editor-column" ref={editorColumnRef}>{guidedDraft&&<div className="guided-draft-notice" role="status"><span>正在预览已保存的 AI 名片草稿</span><button type="button" onClick={()=>setGuidedDraft(null)}>回到手动名片</button></div>}<CardEditor profile={profile} onChange={next=>{setGuidedDraft(null);updateProfile(next);}} motion={motion} onMotion={setMotion} activeStep={activeEditorStep} onStepChange={setActiveEditorStep} saveStatus={saveStatus} onShareRequested={showShare}
        freeTemplateContent={<TemplatePicker selected={selectedTemplate} onSelect={chooseTemplate} mode="free"/>}
        vipTemplateContent={<TemplatePicker selected={selectedVipTemplate} onSelect={chooseVipTemplate} mode="pro"/>}
        baseContent={<ContactPanel vault={vault} profile={profile} onSaved={saved=>{setProfile(saved);void vault.readContacts().then(values=>setPrivateContacts(contactItems(values))).catch(()=>setPrivateContacts([]));}}/>}
        logoContent={<LogoPanel vault={vault} logo={logo} onChanged={setLogo}/>}
        visibilityContent={<CardVisibilityPanel profile={previewProfile} contacts={guidedDraft?[]:privateContacts} logoAvailable={guidedDraft?false:Boolean(logo)} activeCard={previewCard} freeSelection={guidedDraft?guidedVisibility:freeVisibility} vipSelection={guidedDraft?guidedVisibility:vipVisibility} onCardChange={setPreviewCard} onSelectionChange={updateVisibility} singleList inline hideHeading/>}
        /></div>
      <aside className="preview-panel" data-preview-device={previewDevice}>
        <div className="preview-heading"><div><h2>你的名片</h2><p>{visibleDraft?'实时预览 · 更改后即时更新':'填写展示名称后，名片会显示在这里。'}</p></div><div className="preview-device-switch" role="group" aria-label="预览尺寸"><button type="button" aria-pressed={previewDevice==='desktop'} onClick={()=>setPreviewDevice('desktop')}>桌面</button><button type="button" aria-pressed={previewDevice==='mobile'} onClick={()=>setPreviewDevice('mobile')}>手机</button></div></div>
        {visibleDraft?<CardRenderer draft={visibleDraft} visibleIdentityFields={activeVisibility.identity} visibleFieldIds={activeVisibility.fields.map(fieldKey)} visibleContactIds={activeVisibility.contacts} showLogo={activeVisibility.logo}/>:<div className="preview-empty"><span aria-hidden="true">✦</span><p>填写展示名称后，名片会显示在这里。</p></div>}
        <div className="preview-caption">每次修改，即时呈现</div>
        <section className="studio-preview-share" id="studio-share-final" ref={shareSectionRef} aria-label="完成并分享">{visibleDraft&&activeShareSelection?<QuickShare draft={visibleDraft} selection={activeShareSelection} cardKind={previewCard} compact/>:<p className="share-empty">填写展示名称后即可分享。</p>}</section>
      </aside>
    </div>
    <nav className="mobile-work-nav" aria-label="主要功能"><Link href="/" aria-current="page"><span aria-hidden="true">✦</span>制作名片</Link><Link href="/beyond"><span aria-hidden="true">◇</span>Beyond 名片</Link><Link href="/cards"><span aria-hidden="true">▤</span>我的卡片库</Link></nav>
    <footer className="site-footer"><span>免注册 · 本地优先 · 分享由你决定</span><Link href="/cards?tab=received">查看收到的卡片</Link></footer>
  </main>;
}
