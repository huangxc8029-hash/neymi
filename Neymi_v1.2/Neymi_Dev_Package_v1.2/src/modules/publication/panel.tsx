'use client';
import {useState} from 'react';
import type {ShareProjection} from '../../domain/types';
import {confirmShare} from '../sharing/confirmation';

type Receipt={publication:{publicId:string;url:string;expiresAt:string};revokeToken:string};
export function PublicationPanel({projection}:{projection:ShareProjection}){
  const [key,setKey]=useState(''),[receipt,setReceipt]=useState<Receipt|null>(null),[status,setStatus]=useState(''),[handoffUrl,setHandoffUrl]=useState(''),[busy,setBusy]=useState(false),[handoffBusy,setHandoffBusy]=useState(false);
  async function publish(){
    setBusy(true);setStatus('');
    try{
      const idempotencyKey=key||crypto.randomUUID().replaceAll('-','');setKey(idempotencyKey);
      const session=await fetch('/v1/session',{method:'POST'});if(!session.ok)throw new Error('无法建立匿名会话，请稍后重试。');
      const confirmation=await confirmShare(projection,'publish');
      const response=await fetch('/v1/publications',{method:'POST',headers:{'content-type':'application/json','idempotency-key':idempotencyKey},body:JSON.stringify({projection,confirmation})});
      const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'暂时无法发布。');
      setReceipt(body as Receipt);setStatus('公开快照已发布，30 天后到期。撤回令牌只显示给你一次；请复制并妥善保存。');
    }catch(error){setStatus(error instanceof Error?error.message:'暂时无法发布。');}
    finally{setBusy(false);}
  }
  async function revoke(){if(!receipt)return;setBusy(true);setStatus('');
    try{const response=await fetch(`/v1/publications/${encodeURIComponent(receipt.publication.publicId)}`,{method:'DELETE',headers:{authorization:`Bearer ${receipt.revokeToken}`}});
      if(!response.ok)throw new Error('撤回失败；请检查撤回令牌或稍后重试。');setReceipt(null);setStatus('公开快照已撤回。');
    }catch(error){setStatus(error instanceof Error?error.message:'撤回失败。');}finally{setBusy(false);}}
  async function createHandoff(){if(!receipt)return;setHandoffBusy(true);setStatus('');
    try{const response=await fetch('/v1/messaging/handoffs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({publicationId:receipt.publication.publicId})});
      const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'无法创建一次性交接链接。');
      setHandoffUrl(body.url);setStatus(`一次性链接已创建，将于 ${new Date(body.expiresAt).toLocaleTimeString()} 到期。`);
    }catch(error){setStatus(error instanceof Error?error.message:'无法创建一次性交接链接。');}finally{setHandoffBusy(false);}}
  async function shareHandoff(){if(!handoffUrl)return;
    if(!navigator.share){setStatus('此浏览器不支持系统分享；可复制下方链接。');return;}
    try{await navigator.share({title:'Neymi 名片',text:'查看我为这次交流准备的名片。',url:handoffUrl});setStatus('系统分享操作已完成；请以目标应用显示状态为准。');}
    catch(error){setStatus(error instanceof Error&&error.name==='AbortError'?'你取消了系统分享；链接仍可手动复制。':'系统分享不可用；链接仍可手动复制。');}}
  return <section aria-label="发布公开名片" style={{marginTop:20}}>
    <h3>发布可撤回的公开链接</h3><p>仅发布上方预览中的内容，不含接收人标签。链接默认 30 天到期，收到的人仍可能保存副本。</p>
    {!receipt?<button type="button" disabled={busy} onClick={publish}>{busy?'发布中…':'确认发布公开链接'}</button>:<div>
      <p><a href={receipt.publication.url} target="_blank" rel="noreferrer">{receipt.publication.url}</a></p>
      <p>撤回密钥（离开此页前请复制保存）：</p><code style={{overflowWrap:'anywhere'}}>{receipt.revokeToken}</code>
      <p>到期时间：{new Date(receipt.publication.expiresAt).toLocaleString()}</p>
      <button type="button" disabled={busy} onClick={()=>navigator.clipboard.writeText(receipt.revokeToken).then(()=>setStatus('撤回密钥已复制。')).catch(()=>setStatus('复制失败，请手动复制。'))}>复制撤回密钥</button>
      <button type="button" disabled={busy} onClick={revoke}>立即撤回公开链接</button>
      <h4>交接到消息应用</h4><p>只对已发布的公开快照创建 5 分钟内首次使用的链接；不传输本机资料。快照本身仍是可转发的公开内容。</p>
      {!handoffUrl?<button type="button" disabled={busy||handoffBusy} onClick={()=>void createHandoff()}>{handoffBusy?'创建中…':'创建一次性交接链接'}</button>:<>
        <button type="button" disabled={busy} onClick={()=>void shareHandoff()}>交给系统分享</button>
        <p>手动分享链接：</p><code style={{overflowWrap:'anywhere'}}>{handoffUrl}</code>
        <button type="button" disabled={busy} onClick={()=>navigator.clipboard.writeText(handoffUrl).then(()=>setStatus('交接链接已复制；打开一次后即失效。')).catch(()=>setStatus('复制失败，请手动复制。'))}>复制交接链接</button>
      </>}
    </div>}
    {status&&<p role="status">{status}</p>}
  </section>;
}
