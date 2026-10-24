import {shareProjectionSchema} from '../../domain/schemas';
import type {ShareProjection,ShareConfirmation} from '../../domain/types';
export async function digestProjection(projection:ShareProjection):Promise<string>{
  const checked=shareProjectionSchema.parse(projection);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(checked)));
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function confirmShare(projection:ShareProjection,action:ShareConfirmation['action']):Promise<ShareConfirmation>{
  return {digest:await digestProjection(projection),action,confirmedAt:new Date().toISOString()};
}
export async function assertConfirmation(projection:ShareProjection,confirmation:ShareConfirmation,action?:ShareConfirmation['action']):Promise<void>{
  if(confirmation.digest!==await digestProjection(projection)||(action&&confirmation.action!==action))throw new Error('Share confirmation no longer matches');
}
