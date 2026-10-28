import {approvedCloudContextSchema,candidateSelfFactSchema} from '../../domain/schemas';
import type {ApprovedCloudContext,CandidateSelfFact} from '../../domain/types';
import {permissionDenied} from '../../server/errors';
import {getLLMProvider} from '../../server/providers/llm';
import {detectSensitiveText} from './sensitive-text';

export async function proposeSelfFacts(context:ApprovedCloudContext):Promise<CandidateSelfFact[]>{
  approvedCloudContextSchema.parse(context);
  if(detectSensitiveText(context.text).length)throw permissionDenied();
  const result=await getLLMProvider().proposeFacts(context);
  if(!Array.isArray(result))throw new TypeError('AI fact proposal must be an array');
  return result.map(value=>candidateSelfFactSchema.parse(value));
}
