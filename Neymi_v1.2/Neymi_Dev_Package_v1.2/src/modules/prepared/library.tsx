'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {PreparedStore,type PreparedRecord} from './store';
import {IndexedDbVaultStorage} from '../vault/storage';

export function PreparedLibrary(){
  const [records,setRecords]=useState<PreparedRecord[]>([]),[status,setStatus]=useState('');
  useEffect(()=>{new PreparedStore(new IndexedDbVaultStorage()).find().then(setRecords).catch(()=>setStatus('本地准备卡暂不可读。'));},[]);
  return <main className="workspace"><header><Link className="wordmark" href="/">neymi</Link></header>
    <div className="hero"><p className="eyebrow">仅此浏览器保存</p><h1>为不同接收人准备的方案</h1>
      <p className="intro">接收人标签只保存在本地，不会进入公开名片。</p></div>
    <section className="studio" style={{display:'block',maxWidth:760,margin:'0 auto'}}>
      {records.length===0?<p>还没有保存的准备卡。</p>:records.map(record=><article key={record.config.id} style={{borderBottom:'1px solid #ddd',padding:'16px 0'}}>
        <h2>{record.label.recipientLabel}</h2><p>{record.label.scenario}</p>
        <p>{record.config.headlineDraft??record.config.label}</p><p>{record.config.introDraft}</p>
        <small>{record.status==='stale'?'资料已更新，需要重新确认并合成':'资料版本匹配'}</small>
      </article>)}
      {status&&<p role="status">{status}</p>}
    </section><footer><Link href="/prepare">准备新的接收人名片</Link></footer>
  </main>;
}
