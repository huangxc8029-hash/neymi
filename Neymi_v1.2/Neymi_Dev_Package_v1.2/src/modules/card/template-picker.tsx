'use client';
import type {CardTemplateId} from './templates';
import {CARD_TEMPLATES,cardTemplateClass,cardThemeStyle} from './templates';

export function TemplatePicker({selected,onSelect}:{selected:CardTemplateId;onSelect:(id:CardTemplateId)=>void}){
  return <section className="template-picker" aria-labelledby="template-picker-title">
    <div className="template-picker-heading">
      <div><h2 id="template-picker-title">挑选名片风格</h2><p>6 款免费 · 免注册 · 点击即可切换</p></div>
      <span className="template-selected" aria-live="polite">当前：{CARD_TEMPLATES.find(template=>template.id===selected)?.name}</span>
    </div>
    <div className="template-options" role="group" aria-label="免费模板">
      {CARD_TEMPLATES.map(template=><button key={template.id} type="button" className="template-option" aria-label={`使用模板：${template.name}`}
        aria-pressed={selected===template.id} onClick={()=>onSelect(template.id)}>
        <span className={`template-swatch identity-swatch ${cardTemplateClass(template.id)}`} style={cardThemeStyle(template.id)} aria-hidden="true"><span/><i/><b/></span>
        <span className="template-option-name">{template.name}</span><span className="template-option-description">{template.description}</span>
      </button>)}
    </div>
  </section>;
}
