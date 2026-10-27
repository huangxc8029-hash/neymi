import type {LocalProfile} from '../../domain/types';

export type ModuleCatalogEntry={kind:string;title:string;group:string;example:string;availability:'free'|'planned_registration'|'planned_premium'};
export const moduleCatalogGroups=['认识我','我能提供什么','我的证明','我的观点','与我合作','个人特点与联系'] as const;
export const legacyModuleKindMap:Record<string,string>={
  story:'my_story',project:'project_case',services:'service',portfolio:'portfolio_gallery',skills:'skills',
  collaboration:'collaboration_style',availability:'availability',social:'social_links',website:'website',booking:'booking_link',
};
export const normalizeModuleKind=(kind:string)=>legacyModuleKindMap[kind]??kind;
export const moduleCatalog:ModuleCatalogEntry[]=[
  {kind:'my_intro',title:'一句话介绍',group:'认识我',example:'用一句话说清你希望别人记住什么。',availability:'planned_registration'},
  {kind:'current_role',title:'当前身份',group:'认识我',example:'介绍当前真实身份、方向或关注领域。',availability:'planned_registration'},
  {kind:'story',title:'Story · 我的故事',group:'认识我',example:'一次真实经历：面对的问题、我的行动与收获。',availability:'free'},
  {kind:'experience_path',title:'经历路径',group:'认识我',example:'按时间整理真实经历与转折。',availability:'planned_registration'},
  {kind:'service',title:'Services · 服务',group:'我能提供什么',example:'示例：介绍你实际提供的服务、作品或合作条件。请填写真实内容。',availability:'planned_registration'},
  {kind:'problem_solved',title:'解决的问题',group:'我能提供什么',example:'说明你能解决的问题，避免无证据的承诺。',availability:'planned_registration'},
  {kind:'collaboration_style',title:'合作方式',group:'我能提供什么',example:'写明实际合作流程与偏好。',availability:'planned_registration'},
  {kind:'work_process',title:'工作流程',group:'我能提供什么',example:'用步骤介绍你真实采用的工作流程。',availability:'planned_registration'},
  {kind:'project',title:'Projects · 项目案例',group:'我的证明',example:'一个独立案例，记录背景、角色、行动、结果、时间与证据。',availability:'free'},
  {kind:'portfolio_gallery',title:'Portfolio · 作品集',group:'我的证明',example:'展示由你创作或有权展示的作品。',availability:'planned_registration'},
  {kind:'achievement',title:'成果',group:'我的证明',example:'添加有材料支持并经你确认的成果。',availability:'planned_registration'},
  {kind:'credential',title:'资质',group:'我的证明',example:'注明可核实的资格或认证。',availability:'planned_registration'},
  {kind:'testimonial',title:'客户评价',group:'我的证明',example:'只添加你有权展示且经核验的评价。',availability:'planned_registration'},
  {kind:'viewpoint',title:'专业观点',group:'我的观点',example:'介绍你明确表达过的观点。',availability:'planned_registration'},
  {kind:'article',title:'文章',group:'我的观点',example:'链接或摘要你有权分享的文章。',availability:'planned_registration'},
  {kind:'talk',title:'演讲',group:'我的观点',example:'介绍公开演讲或分享主题。',availability:'planned_registration'},
  {kind:'method',title:'方法',group:'我的观点',example:'说明你真实使用的方法与步骤。',availability:'planned_registration'},
  {kind:'faq',title:'常见问答',group:'我的观点',example:'回答合作方常问的问题。',availability:'planned_registration'},
  {kind:'availability',title:'可接项目时间',group:'与我合作',example:'说明当前可合作时间，不代表预约服务。',availability:'planned_registration'},
  {kind:'collaboration_terms',title:'合作条件',group:'与我合作',example:'说明你实际接受的合作条件。',availability:'planned_registration'},
  {kind:'booking',title:'预约链接',group:'与我合作',example:'链接到你提供的预约页面。',availability:'planned_premium'},
  {kind:'interests',title:'兴趣',group:'个人特点与联系',example:'分享你自愿公开的兴趣。',availability:'planned_registration'},
  {kind:'languages',title:'语言',group:'个人特点与联系',example:'介绍你实际使用的语言。',availability:'planned_registration'},
  {kind:'work_style',title:'工作风格',group:'个人特点与联系',example:'用自己的话描述合作习惯。',availability:'planned_registration'},
  {kind:'mbti',title:'自填 MBTI',group:'个人特点与联系',example:'自选的个人表达，不用于判断职业能力。',availability:'planned_registration'},
  {kind:'zodiac',title:'星座',group:'个人特点与联系',example:'可选自我表达，无需填写完整生日。',availability:'planned_registration'},
  {kind:'social',title:'社交账号',group:'个人特点与联系',example:'平台：GitHub；账号：your-name；URL 可选。',availability:'free'},
  {kind:'website',title:'个人网站',group:'个人特点与联系',example:'标题：我的网站；URL：https://example.org',availability:'free'},
];

const externalKinds=new Set(['website','social','social_links','portfolio_link','booking','booking_link','link']);
const contentKinds=new Set(['story','my_story','project','project_case']);
export function canAddFreeModule(profile:LocalProfile,kind:string):boolean{
  if(!moduleCatalog.some(entry=>entry.kind===kind&&entry.availability==='free'))return false;
  const sections=profile.modules.filter(section=>section.kind!=='contact');
  if(externalKinds.has(kind))return !sections.some(section=>externalKinds.has(section.kind));
  if(kind==='project')return !sections.some(section=>!contentKinds.has(section.kind)||contentKinds.has(section.kind)&&!['project','project_case'].includes(section.kind));
  return !sections.some(section=>!contentKinds.has(section.kind)||contentKinds.has(section.kind));
}
export function updateModuleItem(profile:LocalProfile,moduleId:string,itemId:string,value:string,label?:string):LocalProfile{
  return {...profile,revision:profile.revision+1,modules:profile.modules.map(section=>section.id===moduleId?{...section,items:value?section.items.some(item=>item.id===itemId)?section.items.map(item=>item.id===itemId?{...item,value}:item):[...section.items,{id:itemId,label:label??itemId.split('_').slice(1).join('_'),value,valueKind:'text' as const,sensitivity:'ordinary' as const}]:section.items.filter(item=>item.id!==itemId)}:section)};
}
export function moveModule(profile:LocalProfile,moduleId:string,direction:'up'|'down'):LocalProfile{
  const index=profile.modules.findIndex(module=>module.id===moduleId),next=index+(direction==='up'?-1:1);
  if(index<0||next<0||next>=profile.modules.length)return profile;
  const modules=[...profile.modules];[modules[index],modules[next]]=[modules[next],modules[index]];
  return {...profile,revision:profile.revision+1,modules};
}
