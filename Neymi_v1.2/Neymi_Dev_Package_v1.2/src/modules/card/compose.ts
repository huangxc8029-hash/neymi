import {cardConfigSchema,localDraftSchema} from '../../domain/schemas';
import type {CardConfig,ConsentGrant,LocalDraft} from '../../domain/types';
import {checkGrant,type GrantRequest} from '../consent/local';
import type {Vault} from '../vault/vault';

const fieldKey=(field:{moduleId:string;itemId:string})=>`${field.moduleId}/${field.itemId}`;
export async function composeDraft(config:CardConfig,grant:ConsentGrant,vault:Vault,request:GrantRequest,now=new Date().toISOString(),expectedProfileRevision?:number):Promise<LocalDraft>{
  const checked=cardConfigSchema.parse(config),scope=request;
  if(checked.id!==scope.cardId)throw new Error('Card ID does not match consent');
  checkGrant(grant,scope,now);
  const moduleIds=new Set(checked.orderedModules.map(module=>module.localModuleId));
  if(scope.fields.some(field=>!moduleIds.has(field.moduleId)))throw new Error('Field is outside card modules');
  const before=await vault.loadPublicProfile();if(before.id!==scope.profileId)throw new Error('Profile does not match consent');
  if(expectedProfileRevision!==undefined&&before.revision!==expectedProfileRevision)throw new Error('Profile changed; generate a new strategy first');
  const [identity,items,assets]=await Promise.all([vault.readIdentity(scope.identity),vault.readFields(scope.fields),vault.readAssets(scope.assetIds)]);
  const modules=checked.orderedModules.flatMap(reference=>{
    const selected=scope.fields.filter(field=>field.moduleId===reference.localModuleId);if(!selected.length)return[];
    const source=before.modules.find(module=>module.id===reference.localModuleId);if(!source)throw new Error('Module does not exist');
    return[{...source,items:selected.map(field=>items[scope.fields.findIndex(item=>fieldKey(item)===fieldKey(field))])}];
  });
  const after=await vault.loadPublicProfile();if(after.revision!==before.revision)throw new Error('Profile changed during composition');
  return localDraftSchema.parse({id:`draft_${crypto.randomUUID().replaceAll('-','')}`,profileRevision:before.revision,config:checked,identity,modules,assets});
}
