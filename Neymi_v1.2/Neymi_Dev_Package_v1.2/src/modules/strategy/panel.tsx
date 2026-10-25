'use client';
import {useState} from 'react';
import type {InteractionContext,RecipientResearch,ConfirmedSelfFact} from '../../domain/types';
import {buildCloudContext,createContextApproval,detectSensitiveText} from '../self/facts';

export function StrategyPanel({research,context,facts}:{research:RecipientResearch;context:InteractionContext;facts:ConfirmedSelfFact[]}){
  const [selected,setSelected]=useState<string[]>([]),[approved,setApproved]=useState(false),[result,setResult]=useState<{strategy:{recommendation:string;confidence:string;recommendedFocus:string;whyTheyMayCare:string;mainPoint:string;openingLine:string;uncertainties:string[]};recipe:{headlineDraft?:string;introDraft?:string}}|null>(null);
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const preview=[`交流场景：${context.scenario}`,`交流目的：${context.goal.specificAsk}`,`接收人：${research.recipient.displayName}`,
    `公开来源摘录：\n${research.sources.map(source=>`${source.title}: ${source.excerpt}`).join('\n')||'暂无'}`].join('\n');
  const outgoingFacts=facts.filter(fact=>selected.includes(fact.id)),sensitive=detectSensitiveText(`${preview}\n${outgoingFacts.map(fact=>fact.text).join('\n')}`);
  async function generate(){
    setBusy(true);setStatus('');
    try{
      const outgoing=outgoingFacts,now=new Date().toISOString();
      const approval=await createContextApproval(preview,context.id,'为这位接收人拟定表达方案',now,outgoing);
      const approvedContext=await buildCloudContext(preview,outgoing,approval);
      const session=await fetch('/v1/session',{method:'POST'});if(!session.ok)throw new Error('无法建立匿名会话。');
      const response=await fetch('/v1/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({context,research,approvedContext})});
      const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'方案暂不可用。');
      setResult(body);setStatus('方案已生成。当前内容是规则草案，仍需你判断和编辑。');
    }catch(error){setStatus(error instanceof Error?error.message:'方案暂不可用。');}
    finally{setBusy(false);}
  }
  return <section style={{marginTop:32,borderTop:'1px solid #ddd',paddingTop:24}}>
    <h3>表达方案</h3><p>仅在接收人身份已确认后生成。你选择的本人事实会随本次请求发送；其他本地资料不会发送。</p>
    {facts.length?facts.map(fact=><label key={fact.id} style={{display:'block',margin:'8px 0'}}><input type="checkbox" checked={selected.includes(fact.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,fact.id]:current.filter(id=>id!==fact.id))}/>{fact.text}</label>):<p>还没有已确认的本人事实。可先手动添加，或使用更谨慎的无事实方案。</p>}
    <details><summary>查看本次将发送的场景与公开来源</summary><pre style={{whiteSpace:'pre-wrap'}}>{preview}</pre></details>
    {sensitive.length>0&&<p role="alert">检测到联系方式或地址。移除后才能发送。</p>}
    <label style={{display:'block',margin:'12px 0'}}><input type="checkbox" checked={approved} onChange={event=>setApproved(event.target.checked)}/>
      我同意只发送上面选中的本人事实、场景和公开研究摘要，用于生成本次表达方案。
    </label>
    <button type="button" disabled={!approved||busy||sensitive.length>0||research.recipient.identityStatus!=='verified'} onClick={generate}>{busy?'生成中…':'生成本次表达方案'}</button>
    {research.recipient.identityStatus!=='verified'&&<p>先确认接收人身份，再生成方案。</p>}
    {status&&<p role="status">{status}</p>}
    {result&&<article><p>{result.strategy.recommendation==='verify_first'?'先核实双方需求':'建议准备介绍'} · 可信度：{result.strategy.confidence==='low'?'低':result.strategy.confidence==='medium'?'中':'高'}</p>
      <p>建议重点：{result.strategy.recommendedFocus}</p><p>为什么对方可能关心：{result.strategy.whyTheyMayCare}</p>
      <p>本人主张：{result.strategy.mainPoint}</p><p>开场建议：{result.strategy.openingLine}</p>
      <p>{result.recipe.headlineDraft}</p><p>{result.recipe.introDraft}</p>
      <ul>{result.strategy.uncertainties.map((item,index)=><li key={index}>{item}</li>)}</ul>
    </article>}
  </section>;
}
