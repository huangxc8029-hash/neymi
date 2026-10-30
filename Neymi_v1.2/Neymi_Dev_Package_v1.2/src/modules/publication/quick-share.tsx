'use client';
import {useMemo,useState,useSyncExternalStore} from 'react';
import type {PublicationReceipt,ShareSelection} from '../../domain/types';
import {publicationReceiptSchema} from '../../domain/schemas';
import {confirmShare,digestProjection} from '../sharing/confirmation';
import {projectShare} from '../sharing/projection';
import {renderImage} from '../sharing/export';
import type {LocalDraft} from '../../domain/types';
import {publicationRequest} from './request';

type CardKind='free'|'vip';
type ShareRecord={kind:CardKind;digest:string;idempotencyKey:string;lifetime?:'long';receipt?:PublicationReceipt;revoked?:boolean};
const storageKey='neymi.share-links.v1';
const emptyRecords:ShareRecord[]=[];let cachedRaw:string|null|undefined;let cachedRecords=emptyRecords;
function parseRecords(raw:string|null):ShareRecord[]{
  try{const value:unknown=JSON.parse(raw??'[]');if(!Array.isArray(value))return[];return value.flatMap(item=>{if(!item||typeof item!=='object')return[];const record=item as Partial<ShareRecord>;if((record.kind!=='free'&&record.kind!=='vip')||typeof record.digest!=='string'||!/^([a-f\d]{64})$/i.test(record.digest)||typeof record.idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{32,200}$/.test(record.idempotencyKey))return[];try{return[{kind:record.kind,digest:record.digest,idempotencyKey:record.idempotencyKey,...(record.lifetime==='long'?{lifetime:'long' as const}:{}),...(record.receipt?{receipt:publicationReceiptSchema.parse(record.receipt)}:{}),...(record.revoked?{revoked:true}:{})}];}catch{return[];}});}catch{return[];}
}
function getRecordsSnapshot(){const raw=localStorage.getItem(storageKey);if(raw!==cachedRaw){cachedRaw=raw;cachedRecords=parseRecords(raw);}return cachedRecords;}
function subscribeRecords(onChange:()=>void){window.addEventListener('storage',onChange);window.addEventListener('neymi:share-records-change',onChange);return()=>{window.removeEventListener('storage',onChange);window.removeEventListener('neymi:share-records-change',onChange);};}
function writeRecords(records:ShareRecord[]){try{const raw=JSON.stringify(records);localStorage.setItem(storageKey,raw);cachedRaw=raw;cachedRecords=records;window.dispatchEvent(new Event('neymi:share-records-change'));}catch{}}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);}

export function QuickShare({draft,selection,cardKind,compact=false}:{draft:LocalDraft;selection:ShareSelection;cardKind:CardKind;compact?:boolean}){
  const records=useSyncExternalStore(subscribeRecords,getRecordsSnapshot,()=>emptyRecords);
  const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[manualCopyUrl,setManualCopyUrl]=useState('');
  const longRecord=records.find(item=>item.kind===cardKind&&item.lifetime==='long'&&!item.revoked&&item.receipt);
  const projection=useMemo(()=>{try{return projectShare(draft,selection);}catch{return null;}},[draft,selection]);
  const selectedCount=projection?Object.keys(projection.identity).length+projection.modules.reduce((count,section)=>count+section.items.length,0)+projection.assets.length:0;
  function commit(next:ShareRecord[]){writeRecords(next);}
  async function publish():Promise<PublicationReceipt>{
    if(!projection)throw new Error('当前名片内容暂时无法生成，请检查已选内容。');
    const digest=await digestProjection(projection),existing=records.find(item=>item.kind===cardKind&&!item.lifetime&&item.digest===digest&&!item.revoked&&item.receipt&&Date.parse(item.receipt.publication.expiresAt)>Date.now());
    let working=records;
    if(existing){const check=await publicationRequest(`/v1/publications/${encodeURIComponent(existing.receipt!.publication.publicId)}`,{cache:'no-store'});if(check.ok)return existing.receipt!;working=records.map(item=>item===existing?{...item,revoked:true}:item);commit(working);}
    let pending=working.find(item=>item.kind===cardKind&&item.digest===digest&&!item.revoked&&!item.receipt);
    if(!pending){pending={kind:cardKind,digest,idempotencyKey:crypto.randomUUID().replaceAll('-','')};working=[...working,pending];commit(working);}
    const session=await publicationRequest('/v1/session',{cache:'no-store'});if(!session.ok){const created=await publicationRequest('/v1/session',{method:'POST'});if(!created.ok)throw new Error('无法建立分享会话，请稍后重试。');}
    const confirmation=await confirmShare(projection,'publish'),response=await publicationRequest('/v1/publications',{method:'POST',headers:{'content-type':'application/json','idempotency-key':pending.idempotencyKey},body:JSON.stringify({projection,confirmation})});
    const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'暂时无法准备分享链接。');
    const receipt=publicationReceiptSchema.parse(body),updated={...pending,receipt};commit([...working.filter(item=>item!==pending),updated]);return receipt;
  }

  async function publishLong():Promise<PublicationReceipt>{
    if(!projection)throw new Error('请先选择需要分享的名片内容。');
    const digest=await digestProjection(projection);
    const existing=records.find(item=>item.kind===cardKind&&item.lifetime==='long'&&!item.revoked&&item.receipt);
    if(existing?.receipt&&Date.parse(existing.receipt.publication.expiresAt)>Date.now()){
      const id=existing.receipt.publication.publicId;
      const check=await publicationRequest(`/v1/publications/${encodeURIComponent(id)}`,{cache:'no-store'});
      if(check.ok){
        if(existing.digest!==digest){
          const confirmation=await confirmShare(projection,'publish');
          const response=await publicationRequest(`/v1/publications/${encodeURIComponent(id)}`,{
            method:'PATCH',
            headers:{'content-type':'application/json',authorization:`Bearer ${existing.receipt.revokeToken}`},
            body:JSON.stringify({projection,confirmation}),
          });
          if(!response.ok)throw new Error('长期名片更新失败，请稍后重试。');
          commit(records.map(item=>item===existing?{...item,digest}:item));
        }
        return existing.receipt;
      }
      if(check.status!==404&&check.status!==410)throw new Error('无法验证长期链接，请稍后重试。');
    }
    const key=crypto.randomUUID().replaceAll('-','');
    const session=await publicationRequest('/v1/session',{cache:'no-store'});
    if(!session.ok){const created=await publicationRequest('/v1/session',{method:'POST'});if(!created.ok)throw new Error('无法建立分享会话。');}
    const confirmation=await confirmShare(projection,'publish');
    const response=await publicationRequest('/v1/publications',{method:'POST',
      headers:{'content-type':'application/json','idempotency-key':key},
      body:JSON.stringify({projection,confirmation,lifetime:'long'})});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error?.message??'无法创建长期链接。');
    const receipt=publicationReceiptSchema.parse(body);
    commit([...records.filter(item=>!(item.kind===cardKind&&item.lifetime==='long')),
      {kind:cardKind,lifetime:'long',digest,idempotencyKey:key,receipt}]);
    return receipt;
  }
  async function copyLongLink(){
    setBusy(true);setStatus('正在准备长期链接…');setManualCopyUrl('');
    try{
      const receipt=await publishLong();
      try{await navigator.clipboard.writeText(receipt.publication.url);setStatus('长期名片链接已复制。更改并重新分享时会更新同一地址。');}
      catch{setManualCopyUrl(receipt.publication.url);setStatus('长期名片链接已准备好，请手动复制。');}
    }catch(error){setStatus(error instanceof Error?error.message:'无法准备长期链接。');}
    finally{setBusy(false);}
  }
  async function shareWhatsApp(){
    setBusy(true);setStatus('正在准备 WhatsApp 名片链接…');setManualCopyUrl('');
    try{
      const receipt=await publishLong();
      const shareUrl=`https://api.whatsapp.com/send?text=${encodeURIComponent(receipt.publication.url)}`;
      // Do not pre-open a blank tab: in-app browsers frequently block it.
      window.location.assign(shareUrl);
    }catch(error){setStatus(error instanceof Error?error.message:'WhatsApp 分享失败。');setBusy(false);}
  }

  async function copyRevokeCode(){
    const code=longRecord?.receipt?.revokeToken;if(!code)return;
    try{await navigator.clipboard.writeText(code);setStatus('长期名片的撤回码已复制，请安全备份。');}
    catch{setManualCopyUrl(code);setStatus('请手动复制并安全保存撤回码。');}
  }
  async function revokeLong(){
    if(!longRecord?.receipt||!window.confirm('确定撤回长期公开名片吗？链接将无法再打开，但聊天软件可能仍缓存旧预览。'))return;
    setBusy(true);setStatus('');
    try{
      const response=await publicationRequest(`/v1/publications/${encodeURIComponent(longRecord.receipt.publication.publicId)}`,{
        method:'DELETE',headers:{authorization:`Bearer ${longRecord.receipt.revokeToken}`},
      });
      if(!response.ok)throw new Error('撤回失败，请稍后重试。');
      commit(records.map(item=>item===longRecord?{...item,revoked:true}:item));
      setStatus('长期链接已撤回。');
    }catch(error){setStatus(error instanceof Error?error.message:'撤回失败。');}
    finally{setBusy(false);}
  }
  async function copyLink(){setBusy(true);setStatus('正在准备分享链接…');setManualCopyUrl('');try{const receipt=await publish();try{await navigator.clipboard.writeText(receipt.publication.url);setStatus('链接已复制，可以粘贴发送。');}catch{setManualCopyUrl(receipt.publication.url);setStatus('链接已准备好，请手动复制。');}}catch(error){setStatus(error instanceof Error?error.message:'无法准备分享链接。');}finally{setBusy(false);}}
  async function shareLink(){setBusy(true);setStatus('正在准备分享链接…');setManualCopyUrl('');try{const receipt=await publish();if(!navigator.share){try{await navigator.clipboard.writeText(receipt.publication.url);setStatus('此浏览器不支持系统分享，链接已复制。');}catch{setManualCopyUrl(receipt.publication.url);setStatus('链接已准备好，请手动复制。');}return;}setStatus('正在打开系统分享面板；选择接收人或关闭面板后会返回此页。');try{await navigator.share({title:draft.identity.name||'Neymi 名片',text:'查看我的数字名片',url:receipt.publication.url});setStatus('已交给系统分享；请在分享面板中选择接收人。');}catch(error){if(error instanceof DOMException&&error.name==='AbortError')setStatus('已取消分享；链接仍可复制。');else{setManualCopyUrl(receipt.publication.url);setStatus('链接已准备好，请点击“分享名片”重试，或复制链接。');}}}catch(error){setStatus(error instanceof Error?error.message:'无法准备分享链接。');}finally{setBusy(false);}}
  async function downloadImage(){if(!projection)return;setBusy(true);setStatus('正在生成名片图片…');try{download(await renderImage(projection),'neymi-card.png');setStatus('名片图片已下载。');}catch{setStatus('图片生成失败，请稍后重试。');}finally{setBusy(false);}}
  return <section className={`quick-share${compact?' quick-share-compact':''}`} aria-label="分享名片">
    {!compact&&<div className="quick-share-summary"><p>已选 {selectedCount} 项 · 普通链接 30 天到期，长期链接约 5 年有效且可更新。分享内容为公开快照，第三方可能缓存。</p></div>}
    <div className="quick-share-actions"><button type="button" disabled={busy||!projection||selectedCount===0} onClick={()=>void shareLink()}>{busy?'处理中…':'分享名片'}</button><button type="button" className="secondary" disabled={busy||!projection||selectedCount===0} onClick={()=>void copyLink()}>复制链接</button><button type="button" className="secondary" disabled={busy||!projection||selectedCount===0} onClick={()=>void copyLongLink()}>长期链接（5年）</button><button type="button" className="secondary" disabled={busy||!projection||selectedCount===0} onClick={()=>void shareWhatsApp()}>WhatsApp</button><button type="button" className="secondary" disabled={busy||!projection||selectedCount===0} onClick={()=>void downloadImage()}>微信图片 / 下载名片</button></div>
    {longRecord?.receipt&&<div className="quick-share-long-management"><p>长期链接的撤回码仅保存在此浏览器，清除浏览器数据可能失去撤回权限。请先备份撤回码。</p><button type="button" disabled={busy} onClick={()=>void copyRevokeCode()}>复制撤回码</button><button type="button" disabled={busy} onClick={()=>void revokeLong()}>撤回长期链接</button></div>}
    {manualCopyUrl&&<label className="quick-share-copy-field">链接或撤回码<input readOnly value={manualCopyUrl} onFocus={event=>event.currentTarget.select()}/></label>}
    {status&&<p role="status">{status}</p>}
  </section>;
}
