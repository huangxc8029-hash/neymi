'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {PreparedStore,type PreparedRecord} from './store';
import {IndexedDbVaultStorage} from '../vault/storage';
import {createVault} from '../vault/vault';
import type {LocalDraft} from '../../domain/types';
import {UnlockPanel} from '../vault/unlock-panel';
import {CardRenderer} from '../card/renderer';

export function PreparedLibrary(){
  const [records,setRecords]=useState<PreparedRecord[]>([]),[status,setStatus]=useState(''),[initialized,setInitialized]=useState(false),[unlocked,setUnlocked]=useState(false),[drafts,setDrafts]=useState<LocalDraft[]>([]);
  const [vault]=useState(()=>createVault(new IndexedDbVaultStorage()));
  useEffect(()=>{new PreparedStore(vault.storage).find().then(setRecords).catch(()=>setStatus('本地准备卡暂不可读。'));vault.isInitialized().then(setInitialized);},[vault]);
  async function loadOffline(){try{const cached=await vault.listPreparedDrafts();setDrafts(cached);setStatus(cached.length?'本地加密离线副本已解锁。':'当前没有可离线查看的加密副本。');}
    catch{setUnlocked(false);setStatus('解锁失败或资料无法读取。');}}
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
      <details style={{marginTop:24}}><summary>查看本地加密的离线名片</summary><p>离线副本使用本地加密保险库；忘记口令无法找回。公开链接不会离线缓存。</p>
        {!unlocked?<UnlockPanel vault={vault} initialized={initialized} onUnlocked={()=>{setInitialized(true);setUnlocked(true);void loadOffline();}}/>:<><button type="button" onClick={()=>void loadOffline()}>刷新加密副本</button>{drafts.map(draft=><article key={draft.id}><CardRenderer draft={draft}/></article>)}</>}
      </details>
    </section><footer><Link href="/prepare">准备新的接收人名片</Link> · <Link href="/receive">收到的名片</Link></footer>
  </main>;
}
