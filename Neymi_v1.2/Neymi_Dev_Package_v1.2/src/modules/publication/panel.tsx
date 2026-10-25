'use client';
import {useState} from 'react';
import type {ShareProjection} from '../../domain/types';
import {confirmShare} from '../sharing/confirmation';

type Receipt={publication:{publicId:string;url:string;expiresAt:string};revokeToken:string};
export function PublicationPanel({projection}:{projection:ShareProjection}){
  const [key,setKey]=useState(''),[receipt,setReceipt]=useState<Receipt|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
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
  return <section aria-label="发布公开名片" style={{marginTop:20}}>
    <h3>发布可撤回的公开链接</h3><p>仅发布上方预览中的内容，不含接收人标签。链接默认 30 天到期，收到的人仍可能保存副本。</p>
    {!receipt?<button type="button" disabled={busy} onClick={publish}>{busy?'发布中…':'确认发布公开链接'}</button>:<div>
      <p><a href={receipt.publication.url} target="_blank" rel="noreferrer">{receipt.publication.url}</a></p>
      <p>撤回密钥（离开此页前请复制保存）：</p><code style={{overflowWrap:'anywhere'}}>{receipt.revokeToken}</code>
      <p>到期时间：{new Date(receipt.publication.expiresAt).toLocaleString()}</p>
      <button type="button" disabled={busy} onClick={()=>navigator.clipboard.writeText(receipt.revokeToken).then(()=>setStatus('撤回密钥已复制。')).catch(()=>setStatus('复制失败，请手动复制。'))}>复制撤回密钥</button>
      <button type="button" disabled={busy} onClick={revoke}>立即撤回公开链接</button>
    </div>}
    {status&&<p role="status">{status}</p>}
  </section>;
}
