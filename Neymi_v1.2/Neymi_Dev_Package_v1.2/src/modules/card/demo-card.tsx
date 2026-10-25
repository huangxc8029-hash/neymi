import {cardTemplateClass} from './templates';

const channels=[
  {label:'邮箱',icon:<><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 5.5L19.5 7"/></>},
  {label:'电话',icon:<path d="M7.1 3.8 9.4 3a1.6 1.6 0 0 1 2 1l1 2.4a1.6 1.6 0 0 1-.4 1.8l-1.3 1.1a13 13 0 0 0 4 4l1.1-1.3a1.6 1.6 0 0 1 1.8-.4l2.4 1a1.6 1.6 0 0 1 1 2l-.8 2.3a2.2 2.2 0 0 1-2.3 1.5A15.8 15.8 0 0 1 4.7 6.1a2.2 2.2 0 0 1 1.5-2.3Z"/>},
  {label:'微信',icon:<><path d="M12.8 4.5c4.1 0 7.2 2.4 7.2 5.5s-3.1 5.5-7.2 5.5c-.7 0-1.4-.1-2-.2L7 17l.6-2.1C5.4 14 4 12.1 4 10c0-3.1 3.5-5.5 8.8-5.5Z"/><path d="M7.1 18.7c-2.3-.4-3.8-1.8-3.8-3.6 0-1.4 1.1-2.7 2.7-3.2"/><circle cx="9" cy="9.7" r=".7" fill="currentColor" stroke="none"/><circle cx="15.5" cy="9.7" r=".7" fill="currentColor" stroke="none"/></>},
  {label:'WhatsApp',icon:<><path d="M20.2 11.4a8.2 8.2 0 0 1-11.8 7.3l-4 .9 1-3.8a8.2 8.2 0 1 1 14.8-4.4Z"/><path d="M8.3 8.2c.3-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.5.6c-.2.2-.2.4 0 .7.3.5.8 1 1.4 1.4.4.3.8.5 1.1.6.2.1.4 0 .6-.2l.7-.8c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.5 0 .4-.2 1.1-.6 1.4-.4.4-1 .6-1.7.6-.6 0-1.4-.2-2.5-.7-1.2-.5-2.3-1.4-3.2-2.5-.7-.9-1.1-1.8-1.1-2.6 0-.7.3-1.3.8-1.8Z"/></>},
];

export function DemoCard({templateId='evergreen'}:{templateId?:string}){
  return <section className="demo-preview" aria-labelledby="demo-title">
    <div className="preview-heading"><div><h2 id="demo-title">名片预览</h2><p>先看一张示例，再做成你的。</p></div><span className="example-tag">示例</span></div>
    <article className={`sample-card ${cardTemplateClass(templateId)}`} role="region" aria-label="示例名片">
      <div className="sample-content">
        <div className="sample-head"><span className="sample-brand">neymi<span className="brand-spark" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M10 1.5 12 8l6.5 2-6.5 2-2 6.5L8 12l-6.5-2L8 8l2-6.5Z"/></svg></span></span><span className="sample-edition">PERSONAL CARD&nbsp; · &nbsp;示例</span></div>
        <div className="sample-rule"/>
        <div className="sample-person"><div className="sample-monogram" aria-hidden="true">林</div><div><p className="sample-role">独立产品设计师</p><h3>林予安</h3><p className="sample-intro">把复杂的想法，整理成清楚的下一步。</p></div></div>
        <div className="sample-bottom"><span>为这次交流准备</span><span className="sample-index">N&nbsp; / &nbsp;01</span></div>
      </div>
      <span className="sample-orbit sample-orbit-a" aria-hidden="true"/><span className="sample-orbit sample-orbit-b" aria-hidden="true"/>
    </article>
    <div className="channel-preview" role="group" aria-label="联系方式示意">
      {channels.map(channel=><div className="channel-item" key={channel.label}><span className="channel-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{channel.icon}</svg></span><span>{channel.label}</span></div>)}
    </div>
    <p className="demo-caption">邮箱、电话、微信和 WhatsApp 可选填写；分享前由你逐项确认。</p>
  </section>;
}
