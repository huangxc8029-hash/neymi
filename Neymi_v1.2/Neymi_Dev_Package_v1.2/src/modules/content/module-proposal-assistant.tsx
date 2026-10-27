'use client';
import {useState} from 'react';
import type {LocalProfile} from '../../domain/types';
import type {ContentImportDocument} from './types';
import type {ModuleProposal} from './propose-modules';
import {ModuleProposalReview} from './review-panel';
import {serializeContentSourceSegments} from './source-manifest';

async function digest(text:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');}
function hasSensitiveText(text:string){return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)/.test(text);}
export function ModuleProposalAssistant({documents,profile,onApply,purpose='Create display module proposals from selected local files'}:{documents:ContentImportDocument[];profile:LocalProfile;onApply:(next:LocalProfile)=>Promise<void>;purpose?:string}){
  const [approved,setApproved]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[proposals,setProposals]=useState<ModuleProposal[]>([]);
  const text=documents.filter(document=>document.kind==='text').map(document=>document.text).join('\n\n');
  const segments=documents.filter(document=>document.kind==='text').flatMap(document=>document.segments.map(segment=>({sourceRef:segment.sourceRef,text:segment.text})));
  const sources=segments.map(segment=>segment.sourceRef);
  const sourceManifest=`Selected source segments: ${serializeContentSourceSegments(segments)}`;
  async function request(){
    if(!approved||busy||!text||!sources.length||hasSensitiveText(text)||hasSensitiveText(purpose))return;
    setBusy(true);setMessage('正在提交本次核对过的材料…');
    try{
      const contextText=`${text}\n\n${sourceManifest}`,contextId=crypto.randomUUID().replaceAll('-','');
      const context={text:contextText,factIds:[],moduleMetadata:[],approval:{id:crypto.randomUUID().replaceAll('-',''),contextId,contentDigest:await digest(contextText),purpose,approvedAt:new Date().toISOString()}};
      const session=await fetch('/v1/session',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
      if(!session.ok)throw new Error('无法建立临时 AI 会话。');
      const response=await fetch('/v1/modules/proposals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context,segments})});
      const data=await response.json() as {proposals?:ModuleProposal[];error?:{message?:string}};
      if(!response.ok)throw new Error(data.error?.message??'AI 模块整理暂不可用。');
      setProposals(data.proposals??[]);setMessage(data.proposals?.length?'请逐项查看来源和候选内容。':'当前材料没有足够证据生成展示模块。');setApproved(false);
    }catch(error){setMessage(error instanceof Error?error.message:'AI 模块整理暂不可用。');}
    finally{setBusy(false);}
  }
  if(!text||!sources.length)return null;
  return <section className="content-import-panel" aria-labelledby="module-assistant-title"><h3 id="module-assistant-title">把材料整理成展示模块</h3>
    <p>仅提取出的文字与来源位置会发给当前部署配置的 AI 服务；原始文件和录音不会发送。用途是提取有原文依据的模块候选。服务商地区与留存规则由部署配置决定；请先检查全文，并移除你不愿发送的内容。图片不会识别文字。</p>
    <details><summary>查看将发送的完整文字与来源</summary><pre>{text}</pre><ul>{sources.map((source,index)=><li key={`${source.sourceId}-${index}`}>{documents.find(document=>document.sourceId===source.sourceId)?.fileName??source.sourceId}{source.page?` · 第 ${source.page} 页`:source.paragraph?` · 第 ${source.paragraph} 段`:''}</li>)}</ul></details>
    {(hasSensitiveText(text)||hasSensitiveText(purpose))&&<p role="alert">检测到邮箱或电话号码，请从原文件或交流目的中移除后重新选择。</p>}
    <details><summary>查看本次 AI 任务目的</summary><pre>{purpose}</pre></details>
    <label className="assistant-consent"><input type="checkbox" checked={approved} disabled={busy||hasSensitiveText(text)||hasSensitiveText(purpose)} onChange={event=>{setApproved(event.target.checked);setMessage('');}}/>我已核对发送文字、来源和任务目的，并同意发送给当前部署配置的 AI 服务，仅用于生成模块候选。</label>
    <button type="button" disabled={!approved||busy||hasSensitiveText(text)||hasSensitiveText(purpose)} onClick={()=>void request()}>{busy?'正在整理…':'生成候选并审阅'}</button>
    {message&&<p role="status">{message}</p>}
    {proposals.length>0&&<ModuleProposalReview proposals={proposals} profile={profile} onApply={onApply} purpose={purpose}/>}
  </section>;
}
