import {approvedCloudContextSchema} from '../../domain/schemas';
import type {ApprovedCloudContext} from '../../domain/types';
import {permissionDenied} from '../../server/errors';
import type {ZodType} from 'zod';
export async function authorizeContext(input:ApprovedCloudContext,schema:ZodType<ApprovedCloudContext>=approvedCloudContextSchema):Promise<void>{
  const context=schema.parse(input);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(context.text));
  const digest=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(digest!==context.approval.contentDigest.toLowerCase())throw permissionDenied();
}
