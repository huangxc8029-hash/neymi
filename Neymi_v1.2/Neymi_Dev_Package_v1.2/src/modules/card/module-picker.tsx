'use client';
import type {LocalProfile} from '../../domain/types';
import {canAddFreeModule,moduleCatalog,moduleCatalogGroups} from './module-catalog';
export function ModulePicker({profile,onAdd}:{profile:LocalProfile;onAdd:(kind:string)=>void}){
  return <section className="module-catalog" aria-labelledby="catalog-title"><h3 id="catalog-title">展示更多真实的你</h3><p>按你希望别人了解的内容选择模块。免费可添加一个故事或多个项目案例，以及一条外部入口。</p>
    {moduleCatalogGroups.map(group=><fieldset key={group}><legend>{group}</legend>{moduleCatalog.filter(entry=>entry.group===group).map(entry=><details key={entry.kind} className="module-catalog-entry"><summary>{entry.title} <span>{entry.availability==='free'?'免费':entry.availability==='planned_registration'?'🔒 注册功能即将开放':'🔒 高级功能即将开放'}</span></summary><p>静态示例（不会写入你的名片）：{entry.example}</p>{entry.availability==='free'&&(canAddFreeModule(profile,entry.kind)?<button type="button" onClick={()=>onAdd(entry.kind)}>添加{entry.kind==='project'?'项目案例':entry.title}</button>:<p>此类免费展示位已使用；你可以继续编辑已有内容。</p>)}</details>)}</fieldset>)}
  </section>;
}
