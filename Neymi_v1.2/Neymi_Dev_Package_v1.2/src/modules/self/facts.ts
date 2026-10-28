import {approvedCloudContextSchema,candidateSelfFactSchema,confirmedSelfFactSchema} from '../../domain/schemas';
import type {ApprovedCloudContext,CandidateSelfFact,ConfirmedSelfFact,LocalProfile} from '../../domain/types';
import {permissionDenied} from '../../server/errors';
import type {Vault} from '../vault/vault';
export {detectSensitiveText} from './sensitive-text';
export {cloudContextText,createContextApproval,buildCloudContext} from './cloud-context';
import {detectSensitiveText} from './sensitive-text';
export async function proposeSelfFacts(context:ApprovedCloudContext,provider:{proposeFacts:(value:ApprovedCloudContext)=>Promise<unknown>}):Promise<CandidateSelfFact[]>{
  approvedCloudContextSchema.parse(context);
  if(detectSensitiveText(context.text).length)throw permissionDenied();
  const result=await provider.proposeFacts(context);
  if(!Array.isArray(result))throw new TypeError('AI fact proposal must be an array');
  return result.map(value=>candidateSelfFactSchema.parse(value));
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
