import type { CardRecipe, ManualCardConfig, RecipientResearch, ConnectionStrategy, LocalProfile, InteractionContext, ConsentGrant, ShareSelection, LocalDraft, ShareProjection } from '../../src/domain/types';

export const timestamp = '2026-10-24T10:00:00.000Z';
export function makeManual(overrides: Partial<ManualCardConfig> = {}): ManualCardConfig {
  return { schemaVersion: 1, id: 'card_demo', label: 'Workshop', kind: 'manual', templateId: 'plain', layout: 'editorial', animation: 'float', orderedModules: [{localModuleId:'mod_project',kind:'project',emphasis:'high'}], createdAt:timestamp, updatedAt:timestamp, ...overrides };
}
export function makeRecipe(overrides: Partial<CardRecipe> = {}): CardRecipe {
  return { ...makeManual(), kind:'ai', strategyId:'strategy_demo', goalId:'goal_demo', contextId:'context_demo', recipientId:'recipient_demo', headlineDraft:'Warehouse robotics', missingProofPointIds:[], status:'proposed', ...overrides };
}
export function makeStrategy(overrides: Partial<ConnectionStrategy> = {}): ConnectionStrategy {
  return { id:'strategy_demo', recipientId:'recipient_demo', goalId:'goal_demo', contextId:'context_demo', assessmentId:'assessment_demo', recommendation:'prepare_introduction', recommendedFocus:'Show the warehouse demo', whyMeet:'Discuss robotics deployment', whyTheyMayCare:'The provided introduction mentions robotics', mainPoint:'A working demo', proofPointIds:['fact_demo'], recipientClaimIds:['claim_demo'], selectionReasons:[{proofPointId:'fact_demo',claimIds:['claim_demo'],reason:'Relevant to the provided introduction'}], openingLine:'What deployment constraints matter most?', openingQuestions:['Which environment should we test?'], suggestedNextStep:'Offer a demo', misfitRisks:[], uncertainties:['Background is user-provided'], confidence:'low', createdAt:timestamp, ...overrides };
}
export function makeResearch(overrides: Partial<RecipientResearch> = {}): RecipientResearch {
  return { recipient:{id:'recipient_demo',displayName:'Fictional recipient',identityStatus:'unverified'}, state:'ready', sources:[{id:'source_demo',title:'User-provided fictional introduction',origin:'user_provided',accessedAt:timestamp,publishedAt:null,excerpt:'Works on warehouse robots'}], claims:[{id:'claim_demo',recipientId:'recipient_demo',kind:'fact',claim:'Works on warehouse robots, according to the user',sourceIds:['source_demo'],confidence:'low',checkedAt:timestamp}], warnings:['Synthetic offline fixture, not independently verified'], ...overrides };
}
export function makeProfile(overrides: Partial<LocalProfile> = {}): LocalProfile {
  return { schemaVersion:1,id:'profile_demo',revision:1,identity:{name:'Lin'},modules:[{id:'mod_project',kind:'project',title:'Project',items:[{id:'item_demo',label:'Demo',value:'Warehouse robot',valueKind:'text',sensitivity:'ordinary',confirmedFactId:'fact_demo'}]}],facts:[{id:'fact_demo',text:'Built a fictional robot demo',category:'project',origin:'user_text',confirmedAt:timestamp,revision:1}],assets:[],...overrides };
}
export function makeContext(overrides: Partial<InteractionContext> = {}): InteractionContext {
  return { id:'context_demo',scenario:'Industry workshop',goal:{id:'goal_demo',goalType:'partner',specificAsk:'Discuss a deployment test'}, ...overrides };
}
export function makeGrant(overrides: Partial<ConsentGrant> = {}): ConsentGrant {
  return {grantId:'grant_demo',profileId:'profile_demo',deviceId:'device_demo',operation:'compose_local',purpose:'Prepare a workshop card',cardIds:['card_demo'],allowedFields:[{moduleId:'mod_project',itemId:'item_demo'}],allowedIdentity:['name'],allowedAssetIds:[],createdAt:timestamp,expiresAt:'2026-10-24T10:15:00.000Z',...overrides};
}
export function makeSelection(overrides: Partial<ShareSelection> = {}): ShareSelection {
  return {identity:['name'],fields:[{moduleId:'mod_project',itemId:'item_demo'}],assetIds:[],...overrides};
}
export function makeDraft(overrides: Partial<LocalDraft> = {}): LocalDraft {
  const profile = makeProfile();
  return {id:'draft_demo',profileRevision:1,config:makeManual(),identity:profile.identity,modules:profile.modules,assets:[],...overrides};
}
export function makeProjection(overrides: Partial<ShareProjection> = {}): ShareProjection {
  return {schemaVersion:1,format:'ncard-public-share',identity:{name:'Lin'},modules:[{kind:'project',title:'Project',items:[{label:'Demo',value:'Warehouse robot'}]}],assets:[],templateId:'plain',layout:'editorial',animation:'float',...overrides};
}
export function makeSession() { return {id:'session_demo',expiresAt:'2026-10-25T10:00:00.000Z'}; }
