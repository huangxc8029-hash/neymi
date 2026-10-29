'use client';
import {type KeyboardEvent,useEffect,useRef,useState} from 'react';

export function OnboardingModal(){
  const [open,setOpen]=useState(false),[step,setStep]=useState<1|2>(1);
  const dialogRef=useRef<HTMLElement>(null),dismissRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{setOpen(true);},[]);
  useEffect(()=>{if(open)requestAnimationFrame(()=>dismissRef.current?.focus());},[open,step]);
  function dismiss(){setOpen(false);}
  function onKeyDown(event:KeyboardEvent<HTMLElement>){
    if(event.key==='Escape'){event.preventDefault();dismiss();return;}
    if(event.key!=='Tab')return;
    const controls=dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]');
    if(!controls?.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  if(!open)return null;
  return <div className="onboarding-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)dismiss();}}>
    <section ref={dialogRef} className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" onKeyDown={onKeyDown}>
      <header className="onboarding-header"><a className="onboarding-wordmark" href="/" aria-label="Neymi">neymi<span>.</span></a><div className="onboarding-progress" aria-label={`第 ${step} 屏，共 2 屏`}><span className={step===1?'is-active':''}/><span className={step===2?'is-active':''}/><small>{step} / 2</small></div><button ref={dismissRef} className="onboarding-dismiss" type="button" aria-label="稍后再说" onClick={dismiss}>×</button></header>
      {step===1?<div className="onboarding-screen onboarding-privacy" key="privacy" data-step="privacy">
        <p className="onboarding-eyebrow"><span aria-hidden="true">✳</span> 隐私优先</p>
        <h1 id="onboarding-title">你的个人资料，<br/>留在你的设备里</h1>
        <p id="onboarding-description" className="onboarding-description">名片资料默认保存在本机，云端不保存个人资料。只有你确认后，本次对话内容才会发送给 AI。</p>
        <div className="privacy-visual" aria-label="本机保存资料，云端不保存个人资料">
          <div className="privacy-device"><span className="privacy-device-mark">n.</span><span className="privacy-avatar">林</span><i/><i/><i/><span className="privacy-check">✓</span></div>
          <span className="privacy-path" aria-hidden="true"><i/><i/><i/></span>
          <div className="privacy-cloud"><svg viewBox="0 0 64 44" aria-hidden="true"><path d="M18 35h30a11 11 0 0 0 1-22A17 17 0 0 0 17 16a10 10 0 0 0 1 19Z"/><path d="m23 15 20 20M43 15 23 35"/></svg><small>云端不存储个人资料</small></div>
          <span className="privacy-local-label"><span/>仅保存在本机</span>
        </div>
        <ul className="privacy-points"><li><span>⌂</span>资料保存在你的设备</li><li><span>✦</span>仅将你确认的内容用于 AI 对话</li><li><span>↗</span>每次分享都由你决定</li></ul>
        <footer className="onboarding-footer"><button type="button" className="onboarding-text-button" onClick={dismiss}>稍后再说</button><button type="button" className="onboarding-primary" onClick={()=>setStep(2)}>继续<span aria-hidden="true">→</span></button></footer>
      </div>:<div className="onboarding-screen onboarding-steps" key="steps" data-step="steps">
        <p className="onboarding-eyebrow"><span aria-hidden="true">✦</span> 简单开始</p>
        <h1 id="onboarding-title">3 步，生成你的专属名片</h1>
        <p id="onboarding-description" className="onboarding-description">填写关键信息，挑选喜欢的风格，预览后即可分享。</p>
        <div className="onboarding-three-steps">
          <div className="onboarding-step"><span className="onboarding-step-number">01</span><div><strong>填写信息</strong><small>名字 · 职业 · 亮点</small></div><div className="mini-inputs"><i>林知夏</i><i>品牌设计师</i></div></div>
          <span className="onboarding-step-arrow" aria-hidden="true">→</span>
          <div className="onboarding-step"><span className="onboarding-step-number">02</span><div><strong>选择风格</strong><small>找到你的表达方式</small></div><div className="mini-swatches"><i/><i/><i/></div></div>
          <span className="onboarding-step-arrow" aria-hidden="true">→</span>
          <div className="onboarding-step"><span className="onboarding-step-number">03</span><div><strong>生成名片</strong><small>实时预览与调整</small></div><span className="mini-sparkle" aria-hidden="true">✦</span></div>
        </div>
        <div className="onboarding-card-stage"><span className="onboarding-card-caption"><i/>你的名片预览</span><article className="onboarding-sample-card"><span className="sample-monogram">n.</span><div className="sample-identity"><strong>林知夏</strong><span>品牌设计师 · 独立顾问</span><small>Studio June</small></div><p>把复杂的想法，变成清晰的品牌体验。</p><div className="sample-tags"><span>品牌策略</span><span>视觉设计</span></div><span className="sample-signature">neymi · DIGITAL CARD</span><i className="sample-accent"/></article></div>
        <footer className="onboarding-footer"><button type="button" className="onboarding-text-button" onClick={()=>setStep(1)}><span aria-hidden="true">←</span> 上一步</button><button type="button" className="onboarding-primary" onClick={dismiss}>开始制作<span aria-hidden="true">→</span></button></footer>
      </div>}
    </section>
  </div>;
}
