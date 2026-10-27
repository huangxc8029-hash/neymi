'use client';
import {useState} from 'react';
import type {CardTemplateId} from './templates';
import {FREE_CARD_TEMPLATES,PRO_CARD_TEMPLATES,cardTemplateClass,cardThemeStyle,getCardTemplate} from './templates';
import {DemoCard} from './demo-card';

export function TemplatePicker({selected,onSelect,mode='free'}:{selected:CardTemplateId;onSelect:(id:CardTemplateId)=>void;mode?:'free'|'pro'}){
  const [previewId,setPreviewId]=useState<CardTemplateId|null>(null);
  const headingId=mode==='free'?'free-template-picker-title':'vip-template-picker-title';
  return <section className="template-picker" aria-labelledby={headingId}>
    <div className="template-picker-heading">
      <div><h2 id={headingId}>{mode==='free'?'免费模板':'VIP 模板'}</h2><p>{mode==='free'?'6 款免费模板，选中后即时更新右侧预览。':'6 种原创视觉主题，可查看大图与开场效果。'}</p></div>
      {mode==='free'&&<span className="template-selected" aria-live="polite">当前：{getCardTemplate(selected).name}</span>}
    </div>
    {mode==='free'?<div className="template-options" role="group" aria-label="免费模板">
      {FREE_CARD_TEMPLATES.map(template=><button key={template.id} type="button" className="template-option" data-template-id={template.id} aria-label={`使用模板：${template.name}`}
        aria-pressed={selected===template.id} onClick={()=>onSelect(template.id)}>
        <span className={`template-swatch identity-swatch ${cardTemplateClass(template.id)}`} style={cardThemeStyle(template.id)} aria-hidden="true"><span/><i/><b/></span>
        <span className="template-option-name">{template.name}</span><span className="template-option-description">{template.description}</span>
      </button>)}
    </div>:<>
    <div className="template-options pro-template-options" role="group" aria-label="六种 VIP 模板">
      {PRO_CARD_TEMPLATES.map(template=><article key={template.id} className={`template-option pro-template-option template-series-${template.series}`} data-template-id={template.id} aria-label={`VIP 模板：${template.name}`}>
        <span className={`template-swatch identity-swatch ${cardTemplateClass(template.id)}`} style={cardThemeStyle(template.id)} aria-hidden="true"><span/><i/><b/></span>
        <span className="template-option-name">{template.name}</span><span className="template-option-description">{template.description}</span>
        <span className="template-pro-badge">VIP 主题 · 本地预览</span>
        {mode==='pro'&&<button type="button" className="template-pro-select" aria-pressed={selected===template.id} onClick={()=>onSelect(template.id)}>{selected===template.id?'当前预览':'预览此模板'}</button>}
        <button type="button" className="template-preview-button" aria-expanded={previewId===template.id} aria-controls={`preview-${template.id}`} onClick={()=>setPreviewId(previewId===template.id?null:template.id)}>{previewId===template.id?'收起大图':'查看大图'}</button>
      </article>)}
    </div>
    {previewId&&<div className="template-preview-expanded" id={`preview-${previewId}`}><DemoCard templateId={previewId} previewOnly/></div>}
    </>}
  </section>;
}
