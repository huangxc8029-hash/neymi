'use client';
import {useEffect,useId,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import Link from 'next/link';
import type {ContentSourceRef,LocalAsset,LocalDraft,LocalProfile,ManualCardConfig,Motion,ProfileItem,ProfileModule} from '../../domain/types';
import {IndexedDbVaultStorage} from '../vault/storage';
import {createVault} from '../vault/vault';
import {LogoPanel} from './logo-panel';
import {ContactPanel} from './contact-panel';
import {CONTACT_MODULE_ID,contactItems} from './contacts';
import {MotionPicker} from './motion-picker';
import {DemoCard} from './demo-card';
import {CardRenderer} from './renderer';
import {CardVisibilityPanel,type CardVisibilitySelection} from './visibility-panel';
import {TemplatePicker} from './template-picker';
import {PRO_CARD_TEMPLATES,getCardTemplate,type CardTemplateId,isCardTemplateId} from './templates';
import {SharePreview} from '../sharing/preview';
import {ContentImportPanel} from '../content/import-panel';
import type {ContentImportDocument} from '../content/types';
import {VoiceCapture} from '../content/voice-capture';
import {ModuleProposalAssistant} from '../content/module-proposal-assistant';
import {normalizeCardUrl} from './links';
import {credentialCatalog,socialCatalog,universityCatalog,type CatalogOption} from './profile-catalogs';
import Image from 'next/image';

const initial:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};
const templateKey='neymi.vip-card-template',visibleKey='neymi.vip-visible-modules',visibilitySelectionKey='neymi.vip-card-visibility';
const initialVipTemplate:CardTemplateId=PRO_CARD_TEMPLATES[0].id;
const socialPlatforms=socialCatalog.map(item=>item.name);
type SocialRow={id:string;platform:string;url:string};
const infoFields=[
  {kind:'hobby',title:'Hobby · 爱好',label:'写下你的爱好'},
  {kind:'interest',title:'Interest · 兴趣',label:'写下你关注的领域'},
  {kind:'skills',title:'Talents · 才能',label:'写下你的特长'},
  {kind:'credential',title:'Certificate · 证书',label:'写下证书或专业资质'},
  {kind:'university',title:'University · 院校',label:'写下毕业院校或学习经历'},
  {kind:'other',title:'Others · 其他',label:'补充你希望展示的信息'},
];

function fieldKey(field:{moduleId:string;itemId:string}){return `${field.moduleId}/${field.itemId}`;}
function defaultVisibility(profile:LocalProfile):CardVisibilitySelection{
  const fields=profile.modules.filter(module=>module.kind!=='contact').flatMap(module=>module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()).map(item=>({moduleId:module.id,itemId:item.id})));
  return{identity:(['name','company','role'] as const).filter(key=>Boolean(profile.identity[key]?.trim())),modules:[...new Set(fields.map(field=>field.moduleId))],fields,contacts:[],logo:true};
}
function restoreVisibility(profile:LocalProfile):CardVisibilitySelection{
  const defaults=defaultVisibility(profile);
  try{
    const stored=localStorage.getItem(visibilitySelectionKey),legacy=localStorage.getItem(visibleKey),value:unknown=stored?JSON.parse(stored):legacy?JSON.parse(legacy):null;
    if(value===null)return defaults;
    const validFields=profile.modules.filter(module=>module.kind!=='contact').flatMap(module=>module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()).map(item=>({moduleId:module.id,itemId:item.id}))),validKeys=new Set(validFields.map(fieldKey));
    const requested=Array.isArray(value)?validFields.filter(field=>value.includes(field.moduleId)):typeof value==='object'&&value!==null&&Array.isArray((value as CardVisibilitySelection).fields)?((value as CardVisibilitySelection).fields.filter(field=>field&&typeof field.moduleId==='string'&&typeof field.itemId==='string'&&validKeys.has(fieldKey(field)))):defaults.fields;
    const selected=new Set(requested.map(fieldKey)),modules=[...new Set(validFields.filter(field=>selected.has(fieldKey(field))).map(field=>field.moduleId))].filter(id=>{const refs=validFields.filter(field=>field.moduleId===id);return refs.length>0&&refs.every(field=>selected.has(fieldKey(field)));});
    const record=typeof value==='object'&&value!==null?value as Partial<CardVisibilitySelection>:null;
    return{identity:record?.identity?.filter((key):key is 'name'|'company'|'role'=>['name','company','role'].includes(key)&&Boolean(profile.identity[key]?.trim()))??defaults.identity,modules,fields:requested,contacts:record?.contacts?.filter(id=>typeof id==='string'&&id.startsWith('contact_'))??[],logo:typeof record?.logo==='boolean'?record.logo:true};
  }catch{return defaults;}
}
function makeDraft(profile:LocalProfile,templateId:CardTemplateId,visibility:CardVisibilitySelection,logo:LocalAsset|null,motion:Motion,contacts:ProfileItem[]):LocalDraft{
  const now=new Date().toISOString(),template=getCardTemplate(templateId);
  const fields=new Set(visibility.fields.map(fieldKey)),identity={...profile.identity};
  (['name','company','role'] as const).forEach(key=>{if(!visibility.identity.includes(key))delete identity[key];});
  const config:ManualCardConfig={schemaVersion:1,id:'vip_card',kind:'manual',label:'VIP 名片',templateId,layout:template.layout,animation:motion,orderedModules:profile.modules.filter(module=>module.kind!=='contact'&&module.items.some(item=>fields.has(fieldKey({moduleId:module.id,itemId:item.id})))).map(module=>({localModuleId:module.id,kind:module.kind,emphasis:'normal'})),createdAt:now,updatedAt:now};
  const draft=buildDraft({...profile,identity},config,fields),visibleContacts=contacts.filter(item=>visibility.contacts.includes(item.id));
  return {...draft,modules:[...draft.modules,...(visibleContacts.length?[{id:CONTACT_MODULE_ID,kind:'contact',title:'联系方式',items:visibleContacts}]:[])],assets:logo&&visibility.logo?[logo]:[]};
}
function buildDraft(profile:LocalProfile,config:ManualCardConfig,fields:Set<string>):LocalDraft{
  const sections=new Map(profile.modules.map(module=>[module.id,module]));
  return{id:config.id,profileRevision:profile.revision,config,identity:{...profile.identity},modules:config.orderedModules.flatMap(ref=>{const section=sections.get(ref.localModuleId);return section?[{...section,items:section.items.filter(item=>item.sensitivity==='ordinary'&&fields.has(fieldKey({moduleId:section.id,itemId:item.id})))}]:[];}),assets:[]};
}

function catalogText(value:string){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
function catalogInitials(value:string){return value.split(/[\s,./–—-]+/).map(word=>catalogText(word).slice(0,1)).join('');}
type CatalogPickerProps={label:string;value:string;options:CatalogOption[];onChange:(value:string)=>void;placeholder:string;maxLength?:number};
function CatalogPicker({label,value,options,onChange,placeholder,maxLength=2000}:CatalogPickerProps){
  const id=useId(),listId=`catalog-options-${id}`,searchRef=useRef<HTMLInputElement>(null),[query,setQuery]=useState(''),[open,setOpen]=useState(false),[activeIndex,setActiveIndex]=useState(-1);
  const normalizedQuery=catalogText(query),filtered=useMemo(()=>options.filter(item=>!normalizedQuery||[item.name,...item.searchTerms].some(term=>catalogText(term).includes(normalizedQuery))||catalogInitials(item.name).startsWith(normalizedQuery)),[options,normalizedQuery]);
  const exactMatch=options.some(item=>[item.name,...item.searchTerms].some(term=>catalogText(term)===normalizedQuery));
  const showCustom=Boolean(query.trim())&&!exactMatch,total=filtered.length+(showCustom?1:0),selected=options.find(item=>item.name===value);
  function choose(next:string){onChange(next);setQuery('');setOpen(false);setActiveIndex(0);}
  function onSearchKeyDown(event:KeyboardEvent<HTMLInputElement>){
    if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);setActiveIndex(index=>!open||index<0?0:Math.min(index+1,Math.max(0,total-1)));}
    else if(event.key==='ArrowUp'){event.preventDefault();setOpen(true);setActiveIndex(index=>!open||index<0?Math.max(0,total-1):Math.max(0,index-1));}
    else if(event.key==='Enter'&&open){event.preventDefault();if(activeIndex>=0&&activeIndex<filtered.length&&filtered[activeIndex])choose(filtered[activeIndex].name);else if(normalizedQuery){const exact=options.find(item=>[item.name,...item.searchTerms].some(term=>catalogText(term)===normalizedQuery));if(exact)choose(exact.name);else if(filtered.length===1)choose(filtered[0].name);else if(showCustom)choose(query.trim());}}
    else if(event.key==='Escape')setOpen(false);
  }
  return <div className="catalog-picker" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false);}}>
    <div className="catalog-picker-controls">
      <input ref={searchRef} id={`${id}-search`} type="search" maxLength={maxLength} role="combobox" aria-label={`搜索${label}名称或首字母`} aria-autocomplete="list" aria-expanded={open} aria-controls={open?listId:undefined} aria-activedescendant={open&&total&&activeIndex>=0?`${listId}-option-${activeIndex}`:undefined} value={query} placeholder={placeholder} onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setActiveIndex(-1);setOpen(true);}} onKeyDown={onSearchKeyDown}/>
      <button className="catalog-picker-selected" type="button" aria-label={`选择${label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?listId:undefined} onClick={()=>{const next=!open;setOpen(next);if(next)searchRef.current?.focus();}}><span className="catalog-logo-mark" aria-hidden="true">{selected?.logoSrc&&<Image className={label.startsWith('社交平台')?'catalog-social-mark':''} src={selected.logoSrc} alt="" width={26} height={26} unoptimized/>}</span><span>{value||`选择${label}`}</span><span aria-hidden="true">⌄</span></button>
    </div>
    {open&&<div className="catalog-picker-menu" id={listId} role="listbox" aria-label={`${label}选项`}>
      {filtered.map((item,index)=><button id={`${listId}-option-${index}`} role="option" aria-selected={value===item.name} data-active={activeIndex===index} className="catalog-picker-option" type="button" key={item.id} onMouseDown={event=>event.preventDefault()} onMouseMove={()=>setActiveIndex(index)} onClick={()=>choose(item.name)}><span className="catalog-logo-mark" aria-hidden="true">{item.logoSrc&&<Image className={label.startsWith('社交平台')?'catalog-social-mark':''} src={item.logoSrc} alt="" width={26} height={26} unoptimized/>}</span><span>{item.name}</span>{item.rank&&<small>#{item.rank}</small>}</button>)}
      {showCustom&&<button id={`${listId}-option-${filtered.length}`} role="option" aria-selected={false} data-active={activeIndex===filtered.length} className="catalog-picker-option catalog-picker-custom" type="button" onMouseDown={event=>event.preventDefault()} onMouseMove={()=>setActiveIndex(filtered.length)} onClick={()=>choose(query.trim())}><span className="catalog-logo-mark" aria-hidden="true"/><span>使用“{query.trim()}”</span><small>自定义</small></button>}
      {!total&&<div className="catalog-picker-empty" role="option" aria-selected={false} aria-disabled="true">没有匹配项，可继续输入并添加自定义内容。</div>}
    </div>}
  </div>;
}

export function VipWorkspace(){
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  const [profile,setProfile]=useState(initial),[logo,setLogo]=useState<LocalAsset|null>(null),[template,setTemplate]=useState<CardTemplateId>(initialVipTemplate),[motion,setMotion]=useState<Motion>('float'),[replayKey,setReplayKey]=useState(0),[privateContacts,setPrivateContacts]=useState<ProfileItem[]>([]);
  const [vipVisibility,setVipVisibility]=useState<CardVisibilitySelection>({identity:[],modules:[],fields:[],contacts:[],logo:true}),[visibilityReady,setVisibilityReady]=useState(false),[documents,setDocuments]=useState<ContentImportDocument[]>([]),[typedText,setTypedText]=useState(''),[websiteDraft,setWebsiteDraft]=useState(''),[websiteError,setWebsiteError]=useState(''),[socialRows,setSocialRows]=useState<SocialRow[]>([{id:'social-row-1',platform:'微信',url:''}]),[message,setMessage]=useState(''),[recipientContext,setRecipientContext]=useState(''),[meetingPurpose,setMeetingPurpose]=useState('');
  const visibleIds=vipVisibility.modules,visibleContactIds=vipVisibility.contacts;
  useEffect(()=>{let active=true;void vault.loadPublicProfile().then(saved=>{if(!active)return;try{const savedTemplate=localStorage.getItem(templateKey);if(isCardTemplateId(savedTemplate))setTemplate(savedTemplate);}catch{}setProfile(saved);setWebsiteDraft(saved.modules.find(entry=>entry.kind==='website')?.items[0]?.value??'');const savedSocials=saved.modules.find(entry=>entry.kind==='social')?.items??[];if(savedSocials.length)setSocialRows(savedSocials.map((item,index)=>({id:`social-row-${index+1}`,platform:item.label,url:item.value})));setVipVisibility(restoreVisibility(saved));setVisibilityReady(true);}).catch(()=>{if(active)setVisibilityReady(true);});return()=>{active=false;};},[vault]);
  useEffect(()=>{if(!visibilityReady)return;try{localStorage.setItem(visibilitySelectionKey,JSON.stringify(vipVisibility));localStorage.setItem(visibleKey,JSON.stringify(visibleIds));}catch{}},[vipVisibility,visibleIds,visibilityReady]);
  useEffect(()=>{let wasUnlocked=false;const timer=setInterval(()=>{const unlocked=vault.isUnlocked();if(unlocked===wasUnlocked)return;wasUnlocked=unlocked;if(!unlocked){setLogo(null);setPrivateContacts([]);return;}void Promise.all([vault.readCardLogo(),vault.readContacts()]).then(([asset,values])=>{if(vault.isUnlocked()){setLogo(asset);setPrivateContacts(contactItems(values));}}).catch(()=>{});},500);return()=>clearInterval(timer);},[vault]);
  const draft=useMemo(()=>makeDraft(profile,template,vipVisibility,logo,motion,privateContacts),[profile,template,vipVisibility,logo,motion,privateContacts]);
  const moduleDisplayLimit=template.startsWith('mosaic-')?6:4;
  function commit(next:LocalProfile){setProfile(next);setVipVisibility(current=>{const selected=new Set(current.fields.map(fieldKey)),fields=current.fields.filter(field=>next.modules.some(module=>module.id===field.moduleId&&module.items.some(item=>item.id===field.itemId&&item.sensitivity==='ordinary'&&item.value.trim())));for(const module of next.modules.filter(entry=>entry.kind!=='contact')){const previous=profile.modules.find(entry=>entry.id===module.id),selectAll=!previous||current.modules.includes(module.id);if(selectAll)for(const item of module.items.filter(entry=>entry.sensitivity==='ordinary'&&entry.value.trim())){const field={moduleId:module.id,itemId:item.id};if(!previous||!selected.has(fieldKey(field)))fields.push(field);}}const selectedKeys=new Set(fields.map(fieldKey)),modules=next.modules.filter(module=>module.kind!=='contact'&&module.items.some(item=>item.sensitivity==='ordinary'&&item.value.trim())&&module.items.filter(item=>item.sensitivity==='ordinary'&&item.value.trim()).every(item=>selectedKeys.has(fieldKey({moduleId:module.id,itemId:item.id})))).map(module=>module.id);return{...current,modules,fields};});setMessage('');void vault.saveOrdinaryProfile(next).then(()=>setMessage('已保存在此浏览器。')).catch(()=>setMessage('保存失败，请稍后重试。'));}
  function updateField(kind:string,title:string,value:string,itemLabel=title){
    const existing=profile.modules.find(module=>module.kind===kind),id=existing?.id??`vip_${kind}`;
    const item={id:`${id}_value`,label:itemLabel,value,sensitivity:'ordinary' as const};
    const nextModule:ProfileModule={id,kind,title,items:value.trim()?[item]:[]};
    commit({...profile,revision:profile.revision+1,modules:existing?profile.modules.map(item=>item.id===id?nextModule:item):[...profile.modules,nextModule]});
  }
  function updateSocial(rows:SocialRow[]){
    setSocialRows(rows);
    const existing=profile.modules.find(module=>module.kind==='social'),id=existing?.id??'vip_social';
    const items=rows.flatMap((row,index)=>{if(!row.url.trim())return[];try{return[{id:`${id}_account_${index}`,label:row.platform,value:normalizeCardUrl(row.url),sensitivity:'ordinary' as const}];}catch{return[];}});
    const modules=items.length?(()=>{const nextModule:ProfileModule={id,kind:'social',title:'社交账号',items};return existing?profile.modules.map(item=>item.id===id?nextModule:item):[...profile.modules,nextModule];})():profile.modules.filter(item=>item.id!==id);
    commit({...profile,revision:profile.revision+1,modules});
  }
  function addSocialRow(){const platform=socialPlatforms.find(item=>!socialRows.some(row=>row.platform===item))??'其他';updateSocial([...socialRows,{id:`social-row-${crypto.randomUUID()}`,platform,url:''}]);}
  function addDocument(document?:ContentImportDocument){setDocuments(current=>document?[...current.filter(item=>item.sourceId!==document.sourceId),document]:current.filter(item=>item.sourceId!=='voice_note_local'));}
  function setManualText(value:string){setTypedText(value);const sourceId='vip_manual_text',createdAt=new Date().toISOString(),sourceRef:ContentSourceRef={kind:'user_text',sourceId,paragraph:1,createdAt};const doc:ContentImportDocument={sourceId,fileName:'手动输入',mime:'text/plain',kind:'text',untrusted:true,text:value,segments:value.trim()?[{text:value,sourceRef}]:[]};setDocuments(current=>value.trim()?[...current.filter(item=>item.sourceId!==sourceId),doc]:current.filter(item=>item.sourceId!==sourceId));}
  async function approveProposal(next:LocalProfile){commit(next);}
  async function chooseTemplate(id:CardTemplateId){setTemplate(id);try{localStorage.setItem(templateKey,id);}catch{}}
  function saveWebsite(){if(!websiteDraft.trim()){setWebsiteError('');updateField('website','个人网站','','URL');return;}try{const value=normalizeCardUrl(websiteDraft);setWebsiteError('');updateField('website','个人网站',value,'URL');}catch{setWebsiteError('请输入有效的 http/https 网址。');}}
  function updateIdentity(key:'name'|'company'|'role',value:string){commit({...profile,revision:profile.revision+1,identity:{...profile.identity,[key]:value.trim()?value:undefined}});}

  return <main className="workspace vip-workspace">
    <header className="site-header"><Link className="wordmark" href="/">neymi<span aria-hidden="true">.</span></Link><nav className="site-nav"><Link href="/beyond">Beyond 名片</Link><Link href="/account">账户登录</Link></nav></header>
    <section className="hero studio-hero"><div><h1>VIP 名片</h1><p className="intro">从真实资料出发，逐步完成更完整的个人展示。</p></div></section>
    <div className="vip-layout">
      <div className="vip-workflow">
        <MotionPicker value={motion} onChange={setMotion}/>
        <DemoCard expanded templateId={template} motion={motion} replayKey={replayKey} onReplay={()=>setReplayKey(key=>key+1)} moduleDisplayLimit={moduleDisplayLimit}/>
        <section className="workflow-step workflow-step-light"><div className="step-intro"><h2>Step 1 填写基础信息</h2><p>先说明你的身份；Logo 是可选项。</p></div><label>展示名称<input autoComplete="name" maxLength={120} value={profile.identity.name??''} placeholder="例如：林予安" onChange={event=>updateIdentity('name',event.target.value)}/></label><label>公司或团队（选填）<input maxLength={120} value={profile.identity.company??''} onChange={event=>updateIdentity('company',event.target.value)}/></label><label>角色（选填）<input maxLength={120} value={profile.identity.role??''} onChange={event=>updateIdentity('role',event.target.value)}/></label><LogoPanel vault={vault} logo={logo} onChanged={setLogo}/></section>
        <section className="workflow-step workflow-step-dark"><div className="step-intro"><h2>Step 2 添加联系方式</h2><p>与制作名片一致，联系方式加密保存在本机；是否加入卡片和是否公开都由你决定。</p></div><ContactPanel vault={vault} profile={profile} onSaved={saved=>{setProfile(saved);void vault.readContacts().then(values=>setPrivateContacts(contactItems(values))).catch(()=>setPrivateContacts([]));}}/></section>
        <section className="workflow-step workflow-step-light"><div className="step-intro"><h2>Step 3 整理故事与项目</h2><p>上传文件、录音或直接输入；AI 会依据你提供的原文整理候选，确认后才加入名片。</p></div>
          <ContentImportPanel onReady={addDocument} onClear={()=>setDocuments(current=>current.filter(item=>item.sourceId==='vip_manual_text'||item.sourceId==='voice_note_local'))}/>
          <VoiceCapture onTranscript={addDocument}/>
          <label className="vip-manual-label" htmlFor="vip-manual-text">打字输入更多介绍</label><textarea id="vip-manual-text" rows={5} maxLength={20000} value={typedText} onChange={event=>setManualText(event.target.value)} placeholder="例如：我的经历、项目背景、承担的角色、具体行动和可核实的结果。"/>
          <p className="vip-ai-output-note">AI 候选方向：我的故事、我的项目、案例介绍。AI 不会补写原文没有的经历或成果。</p>
          <div className="vip-purpose-fields" id="vip-recipient-context"><h3>这张卡准备给谁看？</h3><p>用对方的职业角色/团队，以及这次交流目的来挑选相关经历。不要填写对方私人信息或你不愿发送给 AI 的内容。</p><label>对方的职业角色或团队<input value={recipientContext} maxLength={160} onChange={event=>setRecipientContext(event.target.value)} placeholder="例如：独立游戏工作室的制作人"/></label><label>这次希望谈什么<input value={meetingPurpose} maxLength={240} onChange={event=>setMeetingPurpose(event.target.value)} placeholder="例如：讨论项目合作，重点展示我的关卡设计项目"/></label></div>
          <ModuleProposalAssistant documents={documents} profile={profile} onApply={approveProposal} purpose={`将已授权材料整理为我的故事、我的项目或案例介绍候选；只引用原文，并标明还缺少的证据。接收对象职业角色/团队：${recipientContext.trim()||'未指定'}。本次交流目的：${meetingPurpose.trim()||'一般自我介绍'}。这些信息只用于确定内容相关性，不得推断对象的敏感特征或补充未经来源支持的事实。`}/>
        </section>
        <section className="workflow-step workflow-step-dark"><div className="step-intro"><h2>Step 4 增加其他个人信息</h2><p>选填兴趣、资质、社交账号和个人网站。</p></div>
          <div className="vip-info-fields">{infoFields.map(field=>{const value=profile.modules.find(module=>module.kind===field.kind)?.items[0]?.value??'';if(field.kind==='university'||field.kind==='credential'){const options=field.kind==='university'?universityCatalog:credentialCatalog;return <div className="vip-catalog-field" key={field.kind}><span>{field.title}</span><CatalogPicker label={field.kind==='university'?'院校':'证书'} value={value} options={options} placeholder={field.kind==='university'?'输入院校名称或首字母':'输入证书名称或首字母'} onChange={next=>updateField(field.kind,field.title,next)}/></div>;}return <label key={field.kind}>{field.title}<textarea rows={2} maxLength={2000} value={value} placeholder={field.label} onChange={event=>updateField(field.kind,field.title,event.target.value)}/></label>;})}</div>
          <div className="vip-social-fields"><div className="vip-social-heading"><h3>社交账号</h3></div>{socialRows.map((row,index)=><div className="vip-social-row" key={row.id}><div className="vip-catalog-field"><span>平台</span><CatalogPicker label={`社交平台 ${index+1}`} value={row.platform} options={socialCatalog.filter(option=>option.name===row.platform||option.name==='其他'||!socialRows.some((item,rowIndex)=>rowIndex!==index&&item.platform===option.name))} placeholder="输入平台名称或首字母" maxLength={80} onChange={platform=>updateSocial(socialRows.map((item,rowIndex)=>rowIndex===index?{...item,platform}:item))}/></div><label>账号链接<input type="url" value={row.url} aria-label={`${row.platform}账号链接`} placeholder="输入完整主页链接，如 https://..." onChange={event=>updateSocial(socialRows.map((item,rowIndex)=>rowIndex===index?{...item,url:event.target.value}:item))}/></label><button type="button" className="vip-social-remove" aria-label={`移除${row.platform}`} onClick={()=>updateSocial(socialRows.filter((_,rowIndex)=>rowIndex!==index))}>移除</button></div>)}<button type="button" className="vip-social-add" onClick={addSocialRow}>＋ 添加社交账号</button></div>
          <label className="vip-website-field">个人网站<input type="url" value={websiteDraft} placeholder="https://" aria-invalid={Boolean(websiteError)} onChange={event=>setWebsiteDraft(event.target.value)} onBlur={saveWebsite}/>{websiteError&&<small role="alert">{websiteError}</small>}</label>
        </section>
        <section className="workflow-step workflow-step-light"><CardVisibilityPanel profile={profile} contacts={privateContacts} logoAvailable={Boolean(logo)} activeCard="vip" freeSelection={vipVisibility} vipSelection={vipVisibility} onCardChange={()=>{}} onSelectionChange={(_,selection)=>setVipVisibility(selection)} hideTabs inline heading="STEP 5 · VIP 名片" title="选择显示内容" description="控制身份、展示字段、联系方式和 Logo 是否出现在 VIP 卡面；取消勾选不会删除资料。"/></section>
        <section className="workflow-step workflow-step-dark"><div className="step-intro"><h2>Step 6 选择 VIP 模板</h2><p>先浏览模板类别，再查看大图并选择用于名片的模板。上方打开效果可同步预览到示例卡和你的卡片。</p></div><TemplatePicker selected={template} onSelect={chooseTemplate} mode="pro"/></section>
      </div>
    </div>
    <section className="vip-live-preview"><div className="preview-heading"><div><h2>实时预览</h2><p>随身份、展示内容、模板和打开效果即时更新。</p></div></div><CardRenderer draft={draft} moduleDisplayLimit={moduleDisplayLimit} visibleIdentityFields={vipVisibility.identity} visibleContactIds={visibleContactIds} showLogo={vipVisibility.logo}/>{message&&<p className="save-status" role="status">{message}</p>}</section>
    <section className="vip-share-section" aria-labelledby="vip-share-title"><div className="step-intro"><h2 id="vip-share-title">分享名片</h2><p>逐项确认公开内容后，再生成预览或分享文件。</p></div><SharePreview draft={draft} moduleDisplayLimit={moduleDisplayLimit}/></section>
    <section className="assistant-panel studio-aftercare" aria-labelledby="vip-beyond-title"><div className="assistant-mark" aria-hidden="true">✦</div><div className="assistant-copy"><h2 id="vip-beyond-title">为具体的人或活动做好准备</h2><p>继续整理个人故事，或针对活动中的关键联系人准备交流重点。</p></div><Link className="assistant-link" href="/beyond">进入 Beyond 名片 <span aria-hidden="true">→</span></Link></section>
    <nav className="mobile-work-nav" aria-label="主要功能"><Link href="/"><span aria-hidden="true">✦</span>制作名片</Link><Link href="/beyond"><span aria-hidden="true">◇</span>Beyond 名片</Link><Link href="/vip" aria-current="page"><span aria-hidden="true">✧</span>VIP 名片</Link><Link href="/cards"><span aria-hidden="true">▤</span>我的卡片库</Link></nav>
  </main>;
}
