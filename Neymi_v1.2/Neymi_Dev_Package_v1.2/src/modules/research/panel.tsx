'use client';
import {useRef,useState} from 'react';
import type {RecipientResearch} from '../../domain/types';

export function ResearchPanel(){
  const [recipient,setRecipient]=useState(''),[scenario,setScenario]=useState(''),[kind,setKind]=useState<'text'|'public_url'>('text');
  const [research,setResearch]=useState<RecipientResearch|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const generation=useRef(0),jobId=useRef('');
  async function start(){
    const current=++generation.current;setBusy(true);setResearch(null);setStatus('');
    try{
      if(jobId.current)await fetch(`/v1/research/${encodeURIComponent(jobId.current)}`,{method:'DELETE'}).catch(()=>{});
      const session=await fetch('/v1/session',{method:'POST'});if(!session.ok)throw new Error('无法建立匿名会话。');
      if(current!==generation.current)return;
      const context={id:'recipient_context',scenario:scenario.trim(),goal:{id:'recipient_goal',goalType:'other',specificAsk:scenario.trim()}};
      const response=await fetch('/v1/research',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input:{kind,value:recipient.trim(),contextId:context.id},context})});
      const started=await response.json();if(!response.ok)throw new Error(started.error?.message??'研究暂不可用。');
      jobId.current=started.jobId;
      if(current!==generation.current){await fetch(`/v1/research/${encodeURIComponent(started.jobId)}`,{method:'DELETE'});return;}
      setStatus('正在查找公开来源…');
      for(let attempt=0;attempt<30&&current===generation.current;attempt++){
        await new Promise(resolve=>setTimeout(resolve,400));
        const result=await fetch(`/v1/research/${encodeURIComponent(started.jobId)}`),body=await result.json();
        if(!result.ok)throw new Error(body.error?.message??'无法读取研究结果。');
        if(current!==generation.current)return;
        setResearch(body.research);
        if(body.research.state!=='researching'){
          setStatus(body.research.state==='needs_confirmation'?'请确认公开来源对应的接收人。':body.research.state==='partial'?'没有找到足够来源。':body.research.state==='failed'?'研究服务暂不可用。':'');
          setBusy(false);return;
        }
      }
      if(current===generation.current){await fetch(`/v1/research/${encodeURIComponent(jobId.current)}`,{method:'DELETE'});setStatus('研究超时，已取消。');setBusy(false);}
    }catch(error){if(current===generation.current){setStatus(error instanceof Error?error.message:'研究暂不可用。');setBusy(false);}}
  }
  async function cancel(){
    generation.current++;setBusy(false);setStatus('已取消研究。');
    if(jobId.current)await fetch(`/v1/research/${encodeURIComponent(jobId.current)}`,{method:'DELETE'}).catch(()=>{});
  }
  async function confirm(){
    if(!research)return;
    const response=await fetch(`/v1/research/${encodeURIComponent(jobId.current)}/confirm`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({candidateId:research.recipient.id})});
    const body=await response.json();
    if(!response.ok){setStatus(body.error?.message??'无法确认接收人。');return;}
    setResearch({...research,state:'ready',recipient:{...research.recipient,identityStatus:'verified'}});setStatus('已确认接收人身份。');
  }
  return <section style={{marginTop:56,borderTop:'1px solid #ddd',paddingTop:28}}>
    <p className="eyebrow">下一步 · 单人公开研究</p><h2>为一位接收人做准备</h2>
    <p>接收人由你提供。公开页面只作为未验证来源；搜索内容中的指令不会执行。</p>
    <label htmlFor="research-kind">接收人信息类型</label>{' '}
    <select id="research-kind" value={kind} onChange={event=>setKind(event.target.value as 'text'|'public_url')}>
      <option value="text">姓名、职位或嘉宾介绍</option><option value="public_url">公开网页链接</option>
    </select>
    <label htmlFor="research-recipient" style={{display:'block',marginTop:12}}>接收人信息</label>
    <textarea id="research-recipient" value={recipient} onChange={event=>setRecipient(event.target.value)} maxLength={20000} rows={4} style={{width:'100%'}} />
    <label htmlFor="research-scenario" style={{display:'block',marginTop:12}}>本次交流场景与目的</label>
    <input id="research-scenario" value={scenario} onChange={event=>setScenario(event.target.value)} maxLength={500} style={{width:'100%'}} />
    <div style={{display:'flex',gap:12,marginTop:16}}><button type="button" disabled={!recipient.trim()||!scenario.trim()||busy||(kind==='public_url'&&!/^https:\/\//i.test(recipient.trim()))} onClick={start}>{busy?'研究中…':'查找公开资料'}</button>{busy&&<button type="button" onClick={cancel}>取消</button>}</div>
    {kind==='public_url'&&<p>仅接受 HTTPS 公开网址；内网和私有地址会被拒绝。</p>}
    {status&&<p role="status">{status}</p>}
    {research&&<div><h3>{research.recipient.displayName} · {research.recipient.identityStatus==='verified'?'已确认':'待确认'}</h3>
      <ul>{research.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul>
      {research.sources.map(source=><article key={source.id}><h4>{source.title}</h4><p>{source.excerpt}</p>
        {source.url&&<a href={source.url} target="_blank" rel="noreferrer">查看来源</a>} <small>{source.origin} · {source.accessedAt}</small></article>)}
      {research.state==='needs_confirmation'&&<button type="button" onClick={confirm}>确认这是我提供的接收人</button>}
    </div>}
  </section>;
}
