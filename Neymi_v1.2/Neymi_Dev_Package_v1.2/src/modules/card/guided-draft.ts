import {localProfileSchema} from '../../domain/schemas';
import type {LocalDraft,LocalProfile,ManualCardConfig} from '../../domain/types';
import type {DesignerEvidence,DesignerProposal,DesignerSlots} from '../assistant/designer/types';
import {getCardTemplate,isCardTemplateId} from './templates';

export function createGuidedDraft(profile:LocalProfile,proposal:DesignerProposal,slots:DesignerSlots,evidence:DesignerEvidence[],confirmedRewriteKeys:string[],now=new Date().toISOString()):LocalDraft{
  const checkedProfile=localProfileSchema.parse(profile);
  if(!isCardTemplateId(proposal.templateId))throw new Error('名片模板不可用。');
  const confirmed=new Set(evidence.filter(item=>item.status==='confirmed').map(item=>item.id));
  const modules=proposal.modules.map((section,moduleIndex)=>({
    id:`guided_${crypto.randomUUID().replaceAll('-','')}_${moduleIndex}`,
    kind:section.kind,
    title:section.title,
    items:section.items.flatMap((item,itemIndex)=>{
      if(item.evidenceIds.some(id=>!confirmed.has(id)))return[];
      const key=`${moduleIndex}:${itemIndex}`;
      if(item.treatment==='rewrite'&&!confirmedRewriteKeys.includes(key))return[];
      if(item.treatment==='verbatim'&&!evidence.some(source=>item.evidenceIds.includes(source.id)&&source.quote.includes(item.text)))return[];
      return[{id:`guided_item_${moduleIndex}_${itemIndex}`,label:item.label,value:item.text,sensitivity:'ordinary' as const}];
    }),
  })).filter(section=>section.items.length>0);
  const identity={
    ...(slots.displayName?{name:slots.displayName}:checkedProfile.identity.name?{name:checkedProfile.identity.name}:{}),
    ...(slots.role?{role:slots.role}:checkedProfile.identity.role?{role:checkedProfile.identity.role}:{}),
    ...(slots.organization?{company:slots.organization}:checkedProfile.identity.company?{company:checkedProfile.identity.company}:{}),
  };
  const template=getCardTemplate(proposal.templateId),id=`guided_${crypto.randomUUID().replaceAll('-','')}`;
  const config:ManualCardConfig={schemaVersion:1,id,kind:'manual',label:'AI 名片草稿',templateId:proposal.templateId,layout:template.layout,animation:'float',orderedModules:modules.map(module=>({localModuleId:module.id,kind:module.kind,emphasis:'normal'})),createdAt:now,updatedAt:now};
  return{id,profileRevision:checkedProfile.revision,config,identity,modules,assets:[]};
}
