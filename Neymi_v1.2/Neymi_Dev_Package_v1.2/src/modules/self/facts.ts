import {approvedCloudContextSchema,candidateSelfFactSchema,confirmedSelfFactSchema} from '../../domain/schemas';
import type {ApprovedCloudContext,CandidateSelfFact,ConfirmedSelfFact,CloudContextApproval,LocalProfile} from '../../domain/types';
import {permissionDenied} from '../../server/errors';
import {getLLMProvider} from '../../server/providers/llm';
import type {Vault} from '../vault/vault';

const patterns:[string,RegExp][]=[
  ['email',/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g],
  ['phone',/(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)/g],
  ['address',/\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(?:street|st|road|rd|avenue|ave|lane|ln|boulevard|blvd)\b/gi],
];
export function detectSensitiveText(text:string):Array<{start:number;end:number;kind:string}>{
  return patterns.flatMap(([kind,pattern])=>{
    pattern.lastIndex=0;
    return Array.from(text.matchAll(pattern),match=>({start:match.index!,end:match.index!+match[0].length,kind}));
  }).sort((a,b)=>a.start-b.start);
}
function digest(text:string):Promise<string>{
  return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(bytes=>Array.from(new Uint8Array(bytes),value=>value.toString(16).padStart(2,'0')).join(''));
}
export function cloudContextText(text:string,facts:ConfirmedSelfFact[]=[]):string{
  const conversation=text.trim();
  return facts.length?`${conversation?`${conversation}\n\n`:''}Confirmed professional facts:\n${facts.map(fact=>`- [${fact.id}] ${fact.text.replace(/\s+/g,' ').trim()}`).join('\n')}`:conversation;
}
export async function createContextApproval(text:string,contextId:string,purpose:string,now:string,facts:ConfirmedSelfFact[]=[]):Promise<CloudContextApproval>{
  const outgoing=cloudContextText(text,facts);
  if(detectSensitiveText(outgoing).length)throw permissionDenied();
  return{id:crypto.randomUUID().replaceAll('-',''),contextId,contentDigest:await digest(outgoing),purpose,approvedAt:now};
}
export async function buildCloudContext(text:string,facts:ConfirmedSelfFact[],approval:CloudContextApproval):Promise<ApprovedCloudContext>{
  const outgoing=cloudContextText(text,facts),value:ApprovedCloudContext={approval,text:outgoing,factIds:facts.map(fact=>fact.id),moduleMetadata:[]};
  approvedCloudContextSchema.parse(value);
  if(detectSensitiveText(outgoing).length||await digest(outgoing)!==approval.contentDigest.toLowerCase())throw permissionDenied();
  return value;
}
export function confirmSelfFact(candidate:CandidateSelfFact,editedText:string,now:string):ConfirmedSelfFact{
  const value:ConfirmedSelfFact={...candidate,text:editedText.replace(/\s+/g,' ').trim(),confirmedAt:now,revision:1};
  confirmedSelfFactSchema.parse(value);
  if(detectSensitiveText(editedText).length)throw permissionDenied();
  return value;
}
export class LocalFactsStore{
  constructor(private readonly vault:Vault){}
  private async profile():Promise<LocalProfile>{
    try{return await this.vault.loadPublicProfile();}
    catch(error){if((error as {code?:string}).code!=='NOT_FOUND')throw error;
      return{schemaVersion:1,id:'guest_profile',revision:1,identity:{},modules:[],facts:[],assets:[]};}
  }
  async list():Promise<ConfirmedSelfFact[]>{return(await this.profile()).facts;}
  async add(fact:ConfirmedSelfFact):Promise<void>{
    const profile=await this.profile(),previous=profile.facts.find(item=>item.id===fact.id);
    const next={...fact,revision:(previous?.revision??0)+1};
    confirmedSelfFactSchema.parse(next);
    await this.vault.saveOrdinaryProfile({...profile,revision:profile.revision+1,facts:[...profile.facts.filter(item=>item.id!==fact.id),next]});
  }
}
export async function proposeSelfFacts(context:ApprovedCloudContext,provider:Pick<ReturnType<typeof getLLMProvider>,'proposeFacts'>=getLLMProvider()):Promise<CandidateSelfFact[]>{
  approvedCloudContextSchema.parse(context);
  if(detectSensitiveText(context.text).length)throw permissionDenied();
  const result=await provider.proposeFacts(context);
  if(!Array.isArray(result))throw new TypeError('AI fact proposal must be an array');
  return result.map(value=>candidateSelfFactSchema.parse(value));
}
