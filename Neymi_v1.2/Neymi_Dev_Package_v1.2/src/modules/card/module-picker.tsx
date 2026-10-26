'use client';
import type {LocalProfile} from '../../domain/types';
import {canAddFreeModule,moduleCatalog} from './module-catalog';
export function ModulePicker({profile,onAdd}:{profile:LocalProfile;onAdd:(kind:string)=>void}){
  return <section className="module-catalog" aria-labelledby="catalog-title"><h3 id="catalog-title">展示更多真实的你</h3><p>免费：一个 Story 或 Project 展示位，加一条网站或社交记录。已有内容不受新增限制影响。</p>
    {['业务与证明','个人表达','外部入口'].map(group=><fieldset key={group}><legend>{group}</legend>{moduleCatalog.filter(entry=>entry.group===group).map(entry=><details key={entry.kind} className="module-catalog-entry"><summary>{entry.title} <span>{entry.availability==='free'?'免费':entry.availability==='planned_registration'?'🔒 注册功能即将开放':'🔒 高级功能即将开放'}</span></summary><p>静态示例（不会写入你的名片）：{entry.example}</p>{entry.availability==='free'&&(canAddFreeModule(profile,entry.kind)?<button type="button" onClick={()=>onAdd(entry.kind)}>添加{entry.title}</button>:<p>此类免费展示位已使用；你可以继续编辑已有内容。</p>)}</details>)}</fieldset>)}
  </section>;
}
