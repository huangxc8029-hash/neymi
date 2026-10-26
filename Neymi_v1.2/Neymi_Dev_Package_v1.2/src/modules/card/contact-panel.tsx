'use client';
import {useEffect,useState} from 'react';
import type {Vault} from '../vault/vault';
import type {LocalProfile} from '../../domain/types';
import {UnlockPanel} from '../vault/unlock-panel';
import {CONTACT_CHANNELS,emptyContacts,type ContactValues} from './contacts';
import {PreparedStore} from '../prepared/store';

export function ContactPanel({vault,profile,onSaved}:{vault:Vault;profile:LocalProfile;onSaved:(profile:LocalProfile)=>void}){
  const [initialized,setInitialized]=useState<boolean|null>(null),[unlocked,setUnlocked]=useState(false);
  const [setup,setSetup]=useState(false),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false);
  const [values,setValues]=useState<ContactValues>(emptyContacts),[status,setStatus]=useState('');
  useEffect(()=>{void vault.isInitialized().then(setInitialized).catch(()=>setStatus('本地加密区读取失败，请刷新后重试。'));},[vault]);
  useEffect(()=>{
    const timer=setInterval(()=>{if(unlocked&&!vault.isUnlocked()){setUnlocked(false);setValues(emptyContacts());setDirty(false);setStatus('联系方式已锁定，请重新解锁。');}},1000);
    return()=>clearInterval(timer);
  },[unlocked,vault]);
  async function afterUnlock(){
    try{
      if(initialized){setValues(await vault.readContacts());setDirty(false);}
      setInitialized(true);setUnlocked(true);setSetup(false);setStatus('本地加密区已解锁，请确认后加密保存联系方式。');
    }catch{setStatus('联系方式读取失败，未修改已保存数据。');}
  }
  async function save(){
    if(initialized===null||busy)return;
    if(!vault.isUnlocked()){setSetup(true);return;}
    setBusy(true);let ordinarySaved=false;
    try{
      await vault.saveOrdinaryProfile(profile);ordinarySaved=true;
      const saved=await vault.saveContacts(values);setDirty(false);onSaved(saved);
      setStatus('联系方式已加密保存');
      try{await new PreparedStore(vault.storage).markStale(saved.revision);}
      catch{setStatus('联系方式已加密保存，但旧方案状态更新失败；请重新生成旧方案。');}
    }catch(error){setStatus(`${ordinarySaved?'基础信息已保存；':''}联系方式未保存：${error instanceof Error?error.message:'请重试'}`);}
    finally{setBusy(false);}
  }
  const locked=initialized===null||(initialized&&!unlocked);
  return <section className="contact-panel" aria-labelledby="contact-title">
    <h3 id="contact-title">联系方式（可选）</h3>
    <p>联系方式加密保存在此浏览器，不会自动上传。分享前，由你选择公开哪些信息。</p>
    {CONTACT_CHANNELS.map(({key,label,autoComplete})=><label key={key} htmlFor={`contact-${key}`}>
      {label}<input id={`contact-${key}`} value={values[key]} disabled={locked||busy} placeholder={locked?'已锁定，解锁后查看或修改':'选填'} autoComplete={autoComplete??'off'} maxLength={200}
        onChange={event=>{setValues(current=>({...current,[key]:event.target.value}));setDirty(true);setStatus('联系方式尚未保存，仅保留在当前页面。');}}/>
    </label>)}
    {initialized&&!unlocked&&<button type="button" className="secondary" onClick={()=>setSetup(true)}>解锁联系方式</button>}
    {setup&&<><UnlockPanel vault={vault} initialized={initialized===true} onUnlocked={()=>void afterUnlock()}/><button type="button" className="secondary" onClick={()=>{setSetup(false);setStatus('已取消，联系方式草稿未保存。');}}>{initialized?'取消解锁':'取消密码设置'}</button></>}
    <button type="button" disabled={!dirty||busy||locked} onClick={()=>void save()}>加密保存联系方式</button>
    {unlocked&&<><p>留空并加密保存可删除已有联系方式。</p><button type="button" className="secondary" onClick={()=>{vault.lock();setUnlocked(false);setValues(emptyContacts());setDirty(false);setStatus('已锁定联系方式。');}}>锁定</button></>}
    {status&&<p role="status">{status}</p>}
  </section>;
}
