import type {DesignerEvidence,DesignerSlots} from './types';
import {containsContact} from '../../../domain/schemas';
function canonical(value:unknown):unknown{
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([left],[right])=>left.localeCompare(right)).map(([key,item])=>[key,canonical(item)]));
  return value;
}
export type DesignerTurnPayload={message:string;slots:DesignerSlots;evidence:DesignerEvidence[];recentMessages:Array<{role:'user'|'assistant';text:string}>;templateIds:string[]};
export function designerPayloadContainsContact(value:Pick<DesignerTurnPayload,'message'|'evidence'|'recentMessages'>):boolean{
  return[value.message,...value.recentMessages.map(message=>message.text),...value.evidence.map(source=>source.quote)].some(containsContact);
}
export function serializeDesignerTurnPayload(value:DesignerTurnPayload):string{return JSON.stringify(canonical({message:value.message,slots:value.slots,evidence:value.evidence,recentMessages:value.recentMessages,templateIds:value.templateIds}));}
export function serializeDesignerProposalPayload(value:DesignerTurnPayload&{confirmedEvidenceIds:string[];allowedFieldRefs:Array<{moduleId:string;itemId:string}>}):string{return JSON.stringify(canonical({message:value.message,slots:value.slots,evidence:value.evidence,recentMessages:value.recentMessages,templateIds:value.templateIds,confirmedEvidenceIds:value.confirmedEvidenceIds,allowedFieldRefs:value.allowedFieldRefs}));}
