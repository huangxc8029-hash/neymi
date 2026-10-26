import {CardExperience} from './card-experience';
import type {ProfileModule} from '../../domain/types';
const modules:ProfileModule[]=[{id:'demo-contact',kind:'contact',title:'联系方式',items:[
  {id:'demo-email',label:'邮箱',value:'hello@example.com',sensitivity:'ordinary'},
  {id:'demo-phone',label:'电话',value:'+86 138 0000 0000',sensitivity:'ordinary'},
  {id:'demo-wechat',label:'微信',value:'lin-design',sensitivity:'ordinary'},
  {id:'demo-wa',label:'WhatsApp',value:'+86 138 0000 0000',sensitivity:'ordinary'},
]},{id:'demo-story',kind:'story',title:'我的故事',items:[{id:'demo-intro',label:'介绍',value:'把复杂的想法，整理成清楚的下一步。',sensitivity:'ordinary'}]}];
export function DemoCard({templateId='evergreen'}:{templateId?:string}){
  return <section className="demo-preview" aria-labelledby="demo-title"><div className="preview-heading"><div><h2 id="demo-title">名片预览</h2><p>先看一张示例，再做成你的。</p></div><span className="example-tag">示例</span></div>
    <CardExperience identity={{name:'林予安',company:'独立设计工作室',role:'产品设计师'}} modules={modules} templateId={templateId} label="示例名片"/>
    <p className="demo-caption" role="group" aria-label="联系方式示意">示例信息 · 邮箱、电话、微信、WhatsApp 均可选填写，分享前由你逐项确认。</p>
  </section>;
}
