'use client';
import {useState} from 'react';
import type {Vault} from './vault';

export function UnlockPanel({vault,initialized,onUnlocked}:{vault:Vault;initialized:boolean;onUnlocked:()=>void}){
  const [passphrase,setPassphrase]=useState(''),[error,setError]=useState('');
  async function submit(event:React.FormEvent){
    event.preventDefault();
    try{
      if(initialized)await vault.unlock(passphrase);else await vault.initialize(passphrase);
      setPassphrase('');setError('');onUnlocked();
    }catch{setError('口令错误或本地资料无法解锁。');}
  }
  return <form onSubmit={submit}>
    <label htmlFor="vault-passphrase">{initialized?'解锁本地敏感资料':'为敏感资料设置本地口令'}</label>
    <input id="vault-passphrase" type="password" autoComplete={initialized?'current-password':'new-password'} minLength={8}
      value={passphrase} onChange={event=>setPassphrase(event.target.value)} required />
    <button type="submit">{initialized?'解锁':'创建加密区'}</button>
    {error&&<p role="alert">{error}</p>}
    <p>口令仅在此设备使用。忘记口令无法由服务器找回，请保存加密备份。</p>
  </form>;
}
