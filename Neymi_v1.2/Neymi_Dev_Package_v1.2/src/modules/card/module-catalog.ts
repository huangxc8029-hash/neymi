import type {LocalProfile} from '../../domain/types';
export type ModuleCatalogEntry={kind:string;title:string;group:string;example:string;availability:'free'|'planned_registration'|'planned_premium'};
export const moduleCatalog:ModuleCatalogEntry[]=[
  {kind:'story',title:'Story · 我的故事',group:'业务与证明',example:'一次真实经历：面对的问题、我的行动与收获。',availability:'free'},
  {kind:'project',title:'Projects · 项目',group:'业务与证明',example:'一个真实项目：承担的角色、解决的问题和成果。',availability:'free'},
  ...[['services','Services · 服务'],['portfolio','Portfolio · 作品集'],['skills','Skills · 技能'],['collaboration','合作方式'],['availability','可接项目时间']].map(([kind,title])=>({kind,title,group:'业务与证明',example:'示例：介绍你实际提供的服务、作品或合作条件。请填写真实内容。',availability:'planned_registration' as const})),
  ...[['interests','兴趣'],['languages','语言'],['work_style','工作风格'],['mbti','自填 MBTI'],['zodiac','星座']].map(([kind,title])=>({kind,title,group:'个人表达',example:kind==='mbti'?'示例：本人自填 MBTI，仅用于自我表达，不用于判断职业能力。':kind==='zodiac'?'示例：本人自选星座，无需填写完整生日。':'示例：用自己的话介绍兴趣、语言或合作习惯。',availability:'planned_registration' as const})),
  {kind:'social',title:'社交账号',group:'外部入口',example:'平台：GitHub；账号：your-name；URL 可选。',availability:'free'},
  {kind:'website',title:'个人网站',group:'外部入口',example:'标题：我的网站；URL：https://example.org',availability:'free'},
  {kind:'portfolio_link',title:'作品链接',group:'外部入口',example:'示例：一个由你维护的作品展示页面。',availability:'planned_registration'},
  {kind:'booking',title:'预约链接',group:'外部入口',example:'示例：由你提供的预约页面，点击后打开。',availability:'planned_premium'},
];
const externalKinds=new Set(['website','social','portfolio_link','booking','link']);
export function canAddFreeModule(profile:LocalProfile,kind:string):boolean{
  if(!moduleCatalog.some(entry=>entry.kind===kind&&entry.availability==='free'))return false;
  return !profile.modules.some(section=>section.kind!=='contact'&&(externalKinds.has(kind)?externalKinds.has(section.kind):!externalKinds.has(section.kind)));
}
export function updateModuleItem(profile:LocalProfile,moduleId:string,itemId:string,value:string):LocalProfile{
  return {...profile,revision:profile.revision+1,modules:profile.modules.map(section=>section.id===moduleId?{...section,items:section.items.map(item=>item.id===itemId?{...item,value}:item)}:section)};
}
