'use client';
import {useEffect,useMemo,useState} from 'react';
import {ZodError} from 'zod';
import type {LocalDraft,LocalProfile,ManualCardConfig} from '../domain/types';
import {CardEditor} from '../modules/card/editor';
import {CardRenderer} from '../modules/card/renderer';
import {createManualDraft} from '../modules/card/create';
import {IndexedDbVaultStorage} from '../modules/vault/storage';
import {createVault} from '../modules/vault/vault';
import '../modules/card/styles.css';

const initial:LocalProfile={schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};
export default function Home(){
  const [profile,setProfile]=useState<LocalProfile>(initial);
  const [draft,setDraft]=useState<LocalDraft|null>(null);
  const [message,setMessage]=useState('');
  const vault=useMemo(()=>createVault(new IndexedDbVaultStorage()),[]);
  useEffect(()=>{vault.loadPublicProfile().then(setProfile).catch(()=>{});},[vault]);
  async function preview(){
    try{
      const now=new Date().toISOString();
      const config:ManualCardConfig={schemaVersion:1,id:'card_guest',kind:'manual',label:'我的名片',templateId:'plain',layout:'editorial',animation:'float',
        orderedModules:profile.modules.map(section=>({localModuleId:section.id,kind:section.kind,emphasis:'normal'})),createdAt:now,updatedAt:now};
      await vault.saveProfile(profile);
      setDraft(createManualDraft(profile,config));setMessage('已保存在此浏览器。');
    }catch(error){
      setMessage(error instanceof ZodError?'检测到联系方式。请在本地加密资料区保存这类信息。':
        error instanceof DOMException&&error.name==='QuotaExceededError'?'浏览器存储空间不足，当前资料仍在本页。':
        '保存失败，当前资料仍在本页。');
    }
  }
  return <main className="workspace">
    <header><span className="wordmark">neymi</span></header>
    <div className="hero"><p className="eyebrow">为每次相遇，准备好的你</p>
      <h1>让对方，<br/>记住你的不同。</h1>
      <p className="intro">一张适合这次交流的名片。由你选择表达什么，分享什么。</p></div>
    <div className="studio">
      <CardEditor profile={profile} onChange={setProfile} onPreview={preview}/>
      <div className="preview-panel"><p className="eyebrow">02 · 即时预览</p>
        {draft?<CardRenderer draft={draft}/>:<p>填写展示名称，立即预览。接下来还能为不同的人准备不同版本。</p>}
        {message&&<p role="status">{message}</p>}
      </div>
    </div>
    <footer>免注册的基础体验 · 本地优先 · 分享由你决定</footer>
  </main>;
}
