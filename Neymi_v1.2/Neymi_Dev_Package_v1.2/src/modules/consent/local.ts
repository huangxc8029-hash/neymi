import {z} from 'zod';
import {consentGrantSchema} from '../../domain/schemas';
import {validateGrant} from '../../domain/validate';
import type {ConsentGrant,FieldRef} from '../../domain/types';

export type GrantRequest={profileId:string;deviceId:string;cardId:string;fields:FieldRef[];identity:Array<'name'|'company'|'role'>;assetIds:string[];purpose:string;operation:'compose_local'};
const requestSchema=z.strictObject({profileId:z.string().min(1),deviceId:z.string().min(1),cardId:z.string().min(1),fields:z.array(z.strictObject({moduleId:z.string().min(1),itemId:z.string().min(1)})),
  identity:z.array(z.enum(['name','company','role'])),assetIds:z.array(z.string().min(1)),purpose:z.string().trim().min(1).max(1000),operation:z.literal('compose_local')});
const unique=(values:string[])=>new Set(values).size===values.length;
function fieldKey(field:FieldRef){return`${field.moduleId}/${field.itemId}`;}
export function checkGrant(grant:ConsentGrant,request:GrantRequest,now:string):void{
  const checked=consentGrantSchema.parse(grant),scope=requestSchema.parse(request);validateGrant(checked,now);
  if(checked.profileId!==scope.profileId||checked.deviceId!==scope.deviceId||!checked.cardIds.includes(scope.cardId)||checked.operation!==scope.operation||checked.purpose!==scope.purpose)throw new Error('Consent scope mismatch');
  const fields=checked.allowedFields.map(fieldKey),wanted=scope.fields.map(fieldKey);
  if(!unique(fields)||!unique(wanted)||!unique(checked.allowedIdentity)||!unique(scope.identity)||!unique(checked.allowedAssetIds)||!unique(scope.assetIds))throw new Error('Duplicate consent scope');
  if(wanted.some(field=>!fields.includes(field))||scope.identity.some(key=>!checked.allowedIdentity.includes(key))||scope.assetIds.some(id=>!checked.allowedAssetIds.includes(id)))throw new Error('Consent does not cover requested data');
}
export function createGrant(request:GrantRequest,now=new Date().toISOString(),durationMs=15*60*1000):ConsentGrant{
  if(durationMs<=0||durationMs>60*60*1000)throw new Error('Invalid consent duration');
  const scope=requestSchema.parse(request),fields=scope.fields.map(fieldKey);
  if(!unique(fields)||!unique(scope.identity)||!unique(scope.assetIds))throw new Error('Duplicate consent scope');
  return consentGrantSchema.parse({grantId:`grant_${crypto.randomUUID().replaceAll('-','')}`,profileId:scope.profileId,deviceId:scope.deviceId,
    operation:scope.operation,purpose:scope.purpose,cardIds:[scope.cardId],allowedFields:scope.fields,allowedIdentity:scope.identity,
    allowedAssetIds:scope.assetIds,createdAt:now,expiresAt:new Date(Date.parse(now)+durationMs).toISOString()});
}
