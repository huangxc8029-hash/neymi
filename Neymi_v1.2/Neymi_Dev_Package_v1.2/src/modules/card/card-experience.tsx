'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {Motion,ProfileModule} from '../../domain/types';
import {cardTemplateClass} from './templates';

type Identity={name?:string;company?:string;role?:string};
export function CardExperience({identity,modules,templateId,motion='float',label='我的名片',dedication,publicCard=false}:{identity:Identity;modules:ProfileModule[];templateId:string;motion?:Motion;label?:string;dedication?:string;publicCard?:boolean}){
  const [active,setActive]=useState<number|null>(null),[status,setStatus]=useState(''),[origin,setOrigin]=useState({x:50,y:50});
  const tileRefs=useRef<Array<HTMLButtonElement|null>>([]),backRef=useRef<HTMLButtonElement|null>(null),cardRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{if(active!==null)backRef.current?.focus();},[active]);
  useEffect(()=>{function onKey(event:KeyboardEvent){if(event.key==='Escape'&&active!==null){event.preventDefault();setActive(null);requestAnimationFrame(()=>tileRefs.current[active]?.focus());}}window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[active]);
  async function copy(label:string,value:string){try{await navigator.clipboard.writeText(value);setStatus(`已复制${label}`);}catch{setStatus('复制失败，请检查浏览器剪贴板权限。');}}
  function openTile(index:number){const box=tileRefs.current[index]?.getBoundingClientRect(),card=cardRef.current?.getBoundingClientRect();if(box&&card)setOrigin({x:Math.round((box.left+box.width/2-card.left)/card.width*100),y:Math.round((box.top+box.height/2-card.top)/card.height*100)});setActive(index);}
  return <section ref={cardRef} className={`cyber-card ${cardTemplateClass(templateId)} motion-${motion}`} style={{'--orbit-x':`${origin.x}%`,'--orbit-y':`${origin.y}%`} as CSSProperties} data-card-motion={motion} data-card-view={active===null?'front':'detail'} role="region" aria-label={label}>
    <div className="card-head"><span className="card-mark">neymi<span className="card-spark" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M10 1.5 12 8l6.5 2-6.5 2-2 6.5L8 12l2-6.5Z"/></svg></span></span><span className="card-label">A better first impression</span></div>
    <div className="card-main"><p className="card-kicker">Nice to meet you</p><h2>{identity.name??'你好'}</h2><p>{[identity.role,identity.company].filter(Boolean).join(' · ')}</p>{dedication&&<p className="card-dedication">{dedication}</p>}</div>
    {active===null?<div className="card-modules" data-module-count={modules.length} aria-label="名片模块">{modules.map((section,index)=><button ref={node=>{tileRefs.current[index]=node;}} className="card-tile" data-tile-size={index%5} style={{'--tile-index':index} as CSSProperties} key={`${section.id}-${index}`} type="button" onClick={()=>openTile(index)}><span>{section.title}</span><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h12M10 4l6 6-6 6"/></svg></button>)}{modules.length===0&&<p className="card-empty">添加一个模块，让对方快速了解你。</p>}</div>:<div className="card-detail" key={active}>
      <button ref={backRef} type="button" className="card-back" aria-label="返回名片模块" onClick={()=>{setActive(null);requestAnimationFrame(()=>tileRefs.current[active]?.focus());}}><svg aria-hidden="true" viewBox="0 0 20 20"><path d="m12.5 4-6 6 6 6M7 10h10"/></svg><span>返回</span></button>
      <div className="card-detail-content"><p className="card-kicker">CARD / {String(active+1).padStart(2,'0')}</p><h3>{modules[active].title}</h3>{modules[active].items.map((item,itemIndex)=><div className="card-value" key={`${item.id}-${itemIndex}`}><div><span>{item.label}</span><p>{item.value}</p></div><button type="button" aria-label={`复制 ${item.label}`} onClick={()=>void copy(item.label,item.value)}><svg aria-hidden="true" viewBox="0 0 20 20"><rect x="7" y="6" width="10" height="12" rx="2"/><path d="M13 6V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></svg></button></div>)}</div>
      <span className="card-detail-index">{String(active+1).padStart(2,'0')} / {String(modules.length).padStart(2,'0')}</span>
    </div>}
    <div className="card-foot"><span>{active===null?'Made for this moment':publicCard?'Shared by the card owner':'Your card, your choice'}</span><span className="card-motion-label">{motion==='float'?'FLOATING GLASS':motion==='keys'?'PIANO KEYS':'ORBIT REVEAL'}</span></div>
    <span className="card-live-status" role="status" aria-live="polite">{status}</span>
  </section>;
}
