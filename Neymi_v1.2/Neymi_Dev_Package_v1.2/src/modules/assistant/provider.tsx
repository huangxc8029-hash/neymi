'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {assistantPrompts,creatorRoutes,nextPrompt,type AssistantIntent} from './prompts';
import './styles.css';

type AssistantState={intent:AssistantIntent|null;input:string;setInput:(value:string)=>void;openAssistant:(intent?:AssistantIntent)=>void;closeAssistant:()=>void};
const Context=createContext<AssistantState|null>(null);
const dismissKey='neymi.assistant.dismissed';
export function useAssistant(){const value=useContext(Context);if(!value)throw new Error('AssistantProvider is missing');return value;}
export function AssistantProvider({children}:{children:ReactNode}){
  const pathname=usePathname(),router=useRouter(),allowed=(creatorRoutes as readonly string[]).includes(pathname);
  const [intent,setIntent]=useState<AssistantIntent|null>(null),[input,setInput]=useState(''),[open,setOpen]=useState(false);
  const [dismissed,setDismissed]=useState(false),[promptIndex,setPromptIndex]=useState(0),[paused,setPaused]=useState(false),[hidden,setHidden]=useState(false),[reduced,setReduced]=useState(false);
  const dialogRef=useRef<HTMLElement|null>(null),opener=useRef<HTMLElement|null>(null);
  useEffect(()=>{try{setDismissed(sessionStorage.getItem(dismissKey)==='1');}catch{setDismissed(false);}},[]);
  useEffect(()=>{setOpen(false);},[allowed]);
  useEffect(()=>{if(!open)return;requestAnimationFrame(()=>dialogRef.current?.querySelector<HTMLElement>('button')?.focus());return()=>requestAnimationFrame(()=>{
    if(opener.current?.isConnected)opener.current.focus();else document.querySelector<HTMLElement>('.assistant-launcher')?.focus();
  });},[open]);
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
  const value=useMemo(()=>({intent,input,setInput,openAssistant,closeAssistant}),[intent,input,openAssistant,closeAssistant]);
  function dismiss(){setDismissed(true);setPromptIndex(assistantPrompts.length);try{sessionStorage.setItem(dismissKey,'1');}catch{}}
  function moveTo(task:AssistantIntent){setIntent(task);setOpen(true);router.push(task==='event'?'/activity':'/prepare');}
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
        <div className="assistant-task-list">
          <button type="button" aria-pressed={intent==='person'} onClick={()=>moveTo('person')}><strong>为一个人准备</strong><span>结合交流对象与已确认事实，形成可审阅的介绍策略。</span></button>
          <button type="button" aria-pressed={intent==='event'} onClick={()=>moveTo('event')}><strong>为一场活动准备</strong><span>沿用活动资料流程，最多 20 位嘉宾。</span></button>
          <button type="button" aria-pressed={intent==='highlight'} onClick={()=>moveTo('highlight')}><strong>一起找亮点</strong><span>整理经历并确认后保存为本地事实。</span></button>
        </div>
        <footer><span>联系方式不会进入 AI 请求</span><button type="button" className="assistant-close-secondary" onClick={closeAssistant}>完成</button></footer>
      </section>
    </div>}
  </>}</Context.Provider>;
}
