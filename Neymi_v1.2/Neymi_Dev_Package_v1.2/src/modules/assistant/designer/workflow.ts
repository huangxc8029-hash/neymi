import {designerProposalSchema,designerSlotsSchema} from './schemas';
import type {DesignerEvidence,DesignerProposal,DesignerQuestion,DesignerSlots,DesignerSlotCandidate,DesignerTemplateCapabilities} from './types';
import type {FieldRef} from '../../../domain/types';

export function emptyDesignerSlots():DesignerSlots{return{highlightRefs:[],tone:'clear',density:'normal',language:'zh'};}
export function nextDesignerQuestion(slots:DesignerSlots):DesignerQuestion|null{
  if(!slots.purposeType)return{field:'purposeType',text:'这张名片主要用在什么场景？',choices:['商务合作','求职展示','日常社交']};
  if(!slots.audienceMode)return{field:'audienceMode',text:'主要希望哪类人看到这张名片？',choices:['某一位具体的人','一类联系人','通用名片']};
  if(!slots.displayName)return{field:'displayName',text:'名片上希望显示什么名字？',choices:[]};
  if(!slots.primaryHighlightRef)return{field:'primaryHighlightRef',text:'最希望对方记住你哪一点？也可以先做基础身份名片。',choices:['先做基础名片']};
  return null;
}
export function nextDesignerStage(slots:DesignerSlots):'collecting'|'confirming'|'ready'{
  const question=nextDesignerQuestion(slots);if(question)return'collecting';
  return slots.primaryHighlightRef==='__basic__'?'ready':'confirming';
}
export function validateDesignerEvidenceSources(message:string,recentMessages:Array<{role:'user'|'assistant';text:string}>,evidence:DesignerEvidence[]):void{
  const sources=[message,...recentMessages.filter(item=>item.role==='user').map(item=>item.text)];
  for(const item of evidence){
    if(!sources.some(source=>source.slice(item.start,item.end)===item.quote))throw new Error('evidence quote does not match approved user text');
  }
}
export function validateDesignerFactCandidates(candidates:Array<{text:string;evidenceIds:string[]}>,evidence:DesignerEvidence[]):void{
  const byId=new Map(evidence.filter(item=>item.status!=='rejected').map(item=>[item.id,item]));
  for(const candidate of candidates){
    const cited=candidate.evidenceIds.map(id=>byId.get(id));
    if(!cited.length||cited.some(item=>!item))throw new Error('fact candidate is not quoted from valid evidence');
    if(!cited.some(item=>item!.quote.includes(candidate.text)))throw new Error('fact candidate is not quoted from cited evidence');
  }
}
export function retainConfirmedPrimaryHighlight(proposal:DesignerProposal,primaryHighlightRef:string|undefined,evidence:DesignerEvidence[]):DesignerProposal{
  if(!primaryHighlightRef)return proposal;
  const source=evidence.find(item=>item.id===primaryHighlightRef&&item.status==='confirmed');
  if(!source)return proposal;
  const alreadyIncluded=proposal.modules.some(section=>section.items.some(item=>item.text===source.quote&&item.evidenceIds.includes(source.id)));
  if(alreadyIncluded)return proposal;
  const item={label:'个人亮点',text:source.quote,evidenceIds:[source.id],treatment:'verbatim' as const,needsConfirmation:false};
  const existing=proposal.modules.find(section=>section.kind==='highlight'&&section.items.length<4);
  if(existing)return designerProposalSchema.parse({...proposal,modules:proposal.modules.map(section=>section===existing?{...section,title:'个人亮点',items:[...section.items,item],evidenceIds:[...new Set([...section.evidenceIds,source.id])]}:section)});
  if(proposal.modules.length<6)return designerProposalSchema.parse({...proposal,modules:[...proposal.modules,{kind:'highlight',title:'个人亮点',items:[item],evidenceIds:[source.id]}]});
  const available=proposal.modules.find(section=>section.items.length<4);
  if(available)return designerProposalSchema.parse({...proposal,modules:proposal.modules.map(section=>section===available?{...section,title:section.title||'个人亮点',items:[...section.items,item],evidenceIds:[...new Set([...section.evidenceIds,source.id])]}:section)});
  return designerProposalSchema.parse({...proposal,modules:proposal.modules.map((section,index)=>index===proposal.modules.length-1?{...section,items:[...section.items.slice(0,-1),item],evidenceIds:[...new Set([...section.evidenceIds,source.id])]}:section)});
}
const purposeValues:Record<string,DesignerSlots['purposeType']>={'求职':'job','找工作':'job','商务合作':'partner','合作':'partner','销售':'sales','融资':'fundraise','学术':'research','社交':'social','通用':'general','其他':'other'};
const audienceValues:Record<string,DesignerSlots['audienceMode']>={'某一位具体的人':'person','具体的人':'person','个人':'person','一类联系人':'group','群体':'group','某类人':'group','通用名片':'general','通用':'general'};
const purposes=['job','partner','sales','fundraise','research','social','general','other'] as const;
const purposeFields=new Set(['purposeType']);
const validText=(value:unknown,max=120):string=>{if(typeof value!=='string')throw new Error('字段值格式无效');const text=value.trim();if(!text||text.length>max)throw new Error('字段值长度无效');return text;};
export function mergeSlotCandidates(slots:DesignerSlots,candidates:DesignerSlotCandidate[]):DesignerSlots{
  const next={...designerSlotsSchema.parse(slots)} as DesignerSlots;
  for(const candidate of candidates){
    if(!['displayName','role','organization','purposeType','desiredOutcome','audienceMode','audienceRole','audienceOrganization','highlightRefs','primaryHighlightRef','tone','density','language','templatePreference'].includes(candidate.field))throw new Error('不支持的名片信息字段');
    const field=candidate.field as keyof DesignerSlots,value=candidate.value;
    if(purposeFields.has(candidate.field)){const text=validText(value,40),mapped=purposeValues[text]??(purposes.includes(text as typeof purposes[number])?text as typeof purposes[number]:undefined);if(!mapped)throw new Error('请选择有效的名片用途');next.purposeType=mapped;}
    else if(candidate.field==='audienceMode'){const text=validText(value,60);next.audienceMode=audienceValues[text]??(['person','group','general'].includes(text)?text as DesignerSlots['audienceMode']:undefined);if(!next.audienceMode)throw new Error('请选择有效的接收人类型');}
    else if(candidate.field==='highlightRefs'){if(!Array.isArray(value)||value.length>20||value.some(item=>typeof item!=='string'))throw new Error('亮点引用格式无效');next.highlightRefs=[...new Set(value as string[])];}
    else if(candidate.field==='primaryHighlightRef'){const text=validText(value,128);next.primaryHighlightRef=text==='先做基础名片'||text==='__basic__'?'__basic__':text;if(text!=='先做基础名片'&&text!=='__basic__'&&!next.highlightRefs.includes(text))next.highlightRefs=[...next.highlightRefs,text];}
    else if(candidate.field==='tone'){const text=validText(value,20);if(!['clear','friendly','bold'].includes(text))throw new Error('语气偏好无效');next.tone=text as DesignerSlots['tone'];}
    else if(candidate.field==='density'){const text=validText(value,20);if(!['compact','normal'].includes(text))throw new Error('内容密度无效');next.density=text as DesignerSlots['density'];}
    else if(candidate.field==='language'){const text=validText(value,20);if(!['zh','en','bilingual'].includes(text))throw new Error('语言偏好无效');next.language=text as DesignerSlots['language'];}
    else{const maximum=candidate.field==='desiredOutcome'?300:candidate.field==='templatePreference'?80:120;(next as Record<string,unknown>)[field]=validText(value,maximum);}
  }
  return designerSlotsSchema.parse(next);
}
const refKey=(ref:FieldRef)=>`${ref.moduleId}/${ref.itemId}`;
export function validateDesignerProposal(input:DesignerProposal,allowed:DesignerTemplateCapabilities,evidence:DesignerEvidence[]=[]):DesignerProposal{
  const proposal=designerProposalSchema.parse(input),templateIds=new Set(allowed.templateIds),evidenceIds=new Set(evidence.filter(item=>item.status==='confirmed').map(item=>item.id)),fieldRefs=new Set(allowed.fieldRefs.map(refKey));
  if(!templateIds.has(proposal.templateId)||proposal.alternatives.some(id=>!templateIds.has(id)))throw new Error('AI returned an unavailable card template');
  if(proposal.modules.length>5)throw new Error('AI returned too many card modules');
  for(const ref of proposal.proposedFieldRefs)if(!fieldRefs.has(refKey(ref)))throw new Error('AI referenced an unavailable profile field');
  for(const section of proposal.modules){
    for(const id of section.evidenceIds)if(!evidenceIds.has(id))throw new Error('AI referenced unconfirmed evidence');
    for(const item of section.items){
      if(item.evidenceIds.length===0||item.evidenceIds.some(id=>!evidenceIds.has(id)))throw new Error('AI content lacks confirmed evidence');
      if(item.treatment==='rewrite'&&!item.needsConfirmation)throw new Error('Rewritten content must be confirmed by the user');
      if(item.treatment==='verbatim'&&!evidence.some(source=>item.evidenceIds.includes(source.id)&&source.quote.includes(item.text)))throw new Error('Verbatim AI content must match the cited source');
    }
  }
  if(proposal.omissions.some(item=>!evidenceIds.has(item.evidenceId)))throw new Error('AI referenced unknown omitted evidence');
  return proposal;
}
