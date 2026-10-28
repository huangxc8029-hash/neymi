'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {ShareProjection} from '../../domain/types';
import {ReceivedCardsStore} from './receiver-store';
import {IndexedDbVaultStorage} from '../vault/storage';
import {shareViaOS} from './native';

export function ReceiveActions({projection}:{projection:ShareProjection}){
  const [saved,setSaved]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  async function save(){setBusy(true);try{await new ReceivedCardsStore(new IndexedDbVaultStorage()).add(projection);setSaved(true);setStatus('已保存到此浏览器的收到名片列表，不会覆盖你自己的资料。');}
    catch{setStatus('本地保存失败；请检查浏览器存储空间。');}finally{setBusy(false);}}
  async function share(){const result=await shareViaOS(projection);setStatus(result==='shared'?'已交给系统分享。':result==='cancelled'?'你取消了分享。':'已下载名片文件，可手动发送。');}
  return <div className="receive-actions"><button type="button" disabled={saved||busy} onClick={save}>{saved?'已保存':'保存到此浏览器'}</button>
    <button type="button" onClick={()=>void share()}>分享/下载这张名片</button><Link href="/">回赠我的名片</Link>{status&&<p role="status">{status}</p>}</div>;
}
