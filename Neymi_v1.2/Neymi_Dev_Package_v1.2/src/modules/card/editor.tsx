'use client';
import type {LocalProfile,Motion} from '../../domain/types';
import type {ReactNode} from 'react';
import {canAddFreeModule,updateModuleItem} from './module-catalog';
import {ModulePicker} from './module-picker';
import {normalizeCardUrl} from './links';
export function CardEditor({profile,onChange,onPreview,motion,onMotion,children}:{profile:LocalProfile;onChange:(profile:LocalProfile)=>void;onPreview:()=>void;motion:Motion;onMotion:(motion:Motion)=>void;children?:ReactNode}){
  function identity(key:'name'|'company'|'role',value:string){onChange({...profile,revision:profile.revision+1,identity:{...profile.identity,[key]:value}});}
  function addSection(kind='project'){
    if(!canAddFreeModule(profile,kind))return;
    const id=`module_${crypto.randomUUID().replaceAll('-','')}`;
    onChange({...profile,revision:profile.revision+1,modules:[...profile.modules,{id,kind,title:kind==='story'?'我的故事':kind==='social'?'社交账号':kind==='website'?'个人网站':'我想介绍',items:[]}]});
  }
  function sectionTitle(id:string,title:string){onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(section=>section.id===id?{...section,title}:section)});}
  function sectionValue(id:string,value:string){onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(section=>section.id===id?{...section,items:value?[{id:`${id}_text`,label:'亮点',value,valueKind:'text',sensitivity:'ordinary'}]:[]}:section)});}
  function linkField(moduleId:string,label:string,value:string){
    onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(section=>{
      if(section.id!==moduleId)return section;
      const existing=section.items.find(item=>item.label===label);
      if(existing)return {...section,items:value?section.items.map(item=>item.id===existing.id?{...item,value}:item):section.items.filter(item=>item.id!==existing.id)};
      return {...section,items:value?[...section.items,{id:`item_${crypto.randomUUID().replaceAll('-','')}`,label,value,valueKind:'text' as const,sensitivity:'ordinary' as const}]:section.items};
    })});
  }
  function linkError(value:string){try{normalizeCardUrl(value);return '';}catch{return '链接仅支持有效的 http/https 网址，不能包含登录凭据。';}}
  return <section className="editor" aria-labelledby="editor-title">
    <div className="editor-title-row"><div className="editor-step" aria-hidden="true">A</div><div><h2 id="editor-title">创建你的名片</h2><p>无需注册，从名字开始。</p></div></div>
    <label htmlFor="display-name">展示名称</label>
    <input id="display-name" autoComplete="name" maxLength={120} value={profile.identity.name??''} onChange={event=>identity('name',event.target.value)}/>
    <label htmlFor="company">公司或团队</label>
    <input id="company" maxLength={120} value={profile.identity.company??''} onChange={event=>identity('company',event.target.value)}/>
    <label htmlFor="role">角色</label>
    <input id="role" maxLength={120} value={profile.identity.role??''} onChange={event=>identity('role',event.target.value)}/>
    {children}
    {profile.modules.filter(section=>section.kind!=='contact').map(section=><fieldset key={section.id}><legend>展示模块</legend>
      {!['website','social'].includes(section.kind)&&<label>内容类型<select value={section.kind} onChange={event=>onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(item=>item.id===section.id?{...item,kind:event.target.value}:item)})}>
        {!['story','project'].includes(section.kind)&&<option value={section.kind}>{section.kind}（已有模块）</option>}<option value="story">Story · 故事</option><option value="project">Project · 项目</option></select></label>}
      <label htmlFor={`${section.id}-title`}>标题</label>
      <input id={`${section.id}-title`} value={section.title} onChange={event=>sectionTitle(section.id,event.target.value)}/>
      {['website','social'].includes(section.kind)?<>
        {(section.kind==='social'?['平台','账号','URL']:['URL']).map(label=>{
          const value=section.items.find(item=>item.label===label)?.value??'',error=label==='URL'&&value?linkError(value):'';
          return <div key={label}><label htmlFor={`${section.id}-${label}`}>{label}</label><input id={`${section.id}-${label}`} value={value} maxLength={2000} aria-invalid={Boolean(error)} aria-describedby={error?`${section.id}-url-error`:undefined} onChange={event=>linkField(section.id,label,event.target.value)}/>{error&&<p id={`${section.id}-url-error`} role="alert">{error}</p>}</div>;
        })}
        {section.items.filter(item=>!['平台','账号','URL'].includes(item.label)).map(item=><div key={item.id}><label htmlFor={`${section.id}-${item.id}`}>{item.label}</label><textarea id={`${section.id}-${item.id}`} value={item.value} onChange={event=>onChange(updateModuleItem(profile,section.id,item.id,event.target.value))}/></div>)}
      </>:section.items.length?section.items.map(item=><div key={item.id}><label htmlFor={`${section.id}-${item.id}`}>{item.label}</label><textarea id={`${section.id}-${item.id}`} value={item.value} onChange={event=>onChange(updateModuleItem(profile,section.id,item.id,event.target.value))}/></div>):<><label htmlFor={`${section.id}-value`}>亮点</label><textarea id={`${section.id}-value`} value="" onChange={event=>sectionValue(section.id,event.target.value)}/></>}
    </fieldset>)}
    <fieldset className="motion-picker"><legend>名片动效</legend><p>选择打开卡片时的动态风格。</p><div role="group" aria-label="名片动效">{([['float','Floating Glass'],['keys','Piano Keys'],['orbit','Orbit Reveal']] as const).map(([value,title])=><button type="button" key={value} aria-pressed={motion===value} className={motion===value?'motion-option selected':'motion-option'} onClick={()=>onMotion(value)}>{title}</button>)}</div></fieldset>
    <button type="button" className="secondary" disabled={!canAddFreeModule(profile,'project')} onClick={()=>addSection()}>添加展示模块</button>
    {!canAddFreeModule(profile,'project')&&<p>免费内容展示位已使用，可继续编辑已有模块。</p>}
    <ModulePicker profile={profile} onAdd={addSection}/>
    <button type="button" onClick={onPreview} disabled={!profile.identity.name?.trim()}>保存并更新预览</button>
    <p className="editor-save-note">输入时实时预览；保存后会留在此浏览器。</p>
  </section>;
}
