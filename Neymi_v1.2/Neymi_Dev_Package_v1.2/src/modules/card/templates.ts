export const CARD_TEMPLATES=[
  {id:'evergreen',name:'松林',description:'沉稳商务',start:'#16382f',end:'#214f42',ink:'#f7f4e8',muted:'#d6e6d4',accent:'#d3e888'},
  {id:'paper',name:'素纸',description:'简洁专业',start:'#f4efe5',end:'#e7dfcf',ink:'#27332f',muted:'#57645c',accent:'#a8563b'},
  {id:'coast',name:'海岸',description:'开放交流',start:'#123250',end:'#176a8b',ink:'#edf7fa',muted:'#c6e0eb',accent:'#83e1dd'},
  {id:'clay',name:'陶土',description:'创意表达',start:'#f4d8c2',end:'#d9895d',ink:'#3b291f',muted:'#65493c',accent:'#a84429'},
  {id:'midnight',name:'夜航',description:'科技质感',start:'#171b2e',end:'#34325a',ink:'#f6f4ff',muted:'#c4c1e3',accent:'#9ff0df'},
  {id:'lilac',name:'紫藤',description:'温和知性',start:'#eee8f6',end:'#d9c9ec',ink:'#382c48',muted:'#635873',accent:'#7650a7'},
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
