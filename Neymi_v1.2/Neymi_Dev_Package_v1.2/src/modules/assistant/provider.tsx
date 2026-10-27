'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {assistantPrompts,creatorRoutes,nextPrompt,type AssistantIntent} from './prompts';
import type {ConfirmedSelfFact} from '../../domain/types';
import {detectSensitiveText} from '../self/facts';
import './styles.css';

type AssistantMessage={id:string;role:'user'|'assistant';text:string;action?:{label:string;run:()=>Promise<void>}};
type AssistantSubmit=(text:string,facts:ConfirmedSelfFact[])=>Promise<{reply:string;action?:{label:string;run:()=>Promise<void>}}>;
type AssistantState={intent:AssistantIntent|null;input:string;messages:AssistantMessage[];facts:ConfirmedSelfFact[];selectedFactIds:string[];setSelectedFactIds:(ids:string[])=>void;setAvailableFacts:(facts:ConfirmedSelfFact[])=>void;appendMessage:(text:string)=>void;registerSubmitHandler:(handler:AssistantSubmit)=>()=>void;openAssistant:(intent?:AssistantIntent)=>void;closeAssistant:()=>void};
const Context=createContext<AssistantState|null>(null);
const dismissKey='neymi.assistant.dismissed';
export function useAssistant(){const value=useContext(Context);if(!value)throw new Error('AssistantProvider is missing');return value;}
export function AssistantProvider({children}:{children:ReactNode}){
  const pathname=usePathname(),router=useRouter(),allowed=(creatorRoutes as readonly string[]).includes(pathname);
  const [intent,setIntent]=useState<AssistantIntent|null>(null),[input,setInput]=useState(''),[open,setOpen]=useState(false),[messages,setMessages]=useState<AssistantMessage[]>([]);
  const [facts,setFacts]=useState<ConfirmedSelfFact[]>([]),[selectedFactIds,setSelectedFactIds]=useState<string[]>([]),[busy,setBusy]=useState(false),[approved,setApproved]=useState(false),[hasSubmitHandler,setHasSubmitHandler]=useState(false);
  const [dismissed,setDismissed]=useState(false),[promptIndex,setPromptIndex]=useState(0),[paused,setPaused]=useState(false),[hidden,setHidden]=useState(false),[reduced,setReduced]=useState(false);
  const dialogRef=useRef<HTMLElement|null>(null),opener=useRef<HTMLElement|null>(null),submitHandler=useRef<AssistantSubmit|null>(null);
  useEffect(()=>{try{setDismissed(sessionStorage.getItem(dismissKey)==='1');}catch{setDismissed(false);}},[]);
  useEffect(()=>{setOpen(false);},[allowed]);
  useEffect(()=>{if(!open)return;requestAnimationFrame(()=>dialogRef.current?.querySelector<HTMLElement>('button')?.focus());return()=>{requestAnimationFrame(()=>{
    if(opener.current?.isConnected)opener.current.focus();else document.querySelector<HTMLElement>('.assistant-launcher')?.focus();
  });};},[open]);
  useEffect(()=>{
    const visibility=()=>setHidden(document.visibilityState==='hidden');
    const focus=()=>setPaused(document.activeElement instanceof HTMLElement&&Boolean(document.activeElement.closest('input,textarea,select,[contenteditable="true"]')));
    const motion=matchMedia('(prefers-reduced-motion: reduce)'),changeMotion=()=>setReduced(motion.matches);
    document.addEventListener('visibilitychange',visibility);document.addEventListener('focusin',focus);document.addEventListener('focusout',focus);motion.addEventListener('change',changeMotion);changeMotion();visibility();focus();
    return()=>{document.removeEventListener('visibilitychange',visibility);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',focus);motion.removeEventListener('change',changeMotion);};
  },[]);
  useEffect(()=>{
    if(!allowed||dismissed||open||paused||hidden||reduced)return;
    const timer=window.setTimeout(()=>setPromptIndex(current=>nextPrompt(current)??assistantPrompts.length),7000);
    return()=>window.clearTimeout(timer);
  },[allowed,dismissed,open,paused,hidden,reduced,promptIndex]);
  const openAssistant=useCallback((task?:AssistantIntent)=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setIntent(task??null);setOpen(true);},[]);
  const closeAssistant=useCallback(()=>setOpen(false),[]);
  const appendMessage=useCallback((text:string)=>setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text}]),[]);
  const registerSubmitHandler=useCallback((handler:AssistantSubmit)=>{submitHandler.current=handler;setHasSubmitHandler(true);return()=>{if(submitHandler.current===handler){submitHandler.current=null;setHasSubmitHandler(false);}};},[]);
  const outgoing=[input.trim(),...facts.filter(fact=>selectedFactIds.includes(fact.id)).map(fact=>`- [${fact.id}] ${fact.text}`)].filter(Boolean).join('\n\nConfirmed professional facts:\n');
  const sensitive=detectSensitiveText(outgoing);
  async function send(){
    if(!approved||busy||!input.trim()||sensitive.length||!submitHandler.current)return;
    const text=input.trim(),selected=facts.filter(fact=>selectedFactIds.includes(fact.id)),handler=submitHandler.current;
    setBusy(true);setInput('');setApproved(false);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'user',text}]);
    try{const result=await handler(text,selected);setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:result.reply,...(result.action?{action:result.action}:{})}]);}
    catch(error){setMessages(current=>[...current,{id:crypto.randomUUID(),role:'assistant',text:error instanceof Error?error.message:'AI 服务暂不可用；你仍可继续手工准备。'}]);}
    finally{setBusy(false);}
  }
  const value=useMemo(()=>({intent,input,messages,facts,selectedFactIds,setSelectedFactIds,setAvailableFacts:setFacts,appendMessage,registerSubmitHandler,openAssistant,closeAssistant}),[intent,input,messages,facts,selectedFactIds,appendMessage,registerSubmitHandler,openAssistant,closeAssistant]);
  function dismiss(){setDismissed(true);setPromptIndex(assistantPrompts.length);try{sessionStorage.setItem(dismissKey,'1');}catch{}}
  function moveTo(task:AssistantIntent){
    setIntent(task);setOpen(task==='person'||task==='person_prep'||task==='event'||task==='event_prep'||task==='highlight');
    const route=task==='event'||task==='event_prep'?'/activity':task==='person'||task==='person_prep'||task==='highlight'?'/prepare':['import','create_module','style_pairing','copy_edit','bilingual','share_check','facts','recipient_card'].includes(task)?'/vip':'/';
    router.push(route);
    window.setTimeout(()=>{
      const target=task==='import'?document.querySelector<HTMLElement>('.content-import-panel'):
        task==='style_pairing'?document.querySelector<HTMLElement>('#vip-template-picker-title'):
        task==='recipient_card'?document.querySelector<HTMLElement>('#vip-recipient-context'):
        task==='share_check'?document.querySelector<HTMLElement>('.vip-share-section'):
        task==='create_module'||task==='facts'||task==='copy_edit'||task==='bilingual'?document.querySelector<HTMLElement>('#vip-manual-text'):null;
      target?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});
      if(target instanceof HTMLButtonElement||target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement)target.focus();
    },180);
  }
  function trapFocus(event:KeyboardEvent<HTMLElement>){
    if(event.key==='Escape'){event.preventDefault();closeAssistant();return;}
    if(event.key!=='Tab')return;
    const items=dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if(!items?.length)return;const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  return <Context.Provider value={value}>{children}{allowed&&<>
    {!open&&<div className="assistant-float-root">
      {!dismissed&&promptIndex<assistantPrompts.length&&!reduced&&<div className="assistant-bubble" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
        <button type="button" className="assistant-prompt" onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)} onClick={()=>openAssistant((['person','event','highlight'] as const)[promptIndex])}>{assistantPrompts[promptIndex]}</button>
        <button type="button" className="assistant-dismiss" aria-label="关闭提示" onClick={dismiss}>×</button>
      </div>}
      <button type="button" className="assistant-launcher" aria-label="打开全局 AI 助手" onClick={()=>openAssistant()}>✦ <span>AI 助手</span></button>
    </div>}
    {open&&<div className="assistant-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)closeAssistant();}}>
      <section ref={node=>{dialogRef.current=node;}} role="dialog" aria-modal="true" aria-labelledby="global-assistant-title" className="global-assistant-panel" onKeyDown={trapFocus}>
        <header><div><p>NEYMI · AI 助手</p><h2 id="global-assistant-title">这次想准备什么？</h2></div><button type="button" aria-label="关闭 AI 助手" onClick={closeAssistant}>×</button></header>
        <p className="assistant-panel-intro">选择一个任务，助手会带你进入现有准备流程。发送内容前仍需逐次核对和授权。</p>
        {pathname==='/prepare'&&intent&&<>
          <ol className="assistant-messages" aria-label="本次助手对话">{messages.map(message=><li key={message.id} className={`assistant-message ${message.role}`}>{message.role==='user'?'你':'AI 助手'}：{message.text}</li>)}</ol>
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
          <button type="button" aria-pressed={intent==='style_pairing'} onClick={()=>moveTo('style_pairing')}><strong>挑选卡片风格</strong><span>根据故事、作品和这次交流目的，比较六款 VIP 视觉主题。</span></button>
          <button type="button" aria-pressed={intent==='share_check'} onClick={()=>moveTo('share_check')}><strong>检查分享内容</strong><span>打开分享确认步骤，逐项检查公开字段。</span></button>
          <button type="button" aria-pressed={intent==='copy_edit'} onClick={()=>moveTo('copy_edit')}><strong>润色或双语改写</strong><span>返回本地编辑区；内容生成服务未配置时可继续手工编辑。</span></button>
        </div>
        <footer><span>联系方式不会进入 AI 请求</span><button type="button" className="assistant-close-secondary" onClick={closeAssistant}>完成</button></footer>
      </section>
    </div>}
  </>}</Context.Provider>;
}
