import type {LocalDraft,LocalProfile,ManualCardConfig} from '../../domain/types';
import {localProfileSchema,manualCardSchema} from '../../domain/schemas';

export function createManualDraft(profile:LocalProfile,config:ManualCardConfig):LocalDraft{
  const checked=localProfileSchema.parse(profile),card=manualCardSchema.parse(config);
  const sections=new Map(checked.modules.map(section=>[section.id,section]));
  return {id:card.id,profileRevision:checked.revision,config:card,identity:{...checked.identity},
    modules:card.orderedModules.flatMap(ref=>{
      const section=sections.get(ref.localModuleId);
      return section?[{...section,items:section.items.filter(item=>item.sensitivity==='ordinary').map(item=>({...item}))}]:[];
    }),assets:[]};
}
