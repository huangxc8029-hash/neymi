'use client';
import {useEffect,useMemo,useState} from 'react';
import type {PublicationReceipt,ShareProjection,ShareSelection} from '../../domain/types';
import {publicationReceiptSchema} from '../../domain/schemas';
import {confirmShare,digestProjection} from '../sharing/confirmation';
import {projectShare} from '../sharing/projection';
import {renderImage,serializeVcard} from '../sharing/export';
import type {LocalDraft} from '../../domain/types';
import {publicationRequest} from './request';

type CardKind='free'|'vip';
type ShareRecord={kind:CardKind;digest:string;idempotencyKey:string;receipt?:PublicationReceipt;revoked?:boolean};
const storageKey='neymi.share-links.v1';
function readRecords():ShareRecord[]{
  try{const value:unknown=JSON.parse(localStorage.getItem(storageKey)??'[]');if(!Array.isArray(value))return[];return value.flatMap(item=>{if(!item||typeof item!=='object')return[];const record=item as Partial<ShareRecord>;if((record.kind!=='free'&&record.kind!=='vip')||typeof record.digest!=='string'||!/^([a-f\d]{64})$/i.test(record.digest)||typeof record.idempotencyKey!=='string'||!/^[A-Za-z0-9_-]{32,200}$/.test(record.idempotencyKey))return[];try{return[{kind:record.kind,digest:record.digest,idempotencyKey:record.idempotencyKey,...(record.receipt?{receipt:publicationReceiptSchema.parse(record.receipt)}:{}),...(record.revoked?{revoked:true}:{})}];}catch{return[];}});}catch{return[];}
}
function writeRecords(records:ShareRecord[]){try{localStorage.setItem(storageKey,JSON.stringify(records));}catch{}}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);}

export function QuickShare({draft,selection,cardKind}:{draft:LocalDraft;selection:ShareSelection;cardKind:CardKind}){
  const [records,setRecords]=useState<ShareRecord[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[manualCopyUrl,setManualCopyUrl]=useState(''),[manageOpen,setManageOpen]=useState(false);
  const projection=useMemo(()=>{try{return projectShare(draft,selection);}catch{return null;}},[draft,selection]);
  const selectedCount=selection.identity.filter(key=>Boolean(draft.identity[key]?.trim())).length+selection.fields.length+selection.assetIds.length;
  useEffect(()=>{setRecords(readRecords());setReady(true);},[]);
  function commit(next:ShareRecord[]){setRecords(next);writeRecords(next);}
  async function publish():Promise<PublicationReceipt>{
    if(!projection)throw new Error('当前名片内容暂时无法生成，请检查已选内容。');
    const digest=await digestProjection(projection),existing=records.find(item=>item.kind===cardKind&&item.digest===digest&&!item.revoked&&item.receipt&&Date.parse(item.receipt.publication.expiresAt)>Date.now());
    let working=records;
    if(existing){const check=await publicationRequest(`/v1/publications/${encodeURIComponent(existing.receipt!.publication.publicId)}`,{cache:'no-store'});if(check.ok)return existing.receipt!;working=records.map(item=>item===existing?{...item,revoked:true}:item);commit(working);}
    let pending=working.find(item=>item.kind===cardKind&&item.digest===digest&&!item.revoked&&!item.receipt);
    if(!pending){pending={kind:cardKind,digest,idempotencyKey:crypto.randomUUID().replaceAll('-','')};working=[...working,pending];commit(working);}
    const session=await publicationRequest('/v1/session',{cache:'no-store'});if(!session.ok){const created=await publicationRequest('/v1/session',{method:'POST'});if(!created.ok)throw new Error('无法建立分享会话，请稍后重试。');}
    const confirmation=await confirmShare(projection,'publish'),response=await publicationRequest('/v1/publications',{method:'POST',headers:{'content-type':'application/json','idempotency-key':pending.idempotencyKey},body:JSON.stringify({projection,confirmation})});
    const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'暂时无法准备分享链接。');
    const receipt=publicationReceiptSchema.parse(body),updated={...pending,receipt};commit([...working.filter(item=>item!==pending),updated]);return receipt;
  }
  async function copyLink(){setBusy(true);setStatus('正在准备分享链接…');setManualCopyUrl('');try{const receipt=await publish();try{await navigator.clipboard.writeText(receipt.publication.url);setStatus('链接已复制，可以粘贴发送。');}catch{setManualCopyUrl(receipt.publication.url);setStatus('链接已准备好，请手动复制。');}}catch(error){setStatus(error instanceof Error?error.message:'无法准备分享链接。');}finally{setBusy(false);}}
  async function shareLink(){setBusy(true);setStatus('正在准备分享链接…');setManualCopyUrl('');try{const receipt=await publish();if(!navigator.share){try{await navigator.clipboard.writeText(receipt.publication.url);setStatus('此浏览器不支持系统分享，链接已复制。');}catch{setManualCopyUrl(receipt.publication.url);setStatus('链接已准备好，请手动复制。');}return;}setStatus('正在打开系统分享面板；选择接收人或关闭面板后会返回此页。');try{await navigator.share({title:draft.identity.name||'Neymi 名片',text:'查看我的数字名片',url:receipt.publication.url});setStatus('已交给系统分享；请在分享面板中选择接收人。');}catch(error){if(error instanceof DOMException&&error.name==='AbortError')setStatus('已取消分享；链接仍可复制。');else{setManualCopyUrl(receipt.publication.url);setStatus('链接已准备好，请点击“分享名片”重试，或复制链接。');}}}catch(error){setStatus(error instanceof Error?error.message:'无法准备分享链接。');}finally{setBusy(false);}}
  async function downloadImage(){if(!projection)return;setBusy(true);setStatus('正在生成名片图片…');try{download(await renderImage(projection),'neymi-card.png');setStatus('名片图片已下载。');}catch{setStatus('图片生成失败，请稍后重试。');}finally{setBusy(false);}}
  function downloadContact(){if(!projection)return;try{download(new Blob([serializeVcard(projection) as BlobPart],{type:'text/vcard;charset=utf-8'}),'neymi-contact.vcf');setStatus('联系人文件已下载，可导入手机通讯录。');}catch{setStatus('联系人文件生成失败，请检查所选内容。');}}
  async function revoke(record:ShareRecord){if(!record.receipt)return;if(!window.confirm('停止后，这个链接将无法打开。已保存的图片和联系人不会被删除。'))return;setBusy(true);setStatus('正在停止分享…');try{const response=await publicationRequest(`/v1/publications/${encodeURIComponent(record.receipt.publication.publicId)}`,{method:'DELETE',headers:{authorization:`Bearer ${record.receipt.revokeToken}`}});if(!response.ok)throw new Error('停止分享失败，请稍后重试。');commit(records.map(item=>item===record?{...item,revoked:true}:item));setStatus('分享链接已停止。');}catch(error){setStatus(error instanceof Error?error.message:'停止分享失败。');}finally{setBusy(false);}}
  return <section className="quick-share" aria-labelledby="quick-share-title">
    <div><h3 id="quick-share-title">分享名片</h3><p>当前：{cardKind==='free'?'Free':'VIP'} 名片 · 已选择 {selectedCount} 项。分享链接会上传这些内容，持有链接的人可以查看，30 天后到期。</p></div>
    <div className="quick-share-actions"><button type="button" disabled={!ready||busy||!projection||selectedCount===0} onClick={()=>void shareLink()}>{busy?'处理中…':'分享名片'}</button><button type="button" className="secondary" disabled={!ready||busy||!projection||selectedCount===0} onClick={()=>void copyLink()}>复制链接</button></div>
    <div className="quick-share-downloads"><button type="button" disabled={busy||!projection||selectedCount===0} onClick={()=>void downloadImage()}>保存名片图片</button><span aria-hidden="true">·</span><button type="button" disabled={busy||!projection||selectedCount===0} onClick={downloadContact}>下载联系人（vCard）</button></div>
    {manualCopyUrl&&<label className="quick-share-copy-field">分享链接<input readOnly value={manualCopyUrl} onFocus={event=>event.currentTarget.select()}/></label>}
    <details className="quick-share-management" open={manageOpen} onToggle={event=>setManageOpen(event.currentTarget.open)}><summary>管理分享</summary>{records.filter(record=>record.receipt).length?<div>{records.filter(record=>record.receipt).map(record=><article key={record.receipt!.publication.publicId}><p>{record.kind==='free'?'Free':'VIP'} 名片 · {new Date(record.receipt!.publication.createdAt).toLocaleString()} · {record.revoked?'已停止':Date.parse(record.receipt!.publication.expiresAt)<=Date.now()?'已过期':`有效期至 ${new Date(record.receipt!.publication.expiresAt).toLocaleDateString()}`}</p><a href={record.receipt!.publication.url} target="_blank" rel="noreferrer">打开链接</a>{!record.revoked&&Date.parse(record.receipt!.publication.expiresAt)>Date.now()&&<button type="button" disabled={busy} onClick={()=>void revoke(record)}>停止分享</button>}</article>)}</div>:<p>分享名片后，可在这里查看或停止链接。</p>}</details>
    {status&&<p role="status">{status}</p>}
  </section>;
}
