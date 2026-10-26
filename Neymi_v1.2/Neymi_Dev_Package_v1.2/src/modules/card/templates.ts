import type {CSSProperties} from 'react';
export const CARD_TEMPLATES=[
  {id:'paper',name:'极简白',description:'纯白 · 银灰',start:'#ffffff',end:'#edf0f3',ink:'#17191d',muted:'#51565e',accent:'#444b56',image:''},
  {id:'midnight',name:'航天黑',description:'曜黑 · 冷银',start:'#090b0e',end:'#181c22',ink:'#f7f8fa',muted:'#c0c6ce',accent:'#d3dbe5',image:''},
  {id:'evergreen',name:'松林',description:'深绿 · 林间雾',start:'#071e19',end:'#153a2e',ink:'#f2f7ee',muted:'#c5d9cc',accent:'#d6e7b9',image:'/card-backgrounds/forest.png'},
  {id:'coast',name:'大海',description:'深蓝 · 浪潮',start:'#061b35',end:'#123e62',ink:'#f0f7ff',muted:'#bed8ef',accent:'#b9eaf7',image:'/card-backgrounds/ocean.png'},
  {id:'clay',name:'樱花',description:'淡粉 · 春日',start:'#fff3f5',end:'#f5dbe3',ink:'#4a2638',muted:'#755165',accent:'#944665',image:'/card-backgrounds/sakura.png'},
  {id:'lilac',name:'紫罗兰',description:'深紫 · 花影',start:'#23132f',end:'#49335d',ink:'#faf2ff',muted:'#dfc9ed',accent:'#e5c9ff',image:'/card-backgrounds/violet.png'},
] as const;

export type CardTemplateId=typeof CARD_TEMPLATES[number]['id'];
export const DEFAULT_CARD_TEMPLATE:CardTemplateId='evergreen';

export function isCardTemplateId(value:string|undefined|null):value is CardTemplateId{
  return CARD_TEMPLATES.some(template=>template.id===value);
}

export function resolveCardTemplateId(value:string|undefined|null):CardTemplateId{
  if(value==='plain'||!isCardTemplateId(value))return DEFAULT_CARD_TEMPLATE;
  return value;
}

export function getCardTemplate(value:string|undefined|null){
  const id=resolveCardTemplateId(value);
  return CARD_TEMPLATES.find(template=>template.id===id)!;
}

export function cardTemplateClass(value:string|undefined|null){
  return `template-${resolveCardTemplateId(value)}`;
}

export function cardThemeStyle(value:string|undefined|null):CSSProperties{
  const t=getCardTemplate(value);
  const surface=t.id==='midnight'
    ?'radial-gradient(circle at 78% 25%,#d5dbe8 0 1px,transparent 1.4px),radial-gradient(circle at 91% 65%,#aeb9cf 0 1px,transparent 1.5px),radial-gradient(circle at 68% 82%,#f4f6fa 0 1px,transparent 1.4px),linear-gradient(135deg,#080a0d,#11151b 55%,#1a1e24)'
    :t.image?`url("${t.image}")`:`linear-gradient(125deg,${t.start} 45%,${t.end})`;
  return {'--template-ink':t.ink,'--template-muted':t.muted,'--template-accent':t.accent,
    '--card-surface':t.start,backgroundImage:surface} as CSSProperties;
}
