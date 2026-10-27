import type {CSSProperties} from 'react';
import type {Layout} from '../../domain/types';

type OpeningEffect='soft-reveal'|'pixel-wake'|'ink-unfold'|'chrome-sheen'|'poster-tear'|'paper-stack'|'light-scan';
type CardTemplate={id:string;name:string;description:string;start:string;end:string;ink:string;muted:string;accent:string;image:string;
  series:'classic'|'mosaic'|'dopamine'|'anime'|'pixel'|'oriental'|'y2k'|'graffiti'|'scrapbook'|'cyber';seriesLabel:string;availability:'free'|'pro';layout:Layout;moduleShell:'glass'|'mosaic'|'sticker'|'panel';pattern:string;openingEffect?:OpeningEffect;legacy?:boolean};
export const CARD_TEMPLATES=[
  {id:'paper',name:'极简白',description:'纯白 · 银灰',start:'#ffffff',end:'#edf0f3',ink:'#17191d',muted:'#51565e',accent:'#444b56',image:'',series:'classic',seriesLabel:'基础',availability:'free',layout:'editorial',moduleShell:'glass',pattern:'classic-paper'},
  {id:'midnight',name:'航天黑',description:'曜黑 · 冷银',start:'#090b0e',end:'#181c22',ink:'#f7f8fa',muted:'#c0c6ce',accent:'#d3dbe5',image:'',series:'classic',seriesLabel:'基础',availability:'free',layout:'editorial',moduleShell:'glass',pattern:'classic-midnight'},
  {id:'evergreen',name:'松林',description:'深绿 · 林间雾',start:'#071e19',end:'#153a2e',ink:'#f2f7ee',muted:'#c5d9cc',accent:'#d6e7b9',image:'/card-backgrounds/forest.png',series:'classic',seriesLabel:'基础',availability:'free',layout:'editorial',moduleShell:'glass',pattern:'classic-evergreen'},
  {id:'coast',name:'大海',description:'深蓝 · 浪潮',start:'#061b35',end:'#123e62',ink:'#f0f7ff',muted:'#bed8ef',accent:'#b9eaf7',image:'/card-backgrounds/ocean.png',series:'classic',seriesLabel:'基础',availability:'free',layout:'editorial',moduleShell:'glass',pattern:'classic-coast'},
  {id:'clay',name:'樱花',description:'淡粉 · 春日',start:'#fff3f5',end:'#f5dbe3',ink:'#4a2638',muted:'#755165',accent:'#944665',image:'/card-backgrounds/sakura.png',series:'classic',seriesLabel:'基础',availability:'free',layout:'editorial',moduleShell:'glass',pattern:'classic-clay'},
  {id:'lilac',name:'紫罗兰',description:'深紫 · 花影',start:'#23132f',end:'#49335d',ink:'#faf2ff',muted:'#dfc9ed',accent:'#e5c9ff',image:'/card-backgrounds/violet.png',series:'classic',seriesLabel:'基础',availability:'free',layout:'editorial',moduleShell:'glass',pattern:'classic-lilac'},
  {id:'mosaic-porcelain',name:'彩瓷拼格',description:'釉面几何 · 作品优先',start:'#172d37',end:'#b36d45',ink:'#fffaf1',muted:'#e9d5bf',accent:'#ffc58d',image:'',series:'mosaic',seriesLabel:'马赛克',availability:'pro',layout:'editorial',moduleShell:'mosaic',pattern:'porcelain',legacy:true},
  {id:'mosaic-glass',name:'玻璃碎片',description:'半透明切片 · 故事优先',start:'#12334a',end:'#8467a8',ink:'#f5fcff',muted:'#c8e4ef',accent:'#7de1d3',image:'',series:'mosaic',seriesLabel:'马赛克',availability:'pro',layout:'constellation',moduleShell:'mosaic',pattern:'glass',legacy:true},
  {id:'mosaic-memories',name:'回忆拼贴',description:'纸片叠层 · 时间线',start:'#54483d',end:'#c8855f',ink:'#fff7e8',muted:'#ead4bc',accent:'#f7c875',image:'',series:'mosaic',seriesLabel:'马赛克',availability:'pro',layout:'ribbon',moduleShell:'mosaic',pattern:'memories',legacy:true},
  {id:'dopamine-candy',name:'糖果派对',description:'高亮撞色 · 大字焦点',start:'#4b1b94',end:'#f43f8b',ink:'#fffef8',muted:'#ffe1f2',accent:'#f9ee57',image:'',series:'dopamine',seriesLabel:'多巴胺',availability:'pro',layout:'constellation',moduleShell:'sticker',pattern:'candy',legacy:true},
  {id:'dopamine-tropical',name:'热带果汁',description:'柑橘色块 · 行动优先',start:'#007b71',end:'#ff8b36',ink:'#fffdf0',muted:'#dcffe8',accent:'#f8fa63',image:'',series:'dopamine',seriesLabel:'多巴胺',availability:'pro',layout:'ribbon',moduleShell:'sticker',pattern:'tropical',legacy:true},
  {id:'dopamine-stickers',name:'快乐贴纸',description:'贴纸散点 · 自我介绍',start:'#ff6b68',end:'#705bdf',ink:'#fffefa',muted:'#ffe9d8',accent:'#b7ff54',image:'',series:'dopamine',seriesLabel:'多巴胺',availability:'pro',layout:'editorial',moduleShell:'sticker',pattern:'stickers',legacy:true},
  {id:'anime-daily',name:'清新日常',description:'日系章节 · 人物优先',start:'#285a76',end:'#e6a26e',ink:'#fffaf2',muted:'#e2edf1',accent:'#ffd19e',image:'',series:'anime',seriesLabel:'动漫灵感',availability:'pro',layout:'ribbon',moduleShell:'panel',pattern:'daily',legacy:true},
  {id:'anime-adventure',name:'冒险档案',description:'任务档案 · 项目章节',start:'#172b38',end:'#b94e3c',ink:'#fff6e8',muted:'#ded2be',accent:'#ffb44d',image:'',series:'anime',seriesLabel:'动漫灵感',availability:'pro',layout:'editorial',moduleShell:'panel',pattern:'adventure',legacy:true},
  {id:'anime-cel',name:'复古赛璐璐',description:'赛璐璐边线 · 故事分镜',start:'#26285d',end:'#d45b74',ink:'#fff8f1',muted:'#e6d7e7',accent:'#73e2d5',image:'',series:'anime',seriesLabel:'动漫灵感',availability:'pro',layout:'constellation',moduleShell:'panel',pattern:'cel',legacy:true},
  {id:'pixel-game',name:'像素游戏',description:'RPG 人物档案 · 项目优先',start:'#101b33',end:'#223a55',ink:'#fff8df',muted:'#c4d8d1',accent:'#a4f38a',image:'',series:'pixel',seriesLabel:'像素游戏',availability:'pro',layout:'constellation',moduleShell:'panel',pattern:'pixel-game',openingEffect:'pixel-wake'},
  {id:'oriental-newwave',name:'东方新潮',description:'宣纸留白 · 朱印点睛',start:'#f1eadb',end:'#d8c9ad',ink:'#25221d',muted:'#665d50',accent:'#b4332e',image:'',series:'oriental',seriesLabel:'东方新潮',availability:'pro',layout:'editorial',moduleShell:'glass',pattern:'oriental-newwave',openingEffect:'ink-unfold'},
  {id:'y2k',name:'Y2K',description:'液态铬银 · 虹彩边框',start:'#e6e7ef',end:'#9da8c7',ink:'#171d32',muted:'#535b73',accent:'#7f66e8',image:'',series:'y2k',seriesLabel:'Y2K',availability:'pro',layout:'constellation',moduleShell:'glass',pattern:'y2k',openingEffect:'chrome-sheen'},
  {id:'street-graffiti',name:'街头涂鸦',description:'海报撞色 · 作品宣言',start:'#f0ebdc',end:'#d7d0bd',ink:'#181716',muted:'#4b4943',accent:'#c6f33e',image:'',series:'graffiti',seriesLabel:'街头涂鸦',availability:'pro',layout:'ribbon',moduleShell:'sticker',pattern:'street-graffiti',openingEffect:'poster-tear'},
  {id:'scrapbook',name:'剪贴手账',description:'纸片叠层 · 故事时间线',start:'#efe5d2',end:'#dac8a8',ink:'#382f27',muted:'#716252',accent:'#bd7357',image:'',series:'scrapbook',seriesLabel:'剪贴手账',availability:'pro',layout:'ribbon',moduleShell:'mosaic',pattern:'scrapbook',openingEffect:'paper-stack'},
  {id:'cyber-neon',name:'赛博霓虹',description:'暗场光路 · 技术标签',start:'#0b1118',end:'#1c2532',ink:'#ecfaff',muted:'#a6bbc8',accent:'#4ce6df',image:'',series:'cyber',seriesLabel:'赛博霓虹',availability:'pro',layout:'constellation',moduleShell:'panel',pattern:'cyber-neon',openingEffect:'light-scan'},
] as const satisfies CardTemplate[];

export type CardTemplateId=typeof CARD_TEMPLATES[number]['id'];
export type RegisteredCardTemplate=CardTemplate&{id:CardTemplateId};
const registeredTemplates=CARD_TEMPLATES as readonly CardTemplate[];
export const CARD_TEMPLATE_REGISTRY:Readonly<Record<CardTemplateId,RegisteredCardTemplate>>=Object.fromEntries(CARD_TEMPLATES.map(template=>[template.id,template])) as Record<CardTemplateId,RegisteredCardTemplate>;
export const FREE_CARD_TEMPLATES=registeredTemplates.filter(template=>template.availability==='free') as RegisteredCardTemplate[];
export const PRO_CARD_TEMPLATES=registeredTemplates.filter(template=>template.availability==='pro'&&!template.legacy) as RegisteredCardTemplate[];
export const DEFAULT_CARD_TEMPLATE:CardTemplateId='evergreen';

export function isCardTemplateId(value:string|undefined|null):value is CardTemplateId{return value!==null&&value!==undefined&&value in CARD_TEMPLATE_REGISTRY;}
export function resolveCardTemplateId(value:string|undefined|null):CardTemplateId{return value==='plain'||!isCardTemplateId(value)?DEFAULT_CARD_TEMPLATE:value;}
export function getCardTemplate(value:string|undefined|null):RegisteredCardTemplate{return CARD_TEMPLATE_REGISTRY[resolveCardTemplateId(value)];}
export function cardTemplateClass(value:string|undefined|null){return `template-${resolveCardTemplateId(value)}`;}

function patternFor(template:CardTemplate){
  const {start,end,accent}=template;
  if(template.pattern==='porcelain')return `linear-gradient(135deg,transparent 0 34%,${accent}44 34% 36%,transparent 36% 65%,${end}99 65% 67%,transparent 67%),linear-gradient(40deg,${start},${end})`;
  if(template.pattern==='glass')return `conic-gradient(from 30deg at 72% 32%,${accent}88 0 17%,transparent 17% 35%,${end}bb 35% 51%,transparent 51% 70%,${accent}44 70% 82%,transparent 82%),linear-gradient(130deg,${start},${end})`;
  if(template.pattern==='memories')return `repeating-linear-gradient(135deg,${accent}18 0 2px,transparent 2px 42px),linear-gradient(120deg,${start},${end})`;
  if(template.pattern==='candy')return `radial-gradient(circle at 80% 20%,${accent} 0 4%,transparent 4.5%),radial-gradient(circle at 90% 75%,#36e3e3 0 7%,transparent 7.5%),linear-gradient(125deg,${start},${end})`;
  if(template.pattern==='tropical')return `linear-gradient(32deg,transparent 0 48%,${accent}aa 48% 64%,transparent 64%),linear-gradient(135deg,${start},${end})`;
  if(template.pattern==='stickers')return `radial-gradient(ellipse at 88% 18%,${accent} 0 7%,transparent 7.5%),radial-gradient(circle at 75% 82%,#ffda5d 0 6%,transparent 6.5%),linear-gradient(135deg,${start},${end})`;
  if(template.pattern==='daily')return `linear-gradient(0deg,${start}cc 0 13%,transparent 13%),radial-gradient(ellipse at 83% 13%,${accent}77,transparent 34%),linear-gradient(130deg,${start},${end})`;
  if(template.pattern==='adventure')return `repeating-linear-gradient(115deg,transparent 0 36px,${accent}2a 37px 39px),linear-gradient(135deg,${start},${end})`;
  if(template.pattern==='cel')return `radial-gradient(${accent}4a 1px,transparent 1.5px) 70% 25%/12px 12px,linear-gradient(135deg,${start},${end})`;
  if(template.pattern==='pixel-game')return `linear-gradient(90deg,transparent 49%,${accent}20 50% 51%,transparent 52%) 0 0/12px 12px,linear-gradient(0deg,transparent 49%,${accent}20 50% 51%,transparent 52%) 0 0/12px 12px,linear-gradient(135deg,${start},${end})`;
  if(template.pattern==='oriental-newwave')return `radial-gradient(ellipse at 84% 23%,${accent}22 0 9%,transparent 9.5%),linear-gradient(90deg,transparent 70%,${accent}20 70% 70.4%,transparent 70.5%),linear-gradient(125deg,${start},${end})`;
  if(template.pattern==='y2k')return `linear-gradient(120deg,transparent 26%,#fff9 39%,${accent}55 43%,transparent 51%),radial-gradient(ellipse at 83% 14%,#fff9,transparent 36%),linear-gradient(135deg,${start},${end})`;
  if(template.pattern==='street-graffiti')return `linear-gradient(145deg,transparent 0 55%,${accent} 55% 64%,transparent 64%),repeating-linear-gradient(0deg,transparent 0 22px,#17171612 23px 24px),linear-gradient(120deg,${start},${end})`;
  if(template.pattern==='scrapbook')return `linear-gradient(90deg,transparent 0 64%,${accent}33 64% 64.5%,transparent 65%),repeating-linear-gradient(0deg,transparent 0 20px,#6e594218 21px 22px),linear-gradient(125deg,${start},${end})`;
  if(template.pattern==='cyber-neon')return `linear-gradient(90deg,transparent 72%,${accent}66 72.3%,transparent 72.8%),radial-gradient(ellipse at 86% 16%,${accent}28,transparent 31%),linear-gradient(135deg,${start},${end})`;
  if(template.id==='midnight')return `radial-gradient(circle at 78% 25%,#d5dbe8 0 1px,transparent 1.4px),radial-gradient(circle at 91% 65%,#aeb9cf 0 1px,transparent 1.5px),radial-gradient(circle at 68% 82%,#f4f6fa 0 1px,transparent 1.4px),linear-gradient(135deg,${start},${end})`;
  return template.image?`url("${template.image}")`:`linear-gradient(125deg,${start} 45%,${end})`;
}
export function cardThemeStyle(value:string|undefined|null):CSSProperties{
  const t=getCardTemplate(value);
  return {'--template-ink':t.ink,'--template-muted':t.muted,'--template-accent':t.accent,'--card-surface':t.start,backgroundImage:patternFor(t)} as CSSProperties;
}
