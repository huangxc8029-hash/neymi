'use client';
import type {LocalProfile,Motion} from '../../domain/types';
import type {ReactNode} from 'react';
import {moveModule,updateModuleItem} from './module-catalog';
import {normalizeCardUrl} from './links';
import {DemoCard} from './demo-card';
import {MotionPicker} from './motion-picker';
const vipGroups=[
  {title:'关于我',choices:[['story','我的故事'],['my_intro','一句话介绍']]},
  {title:'我能提供什么',choices:[['service','服务与价值'],['project','项目案例']]},
  {title:'与我合作',choices:[['collaboration_style','合作方式']]},
  {title:'个人特点与更多链接',choices:[['interests','个人特点'],['social','社交账号'],['website','个人网站']]},
] as const;
export type StudioStep='content'|'appearance'|'share';
export const studioSteps:Array<{id:StudioStep;label:string;summary:string}>=[
  {id:'content',label:'内容',summary:'填写身份与联系方式'},
  {id:'appearance',label:'外观',summary:'选择模板与动效'},
  {id:'share',label:'分享',summary:'确认公开内容并交付'},
];
export function CardEditor({profile,onChange,motion,onMotion,freeTemplateContent,vipTemplateContent,baseContent,vipContent,shareContent,activeStep='content',onStepChange,saveStatus,mode='base'}:{profile:LocalProfile;onChange:(profile:LocalProfile)=>void;motion:Motion;onMotion:(motion:Motion)=>void;freeTemplateContent?:ReactNode;vipTemplateContent?:ReactNode;baseContent?:ReactNode;vipContent?:ReactNode;shareContent?:ReactNode;activeStep?:StudioStep;onStepChange?:(step:StudioStep)=>void;saveStatus?:string;mode?:'base'|'vip'}){
  function identity(key:'name'|'company'|'role',value:string){onChange({...profile,revision:profile.revision+1,identity:{...profile.identity,[key]:value.trim()?value:undefined}});}
  function addSection(kind:string,title:string){
    const id=`module_${crypto.randomUUID().replaceAll('-','')}`;
    onChange({...profile,revision:profile.revision+1,modules:[...profile.modules,{id,kind,title,items:[]}]});
  }
  function sectionTitle(id:string,title:string){onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(section=>section.id===id?{...section,title}:section)});}
  function sectionValue(id:string,value:string){onChange(updateModuleItem(profile,id,`${id}_text`,value,'亮点'));}
  function projectField(id:string,key:string,label:string,value:string){onChange(updateModuleItem(profile,id,`project_${id}_${key}`,value,label));}
  function linkField(moduleId:string,label:string,value:string){
    onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(section=>{
      if(section.id!==moduleId)return section;
      const existing=section.items.find(item=>item.label===label);
      if(existing)return {...section,items:value?section.items.map(item=>item.id===existing.id?{...item,value}:item):section.items.filter(item=>item.id!==existing.id)};
      return {...section,items:value?[...section.items,{id:`item_${crypto.randomUUID().replaceAll('-','')}`,label,value,valueKind:'text' as const,sensitivity:'ordinary' as const}]:section.items};
    })});
  }
  function linkError(value:string){try{normalizeCardUrl(value);return '';}catch{return '链接仅支持有效的 http/https 网址，不能包含登录凭据。';}}
  return <section className={`editor ${mode==='vip'?'vip-page-editor':''}`} aria-labelledby={mode==='vip'?'vip-editor-title':'editor-title'}>
    {mode==='base'&&<><div className="editor-title-row"><div className="editor-step" aria-hidden="true">✦</div><div><h2 id="editor-title">名片工作室</h2><p>先整理内容，再选择呈现方式，最后决定分享什么。</p></div></div>{saveStatus&&<p className="studio-save-status" role="status">{saveStatus}</p>}
    <nav className="editor-stepper" aria-label="名片制作步骤">{studioSteps.map((step,index)=><button type="button" key={step.id} data-step={step.id} className={activeStep===step.id?'is-active':''} aria-current={activeStep===step.id?'step':undefined} onClick={()=>onStepChange?.(step.id)}><span className="editor-stepper-number">0{index+1}</span><span className="editor-stepper-copy"><strong>{step.label}</strong><small>{step.summary}</small></span></button>)}</nav>
    <div className="editor-step-panel" hidden={activeStep!=='content'} aria-label="填写名片内容">
    <div className="workflow-step workflow-step-light">
    <div className="step-intro"><h3>建立你的身份</h3><p>姓名是唯一建议填写的内容，公司与角色都可以稍后补充。</p></div>
    <label htmlFor="display-name">展示名称 · 从名字开始</label>
    <input id="display-name" autoComplete="name" maxLength={120} value={profile.identity.name??''} placeholder="例如：林予安" onChange={event=>identity('name',event.target.value)}/>
    <label htmlFor="company">公司或团队（选填）</label>
    <input id="company" maxLength={120} value={profile.identity.company??''} onChange={event=>identity('company',event.target.value)}/>
    <label htmlFor="role">角色（选填）</label>
    <input id="role" maxLength={120} value={profile.identity.role??''} onChange={event=>identity('role',event.target.value)}/>
    </div>
    <div className="workflow-step workflow-step-dark"><div className="step-intro"><h3>联系方式（可选）</h3><p>联系方式保存在本机加密区，默认不公开；可在右侧逐项勾选。</p></div>{baseContent}</div>
    </div>
    <div className="editor-step-panel" hidden={activeStep!=='appearance'} aria-label="选择名片外观">
    <div className="workflow-step workflow-step-light"><div className="step-intro"><h3>选择模板与动效</h3><p>模板只改变呈现方式，不会删除或改写你的资料。</p></div><div className="free-template-area">{freeTemplateContent}</div>
    <MotionPicker value={motion} onChange={onMotion}/>
    </div></div></>}
    {mode==='base'&&<div className="editor-step-panel editor-share-step" hidden={activeStep!=='share'} aria-label="确认并分享名片"><div className="step-intro"><h3>确认并分享</h3><p>右侧勾选控制公开内容，实时预览会同步更新。准备好后选择分享链接或下载格式。</p></div>{shareContent}</div>}
    {mode==='base'&&<div className="editor-step-actions" aria-label="步骤导航">{activeStep!=='content'&&<button type="button" className="secondary" onClick={()=>onStepChange?.(activeStep==='share'?'appearance':'content')}>上一步</button>}{activeStep!=='share'&&<button type="button" onClick={()=>onStepChange?.(activeStep==='content'?'appearance':'share')}>{activeStep==='content'?'下一步：选择外观':'下一步：确认分享'}</button>}</div>}
    {mode==='vip'&&<div className="editor-step-panel vip-content-step">
      <div className="step-intro"><h3 id="vip-editor-title">VIP 名片</h3><p>丰富名片展示内容，并预览高级模板。会员开通尚未接入；本页可在本机编辑和预览。</p></div>
      {vipTemplateContent}
      <DemoCard expanded/>
      {vipContent}
      <div className="vip-module-groups">{vipGroups.map(group=><section key={group.title} className="vip-module-group"><h4>{group.title}</h4><div>{group.choices.map(([kind,title])=><button type="button" className="secondary" key={kind} onClick={()=>addSection(kind,title)}>＋ {title}</button>)}</div></section>)}</div>
      <h3 className="vip-module-heading">已添加的展示内容</h3>
    {profile.modules.filter(section=>section.kind!=='contact').map((section,index,visibleModules)=><fieldset key={section.id}><legend>展示模块</legend>
      <div className="module-order-controls" role="group" aria-label={`${section.title}排序`}><button type="button" aria-label={`上移 ${section.title}`} disabled={index===0} onClick={()=>onChange(moveModule(profile,section.id,'up'))}>上移</button><button type="button" aria-label={`下移 ${section.title}`} disabled={index===visibleModules.length-1} onClick={()=>onChange(moveModule(profile,section.id,'down'))}>下移</button></div>
      {!['website','social'].includes(section.kind)&&<label>内容类型<select value={section.kind} onChange={event=>onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(item=>item.id===section.id?{...item,kind:event.target.value}:item)})}>
        {!['story','project'].includes(section.kind)&&<option value={section.kind}>{section.kind}（已有模块）</option>}<option value="story">Story · 故事</option><option value="project">Project · 项目</option></select></label>}
      <label htmlFor={`${section.id}-title`}>标题</label>
      <input id={`${section.id}-title`} value={section.title} onChange={event=>sectionTitle(section.id,event.target.value)}/>
      <button type="button" className="secondary" onClick={()=>onChange({...profile,revision:profile.revision+1,modules:profile.modules.filter(item=>item.id!==section.id)})}>移除这个模块</button>
      {['website','social'].includes(section.kind)?<>
        {(section.kind==='social'?['平台','账号','URL']:['URL']).map(label=>{
          const value=section.items.find(item=>item.label===label)?.value??'',error=label==='URL'&&value?linkError(value):'';
          return <div key={label}><label htmlFor={`${section.id}-${label}`}>{label}</label><input id={`${section.id}-${label}`} value={value} maxLength={2000} aria-invalid={Boolean(error)} aria-describedby={error?`${section.id}-url-error`:undefined} onChange={event=>linkField(section.id,label,event.target.value)}/>{error&&<p id={`${section.id}-url-error`} role="alert">{error}</p>}</div>;
        })}
        {section.items.filter(item=>!['平台','账号','URL'].includes(item.label)).map(item=><div key={item.id}><label htmlFor={`${section.id}-${item.id}`}>{item.label}</label><textarea id={`${section.id}-${item.id}`} value={item.value} onChange={event=>onChange(updateModuleItem(profile,section.id,item.id,event.target.value))}/></div>)}
      </>:section.kind==='project'?<>{[['background','背景'],['role','角色'],['action','行动'],['result','结果'],['time','时间'],['evidence','证据']].map(([key,label])=>{const value=section.items.find(item=>item.id===`project_${section.id}_${key}`)?.value??'';return <div key={key}><label htmlFor={`${section.id}-${key}`}>{label}</label><textarea id={`${section.id}-${key}`} value={value} onChange={event=>projectField(section.id,key,label,event.target.value)}/></div>;})}<label htmlFor={`${section.id}-highlight`}>亮点</label><textarea id={`${section.id}-highlight`} value={section.items.find(item=>item.id===`${section.id}_text`)?.value??''} onChange={event=>sectionValue(section.id,event.target.value)}/></>:section.items.length?section.items.map(item=><div key={item.id}><label htmlFor={`${section.id}-${item.id}`}>{item.label}</label><textarea id={`${section.id}-${item.id}`} value={item.value} onChange={event=>onChange(updateModuleItem(profile,section.id,item.id,event.target.value))}/></div>):<><label htmlFor={`${section.id}-value`}>亮点</label><textarea id={`${section.id}-value`} value="" onChange={event=>sectionValue(section.id,event.target.value)}/></>}
      {section.items.some(item=>item.sourceRefs?.length||item.confirmedAt)&&<details className="private-source-review"><summary>来源与确认状态（仅本机）</summary>{section.items.filter(item=>item.sourceRefs?.length||item.confirmedAt).map(item=><div key={item.id}><p>{item.label}：{item.confirmedAt?`已确认 ${item.confirmedAt}`:'尚未记录确认时间'}</p>{item.sourceRefs?.map((source,index)=><p key={`${source.sourceId}-${index}`}>{source.kind} · {source.sourceId}{source.page?` · 第 ${source.page} 页`:''}{source.paragraph?` · 段落 ${source.paragraph}`:''}{source.startMs!==undefined?` · ${source.startMs}–${source.endMs} ms`:''}</p>)}</div>)}</details>}
    </fieldset>)}
    </div>}
  </section>;
}
