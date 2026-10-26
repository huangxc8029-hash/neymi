'use client';
import {useState} from 'react';
import type {CardRecipe,ConfirmedSelfFact,InteractionContext,LocalDraft,LocalProfile,RecipientResearch} from '../../domain/types';
import type {Vault} from '../vault/vault';
import {buildCloudContext,createContextApproval,detectSensitiveText} from '../self/facts';
import {createGrant,type GrantRequest} from '../consent/local';
import {composeDraft} from '../card/compose';
import {CardRenderer} from '../card/renderer';
import {SharePreview} from '../sharing/preview';
import {PreparedStore} from '../prepared/store';
import {cachePreparedCard} from '../sharing/native';
import {UnlockPanel} from '../vault/unlock-panel';
import {CONTACT_MODULE_ID,contactItems} from '../card/contacts';
import type {ProfileItem} from '../../domain/types';
import {useEffect} from 'react';

type Plan={mode?:'ai'|'rule';strategy:{recommendation:string;confidence:string;recommendedFocus:string;whyTheyMayCare:string;mainPoint:string;openingLine:string;uncertainties:string[]};recipe:CardRecipe};
export function StrategyPanel({research,context,facts,profile,deviceId,vault,initialPlan,onAssistantUpdate}:{research:RecipientResearch;context:InteractionContext;facts:ConfirmedSelfFact[];profile:LocalProfile;deviceId:string;vault:Vault;initialPlan?:Plan;onAssistantUpdate?:(message:string)=>void}){
  const [selectedFacts,setSelectedFacts]=useState<string[]>([]),[cloudApproved,setCloudApproved]=useState(false),[result,setResult]=useState<Plan|null>(()=>initialPlan??null),[resultRevision,setResultRevision]=useState<number|null>(()=>initialPlan?profile.revision:null);
  const [selectedIdentity,setSelectedIdentity]=useState<Array<'name'|'company'|'role'>>([]),[selectedFields,setSelectedFields]=useState<string[]>([]);
  const [localApproved,setLocalApproved]=useState(false),[privateLabel,setPrivateLabel]=useState(research.recipient.displayName);
  const [draft,setDraft]=useState<LocalDraft|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const [contacts,setContacts]=useState<ProfileItem[]>([]),[vaultInitialized,setVaultInitialized]=useState(false);
  useEffect(()=>{void vault.isInitialized().then(setVaultInitialized);},[vault]);
  useEffect(()=>{const timer=setInterval(()=>{if(!vault.isUnlocked())setContacts([]);},15_000);return()=>clearInterval(timer);},[vault]);
  const preview=[`交流场景：${context.scenario}`,`交流目的：${context.goal.specificAsk}`,`接收人：${research.recipient.displayName}`,
    `公开来源摘录：\n${research.sources.map(source=>`${source.title}: ${source.excerpt}`).join('\n')||'暂无'}`].join('\n');
  const outgoingFacts=facts.filter(fact=>selectedFacts.includes(fact.id)),sensitive=detectSensitiveText(`${preview}\n${outgoingFacts.map(fact=>fact.text).join('\n')}`);
  const fields=[...profile.modules.flatMap(module=>module.items.filter(item=>item.sensitivity==='ordinary').map(item=>({moduleId:module.id,itemId:item.id,key:`${module.id}/${item.id}`,label:`${module.title} · ${item.label}: ${item.value}`}))),
    ...contacts.map(item=>({moduleId:CONTACT_MODULE_ID,itemId:item.id,key:`${CONTACT_MODULE_ID}/${item.id}`,label:`联系方式 · ${item.label}: ${item.value}`}))];
  const stale=Boolean(draft&&draft.profileRevision!==profile.revision);
  const strategyStale=resultRevision!==null&&resultRevision!==profile.revision;
  async function generate(){
    setBusy(true);setStatus('');
    try{
      const now=new Date().toISOString(),approval=await createContextApproval(preview,context.id,'为这位接收人拟定表达方案',now,outgoingFacts);
      const approvedContext=await buildCloudContext(preview,outgoingFacts,approval);
      const session=await fetch('/v1/session',{method:'POST'});if(!session.ok)throw new Error('无法建立匿名会话。');
      const response=await fetch('/v1/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context,research,approvedContext})});
      const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'方案暂不可用。');
      setResult(body as Plan);setResultRevision(profile.revision);setDraft(null);setSelectedIdentity([]);setSelectedFields([]);setLocalApproved(false);setStatus(body.mode==='ai'?'AI 方案已生成，请核对事实与来源后再使用。':'方案已生成。当前内容是规则草案，仍需你判断和编辑。');onAssistantUpdate?.(`单人表达方案已生成：${body.strategy.recommendedFocus}。请在页面核对依据与不确定项；本地合成及最终分享仍需分别确认。`);
    }catch(error){setStatus(error instanceof Error?error.message:'方案暂不可用。');}
    finally{setBusy(false);}
  }
  async function compose(){
    if(!result)return;setBusy(true);setStatus('');
    try{
      const chosen=fields.filter(field=>selectedFields.includes(field.key)),moduleRefs=[...new Set(chosen.map(field=>field.moduleId))].map(id=>{
        const section=profile.modules.find(item=>item.id===id)!;return{localModuleId:id,kind:section.kind,emphasis:'normal' as const};
      });
      const now=new Date().toISOString(),config:CardRecipe={...result.recipe,orderedModules:moduleRefs,updatedAt:now};
      const request:GrantRequest={profileId:profile.id,deviceId,cardId:config.id,fields:chosen.map(({moduleId,itemId})=>({moduleId,itemId})),identity:selectedIdentity,assetIds:[],purpose:'为本次接收人名片在本地合成',operation:'compose_local'};
      const grant=createGrant(request,now),localDraft=await composeDraft(config,grant,vault,request,now,profile.revision);
      setDraft(localDraft);setStatus('已按本次授权在本地合成。公开分享仍需单独选择和确认。');onAssistantUpdate?.('已按本次授权在本地合成名片草稿。你可以在页面预览；分享需要再次逐项选择并确认。');
    }catch(error){setStatus(error instanceof Error?error.message:'本地合成失败。请确认资料库已解锁。');}
    finally{setBusy(false);}
  }
  async function save(){
    if(!result||!draft||stale)return;setBusy(true);
    try{await new PreparedStore(vault.storage).save(draft.config as CardRecipe,{cardId:draft.config.id,recipientLabel:privateLabel,scenario:context.scenario},draft.profileRevision);setStatus('已保存在本地准备卡库。');}
    catch(error){setStatus(error instanceof Error?error.message:'本地保存失败。');}
    finally{setBusy(false);}
  }
  async function cacheOffline(){
    if(!draft||stale)return;setBusy(true);
    try{await cachePreparedCard(draft,vault);setStatus('已用本地加密保险库保存此版本，可在此设备离线查看。');}
    catch(error){setStatus(error&&typeof error==='object'&&(error as {code?:string}).code==='PERMISSION_DENIED'?'请先到“我的准备卡”设置或解锁本地加密区，再缓存离线副本。':error instanceof Error?error.message:'加密缓存失败。');}
    finally{setBusy(false);}
  }
  return <section style={{marginTop:32,borderTop:'1px solid #ddd',paddingTop:24}}>
    <h3>表达方案</h3><p>仅在接收人身份已确认后生成。你选择的本人事实会随本次请求发送；其他本地资料不会发送。</p>
    {facts.length?facts.map(fact=><label key={fact.id} style={{display:'block',margin:'8px 0'}}><input type="checkbox" aria-label={`选择发送事实：${fact.text}`} checked={selectedFacts.includes(fact.id)} onChange={event=>setSelectedFacts(current=>event.target.checked?[...current,fact.id]:current.filter(id=>id!==fact.id))}/>{fact.text}</label>):<p>还没有已确认的本人事实。可先手动添加，或使用更谨慎的无事实方案。</p>}
    <details><summary>查看本次将发送的场景与公开来源</summary><pre style={{whiteSpace:'pre-wrap'}}>{preview}</pre></details>
    {sensitive.length>0&&<p role="alert">检测到联系方式或地址。移除后才能发送。</p>}
    <label style={{display:'block',margin:'12px 0'}}><input type="checkbox" checked={cloudApproved} onChange={event=>setCloudApproved(event.target.checked)}/>
      我同意只发送上面选中的本人事实、场景和公开研究摘要，用于生成本次表达方案。
    </label>
    <button type="button" disabled={!cloudApproved||busy||sensitive.length>0||research.recipient.identityStatus!=='verified'} onClick={generate}>{busy?'生成中…':'生成本次表达方案'}</button>
    {research.recipient.identityStatus!=='verified'&&<p>先确认接收人身份，再生成方案。</p>}
    {status&&<p role="status">{status}</p>}
    {result&&<article><p>{result.strategy.recommendation==='verify_first'?'先核实双方需求':'建议准备介绍'} · 可信度：{result.strategy.confidence==='low'?'低':result.strategy.confidence==='medium'?'中':'高'}</p>
      <p>建议重点：{result.strategy.recommendedFocus}</p><p>为什么对方可能关心：{result.strategy.whyTheyMayCare}</p>
      <p>本人主张：{result.strategy.mainPoint}</p><p>开场建议：{result.strategy.openingLine}</p>
      <p>{result.recipe.headlineDraft}</p><p>{result.recipe.introDraft}</p>
      <ul>{result.strategy.uncertainties.map((item,index)=><li key={index}>{item}</li>)}</ul>
      <h4>授权本地读取并合成名片</h4><p>默认 15 分钟，只读取你勾选的字段。敏感资料需先解锁。</p>
      {(['name','company','role'] as const).map(key=>profile.identity[key]&&<label key={key} style={{display:'block'}}><input type="checkbox" checked={selectedIdentity.includes(key)} onChange={event=>setSelectedIdentity(current=>event.target.checked?[...current,key]:current.filter(value=>value!==key))}/>{key==='name'?'姓名':key==='company'?'公司':'职位'}：{profile.identity[key]}</label>)}
      {fields.map(field=><label key={field.key} style={{display:'block'}}><input type="checkbox" checked={selectedFields.includes(field.key)} onChange={event=>setSelectedFields(current=>event.target.checked?[...current,field.key]:current.filter(value=>value!==field.key))}/>{field.label}</label>)}
      {profile.modules.some(section=>section.id===CONTACT_MODULE_ID)&&<details><summary>选择本地加密的联系方式</summary>
        <p>联系方式只在此设备解锁和合成，不发送给 AI；分享时仍需单独勾选。</p>
        {!vault.isUnlocked()?<UnlockPanel vault={vault} initialized={vaultInitialized} onUnlocked={()=>{void vault.readContacts().then(values=>setContacts(contactItems(values))).catch(()=>setStatus('联系方式读取失败。'));}}/>:
          <button type="button" onClick={()=>{vault.lock();setContacts([]);setSelectedFields(current=>current.filter(key=>!key.startsWith(`${CONTACT_MODULE_ID}/`)));}}>锁定联系方式</button>}
      </details>}
      <label style={{display:'block',marginTop:12}}>仅本地可见的接收人标签<input value={privateLabel} onChange={event=>setPrivateLabel(event.target.value)} maxLength={120}/></label>
      <label style={{display:'block',margin:'12px 0'}}><input type="checkbox" checked={localApproved} onChange={event=>setLocalApproved(event.target.checked)}/>我同意按所选字段在此设备本地合成。</label>
      {strategyStale&&<p role="alert">本人资料已更改。此方案已过期，请重新生成后再合成。</p>}
      <button type="button" disabled={!localApproved||busy||stale||strategyStale||!selectedIdentity.length&&!selectedFields.length} onClick={compose}>授权并在本地合成</button>
      {draft&&<><CardRenderer draft={draft}/>{stale?<p role="alert">本人资料已更改。此方案已过期，请重新生成。</p>:<SharePreview draft={draft}/>}<button type="button" disabled={busy||stale||!privateLabel.trim()} onClick={save}>仅本地保存方案</button>
        <button type="button" disabled={busy||stale} onClick={cacheOffline}>加密缓存此名片供离线查看</button></>}
    </article>}
  </section>;
}
