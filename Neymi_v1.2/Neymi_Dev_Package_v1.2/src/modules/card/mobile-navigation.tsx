'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';

export function MobileNavigation({active}:{active:'home'|'beyond'|'cards'}){
  const [open,setOpen]=useState(false),root=useRef<HTMLElement>(null);
  useEffect(()=>{if(!open)return;function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false);}function escape(event:KeyboardEvent){if(event.key==='Escape')setOpen(false);}document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
  return <nav ref={root} className="mobile-work-nav" aria-label="主要功能"><Link href="/" aria-current={active==='home'?'page':undefined}><span aria-hidden="true">✦</span>制作名片</Link><Link href="/beyond" aria-current={active==='beyond'?'page':undefined}><span aria-hidden="true">◇</span>Beyond 名片</Link><button type="button" aria-expanded={open} aria-controls="card-collect-menu" aria-current={active==='cards'?'page':undefined} onClick={()=>setOpen(value=>!value)}><span aria-hidden="true">▤</span>识别收藏卡片</button>{open&&<div id="card-collect-menu" className="card-collect-menu"><Link href="/cards/scan?source=camera" onClick={()=>setOpen(false)}>拍照识别新卡</Link><Link href="/cards/scan?source=album" onClick={()=>setOpen(false)}>选择识别照片</Link><Link href="/cards" onClick={()=>setOpen(false)}>进入卡片库</Link></div>}</nav>;
}
