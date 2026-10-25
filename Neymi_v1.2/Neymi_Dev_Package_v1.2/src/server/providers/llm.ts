import {unavailable} from '../errors';
import type {ApprovedCloudContext,CandidateSelfFact,ConnectionStrategy,CardRecipe,InteractionContext,RecipientResearch} from '../../domain/types';
export type PlanningInput={context:InteractionContext;research:RecipientResearch;approvedContext:ApprovedCloudContext};
export interface LLMProvider{
  proposeFacts(context:ApprovedCloudContext):Promise<unknown>;
  plan(input:PlanningInput):Promise<unknown>;
}
export class UnconfiguredLLMProvider implements LLMProvider{
  async proposeFacts():Promise<CandidateSelfFact[]>{throw unavailable('AI provider is not configured');}
  async plan():Promise<{strategy:ConnectionStrategy;recipe:CardRecipe}>{throw unavailable('AI provider is not configured');}
}
export function getLLMProvider():LLMProvider{return new UnconfiguredLLMProvider();}
