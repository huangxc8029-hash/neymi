import {approvedCloudContextSchema,aiRecipeSchema,connectionStrategySchema,interactionContextSchema} from '../../domain/schemas';
import {z} from 'zod';
import {validateResearch,validateRecipe} from '../../domain/validate';
import type {CardRecipe,ConnectionStrategy} from '../../domain/types';
import type {PlanningInput,LLMProvider} from '../../server/providers/llm';
import {getLLMProvider} from '../../server/providers/llm';
import {ApiError} from '../../server/errors';
import {detectSensitiveText} from '../self/facts';
import {assessRecipient,matchedTopics,approvedSelfFacts} from './assess';

type Plan={strategy:ConnectionStrategy;recipe:CardRecipe};
export {assessRecipient};
function validateInput(input:PlanningInput){
  const context=interactionContextSchema.parse(input.context),research=validateResearch(input.research),approvedContext=approvedCloudContextSchema.parse(input.approvedContext);
  if(approvedContext.approval.contextId!==context.id)throw new Error('Approved context belongs to another interaction');
  if(detectSensitiveText(approvedContext.text).length)throw new Error('Approved context contains contact details');
  return{context,research,approvedContext};
}
export function validatePlan(value:unknown,input:PlanningInput):Plan{
  const source=validateInput(input),facts=approvedSelfFacts({...input,...source});
  const plan=z.strictObject({strategy:connectionStrategySchema,recipe:aiRecipeSchema}).parse(value) as Plan;
  const strategy=connectionStrategySchema.parse(plan.strategy),recipe=aiRecipeSchema.parse(plan.recipe);
  if(strategy.recipientId!==source.research.recipient.id||strategy.goalId!==source.context.goal.id||strategy.contextId!==source.context.id)throw new Error('Strategy scope mismatch');
  const factIds=new Set(facts.map(fact=>fact.id)),claimIds=new Set(source.research.claims.map(claim=>claim.id));
  if(strategy.proofPointIds.some(id=>!factIds.has(id))||strategy.recipientClaimIds.some(id=>!claimIds.has(id)))throw new Error('Strategy references unapproved evidence');
  if(new Set(strategy.proofPointIds).size!==strategy.proofPointIds.length||new Set(strategy.recipientClaimIds).size!==strategy.recipientClaimIds.length||recipe.missingProofPointIds.some(id=>!factIds.has(id)))throw new Error('Plan contains duplicate or unapproved fact references');
  if(strategy.selectionReasons.some(item=>!factIds.has(item.proofPointId)||item.claimIds.some(id=>!claimIds.has(id))))throw new Error('Strategy reason references unknown evidence');
  const moduleIds=source.approvedContext.moduleMetadata.map(module=>module.id);
  const checkedRecipe=validateRecipe(recipe,strategy,moduleIds);
  if(checkedRecipe.orderedModules.some(module=>!moduleIds.includes(module.localModuleId)))throw new Error('Recipe references an unapproved module');
  if(strategy.recommendation==='prepare_introduction'&&assessRecipient(input).result!=='qualified')throw new Error('Strategy requires verified recipient evidence');
  const groundedText=facts.map(fact=>fact.text.toLowerCase());
  const claimPattern=/\b(?:built|founded|raised|increased|generated|delivered|led|won|patented|sold|grew)\b|创办|筹集|提升|增长|获得|带领|交付|研发|发明|(?:[$€¥]\s*\d|\b\d+(?:\.\d+)?\s*(?:%|x|million|billion|万|亿))/gi;
  for(const copy of [checkedRecipe.headlineDraft,checkedRecipe.introDraft].filter((value):value is string=>Boolean(value)))
    for(const match of copy.matchAll(claimPattern))if(!groundedText.some(fact=>fact.includes(match[0].toLowerCase())))throw new Error('Recipe contains an unsupported achievement claim');
  return{strategy,recipe:checkedRecipe};
}
function ruleBasedPlan(input:PlanningInput,reason:string):Plan{
  const source=validateInput(input),assessment=assessRecipient(input),{claims}=matchedTopics(input),best=claims[0],fact=best?.matches[0]?.fact;
  const id=crypto.randomUUID().replaceAll('-',''),now=new Date().toISOString(),focus='核实对方是否愿意讨论与你经历相关的主题';
  const strategy:ConnectionStrategy={id:`strategy_${id}`,recipientId:source.research.recipient.id,goalId:source.context.goal.id,contextId:source.context.id,
    assessmentId:assessment.id,recommendation:best&&source.research.recipient.identityStatus==='verified'?'prepare_introduction':'verify_first',
    recommendedFocus:focus,whyMeet:source.context.scenario,whyTheyMayCare:best?'已确认事实和公开来源片段出现主题重合；实际需求仍需确认。':'现有证据不足，先询问对方关注点。',
    mainPoint:fact?'分享一项已确认的本人事实，再询问对方需求。':'先介绍本次交流目的，不陈述未确认经历。',proofPointIds:fact?[fact.id]:[],recipientClaimIds:best?[best.claim.id]:[],
    selectionReasons:fact&&best?[{proofPointId:fact.id,claimIds:[best.claim.id],reason:'仅依据主题重合；来源未独立核验。'}]:[],
    openingLine:best?'我看到公开资料提到一个与我经历相关的主题，想请教你目前最关注什么？':'想了解你目前最关注的方向，判断这次交流是否有帮助。',
    openingQuestions:assessment.openQuestions.slice(0,2),suggestedNextStep:'确认双方确有共同议题后，再约后续交流。',misfitRisks:[],
    uncertainties:[...assessment.openQuestions,reason,'公开来源内容尚未独立核验。'],confidence:'low',createdAt:now};
  const recipe:CardRecipe={schemaVersion:1,id:`recipe_${id}`,kind:'ai',label:'本次交流提案',templateId:'plain',layout:'editorial',animation:'float',
    orderedModules:source.approvedContext.moduleMetadata.map(module=>({localModuleId:module.id,kind:module.kind,emphasis:'normal'})),createdAt:now,updatedAt:now,
    strategyId:strategy.id,goalId:strategy.goalId,contextId:strategy.contextId,recipientId:strategy.recipientId,
    headlineDraft:'为这次交流准备的介绍',introDraft:'内容由你确认后再分享。',missingProofPointIds:[],status:'proposed'};
  return validatePlan({strategy,recipe},input);
}
export async function planStrategy(input:PlanningInput,provider:LLMProvider=getLLMProvider()):Promise<Plan>{
  validateInput(input);
  try{return validatePlan(await provider.plan(input),input);}
  catch(error){if(error instanceof ApiError&&error.status===503)return ruleBasedPlan(input,'AI 服务未配置；当前是规则草案。');throw error;}
}
