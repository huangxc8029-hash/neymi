'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {ReceivedCard} from './receiver-store';
import {ReceivedCardsStore} from './receiver-store';
import {importSharedCard} from './import';
import {IndexedDbVaultStorage} from '../vault/storage';

export function Receiver(){
  const [store]=useState(()=>new ReceivedCardsStore(new IndexedDbVaultStorage()));
  const [cards,setCards]=useState<ReceivedCard[]>([]),[status,setStatus]=useState('');
  useEffect(()=>{store.list().then(setCards).catch(()=>setStatus('此浏览器的收到名片列表暂不可读。'));},[store]);
  async function importFile(file:File){
    try{if(file.size>8*1024*1024)throw new Error('File too large');const projection=await importSharedCard(new Uint8Array(await file.arrayBuffer())),record=await store.add(projection);setCards(current=>[record,...current]);setStatus('名片已安全导入到收到列表；本人资料没有更改。');}
    catch{setStatus('文件无效或格式不受支持。请导入 Neymi .ncard JSON 名片。');}
  }
  async function remove(id:string){await store.remove(id);setCards(current=>current.filter(card=>card.id!==id));setStatus('已从此浏览器删除收到的名片。');}
  return <main className="workspace"><header><Link className="wordmark" href="/">neymi</Link></header>
    <div className="hero"><p className="eyebrow">免注册接收</p><h1>收到的名片，单独保存在这里。</h1><p className="intro">导入只接受经过 schema 校验的数据，不执行 HTML 或脚本，也不会覆盖本人资料。</p></div>
    <section className="studio" style={{display:'block',maxWidth:760,margin:'0 auto'}}>
      <label htmlFor="card-file">导入 Neymi 名片文件</label><input id="card-file" type="file" accept=".ncard,application/json" onChange={event=>{const file=event.currentTarget.files?.[0];if(file)void importFile(file);event.currentTarget.value='';}}/>
      {status&&<p role="status">{status}</p>}
      <h2>收到的名片</h2>{cards.length?cards.map(card=><article key={card.id} style={{borderBottom:'1px solid #ddd',padding:'16px 0'}}>
        <h3>{card.projection.identity.name??'未命名'}</h3><p>{[card.projection.identity.role,card.projection.identity.company].filter(Boolean).join(' · ')}</p>
        {card.projection.modules.map((section,index)=><div key={`${section.title}-${index}`}><strong>{section.title}</strong>{section.items.map((item,itemIndex)=><p key={`${item.label}-${itemIndex}`}>{item.label}：{item.value}</p>)}</div>)}
        <small>收到于 {new Date(card.receivedAt).toLocaleString()}</small><button type="button" onClick={()=>void remove(card.id)}>删除</button>
      </article>):<p>还没有保存收到的名片。</p>}
    </section><footer><Link href="/">回赠我的名片</Link></footer>
  </main>;
}
