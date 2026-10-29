'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {ReceivedCard} from './receiver-store';
import {ReceivedCardsStore} from './receiver-store';
import {importSharedCard} from './import';
import {IndexedDbVaultStorage} from '../vault/storage';
import {CardExperience} from '../card/card-experience';
import {getCardTemplate} from '../card/templates';
import {listScannedCards,removeScannedCard,updateScannedCard,type ScannedCard} from '../card/scan/store';

const demoReceivedCards:ReceivedCard[]=[
  {id:'demo-received-one',receivedAt:'2026-10-18T10:00:00.000Z',projection:{schemaVersion:1,format:'ncard-public-share',identity:{name:'顾思远',company:'远山创意',role:'品牌策略顾问'},modules:[{kind:'story',title:'关于我',items:[{label:'介绍',value:'让品牌表达更清楚，也更贴近真实的人。'}]},{kind:'social',title:'社交账号',items:[{label:'小红书',value:'https://xiaohongshu.com'}]}],assets:[],templateId:'evergreen',layout:getCardTemplate('evergreen').layout,animation:'float'}},
  {id:'demo-received-two',receivedAt:'2026-10-20T09:30:00.000Z',projection:{schemaVersion:1,format:'ncard-public-share',identity:{name:'陆予宁',company:'澄海科技',role:'联合创始人'},modules:[{kind:'project',title:'正在做的项目',items:[{label:'方向',value:'用更简单的工具帮助小团队快速验证产品。'}]}],assets:[],templateId:'coast',layout:getCardTemplate('coast').layout,animation:'float'}},
];

export function Receiver({embedded=false,searchQuery=''}:{embedded?:boolean;searchQuery?:string}){
  const [store]=useState(()=>new ReceivedCardsStore(new IndexedDbVaultStorage()));
  const [cards,setCards]=useState<ReceivedCard[]>([]),[status,setStatus]=useState('');
  const [scanned,setScanned]=useState<ScannedCard[]>([]);
  useEffect(()=>{store.list().then(setCards).catch(()=>setStatus('此浏览器的收到名片列表暂不可读。'));},[store]);
  useEffect(()=>{listScannedCards().then(setScanned).catch(()=>setStatus('照片名片暂不可读。'));},[]);
  async function importFile(file:File){
    try{if(file.size>8*1024*1024)throw new Error('File too large');const projection=await importSharedCard(new Uint8Array(await file.arrayBuffer())),record=await store.add(projection);setCards(current=>[record,...current]);setStatus('名片已安全导入到收到列表；本人资料没有更改。');}
    catch{setStatus('文件无效或格式不受支持。请导入 Neymi .ncard JSON 名片。');}
  }
  async function remove(id:string){await store.remove(id);setCards(current=>current.filter(card=>card.id!==id));setStatus('已从此浏览器删除收到的名片。');}
  const matches=(card:ReceivedCard)=>`${card.projection.identity.name??''} ${card.projection.identity.company??''} ${card.projection.identity.role??''}`.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase());
  const visibleCards=cards.filter(matches),visibleDemos=demoReceivedCards.filter(matches);
  const content=<section className="card-library-content wallet-received" aria-label="收到的卡片">
      <div className="wallet-collection-heading"><div><h2>收到的卡片</h2><p>导入的名片只保存在此浏览器，不会改动你的个人资料。</p></div><input className="wallet-file-input" id="card-file" type="file" accept=".ncard,application/json" onChange={event=>{const file=event.currentTarget.files?.[0];if(file)void importFile(file);event.currentTarget.value='';}}/><label className="wallet-import-button" htmlFor="card-file">导入名片</label></div>
      {status&&<p role="status" className="wallet-status">{status}</p>}
      <div className="wallet-list">
        {scanned.filter(card=>`${card.name} ${card.company} ${card.role}`.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())).map(card=><article key={card.id} className="wallet-card-item scanned-card-item"><div className="wallet-card-heading"><div><span className="wallet-kind">{card.source==='camera'?'拍照识别':'照片识别'}</span><h3>{card.name||'未命名名片'}</h3><p>{[card.role,card.company].filter(Boolean).join(' · ')}</p></div><time>{card.createdAt.slice(0,10)}</time></div><img src={card.image} alt={`${card.name||'未命名'}的名片原图`}/><p>{[card.phone,card.email].filter(Boolean).join(' · ')}</p><details className="scanned-card-edit"><summary>编辑识别信息</summary>{(['name','company','role','phone','email'] as const).map(field=><label key={field}>{({name:'姓名',company:'公司',role:'职位',phone:'电话',email:'邮箱'} as const)[field]}<input value={card[field]} onChange={event=>setScanned(items=>items.map(item=>item.id===card.id?{...item,[field]:event.target.value}:item))}/></label>)}<button type="button" onClick={()=>{void updateScannedCard(card).then(()=>setStatus('修改已保存。')).catch(()=>setStatus('修改保存失败。'));}}>保存修改</button></details><button className="wallet-delete-button" type="button" onClick={()=>{void removeScannedCard(card.id).then(()=>setScanned(items=>items.filter(item=>item.id!==card.id))).catch(()=>setStatus('删除失败，请重试。'));}}>从卡片库移除</button></article>)}
        {visibleCards.map(card=><article key={card.id} className="wallet-card-item wallet-received-item"><div className="wallet-card-heading"><div><span className="wallet-kind">收到的名片</span><h3>{card.projection.identity.name??'未命名'}</h3><p>{[card.projection.identity.role,card.projection.identity.company].filter(Boolean).join(' · ')}</p></div><span className="wallet-received-date">{card.receivedAt.slice(0,10)}</span></div><div className="wallet-received-preview"><CardExperience identity={card.projection.identity} modules={card.projection.modules.map((section,index)=>({id:`${card.id}-module-${index}`,kind:section.kind,title:section.title,items:section.items.map((item,itemIndex)=>({id:`${card.id}-item-${index}-${itemIndex}`,label:item.label,value:item.value,sensitivity:'ordinary' as const}))}))} templateId={card.projection.templateId} layout={card.projection.layout} motion={card.projection.animation} label={`${card.projection.identity.name??'收到的'}名片`}/></div><button className="wallet-delete-button" type="button" onClick={()=>void remove(card.id)}>从卡片库移除</button></article>)}
        {!cards.length&&visibleDemos.map(card=><article key={card.id} className="wallet-card-item wallet-received-item wallet-example-item"><div className="wallet-card-heading"><div><span className="wallet-kind">收到的名片 · 示例</span><h3>{card.projection.identity.name}</h3><p>{[card.projection.identity.role,card.projection.identity.company].filter(Boolean).join(' · ')}</p></div><span className="wallet-demo-badge">示例</span></div><div className="wallet-received-preview"><CardExperience identity={card.projection.identity} modules={card.projection.modules.map((section,index)=>({id:`${card.id}-module-${index}`,kind:section.kind,title:section.title,items:section.items.map((item,itemIndex)=>({id:`${card.id}-item-${index}-${itemIndex}`,label:item.label,value:item.value,sensitivity:'ordinary' as const}))}))} templateId={card.projection.templateId} layout={card.projection.layout} motion={card.projection.animation} label={`示例名片：${card.projection.identity.name}`}/></div></article>)}
        {searchQuery.trim()&&!visibleCards.length&&(cards.length>0||!visibleDemos.length)&&<div className="wallet-empty"><h3>没有找到这张名片</h3><p>试试名片持有人姓名、公司或职位。</p></div>}
        {!cards.length&&!searchQuery.trim()&&<p className="wallet-demo-note">下面是卡片样式示例，并非真实收到的名片。</p>}
        {!cards.length&&!searchQuery.trim()&&<div className="wallet-import-empty"><h3>收到名片后，会出现在这里</h3><p>选择对方分享的 Neymi 名片文件，即可保存到本机卡片夹。</p><label className="wallet-import-button" htmlFor="card-file">选择名片文件</label></div>}
      </div>
    </section>;
  return embedded?content:<main className="workspace"><header><Link className="wordmark" href="/">neymi</Link></header><div className="hero"><h1>收到的卡片</h1><p className="intro">导入的卡片保存在此浏览器，不会覆盖你的资料。</p></div>{content}<footer><Link href="/cards">我的卡片库</Link></footer></main>;
}
