import {createHash} from 'node:crypto';
import {interactionContextSchema,approvedCloudContextSchema} from '../../domain/schemas';
import {validateResearch} from '../../domain/validate';
import type {ApprovedCloudContext,InteractionContext,RecipientResearch} from '../../domain/types';
import {planStrategy} from '../strategy/plan';
import type {LLMProvider} from '../../server/providers/llm';
import type {CardRecipe,ConnectionStrategy} from '../../domain/types';

export type ActivityPlanInput={eventId:string;context:InteractionContext;approvedContext:ApprovedCloudContext;researches:RecipientResearch[]};
export type ActivityPlanResult={candidateId:string;state:'ready'|'reused'|'failed'|'cancelled';strategy?:ConnectionStrategy;recipe?:CardRecipe;error?:string};
const maxPeople=20;
function planKey(input:{eventId:string;context:InteractionContext;approvedContext:ApprovedCloudContext;research:RecipientResearch}){
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export async function planActivity(input:ActivityPlanInput,options:{provider?:LLMProvider;signal?:AbortSignal;cache?:Map<string,{strategy:ConnectionStrategy;recipe:CardRecipe}>}={}):Promise<ActivityPlanResult[]>{
  const context=interactionContextSchema.parse(input.context),approvedContext=approvedCloudContextSchema.parse(input.approvedContext);
  if(!input.eventId||input.eventId!==context.eventId||input.researches.length<1||input.researches.length>maxPeople)throw new Error('Invalid activity planning scope');
  const researches=input.researches.map(validateResearch),ids=researches.map(item=>item.recipient.id);
  if(new Set(ids).size!==ids.length||researches.some(item=>item.recipient.eventId!==input.eventId||item.recipient.identityStatus!=='verified'))throw new Error('All recipients must be unique, confirmed, and in this event');
  const results:ActivityPlanResult[]=[];
  for(const research of researches){
    await new Promise(resolve=>setTimeout(resolve,0));
    if(options.signal?.aborted){results.push({candidateId:research.recipient.id,state:'cancelled'});continue;}
    const key=planKey({eventId:input.eventId,context,approvedContext,research}),cached=options.cache?.get(key);
    if(cached){results.push({candidateId:research.recipient.id,state:'reused',...cached});continue;}
    try{
      const plan=await planStrategy({context,research,approvedContext},options.provider,options.signal);
      if(options.signal?.aborted){results.push({candidateId:research.recipient.id,state:'cancelled'});continue;}
      options.cache?.set(key,plan);results.push({candidateId:research.recipient.id,state:'ready',...plan});
    }catch{results.push({candidateId:research.recipient.id,state:options.signal?.aborted?'cancelled':'failed',...(!options.signal?.aborted?{error:'此人方案生成失败，可单独重试。'}:{})});}
  }
  return results;
}
