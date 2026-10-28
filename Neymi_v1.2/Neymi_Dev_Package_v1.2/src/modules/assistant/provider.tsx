'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {creatorRoutes,type AssistantIntent} from './prompts';
import type {ConfirmedSelfFact} from '../../domain/types';
import {detectSensitiveText} from '../self/sensitive-text';
import {createContextApproval,buildCloudContext} from '../self/cloud-context';
import {emptyDesignerSlots} from './designer/workflow';
import type {DesignerEvidence,DesignerSlots} from './designer/types';
import {FREE_CARD_TEMPLATES} from '../card/templates';
import {serializeDesignerProposalPayload,serializeDesignerTurnPayload} from './designer/payload';
import {designerProposalSchema} from './designer/schemas';
import type {DesignerProposal} from './designer/types';
import {studioNavigationForIntent,type StudioNavigationRequest} from '../card/studio-bridge';
import {ContentImportPanel} from '../content/import-panel';
import {VoiceCapture} from '../content/voice-capture';
import type {ContentImportDocument} from '../content/types';
import './styles.css';

type AssistantMessage={id:string;role:'user'|'assistant';text:string;action?:{label:string;run:()=>Promise<void>};choices?:string[]};
type AssistantSubmit=(text:string,facts:ConfirmedSelfFact[])=>Promise<{reply:string;action?:{label:string;run:()=>Promise<void>}}>;
type StudioApply=(value:{proposal:DesignerProposal;slots:DesignerSlots;evidence:DesignerEvidence[];confirmedRewriteKeys:string[]})=>void|Promise<void>;
type StudioNavigate=(request:StudioNavigationRequest)=>void;
type AssistantState={intent:AssistantIntent|null;input:string;messages:AssistantMessage[];facts:ConfirmedSelfFact[];selectedFactIds:string[];setSelectedFactIds:(ids:string[])=>void;setAvailableFacts:(facts:ConfirmedSelfFact[])=>void;appendMessage:(text:string)=>void;registerSubmitHandler:(handler:AssistantSubmit)=>()=>void;registerStudioApply:(handler:StudioApply)=>()=>void;registerStudioNavigate:(handler:StudioNavigate)=>()=>void;openAssistant:(intent?:AssistantIntent)=>void;closeAssistant:()=>void};
const Context=createContext<AssistantState|null>(null);
export function useAssistant(){const value=useContext(Context);if(!value)throw new Error('AssistantProvider is missing');return value;}
export function AssistantProvider({children}:{children:ReactNode}){
  const pathname=usePathname(),router=useRouter(),allowed=(creatorRoutes as readonly string[]).includes(pathname);
  const [intent,setIntent]=useState<AssistantIntent|null>(null),[input,setInput]=useState(''),[open,setOpen]=useState(false),[messages,setMessages]=useState<AssistantMessage[]>([]);
  const [facts,setFacts]=useState<ConfirmedSelfFact[]>([]),[selectedFactIds,setSelectedFactIds]=useState<string[]>([]),[busy,setBusy]=useState(false),[approved,setApproved]=useState(false),[hasSubmitHandler,setHasSubmitHandler]=useState(false);
  const [designerSlots,setDesignerSlots]=useState<DesignerSlots>(emptyDesignerSlots),[designerQuestion,setDesignerQuestion]=useState<{text:string;choices:string[]}|null>(null);
  const [designerProposal,setDesignerProposal]=useState<DesignerProposal|null>(null),[proposalBusy,setProposalBusy]=useState(false);
  const [designerEvidence,setDesignerEvidence]=useState<DesignerEvidence[]>([]),[factCandidates,setFactCandidates]=useState<Array<{text:string;evidenceIds:string[]}>>([]),[confirmedRewriteKeys,setConfirmedRewriteKeys]=useState<string[]>([]);
  const [confirmedFacts,setConfirmedFacts]=useState<Array<{id:string;text:string;sourceEvidenceId:string}>>([]);
  const [voiceDocument,setVoiceDocument]=useState<ContentImportDocument|null>(null),[fileDocuments,setFileDocuments]=useState<ContentImportDocument[]>([]),[materialDraftText,setMaterialDraftText]=useState<string|null>(null),[attachmentKey,setAttachmentKey]=useState(0);
  const dialogRef=useRef<HTMLElement|null>(null),conversationRef=useRef<HTMLDivElement|null>(null),opener=useRef<HTMLElement|null>(null),submitHandler=useRef<AssistantSubmit|null>(null),studioApply=useRef<StudioApply|null>(null),studioNavigate=useRef<StudioNavigate|null>(null),pendingStudioNavigation=useRef<StudioNavigationRequest|null>(null);
  useEffect(()=>{setOpen(false);},[allowed]);
  useEffect(()=>{if(!open)return;requestAnimationFrame(()=>dialogRef.current?.querySelector<HTMLElement>(pathname==='/'?'#designer-assistant-input':'button')?.focus());return()=>{requestAnimationFrame(()=>{
    if(opener.current?.isConnected)opener.current.focus();else document.querySelector<HTMLElement>('.assistant-launcher')?.focus();
  });};},[open,pathname]);
  useEffect(()=>{if(!open||pathname!=='/')return;requestAnimationFrame(()=>{if(conversationRef.current)conversationRef.current.scrollTop=conversationRef.current.scrollHeight;});},[open,pathname,messages.length,designerQuestion,designerProposal,factCandidates.length]);
  const openAssistant=useCallback((task?:AssistantIntent)=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setIntent(task??null);setOpen(true);},[]);
  const closeAssistant=useCallback(()=>setOpen(false),[]);
  const appendMessage=useCallback((text:string)=>setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text}]),[]);
  const registerSubmitHandler=useCallback((handler:AssistantSubmit)=>{submitHandler.current=handler;setHasSubmitHandler(true);return()=>{if(submitHandler.current===handler){submitHandler.current=null;setHasSubmitHandler(false);}};},[]);
  const registerStudioApply=useCallback((handler:StudioApply)=>{studioApply.current=handler;return()=>{if(studioApply.current===handler)studioApply.current=null;};},[]);
  const registerStudioNavigate=useCallback((handler:StudioNavigate)=>{studioNavigate.current=handler;if(pathname==='/'&&pendingStudioNavigation.current){handler(pendingStudioNavigation.current);pendingStudioNavigation.current=null;}return()=>{if(studioNavigate.current===handler)studioNavigate.current=null;}},[pathname]);
  const outgoing=[input.trim(),...facts.filter(fact=>selectedFactIds.includes(fact.id)).map(fact=>`- [${fact.id}] ${fact.text}`)].filter(Boolean).join('\n\nConfirmed professional facts:\n');
  const sensitive=detectSensitiveText(outgoing);
  const designerRecentMessages=(current?:string)=>[...messages.filter(item=>item.role==='user').slice(-11).map(item=>({role:'user' as const,text:item.text.slice(0,2000)})),...(current?[{role:'user' as const,text:current.slice(0,2000)}]:[])];
  const confirmedEvidenceForProposal=()=>confirmedFacts.flatMap(fact=>{const source=designerEvidence.find(item=>item.id===fact.sourceEvidenceId),supported=source?.quote.includes(fact.text)??false;return source&&supported?[{...source,id:fact.id,quote:fact.text,start:0,end:fact.text.length,status:'confirmed' as const}]:[];});
  function materialMessage(documents:ContentImportDocument[]){return documents.map(document=>`材料来源：${document.fileName}\n${document.text}`).join('\n\n');}
  async function send(quickReply?:string,sourceDocuments?:ContentImportDocument[]){
    const documents=sourceDocuments??(quickReply?[]:[...(voiceDocument?[voiceDocument]:[]),...fileDocuments]),readyDocuments=documents.filter(document=>document.text.trim());
    if(pathname==='/'&&(quickReply?.trim()||input.trim()||readyDocuments.length>0)&&!busy){
      const typedText=(quickReply??input).trim(),materialText=readyDocuments.length?(materialDraftText??materialMessage(readyDocuments)).trim():'',text=[typedText,materialText].filter(Boolean).join('\n\n');if(text.length>12000){setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:'这次内容超过 12,000 字，请在输入框里精简后再发送；原材料仍保留在本机。'}]);return;}if(detectSensitiveText(text).length){setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:'这段内容包含联系方式或地址，请先移到本地联系方式表单，再发送其余介绍。'}]);return;}
      if(text==='先做基础名片'){
        setInput('');setDesignerSlots(current=>({...current,primaryHighlightRef:'__basic__'}));setDesignerQuestion(null);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'user',text},{id:crypto.randomUUID(),role:'assistant',text:'好的。可以直接生成基础名片草稿；之后仍可补充你的亮点。'}]);return;
      }
      setBusy(true);setInput('');setApproved(false);setDesignerQuestion(null);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'user',text}]);
      try{
        let session=await fetch('/v1/session',{cache:'no-store'});if(!session.ok){session=await fetch('/v1/session',{method:'POST',headers:{'content-type':'application/json'}});if(!session.ok)throw new Error('暂时无法建立 AI 会话；你的文字仍保留在对话中。');}
        const requestId=crypto.randomUUID().replaceAll('-',''),sourceRevision=messages.length+1;
        const evidenceFromDocuments=readyDocuments.flatMap(document=>document.segments.map((segment,index)=>{
          const quote=segment.text.trim().slice(0,2000),start=text.indexOf(quote);
          if(!quote||start<0)return null;
          return{id:`ev_${document.sourceId}_${index}_${requestId.slice(0,8)}`,sourceId:segment.sourceRef.sourceId,sourceRevision,start,end:start+quote.length,quote,status:'candidate' as const};
        }).filter((item):item is NonNullable<typeof item>=>Boolean(item)));
        const sourceId=crypto.randomUUID().replaceAll('-',''),quote=text.slice(0,2000),newEvidence:DesignerEvidence={id:`ev_${sourceId}`,sourceId,sourceRevision,quote,start:0,end:quote.length,status:'candidate'},recentMessages=designerRecentMessages(text),validSources=recentMessages.filter(item=>item.role==='user').map(item=>item.text),retainedEvidence=readyDocuments.length?[]:designerEvidence.filter(item=>validSources.some(source=>source.includes(item.quote))),evidence=[...retainedEvidence,...(evidenceFromDocuments.length?evidenceFromDocuments:[newEvidence])].slice(-30),turnPayload={message:text,slots:designerSlots,evidence,recentMessages,templateIds:FREE_CARD_TEMPLATES.map(template=>template.id)},approvedText=serializeDesignerTurnPayload(turnPayload);
        if(detectSensitiveText([text,...recentMessages.map(item=>item.text),...evidence.map(item=>item.quote)].join('\n')).length)throw new Error('最近的对话包含联系方式，请清除对话后再发送。');
        const approval=await createContextApproval(approvedText,requestId,'设计数字名片',new Date().toISOString()),approvedContext=await buildCloudContext(approvedText,[],approval);
        const response=await fetch('/v1/designer/turn',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...turnPayload,approvedContext,requestId,sessionRevision:messages.length,profileRevision:1})});
        const payload=await response.json() as {reply?:string;slots?:DesignerSlots;question?:{text:string;choices:string[]}|null;factCandidates?:Array<{text:string;evidenceIds:string[]}>;error?:{message?:string}};if(!response.ok)throw new Error(payload.error?.message??(response.status===503?'AI 服务尚未配置。你可以继续手动制作名片。':'AI 暂时无法处理这条消息，请稍后重试.'));
        setDesignerEvidence(evidence);setFactCandidates(payload.factCandidates??[]);setDesignerProposal(null);setConfirmedRewriteKeys([]);if(payload.slots)setDesignerSlots({...payload.slots,primaryHighlightRef:designerSlots.primaryHighlightRef,highlightRefs:designerSlots.highlightRefs});setDesignerQuestion(payload.question??null);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:payload.reply??'AI 服务返回了无效内容，请重试。'}]);if(readyDocuments.length){setVoiceDocument(null);setFileDocuments([]);setMaterialDraftText(null);setAttachmentKey(key=>key+1);}
      }catch(error){setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:error instanceof Error?error.message:'AI 服务暂不可用；你仍可继续手工制作。'}]);}
      finally{setBusy(false);}
      return;
    }
    if(!approved||busy||!input.trim()||sensitive.length||!submitHandler.current)return;
    const text=input.trim(),selected=facts.filter(fact=>selectedFactIds.includes(fact.id)),handler=submitHandler.current;
    setBusy(true);setInput('');setApproved(false);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'user',text}]);
    try{const result=await handler(text,selected);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:result.reply,...(result.action?{action:result.action}:{})}]);}
    catch(error){setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:error instanceof Error?error.message:'AI 服务暂不可用；你仍可继续手工准备。'}]);}
    finally{setBusy(false);}
  }
  async function requestDesignerProposal(){
    if(pathname!=='/'||proposalBusy||(!designerSlots.primaryHighlightRef&&confirmedFacts.length===0))return;
    setProposalBusy(true);
    try{
      const confirmedEvidence=confirmedEvidenceForProposal(),recentMessages=[...designerRecentMessages(),...confirmedEvidence.map(item=>({role:'user' as const,text:item.quote}))].slice(-12),evidenceIds=new Set(confirmedEvidence.map(item=>item.id)),highlightRefs=designerSlots.highlightRefs.filter(id=>evidenceIds.has(id)),primaryHighlightRef=designerSlots.primaryHighlightRef==='__basic__'?'__basic__':evidenceIds.has(designerSlots.primaryHighlightRef??'')?designerSlots.primaryHighlightRef:highlightRefs[0],proposalSlots={...designerSlots,highlightRefs,...(primaryHighlightRef?{primaryHighlightRef}:{primaryHighlightRef:undefined})};
      const payload={message:'请根据已确认的身份和亮点制作一张简约名片，不添加未经提供的经历或成果。',slots:proposalSlots,evidence:confirmedEvidence,recentMessages,templateIds:FREE_CARD_TEMPLATES.map(template=>template.id),confirmedEvidenceIds:confirmedEvidence.map(item=>item.id),allowedFieldRefs:[]},requestId=crypto.randomUUID().replaceAll('-','');
      const approvedText=serializeDesignerProposalPayload(payload),session=await fetch('/v1/session',{cache:'no-store'});
      let activeSession=session;if(!session.ok)activeSession=await fetch('/v1/session',{method:'POST',headers:{'content-type':'application/json'}});
      if(!activeSession.ok)throw new Error('暂时无法建立 AI 会话。');
      const approval=await createContextApproval(approvedText,requestId,'生成基础名片草稿',new Date().toISOString()),approvedContext=await buildCloudContext(approvedText,[],approval);
      const response=await fetch('/v1/designer/proposal',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,approvedContext,requestId,sessionRevision:messages.length,profileRevision:1})}),result=await response.json() as {proposal?:unknown;error?:{message?:string}};
      if(!response.ok)throw new Error(result.error?.message??'AI 暂时无法生成草稿。');
      const proposal=designerProposalSchema.parse(result.proposal);setDesignerProposal(proposal);setDesignerQuestion(null);setConfirmedRewriteKeys([]);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:`已生成名片草稿：${proposal.rationale}`}]);
    }catch(error){setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:error instanceof Error?error.message:'AI 暂时无法生成草稿。'}]);}
    finally{setProposalBusy(false);}
  }
  async function applyDesignerProposal(){if(!designerProposal||!studioApply.current)return;try{await studioApply.current({proposal:designerProposal,slots:designerSlots,evidence:confirmedEvidenceForProposal(),confirmedRewriteKeys});setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:'草稿已保存并应用到右侧名片预览。你可以继续确认展示内容，再分享、复制链接或下载名片。'}]);setOpen(false);}catch(error){setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:error instanceof Error?error.message:'名片草稿无法保存。'}]);}}
  const value=useMemo(()=>({intent,input,messages,facts,selectedFactIds,setSelectedFactIds,setAvailableFacts:setFacts,appendMessage,registerSubmitHandler,registerStudioApply,registerStudioNavigate,openAssistant,closeAssistant}),[intent,input,messages,facts,selectedFactIds,appendMessage,registerSubmitHandler,registerStudioApply,registerStudioNavigate,openAssistant,closeAssistant]);
  function moveTo(task:AssistantIntent){
    setIntent(task);setOpen(task==='person'||task==='person_prep'||task==='event'||task==='event_prep'||task==='highlight');
    const navigation=studioNavigationForIntent(task);
    if(navigation){if(pathname==='/'){if(studioNavigate.current)studioNavigate.current(navigation);else pendingStudioNavigation.current=navigation;}else{pendingStudioNavigation.current=navigation;router.push('/');}return;}
    const route=task==='event'||task==='event_prep'?'/activity':task==='person'||task==='person_prep'||task==='highlight'||task==='import'?'/prepare':'/';
    router.push(route);
  }
  function trapFocus(event:KeyboardEvent<HTMLElement>){
    if(event.key==='Escape'){event.preventDefault();closeAssistant();return;}
    if(event.key!=='Tab')return;
    const items=dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if(!items?.length)return;const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  return <Context.Provider value={value}>{children}{allowed&&<>
    {!open&&pathname!=='/'&&<div className="assistant-float-root"><button type="button" className="assistant-launcher" aria-label="打开 AI 名片助理" onClick={()=>openAssistant()}>✦ <span>AI 名片助理</span></button></div>}
    {open&&<div className="assistant-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)closeAssistant();}}>
      <section ref={node=>{dialogRef.current=node;}} role="dialog" aria-modal="true" aria-labelledby="global-assistant-title" className={`global-assistant-panel${pathname==='/'?' designer-chat-panel':''}`} onKeyDown={trapFocus}>
        <header><div><p>NEYMI · AI 名片助理</p><h2 id="global-assistant-title">AI 名片助理</h2></div><button type="button" aria-label="关闭 AI 名片助理" onClick={closeAssistant}>×</button></header>
        {pathname!=='/'&&<p className="assistant-panel-intro">选择一个任务，助手会带你进入现有准备流程。发送内容前仍需逐次核对和授权。</p>}
        {pathname==='/'&&<>
          <div className="designer-conversation" ref={conversationRef} role="log" aria-label="名片设计对话" aria-live="polite">
          <ol className="assistant-messages">{messages.length===0&&<li className="assistant-message assistant">AI 名片助理：你好！你可以直接说说自己、项目或服务，也可以先告诉我这张名片的用途和希望谁看到。我会把资料整理成候选内容，确认后生成真实名片预览。</li>}{messages.map(message=><li key={message.id} className={`assistant-message ${message.role}`}>{message.role==='user'?'你':'AI 名片助理'}：{message.text}</li>)}{designerQuestion&&<li className="assistant-message assistant assistant-question">AI 名片助理：{designerQuestion.text}<div className="assistant-choice-row">{designerQuestion.choices.map(choice=><button key={choice} type="button" className="assistant-choice" disabled={busy} onClick={()=>void send(choice)}>{choice}</button>)}</div></li>}{busy&&<li className="assistant-message assistant" role="status">AI 名片助理正在整理你的回答…</li>}</ol>
          {confirmedFacts.length>0&&<section className="designer-proposal-card" aria-label="已确认的名片亮点"><h3>你已确认的亮点</h3>{confirmedFacts.map(fact=><article key={fact.id}><span>{fact.text}</span><button type="button" className="assistant-close-secondary" onClick={()=>{setConfirmedFacts(current=>current.filter(item=>item.id!==fact.id));setDesignerSlots(current=>({...current,primaryHighlightRef:current.primaryHighlightRef===fact.id?undefined:current.primaryHighlightRef,highlightRefs:current.highlightRefs.filter(ref=>ref!==fact.id)}));setDesignerProposal(null);}}>移除</button></article>)}</section>}
          {factCandidates.length>0&&<section className="designer-proposal-card" aria-label="确认名片亮点"><h3>先确认 AI 提取的亮点</h3><p>仅保留你确认的原文，未确认的信息不会进入名片。</p>{factCandidates.map((candidate,index)=>{const source=designerEvidence.find(item=>candidate.evidenceIds.includes(item.id)&&item.quote.includes(candidate.text)),factId=source?`fact_${source.sourceId}_${index}`:'';return <article key={`${candidate.text}-${index}`}><label><input type="checkbox" checked={Boolean(factId&&confirmedFacts.some(fact=>fact.id===factId))} disabled={!source} onChange={event=>{const accepted=event.target.checked;if(!source)return;if(accepted){setConfirmedFacts(current=>[...current.filter(fact=>fact.id!==factId),{id:factId,text:candidate.text,sourceEvidenceId:source.id}]);setDesignerSlots(current=>({...current,primaryHighlightRef:factId,highlightRefs:[...new Set([...current.highlightRefs,factId])]}));}else{setConfirmedFacts(current=>current.filter(fact=>fact.id!==factId));setDesignerSlots(current=>({...current,primaryHighlightRef:current.primaryHighlightRef===factId?undefined:current.primaryHighlightRef,highlightRefs:current.highlightRefs.filter(ref=>ref!==factId)}));}setDesignerProposal(null);}}/>{candidate.text}</label><small>原文：{source?.quote}</small></article>})}</section>}
          {(designerSlots.primaryHighlightRef==='__basic__'||confirmedFacts.length>0)&&<div className="designer-proposal-card"><p><strong>{designerSlots.primaryHighlightRef==='__basic__'?'基础信息已齐':'已确认亮点'}</strong> · AI 只使用确认过的内容。</p>{designerProposal&&<><p>{designerProposal.templateId} · {designerProposal.rationale}</p>{designerProposal.modules.flatMap((section,moduleIndex)=>section.items.map((item,itemIndex)=><label className="designer-rewrite-confirm" key={`${moduleIndex}:${itemIndex}`}><input type="checkbox" disabled={item.treatment!=='rewrite'} checked={item.treatment!=='rewrite'||confirmedRewriteKeys.includes(`${moduleIndex}:${itemIndex}`)} onChange={event=>setConfirmedRewriteKeys(keys=>event.target.checked?[...new Set([...keys,`${moduleIndex}:${itemIndex}`])]:keys.filter(key=>key!==`${moduleIndex}:${itemIndex}`))}/><span>{section.title} · {item.label}：{item.text} {item.treatment==='rewrite'&&<em>AI 改写，勾选后加入预览</em>}</span><small>来源：{confirmedEvidenceForProposal().find(source=>item.evidenceIds.includes(source.id))?.quote??'无'}</small></label>))}</>}{designerProposal?<button type="button" onClick={()=>void applyDesignerProposal()}>打开名片预览并确认显示内容</button>:<button type="button" disabled={proposalBusy} onClick={()=>void requestDesignerProposal()}>{proposalBusy?'正在生成预览…':'生成名片预览'}</button>}</div>}
          </div>
          <form className="designer-composer" onSubmit={event=>{event.preventDefault();void send();}}><label className="designer-composer-label" htmlFor="designer-assistant-input">告诉 AI 名片助理</label><div className="designer-composer-box"><textarea id="designer-assistant-input" value={input} maxLength={12000} rows={2} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send();}}} placeholder="说说你自己、项目、服务，或直接回答助理的问题…"/>
          <div className="designer-composer-toolbar"><div className="designer-composer-tools"><ContentImportPanel key={attachmentKey} compact onReady={document=>{setFileDocuments(current=>[...current.filter(item=>item.sourceId!==document.sourceId),document]);setMaterialDraftText(null);}} onClear={()=>{setFileDocuments([]);setMaterialDraftText(null);}}/><VoiceCapture compact onTranscript={document=>{setVoiceDocument(document??null);setMaterialDraftText(null);}}/></div><button className="designer-send-button" type="submit" disabled={(!input.trim()&&!fileDocuments.some(document=>document.text.trim())&&!voiceDocument?.text.trim())||busy} aria-label="发送消息">{busy?'…':'↑'}</button></div></div>
          {(voiceDocument||fileDocuments.length>0)&&(()=>{const docs=[...(voiceDocument?[voiceDocument]:[]),...fileDocuments],defaultText=materialMessage(docs),shownText=materialDraftText??defaultText;return <details className="designer-material-review"><summary>核对材料文字（{shownText.length} 字）</summary><textarea aria-label="核对材料文字" rows={3} maxLength={50000} value={shownText} onChange={event=>setMaterialDraftText(event.target.value)} placeholder="本机解析的文本会出现在这里。"/><small>只有点击“发送”后，这些文字才会发送给 AI。</small></details>;})()}
          </form>
        </>}
        {pathname==='/prepare'&&intent&&<>
          <ol className="assistant-messages" aria-label="本次 AI 名片助理对话">{messages.map(message=><li key={message.id} className={`assistant-message ${message.role}`}>{message.role==='user'?'你':'AI 名片助理'}：{message.text}</li>)}</ol>
          {messages.filter(message=>message.action).map(message=><button type="button" className="assistant-action" key={message.id} onClick={()=>void message.action?.run()}>{message.action?.label}</button>)}
          {facts.length>0&&<fieldset className="assistant-facts"><legend>可选的已确认本人事实（默认不发送）</legend>{facts.map(fact=><label key={fact.id}><input type="checkbox" checked={selectedFactIds.includes(fact.id)} onChange={event=>{setSelectedFactIds(current=>event.target.checked?[...current,fact.id]:current.filter(id=>id!==fact.id));setApproved(false);}}/>{fact.text}</label>)}</fieldset>}
          <label htmlFor="assistant-input">告诉助手你的经历或目标</label><textarea id="assistant-input" value={input} maxLength={20000} rows={3} onChange={event=>{setInput(event.target.value);setApproved(false);}} placeholder="仅发送你这次输入的内容。"/>
          <details><summary>核对本次实际发送内容</summary><pre>{outgoing||'尚无可发送内容。'}</pre></details>
          {sensitive.length>0&&<p role="alert">检测到联系方式或地址，请移除后再发送。</p>}
          <label className="assistant-consent"><input type="checkbox" checked={approved} disabled={!input.trim()||Boolean(sensitive.length)||busy} onChange={event=>setApproved(event.target.checked)}/>我已核对本次发送内容，并同意发送。</label>
          <button type="button" disabled={!approved||!hasSubmitHandler||busy||Boolean(sensitive.length)} onClick={()=>void send()}>{busy?'处理中…':'同意发送当前内容'}</button>
          {intent==='person'&&<button type="button" className="assistant-close-secondary" onClick={()=>{closeAssistant();requestAnimationFrame(()=>document.querySelector<HTMLElement>('#research-recipient')?.focus());}}>继续选择接收人和交流目的</button>}
          {intent==='highlight'&&<p>AI 返回的经历只会作为候选；点击单条确认后才保存到本地事实。</p>}
          {intent==='person'&&!hasSubmitHandler&&<p role="status">单人助手暂不可用；你仍可手动填写下方接收人和研究流程。</p>}
        </>}
        {pathname==='/activity'&&<button type="button" className="assistant-close-secondary" onClick={()=>{const target=document.querySelector<HTMLElement>('#event-name');if(target)opener.current=target;closeAssistant();requestAnimationFrame(()=>target?.focus());}}>填写活动资料</button>}
        <div className="assistant-task-list">
          <button type="button" aria-pressed={intent==='person'} onClick={()=>moveTo('person')}><strong>关于自己的故事</strong><span>整理真实经历，再针对一位交流对象准备介绍。</span></button>
          <button type="button" aria-pressed={intent==='event'} onClick={()=>moveTo('event')}><strong>瞄准关键联系人</strong><span>整理活动资料与嘉宾名单，最多 20 位。</span></button>
          <button type="button" aria-pressed={intent==='highlight'} onClick={()=>moveTo('highlight')}><strong>一起找亮点</strong><span>整理经历并确认后保存为本地事实。</span></button>
          <button type="button" aria-pressed={intent==='recipient_card'} onClick={()=>moveTo('recipient_card')}><strong>为特定对象准备名片</strong><span>填写对方职业角色与会面目的，再从已确认材料中挑出相关故事、履历和项目。</span></button>
          <button type="button" aria-pressed={intent==='import'} onClick={()=>moveTo('import')}><strong>整理文件或语音材料</strong><span>打开本地导入与录音审阅；内容保留在本机临时区。</span></button>
          <button type="button" aria-pressed={intent==='create_module'} onClick={()=>moveTo('create_module')}><strong>创建展示模块</strong><span>回到名片内容编辑区；候选内容须经你校对后保存。</span></button>
          <button type="button" aria-pressed={intent==='style_pairing'} onClick={()=>moveTo('style_pairing')}><strong>挑选卡片风格</strong><span>根据故事、作品和交流目的，查看免费与 VIP 模板。</span></button>
          <button type="button" aria-pressed={intent==='share_check'} onClick={()=>moveTo('share_check')}><strong>检查分享内容</strong><span>打开分享确认步骤，逐项检查公开字段。</span></button>
          <button type="button" aria-pressed={intent==='copy_edit'} onClick={()=>moveTo('copy_edit')}><strong>润色或双语改写</strong><span>返回本地编辑区；内容生成服务未配置时可继续手工编辑。</span></button>
        </div>
        <footer><span>联系方式不会进入 AI 请求</span><button type="button" className="assistant-close-secondary" onClick={closeAssistant}>完成</button></footer>
      </section>
    </div>}
  </>}</Context.Provider>;
}
