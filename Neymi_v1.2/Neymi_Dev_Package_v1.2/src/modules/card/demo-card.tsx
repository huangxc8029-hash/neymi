import {CardExperience} from './card-experience';
import type {Motion,ProfileModule} from '../../domain/types';
import {getCardTemplate} from './templates';
const modules:ProfileModule[]=[{id:'demo-contact',kind:'contact',title:'联系方式',items:[
  {id:'demo-email',label:'邮箱',value:'hello@example.com',sensitivity:'ordinary'},
  {id:'demo-phone',label:'电话',value:'+86 138 0000 0000',sensitivity:'ordinary'},
  {id:'demo-wechat',label:'微信',value:'lin-design',sensitivity:'ordinary'},
  {id:'demo-wa',label:'WhatsApp',value:'+86 138 0000 0000',sensitivity:'ordinary'},
]},{id:'demo-story',kind:'story',title:'我的故事',items:[{id:'demo-intro',label:'介绍',value:'把复杂的想法，整理成清楚的下一步。',sensitivity:'ordinary'}]}];
const homepageModules:ProfileModule[]=[...modules,
  {id:'demo-school',kind:'university',title:'教育背景',items:[{id:'demo-stanford',label:'院校',value:'Stanford University',sensitivity:'ordinary'}]},
  {id:'demo-social',kind:'social',title:'社交账号',items:[{id:'demo-instagram',label:'Instagram',value:'https://instagram.com',sensitivity:'ordinary'}]},
  {id:'demo-design-certificate',kind:'credential',title:'设计行业证书',items:[{id:'demo-google-ux',label:'证书',value:'Google UX Design Professional Certificate',sensitivity:'ordinary'}]},
];
const expandedModules:ProfileModule[]=[
  {id:'vip-about',kind:'story',title:'关于我',items:[{id:'vip-about-text',label:'介绍',value:'我是一名产品设计师，擅长把复杂信息整理成容易使用的体验。',sensitivity:'ordinary'}]},
  {id:'vip-offer',kind:'service',title:'我能提供什么',items:[{id:'vip-offer-text',label:'服务',value:'从用户研究到界面设计，帮助团队把想法做成清晰的产品。',sensitivity:'ordinary'}]},
  {id:'vip-work',kind:'collaboration_style',title:'与我合作',items:[{id:'vip-work-text',label:'方式',value:'先确认目标与范围，再共同审阅设计方案。',sensitivity:'ordinary'}]},
  {id:'vip-personal',kind:'interests',title:'个人特点与更多链接',items:[{id:'vip-personal-text',label:'特点',value:'喜欢用简单的方式解释复杂的事情。',sensitivity:'ordinary'}]},
  {id:'vip-education',kind:'credential',title:'我的资质',items:[{id:'vip-education-text',label:'证书',value:'产品设计与用户研究方向。',sensitivity:'ordinary'}]},
  {id:'vip-social',kind:'social',title:'社交账号',items:[{id:'vip-social-x',label:'X',value:'https://x.com',sensitivity:'ordinary'},{id:'vip-social-instagram',label:'Instagram',value:'https://instagram.com',sensitivity:'ordinary'}]},
  {id:'vip-hobby',kind:'hobby',title:'兴趣爱好',items:[{id:'vip-hobby-text',label:'兴趣',value:'城市漫步、摄影与阅读。',sensitivity:'ordinary'}]},
  {id:'vip-contact',kind:'contact',title:'联系方式',items:[{id:'vip-contact-phone',label:'电话',value:'+86 138 0013 0210',sensitivity:'ordinary'},{id:'vip-contact-email',label:'邮件',value:'hello@spacex.design',sensitivity:'ordinary'},{id:'vip-contact-whatsapp',label:'WhatsApp',value:'+1 202 555 0148',sensitivity:'ordinary'},{id:'vip-contact-city',label:'所在城市',value:'上海 · 中国',sensitivity:'ordinary'}]},
];
export function DemoCard({templateId='evergreen',previewOnly=false,expanded=false,homeExample=false,showReplay=false,moduleDisplayLimit=4,motion='float',replayKey=0,onReplay}:{templateId?:string;previewOnly?:boolean;expanded?:boolean;homeExample?:boolean;showReplay?:boolean;moduleDisplayLimit?:number;motion?:Motion;replayKey?:number;onReplay?:()=>void}){
  const titleId=expanded?'vip-content-example':previewOnly?`template-preview-${templateId}`:'demo-title';
  if(!expanded&&!previewOnly){const demoTemplate=getCardTemplate(templateId),rgb=demoTemplate.ink.slice(1).match(/.{2}/g)?.map(part=>parseInt(part,16))??[],darkInk=rgb.length===3&&rgb[0]*.299+rgb[1]*.587+rgb[2]*.114<127;return <section className="home-demo-card" aria-label="示例名片">{showReplay&&<div className="home-demo-heading"><span>示例名片</span><button type="button" className="demo-replay" onClick={onReplay}>重播开场</button></div>}<CardExperience key={`${templateId}-${motion}-${replayKey}`} identity={{name:'林予安',company:homeExample?'NVIDIA 设计团队':'独立设计工作室',role:'产品设计师'}} modules={homeExample?homepageModules:modules} templateId={templateId} layout={demoTemplate.layout} motion={motion} logoSrc={homeExample?darkInk?'/nvidia-logo-vertical-black.png':'/nvidia-logo-vertical-white.png':undefined} logoAlt="NVIDIA 标志（示例）" moduleDisplayLimit={moduleDisplayLimit} label="示例名片"/></section>;}
  return <section className={expanded?'demo-preview vip-demo-example':'demo-preview'} aria-labelledby={titleId}><div className="preview-heading"><div><h2 id={titleId}>{expanded?'展示内容示例':previewOnly?'高级模板大图预览':'名片预览'}</h2><p>{expanded?'示例展示模块结构，下面填写的才是你的内容。':previewOnly?'仅供查看，不会更换当前模板或进入导出。':'先看一张示例，再做成你的。'}</p></div>{expanded?<button type="button" className="demo-replay" onClick={onReplay}>重播开场</button>:<span className="example-tag">{previewOnly?'只读预览':'示例'}</span>}</div>
    <CardExperience key={`${templateId}-${motion}-${replayKey}`} identity={{name:'林予安',company:'独立设计工作室',role:'产品设计师'}} modules={expanded?expandedModules:modules} templateId={templateId} layout={getCardTemplate(templateId).layout} motion={motion} logoSrc={expanded?'/spacex-logo.svg':undefined} plainContacts={expanded} moduleDisplayLimit={moduleDisplayLimit} label={expanded?'展示内容示例':previewOnly?'模板只读预览':'示例名片'}/>
    {expanded?<p className="demo-caption">这是演示名片，不会写入你的资料。</p>:previewOnly?<p className="demo-caption">示例内容仅用于查看主题布局，不会创建或导出卡片。</p>:<p className="demo-caption" role="group" aria-label="联系方式示意">示例信息 · 邮箱、电话、微信、WhatsApp 和联系地址均可选填写，分享前由你逐项确认。</p>}
  </section>;
}
