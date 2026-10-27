'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {LocalDraft,ManualCardConfig} from '../../domain/types';
import {PreparedStore,type PreparedRecord} from '../prepared/store';
import {IndexedDbVaultStorage} from '../vault/storage';
import {createVault} from '../vault/vault';
import {UnlockPanel} from '../vault/unlock-panel';
import {Receiver} from '../sharing/receiver';
import {CardRenderer} from './renderer';
import {createManualDraft} from './create';
import {getCardTemplate,resolveCardTemplateId} from './templates';
import {projectShare} from '../sharing/projection';
import {serializeNcard} from '../sharing/export';

type LibraryTab='own'|'received';
const demoRecipientCards=[
  {id:'demo-recipient-1',recipient:'林予安',scenario:'创意科技论坛',headline:'把复杂产品，变成清晰体验',intro:'从用户研究到产品设计，和团队一起把重要想法落到真实场景。',template:'evergreen'},
  {id:'demo-recipient-2',recipient:'周屿',scenario:'一对一产品交流',headline:'让好想法更容易被理解',intro:'擅长把复杂的信息结构整理成自然、易用的产品体验。',template:'coast'},
  {id:'demo-recipient-3',recipient:'许知遥',scenario:'创业者早餐会',headline:'从问题出发，一起做好产品',intro:'关注早期产品定位、用户研究与团队协作。',template:'lilac'},
];
function DemoRecipientCard({card}:{card:typeof demoRecipientCards[number]}){
  return <article className="wallet-recipient-card" data-template={card.template}><div className="wallet-recipient-top"><span>neymi</span><span className="wallet-demo-badge">示例</span></div><div className="wallet-recipient-copy"><h3>{card.headline}</h3><p>{card.intro}</p></div><div className="wallet-recipient-meta"><span>发给 <strong>{card.recipient}</strong></span><span>{card.scenario}</span></div></article>;
}
export function CardLibrary({initialTab='own'}:{initialTab?:LibraryTab}){
  const tab=initialTab;
  const [records,setRecords]=useState<PreparedRecord[]>([]),[status,setStatus]=useState('');
  const [initialized,setInitialized]=useState(false),[unlocked,setUnlocked]=useState(false);
  const [drafts,setDrafts]=useState<LocalDraft[]>([]),[ownDraft,setOwnDraft]=useState<LocalDraft|null>(null),[search,setSearch]=useState('');
  const filteredRecords=useMemo(()=>records.filter(record=>`${record.label.recipientLabel} ${record.label.scenario} ${record.config.label}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),[records,search]);
  const filteredDemos=useMemo(()=>demoRecipientCards.filter(card=>`${card.recipient} ${card.scenario} ${card.headline}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),[search]);
  const [vault]=useState(()=>createVault(new IndexedDbVaultStorage()));
  function exportCardFile(){if(!ownDraft)return;try{const projection=projectShare(ownDraft,{identity:(['name','company','role'] as const).filter(key=>Boolean(ownDraft.identity[key]?.trim())),fields:ownDraft.modules.flatMap(module=>module.items.filter(item=>item.sensitivity==='ordinary').map(item=>({moduleId:module.id,itemId:item.id}))),assetIds:ownDraft.assets.map(asset=>asset.id)}),blob=new Blob([serializeNcard(projection) as BlobPart],{type:'application/vnd.neymi.card+json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='neymi-card.ncard';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);setStatus('名片文件已下载。');}catch{setStatus('名片文件生成失败，请检查本机资料。');}}
  useEffect(()=>{
    new PreparedStore(vault.storage).find().then(setRecords).catch(()=>setStatus('本地卡片暂不可读。'));
    vault.isInitialized().then(setInitialized).catch(()=>setStatus('本地加密区暂不可读。'));
    vault.loadPublicProfile().then(profile=>{
      if(!profile.identity.name?.trim())return;
      const templateId=resolveCardTemplateId(window.localStorage.getItem('neymi.card-template'));
      const now=new Date().toISOString();
      const config:ManualCardConfig={schemaVersion:1,id:'card_guest',kind:'manual',label:'我的基础名片',templateId,layout:getCardTemplate(templateId).layout,animation:'float',orderedModules:profile.modules.map(section=>({localModuleId:section.id,kind:section.kind,emphasis:'normal'})),createdAt:now,updatedAt:now};
      setOwnDraft(createManualDraft(profile,config));
    }).catch(()=>{});
  },[vault]);
  async function loadOffline(){try{const cached=await vault.listPreparedDrafts();setDrafts(cached);setStatus(cached.length?'本地加密离线副本已解锁。':'当前没有可离线查看的加密副本。');}
    catch{setUnlocked(false);setStatus('解锁失败或资料无法读取。');}}
  return <main className="workspace library-page">
    <header className="library-header"><Link className="wordmark" href="/">neymi<span aria-hidden="true">.</span></Link><Link className="prepare-back" href="/">返回制作名片</Link></header>
    <section className="library-intro"><h1>我的卡片库</h1><p>按接收人找回你准备过的名片，也可以查看别人发给你的名片。</p></section>
    <nav className="library-tabs" aria-label="卡片库分类" role="tablist">
      <Link role="tab" href="/cards" aria-selected={tab==='own'} aria-current={tab==='own'?'page':undefined}>自己的卡片<span>{records.length+(ownDraft?1:0)}</span></Link>
      <Link role="tab" href="/cards?tab=received" aria-selected={tab==='received'} aria-current={tab==='received'?'page':undefined}>收到的卡片</Link>
    </nav>
    <label className="wallet-search"><svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><span className="sr-only">{tab==='own'?'按接收人搜索':'按名片持有人搜索'}</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder={tab==='own'?'搜索接收人姓名、机构或交流场景':'搜索名片持有人、公司或职位'}/></label>
    {tab==='received'?<Receiver embedded searchQuery={search}/>:<section className="card-library-content" aria-label="自己的卡片">
      <div className="wallet-collection-heading"><div><h2>自己的卡片</h2><p>包含你的通用名片和为具体联系人准备的版本。</p></div><Link className="wallet-create-link" href="/">制作新名片 <span aria-hidden="true">↗</span></Link></div>
      <div className="wallet-list">
        {ownDraft&&!search.trim()&&<article className="wallet-card-item wallet-main-card"><div className="wallet-card-heading"><div><span className="wallet-kind">通用名片</span><h3>{ownDraft.identity.name||'我的基础名片'}</h3><p>{[ownDraft.identity.company,ownDraft.identity.role].filter(Boolean).join(' · ')||'介绍你自己的一张名片'}</p></div><Link href="/" aria-label="编辑通用名片">编辑 <span aria-hidden="true">↗</span></Link></div><div className="wallet-main-preview"><CardRenderer draft={ownDraft}/></div><p className="wallet-recipient-note">接收人 <strong>任何人</strong></p><details className="library-offline"><summary>备份与导出</summary><p>下载当前通用名片文件，可保存或导入 Neymi。</p><button type="button" onClick={exportCardFile}>下载名片文件（.ncard）</button></details></article>}
        {filteredRecords.map((record,index)=><article className="wallet-card-item" key={record.config.id}><div className="wallet-card-heading"><div><span className="wallet-kind">{record.config.status==='stale'?'需要更新':'专属名片'}</span><h3>{record.label.recipientLabel}</h3><p>{record.label.scenario}</p></div><span className={'wallet-record-status '+(record.status==='stale'?'is-stale':'')}>{record.status==='stale'?'资料有更新':'已准备'}</span></div><div className="wallet-recipient-card wallet-saved-card" data-template={index%2?'coast':'evergreen'}><div className="wallet-recipient-top"><span>neymi</span><span>{record.config.label}</span></div><div className="wallet-recipient-copy"><h3>{record.config.headlineDraft||record.config.label}</h3>{record.config.introDraft&&<p>{record.config.introDraft}</p>}</div><div className="wallet-recipient-meta"><span>发给 <strong>{record.label.recipientLabel}</strong></span><span>{record.label.scenario}</span></div></div></article>)}
        {!records.length&&filteredDemos.map(card=><article className="wallet-card-item wallet-example-item" key={card.id}><div className="wallet-card-heading"><div><span className="wallet-kind">联系人专属名片</span><h3>{card.recipient}</h3><p>{card.scenario}</p></div></div><DemoRecipientCard card={card}/></article>)}
      </div>
      {search.trim()&&!filteredRecords.length&&(records.length>0||!filteredDemos.length)&&<div className="wallet-empty"><h3>没有找到这位接收人</h3><p>试试姓名、机构或当时的交流场景。</p></div>}
      {!search.trim()&&!ownDraft&&!records.length&&<div className="wallet-empty wallet-first-run"><h3>你的卡片会收在这里</h3><p>先制作一张通用名片，或为具体联系人准备专属版本。下面的卡片仅用于演示卡片夹样式。</p><Link className="wallet-create-link" href="/">开始制作 <span aria-hidden="true">→</span></Link></div>}
      {status&&<p role="status" className="wallet-status">{status}</p>}
      <details className="library-offline"><summary>本机加密备份</summary><p>离线副本保存在本机加密区；忘记口令无法找回。</p>
        {!unlocked?<UnlockPanel vault={vault} initialized={initialized} onUnlocked={()=>{setInitialized(true);setUnlocked(true);void loadOffline();}}/>:<><button type="button" onClick={()=>void loadOffline()}>刷新加密副本</button>{drafts.map(draft=><article key={draft.id}><CardRenderer draft={draft}/></article>)}</>}
      </details>
    </section>}
    <footer className="site-footer">本机保存 · 分享前逐项确认</footer>
  </main>;
}
