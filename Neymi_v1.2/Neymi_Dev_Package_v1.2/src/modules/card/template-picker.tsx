'use client';
import {useState} from 'react';
import type {CardTemplateId} from './templates';
import {FREE_CARD_TEMPLATES,PRO_CARD_TEMPLATES,cardTemplateClass,cardThemeStyle,getCardTemplate} from './templates';

export function TemplatePicker({selected,onSelect,mode='free'}:{selected:CardTemplateId;onSelect:(id:CardTemplateId)=>void;mode?:'free'|'pro'}){
  const [showAll,setShowAll]=useState(false);
  const headingId=mode==='free'?'free-template-picker-title':'vip-template-picker-title',templates=mode==='free'?FREE_CARD_TEMPLATES:PRO_CARD_TEMPLATES,shownTemplates=mode==='pro'||showAll?templates:templates.slice(0,3);
  return <section className="template-picker" aria-labelledby={headingId}>
    <div className="template-picker-heading">
      <div><h2 id={headingId}>{mode==='free'?'免费模板':'VIP 模板'}</h2><p>{mode==='free'?`${templates.length} 款免费模板，选中后即时更新右侧预览。`:`${templates.length} 款 VIP 模板，选中后即时更新右侧预览。`}</p></div>
      <span className="template-selected" aria-live="polite">当前：{getCardTemplate(selected).name}</span>
    </div>
    <div className={`template-options${mode==='pro'?' pro-template-options':''}`} role="group" aria-label={mode==='free'?'免费模板':'VIP 模板'}>
      {shownTemplates.map(template=><button key={template.id} type="button" className={`template-option${mode==='pro'?` template-series-${template.series}`:''}`} data-template-id={template.id} aria-label={`使用模板：${template.name}`}
        aria-pressed={selected===template.id} onClick={()=>onSelect(template.id)}>
        <span className={`template-swatch identity-swatch ${cardTemplateClass(template.id)}`} style={cardThemeStyle(template.id)} aria-hidden="true"><span/><i/><b/></span>
        <span className="template-option-name">{template.name}</span><span className="template-option-description">{template.description}</span>
      </button>)}
      {mode==='free'&&templates.length>3&&<button type="button" className="template-more" aria-expanded={showAll} onClick={()=>setShowAll(value=>!value)}>{showAll?'收起':'更多模板'} <span aria-hidden="true">{showAll?'↑':'＋'}</span></button>}
    </div>
  </section>;
}
