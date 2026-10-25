import {describe,expect,it} from 'vitest';
import {assessRecipient,planStrategy,validatePlan} from '../../src/modules/strategy/plan';
import type {PlanningInput} from '../../src/server/providers/llm';
import {makeContext,makeResearch,timestamp} from '../fixtures/domain';
import {cloudContextText} from '../../src/modules/self/facts';

function input(text='I built a warehouse robotics demo',factId='fact_robotics',claim='The guest discusses warehouse robotics'):PlanningInput{
  const fact={id:factId,text,category:'project',origin:'user_text' as const,confirmedAt:timestamp,revision:1};
  return{context:makeContext(),research:makeResearch({claims:[{id:'claim_topic',recipientId:'recipient_demo',kind:'unknown',claim,sourceIds:['source_demo'],confidence:'unknown',checkedAt:timestamp}]}),
    approvedContext:{approval:{id:'approval',contextId:'context_demo',contentDigest:'a'.repeat(64),purpose:'Prepare one introduction',approvedAt:timestamp},text:cloudContextText('Prepare for a workshop.',[fact]),factIds:[factId],moduleMetadata:[{id:'mod_project',kind:'project',label:'Project'}]}};
}

describe('grounded expression strategy',()=>{
  it('connects only overlapping approved self facts and recipient claims',async()=>{
    const roboticsInput=input(),communityInput=input('I built a community for founders','fact_community','The guest discusses community programs');
    const robotics=await planStrategy(roboticsInput),community=await planStrategy(communityInput),assessment=assessRecipient(roboticsInput);
    expect(robotics.strategy.proofPointIds).toContain('fact_robotics');expect(community.strategy.proofPointIds).toContain('fact_community');
    expect(robotics.strategy.recipientClaimIds).toContain('claim_topic');expect(community.strategy.recipientClaimIds).toContain('claim_topic');
    expect(assessment.result).toBe('uncertain');expect(assessment.evidenceQuality).toBe('insufficient');
  });
  it('uses a cautious plan when provider is not configured',async()=>{
    const result=await planStrategy(input());
    expect(result.strategy.proofPointIds).toContain('fact_robotics');
    expect(result.strategy.recommendation).toBe('verify_first');
    expect(result.strategy.uncertainties).toContain('AI 服务未配置；当前是规则草案。');
    expect(result.recipe.status).toBe('proposed');
  });
  it('rejects invented self facts, cross-recipient evidence, and unknown modules',()=>{
    const source=input(),plan=buildValid();
    expect(()=>validatePlan({...plan,strategy:{...plan.strategy,proofPointIds:['fact_invented']}},source)).toThrow();
    expect(()=>validatePlan({...plan,strategy:{...plan.strategy,recipientId:'recipient_other'}},source)).toThrow();
    expect(()=>validatePlan({...plan,recipe:{...plan.recipe,orderedModules:[{localModuleId:'mod_secret',kind:'private',emphasis:'high'}]}},source)).toThrow();
  });
  it('rejects unsafe or unapproved fields from a model plan',()=>{
    const source=input(),plan=buildValid();
    expect(()=>validatePlan({...plan,recipe:{...plan.recipe,phone:'PRIVATE_SENTINEL'}},source)).toThrow();
    expect(()=>validatePlan({...plan,recipe:{...plan.recipe,introDraft:'Raised $2M and founded three companies.'}},source)).toThrow();
  });
});

function buildValid(){
  return{
    strategy:{id:'strategy_demo',recipientId:'recipient_demo',goalId:'goal_demo',contextId:'context_demo',assessmentId:'assessment_demo',recommendation:'verify_first',recommendedFocus:'Confirm whether robotics is relevant',whyMeet:'Discuss a deployment test',whyTheyMayCare:'The provided excerpt shares a topic with an approved fact',mainPoint:'Ask before offering a demo',proofPointIds:['fact_robotics'],recipientClaimIds:['claim_topic'],selectionReasons:[{proofPointId:'fact_robotics',claimIds:['claim_topic'],reason:'Topic overlap only; source remains unverified'}],openingLine:'What robotics problem matters most to your team?',openingQuestions:['What should be verified first?'],suggestedNextStep:'Continue only if the topic is relevant',misfitRisks:[],uncertainties:['The recipient identity and excerpt are unverified'],confidence:'low',createdAt:timestamp},
    recipe:{schemaVersion:1,id:'recipe_demo',label:'Workshop',kind:'ai',templateId:'plain',layout:'editorial',animation:'float',orderedModules:[{localModuleId:'mod_project',kind:'project',emphasis:'high'}],createdAt:timestamp,updatedAt:timestamp,strategyId:'strategy_demo',goalId:'goal_demo',contextId:'context_demo',recipientId:'recipient_demo',missingProofPointIds:[],status:'proposed'},
  };
}
