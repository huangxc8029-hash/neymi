'use client';
import {useState} from 'react';
import type {LocalProfile} from '../../domain/types';
import type {ModuleProposal} from './propose-modules';
import {applyModuleProposal,selectStylePairings} from './propose-modules';
import {getCardTemplate} from '../card/templates';

export function ModuleProposalReview({proposals,profile,onApply,purpose=''}:{proposals:ModuleProposal[];profile:LocalProfile;onApply:(profile:LocalProfile)=>Promise<void>|void;purpose?:string}){
  const [dismissed,setDismissed]=useState<string[]>([]),[error,setError]=useState(''),[titles,setTitles]=useState<Record<string,string>>({});
  const visible=proposals.filter(proposal=>!dismissed.includes(proposal.id));if(!visible.length)return null;
  const styles=selectStylePairings(visible.map(proposal=>proposal.kind),[purpose,...visible.map(proposal=>proposal.title)]);
  async function confirm(proposal:ModuleProposal){try{const title=(titles[proposal.id]??proposal.title).trim();if(!title)throw new Error('请填写模块标题。');await onApply(applyModuleProposal(profile,{...proposal,title},new Date().toISOString()));setDismissed(ids=>[...ids,proposal.id]);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'保存失败，请检查资料后重试。');}}
  return <section className="content-import-panel" aria-labelledby="module-proposal-title"><h3 id="module-proposal-title">审阅 AI 模块候选</h3><p>候选不会自动改写资料。确认后才会追加新模块；每项来源只保留在本机编辑区。</p>
    {visible.map(proposal=><article className="content-import-job" key={proposal.id}><label>模块标题（确认前可编辑）<input aria-label="模块标题" value={titles[proposal.id]??proposal.title} maxLength={100} onChange={event=>setTitles(current=>({...current,[proposal.id]:event.target.value}))}/></label><p>模块类型：{proposal.kind} · {proposal.rationale}</p>
      <dl>{proposal.items.map(item=><div key={item.id}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      {proposal.missingEvidence.length>0&&<p>仍需补证：{proposal.missingEvidence.join('；')}</p>}
      <details><summary>核对原文与来源</summary>{proposal.sourceRefs.map((source,index)=><p key={`${source.sourceId}-${index}`}>{source.kind} · {source.sourceId}{source.page?` · 第 ${source.page} 页`:''}{source.paragraph?` · 第 ${source.paragraph} 段`:''}{source.startMs!==undefined?` · ${source.startMs}–${source.endMs} ms`:''}</p>)}</details>
      <div className="content-import-actions"><button type="button" onClick={()=>void confirm(proposal)}>确认并加入名片</button><button type="button" className="secondary" onClick={()=>setDismissed(ids=>[...ids,proposal.id])}>忽略</button></div>
    </article>)}
    {error&&<p role="alert">{error}</p>}
    <details><summary>针对本次目的推荐的卡片风格</summary><p>推荐依据：本次准备目的与候选内容类型；AI 不会根据接收人的敏感属性推断喜好。可在名片工作室的“挑选模板”步骤查看可用模板。</p>{styles.map(style=>{const template=getCardTemplate(style.templateId);return <p key={style.templateId}>{template.name} · {style.layout} · {style.availability==='pro'?'VIP':'免费'}：{style.rationale}</p>;})}</details>
  </section>;
}
