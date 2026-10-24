'use client';
import type {LocalProfile} from '../../domain/types';
export function CardEditor({profile,onChange,onPreview}:{profile:LocalProfile;onChange:(profile:LocalProfile)=>void;onPreview:()=>void}){
  function identity(key:'name'|'company'|'role',value:string){onChange({...profile,revision:profile.revision+1,identity:{...profile.identity,[key]:value}});}
  function addSection(){
    const id=`module_${crypto.randomUUID().replaceAll('-','')}`;
    onChange({...profile,revision:profile.revision+1,modules:[...profile.modules,{id,kind:'project',title:'我想介绍',items:[]}]});
  }
  function sectionTitle(id:string,title:string){onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(section=>section.id===id?{...section,title}:section)});}
  function sectionValue(id:string,value:string){onChange({...profile,revision:profile.revision+1,modules:profile.modules.map(section=>section.id===id?{...section,items:value?[{id:`${id}_text`,label:'亮点',value,valueKind:'text',sensitivity:'ordinary'}]:[]}:section)});}
  return <section className="editor" aria-labelledby="editor-title">
    <p className="eyebrow">01 · 免费开始</p><h2 id="editor-title">先做一张能用的名片</h2>
    <p>无需注册。名字就够了，其他内容随时补充。</p>
    <label htmlFor="display-name">展示名称</label>
    <input id="display-name" autoComplete="name" maxLength={120} value={profile.identity.name??''} onChange={event=>identity('name',event.target.value)}/>
    <label htmlFor="company">公司或团队</label>
    <input id="company" maxLength={120} value={profile.identity.company??''} onChange={event=>identity('company',event.target.value)}/>
    <label htmlFor="role">角色</label>
    <input id="role" maxLength={120} value={profile.identity.role??''} onChange={event=>identity('role',event.target.value)}/>
    {profile.modules.map(section=><fieldset key={section.id}><legend>展示模块</legend>
      <label htmlFor={`${section.id}-title`}>标题</label>
      <input id={`${section.id}-title`} value={section.title} onChange={event=>sectionTitle(section.id,event.target.value)}/>
      <label htmlFor={`${section.id}-value`}>亮点</label>
      <textarea id={`${section.id}-value`} value={section.items[0]?.value??''} onChange={event=>sectionValue(section.id,event.target.value)}/>
    </fieldset>)}
    <button type="button" className="secondary" onClick={addSection}>添加展示模块</button>
    <button type="button" onClick={onPreview} disabled={!profile.identity.name?.trim()}>预览名片</button>
  </section>;
}
