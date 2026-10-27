'use client';
import {useState} from 'react';
import type {LocalAsset} from '../../domain/types';
import type {Vault} from '../vault/vault';
import {UnlockPanel} from '../vault/unlock-panel';
import {sanitizeImage} from '../sharing/media';

export function LogoPanel({vault,logo,onChanged}:{vault:Vault;logo:LocalAsset|null;onChanged:(asset:LocalAsset|null)=>void}){
  const [unlock,setUnlock]=useState(false),[initialized,setInitialized]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function enable(){setInitialized(await vault.isInitialized());setUnlock(true);}
  async function upload(file:File|undefined){
    if(!file)return;setBusy(true);setMessage('');
    try{const asset={...await sanitizeImage(file),id:'card_logo'};await vault.saveCardLogo(asset);onChanged(asset);setMessage('图片已加密保存在本机。分享时请单独勾选。');}
    catch{setMessage('图片保存失败。请使用不超过 5 MB 的 PNG、JPEG 或 WebP，并确认加密区已解锁。');}
    finally{setBusy(false);}
  }
  return <section className="logo-editor" aria-label="公司或团队 Logo"><h3>公司或团队 Logo</h3><p>可选添加公司、团队标志或个人图片，显示在名片左上角。</p>
    {vault.isUnlocked()?<><label htmlFor="card-logo-file">上传 Logo 或图片</label><input id="card-logo-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/>
    {logo&&<button className="secondary" type="button" disabled={busy} onClick={async()=>{try{await vault.saveCardLogo(null);onChanged(null);setMessage('已移除本机卡片图片。');}catch{setMessage('移除失败，请先解锁加密区。');}}}>移除图片</button>}</>:
    <button className="secondary" type="button" onClick={()=>void enable()}>设置或解锁卡片图片</button>}
    {unlock&&!vault.isUnlocked()&&<UnlockPanel vault={vault} initialized={initialized} onUnlocked={async()=>{setUnlock(false);onChanged(await vault.readCardLogo());}}/>}
    <p className="logo-help">PNG / JPEG / WebP · 最大 5 MB · 上传后移除图片元数据</p>{message&&<p role="status">{message}</p>}
  </section>;
}
