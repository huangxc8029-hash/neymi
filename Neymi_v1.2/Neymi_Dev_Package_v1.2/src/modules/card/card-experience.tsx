'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {Motion,ProfileModule} from '../../domain/types';
import {cardTemplateClass,cardThemeStyle} from './templates';
import {safeCardHref} from './links';

type Identity={name?:string;company?:string;role?:string};
const CopyIcon=()=> <svg aria-hidden="true" viewBox="0 0 20 20"><rect x="7" y="6" width="10" height="12" rx="2"/><path d="M13 6V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></svg>;
export function CardExperience({identity,modules,templateId,motion='float',label='我的名片',dedication,logoSrc}:{identity:Identity;modules:ProfileModule[];templateId:string;motion?:Motion;label?:string;dedication?:string;publicCard?:boolean;logoSrc?:string}){
  const [activeId,setActiveId]=useState<string|null>(null),[status,setStatus]=useState(''),[origin,setOrigin]=useState({x:50,y:50});
  const tiles=modules.filter(section=>section.kind!=='contact'&&section.items.length);
  const contacts=modules.filter(section=>section.kind==='contact').flatMap(section=>section.items).filter(item=>item.value.trim());
  const active=tiles.find(section=>section.id===activeId);
  const tileRefs=useRef<Record<string,HTMLButtonElement|null>>({}),backRef=useRef<HTMLButtonElement|null>(null),cardRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{if(activeId)backRef.current?.focus();},[activeId]);
  useEffect(()=>{function onKey(event:KeyboardEvent){if(event.key==='Escape'&&activeId){event.preventDefault();setActiveId(null);requestAnimationFrame(()=>tileRefs.current[activeId]?.focus());}}window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[activeId]);
  async function copy(label:string,value:string){try{await navigator.clipboard.writeText(value);setStatus('已复制 '+label);}catch{setStatus('复制失败，请检查浏览器剪贴板权限。');}}
  function openTile(id:string){const box=tileRefs.current[id]?.getBoundingClientRect(),card=cardRef.current?.getBoundingClientRect();if(box&&card)setOrigin({x:(box.left+box.width/2-card.left)/card.width*100,y:(box.top+box.height/2-card.top)/card.height*100});setActiveId(id);}
  function close(){setActiveId(null);if(activeId)requestAnimationFrame(()=>tileRefs.current[activeId]?.focus());}
  return <section ref={cardRef} className={'cyber-card identity-card '+cardTemplateClass(templateId)+' motion-'+motion} style={{...cardThemeStyle(templateId),'--orbit-x':origin.x+'%','--orbit-y':origin.y+'%'} as CSSProperties} data-card-motion={motion} data-card-view={active?'detail':'front'} role="region" aria-label={label}>
    <div className="identity-front" inert={Boolean(active)}>
      <div className="identity-logo-slot">{logoSrc&&<Image className="identity-logo" src={logoSrc} alt="用户上传的 Logo 或图片" width={140} height={72} unoptimized/>}</div>
      <div className="identity-nameblock"><h2>{identity.name||'你的名字'}</h2><p className="identity-role">{[identity.company,identity.role].filter(Boolean).join(' · ')}</p>{dedication&&<p className="identity-dedication">{dedication}</p>}</div>
      {contacts.length>0&&<div className="identity-contacts" aria-label="卡面联系方式">{contacts.map(item=><button className="identity-contact" type="button" key={item.id} aria-label={'复制 '+item.label} onClick={()=>void copy(item.label,item.value)}><span className="identity-contact-label">{item.label}</span><span className="identity-contact-value">{item.value}</span><CopyIcon/></button>)}</div>}
      {tiles.length>0&&<div className="identity-modules" aria-label="名片模块">{tiles.map((section,index)=><button ref={node=>{tileRefs.current[section.id]=node;}} className="identity-tile card-tile" data-tile-size={index%5} key={section.id} type="button" onClick={()=>openTile(section.id)}><span>{section.title}</span><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h12m-5-5 5 5-5 5"/></svg></button>)}</div>}
    </div>
    {active&&<div className="identity-detail" role="group" aria-label={active.title+'详情'}><button ref={backRef} type="button" className="identity-back" aria-label="返回名片模块" onClick={close}><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M16 10H4m5-5-5 5 5 5"/></svg>返回</button><h3>{active.title}</h3><div className="identity-detail-scroll">{active.items.map(item=><div className="identity-value" key={item.id}><div><span>{item.label}</span><p>{item.value}</p>{safeCardHref(active.kind,item.label,item.value)&&<a href={safeCardHref(active.kind,item.label,item.value)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">打开 {item.label}</a>}</div><button type="button" aria-label={'复制 '+item.label} onClick={()=>void copy(item.label,item.value)}><CopyIcon/></button></div>)}</div></div>}
    <div className="identity-signature"><span>Neymi</span><small>your secure cyber card manager</small></div>
    <span className="card-live-status" role="status" aria-live="polite">{status}</span>
  </section>;
}
