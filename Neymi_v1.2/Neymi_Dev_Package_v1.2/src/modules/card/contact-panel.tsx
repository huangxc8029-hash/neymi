'use client';
import {useEffect,useState} from 'react';
import type {Vault} from '../vault/vault';
import type {LocalProfile} from '../../domain/types';
import {UnlockPanel} from '../vault/unlock-panel';
import {CONTACT_CHANNELS,emptyContacts,type ContactValues} from './contacts';
import {PreparedStore} from '../prepared/store';

export function ContactPanel({vault,profile,onSaved}:{vault:Vault;profile:LocalProfile;onSaved:(profile:LocalProfile)=>void}){
  const [initialized,setInitialized]=useState(false),[unlocked,setUnlocked]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [values,setValues]=useState<ContactValues>(emptyContacts),[status,setStatus]=useState('');
  useEffect(()=>{void vault.isInitialized().then(setInitialized);},[vault]);
  useEffect(()=>{
    const timer=setInterval(()=>{if(unlocked&&!vault.isUnlocked()){setUnlocked(false);setValues(emptyContacts());}},15_000);
    return()=>clearInterval(timer);
  },[unlocked,vault]);
  async function afterUnlock(){
    try{setValues(await vault.readContacts());setDirty(false);setInitialized(true);setUnlocked(true);setStatus('本地加密区已解锁。');}
    catch{setStatus('联系方式读取失败。');}
  }
  async function save(){
    try{await vault.saveOrdinaryProfile(profile);const saved=await vault.saveContacts(values);setDirty(false);onSaved(saved);
      try{await new PreparedStore(vault.storage).markStale(saved.revision);setStatus('联系方式已加密保存在此浏览器。预览名片时可选择包含，分享时仍需逐项确认。');}
      catch{setStatus('联系方式已保存，但旧方案状态更新失败；请重新生成旧方案。');}}
    catch(error){setStatus(error instanceof Error?error.message:'联系方式保存失败。');}
  }
  return <section className="contact-panel" aria-labelledby="contact-title">
    <h3 id="contact-title">联系方式（可选）</h3>
    <p>填写后加密保存在本机。AI 不读取这些值；公开分享时由你逐项选择。</p>
    <button type="button" className="secondary" aria-expanded={expanded} onClick={()=>setExpanded(current=>!current)}>{expanded?'收起联系方式':'填写联系方式'}</button>
    {expanded&&(!unlocked?<UnlockPanel vault={vault} initialized={initialized} onUnlocked={()=>void afterUnlock()}/>:
      <><p>留空并保存可删除已有联系方式。</p>{CONTACT_CHANNELS.map(({key,label,autoComplete})=><label key={key} htmlFor={`contact-${key}`}>
        {label}<input id={`contact-${key}`} value={values[key]} autoComplete={autoComplete??'off'} maxLength={200}
          onChange={event=>{setValues(current=>({...current,[key]:event.target.value}));setDirty(true);}}/>
      </label>)}
      <button type="button" disabled={!dirty} onClick={()=>void save()}>加密保存联系方式</button>
      <button type="button" className="secondary" onClick={()=>{vault.lock();setUnlocked(false);setValues(emptyContacts());setStatus('已锁定联系方式。');}}>锁定</button></>)}
    {status&&<p role="status">{status}</p>}
  </section>;
}
