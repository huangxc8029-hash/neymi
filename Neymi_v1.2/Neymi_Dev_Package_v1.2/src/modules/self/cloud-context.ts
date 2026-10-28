import {approvedCloudContextSchema} from '../../domain/schemas';
import type {ApprovedCloudContext,ConfirmedSelfFact,CloudContextApproval} from '../../domain/types';
import {permissionDenied} from '../../server/errors';
import {detectSensitiveText} from './sensitive-text';
function digest(text:string):Promise<string>{return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(bytes=>Array.from(new Uint8Array(bytes),value=>value.toString(16).padStart(2,'0')).join(''));}
export function cloudContextText(text:string,facts:ConfirmedSelfFact[]=[]):string{
  const conversation=text.trim();return facts.length?`${conversation?`${conversation}\n\n`:''}Confirmed professional facts:\n${facts.map(fact=>`- [${fact.id}] ${fact.text.replace(/\s+/g,' ').trim()}`).join('\n')}`:conversation;
}
export async function createContextApproval(text:string,contextId:string,purpose:string,now:string,facts:ConfirmedSelfFact[]=[]):Promise<CloudContextApproval>{
  const outgoing=cloudContextText(text,facts);if(detectSensitiveText(outgoing).length)throw permissionDenied();
  return{id:crypto.randomUUID().replaceAll('-',''),contextId,contentDigest:await digest(outgoing),purpose,approvedAt:now};
}
export async function buildCloudContext(text:string,facts:ConfirmedSelfFact[],approval:CloudContextApproval):Promise<ApprovedCloudContext>{
  const outgoing=cloudContextText(text,facts),value:ApprovedCloudContext={approval,text:outgoing,factIds:facts.map(fact=>fact.id),moduleMetadata:[]};approvedCloudContextSchema.parse(value);
  if(detectSensitiveText(outgoing).length||await digest(outgoing)!==approval.contentDigest.toLowerCase())throw permissionDenied();return value;
}
