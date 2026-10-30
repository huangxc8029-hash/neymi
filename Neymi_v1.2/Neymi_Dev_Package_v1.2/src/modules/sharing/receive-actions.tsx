'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {ShareProjection} from '../../domain/types';
import {ReceivedCardsStore} from './receiver-store';
import {IndexedDbVaultStorage} from '../vault/storage';
import {shareViaOS} from './native';

export function ReceiveActions({projection,publicUrl}:{projection:ShareProjection;publicUrl:string}){
  const [saved,setSaved]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  async function save(){setBusy(true);try{await new ReceivedCardsStore(new IndexedDbVaultStorage()).add(projection);setSaved(true);setStatus('已保存到此浏览器的收到名片列表，不会覆盖你自己的资料。');}
    catch{setStatus('本地保存失败；请检查浏览器存储空间。');}finally{setBusy(false);}}
  async function share(){
    if(navigator.share){
      try{await navigator.share({title:`${projection.identity.name||'Neymi'} 的数字名片`,url:publicUrl});setStatus('已交给系统分享。');return;}
      catch(error){if(error instanceof DOMException&&error.name==='AbortError'){setStatus('已取消分享。');return;}}
    }
    try{await navigator.clipboard.writeText(publicUrl);setStatus('名片链接已复制，可以转发。');}
    catch{setStatus(`请复制链接分享：${publicUrl}`);}
  }
  async function downloadCard(){const result=await shareViaOS(projection);setStatus(result==='shared'?'已交给系统分享。':result==='cancelled'?'已取消。':'名片文件已下载。');}
  return <div className="receive-actions"><button type="button" disabled={saved||busy} onClick={save}>{saved?'已保存':'保存到此浏览器'}</button>
    <button type="button" onClick={()=>void share()}>转发名片链接</button><button type="button" onClick={()=>void downloadCard()}>导出名片文件</button><Link href="/">回赠我的名片</Link>{status&&<p role="status">{status}</p>}</div>;
}
