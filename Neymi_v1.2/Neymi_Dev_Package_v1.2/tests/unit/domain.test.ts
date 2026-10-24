import { describe, expect, it } from 'vitest';
import { manualCardSchema, aiRecipeSchema, recipientSchema, localProfileSchema, consentGrantSchema, shareProjectionSchema, approvedCloudContextSchema, connectionStrategySchema, recipientInputSchema, localAssetSchema } from '../../src/domain/schemas';
import { validateRecipe, validateResearch, validateGrant } from '../../src/domain/validate';
import { makeManual, makeRecipe, makeResearch, makeProfile, makeStrategy, makeGrant, makeProjection, timestamp } from '../fixtures/domain';

describe('valid independent cards and scoped data', () => {
  it('accepts a manual card without an invented AI strategy', () => expect(manualCardSchema.parse(makeManual()).kind).toBe('manual'));
  it('accepts a recipient without an event', () => expect(recipientSchema.parse({id:'person',displayName:'Guest',identityStatus:'unverified'})).not.toHaveProperty('eventId'));
  it('accepts more than six modules', () => expect(manualCardSchema.parse(makeManual({orderedModules:Array.from({length:8},(_,i)=>({localModuleId:'module_'+i,kind:'project',emphasis:'normal'}))})).orderedModules).toHaveLength(8));
  it('accepts a minimal local profile', () => expect(localProfileSchema.parse(makeProfile()).identity.name).toBe('Lin'));
  it('accepts a matched strategy and recipe', () => expect(validateRecipe(makeRecipe(),makeStrategy(),['mod_project']).strategyId).toBe('strategy_demo'));
  it('keeps user-provided sources explicitly unverified and undated', () => expect(validateResearch(makeResearch()).sources[0]).toMatchObject({origin:'user_provided',publishedAt:null}));
  it('accepts a currently active grant', () => expect(validateGrant(makeGrant(),'2026-10-24T10:05:00.000Z').grantId).toBe('grant_demo'));
});

const invalidRecipes: Array<[string, unknown]> = [
  ['missing strategy',{...makeRecipe(),strategyId:undefined}],
  ['unknown field',{...makeRecipe(),phone:'PRIVATE_SENTINEL'}],
  ['unknown nested field',{...makeRecipe(),orderedModules:[{localModuleId:'mod_project',kind:'project',emphasis:'high',value:'private'}]}],
  ['email in copy',{...makeRecipe(),introDraft:'Write demo@example.org'}],
  ['phone in copy',{...makeRecipe(),headlineDraft:'Call +1 (415) 555-0100'}],
  ['address in copy',{...makeRecipe(),introDraft:'Meet at 123 Main Street'}],
  ['sensitive copy in label',{...makeRecipe(),label:'demo@example.org'}],
  ['invalid motion',{...makeRecipe(),animation:'flash'}],
  ['invalid layout',{...makeRecipe(),layout:'six_fixed'}],
  ['invalid date',{...makeRecipe(),createdAt:'yesterday'}],
  ['reversed update time',{...makeRecipe(),updatedAt:'2025-01-01T00:00:00.000Z'}],
  ['duplicate module',{...makeRecipe(),orderedModules:[...makeRecipe().orderedModules,...makeRecipe().orderedModules]}],
];
it.each(invalidRecipes)('rejects recipe: %s',(_name,value)=>expect(aiRecipeSchema.safeParse(value).success).toBe(false));

describe('reference integrity',()=>{
  it.each(['strategyId','recipientId','goalId','contextId'] as const)('rejects mismatched %s',key=>{
    expect(()=>validateRecipe({...makeRecipe(),[key]:'different'},makeStrategy(),['mod_project'])).toThrow();
  });
  it('rejects a module outside the approved registry',()=>expect(()=>validateRecipe(makeRecipe(),makeStrategy(),[])).toThrow());
  it('rejects a fact with no source',()=>{
    const r=makeResearch(); r.claims[0].sourceIds=[]; expect(()=>validateResearch(r)).toThrow();
  });
  it('rejects an invented source ID',()=>{
    const r=makeResearch(); r.claims[0].sourceIds=['missing']; expect(()=>validateResearch(r)).toThrow();
  });
  it('rejects a claim for another person',()=>{
    const r=makeResearch(); r.claims[0].recipientId='other'; expect(()=>validateResearch(r)).toThrow();
  });
  it('rejects a public source without a URL',()=>{
    const r=makeResearch(); r.sources[0].origin='official'; expect(()=>validateResearch(r)).toThrow();
  });
  it('rejects duplicate evidence IDs',()=>{
    const r=makeResearch(); r.sources.push({...r.sources[0]}); expect(()=>validateResearch(r)).toThrow();
  });
  it('rejects a reference to a missing conflicting claim',()=>{
    const r=makeResearch(); r.claims[0].conflictWithClaimIds=['missing']; expect(()=>validateResearch(r)).toThrow();
  });
});

describe('private data and operation boundaries',()=>{
  it('rejects AI metadata on a manual card',()=>expect(manualCardSchema.safeParse({...makeManual(),strategyId:'hidden'}).success).toBe(false));
  it('rejects private labels in share packages',()=>expect(shareProjectionSchema.safeParse({...makeProjection(),recipientLabel:'Private'}).success).toBe(false));
  it('rejects internal IDs nested in shares',()=>{
    const p=makeProjection(); Object.assign(p.modules[0].items[0],{itemId:'private'}); expect(shareProjectionSchema.safeParse(p).success).toBe(false);
  });
  it('rejects a blanket profile in cloud context',()=>expect(approvedCloudContextSchema.safeParse({approval:{id:'approval',contextId:'context_demo',contentDigest:'a'.repeat(64),purpose:'Draft',approvedAt:timestamp},text:'Robot demo',factIds:[],moduleMetadata:[],profile:makeProfile()}).success).toBe(false));
  it('requires stable contact kinds to remain sensitive despite a renamed label',()=>{
    const p=makeProfile(); Object.assign(p.modules[0].items[0],{valueKind:'phone',label:'Project',value:'+1 415 555 0100',sensitivity:'ordinary'}); expect(localProfileSchema.safeParse(p).success).toBe(false);
  });
  it('rejects missing confirmed fact references',()=>{
    const p=makeProfile(); p.modules[0].items[0].confirmedFactId='unknown'; expect(localProfileSchema.safeParse(p).success).toBe(false);
  });
  it('rejects duplicate local module IDs',()=>{
    const p=makeProfile(); p.modules.push({...p.modules[0]}); expect(localProfileSchema.safeParse(p).success).toBe(false);
  });
  it('rejects share permissions disguised as composition grants',()=>expect(consentGrantSchema.safeParse({...makeGrant(),operation:'share_external'}).success).toBe(false));
  it('rejects invalid grant intervals',()=>expect(consentGrantSchema.safeParse({...makeGrant(),expiresAt:'2026-10-24T09:00:00.000Z'}).success).toBe(false));
  it('rejects a grant at its exact expiry',()=>expect(()=>validateGrant(makeGrant(),makeGrant().expiresAt)).toThrow());
  it('rejects revoked grants',()=>expect(()=>validateGrant(makeGrant({revokedAt:'2026-10-24T10:01:00.000Z'}),'2026-10-24T10:05:00.000Z')).toThrow());
  it('rejects grants that have not started',()=>expect(()=>validateGrant(makeGrant(),'2026-10-24T09:59:00.000Z')).toThrow());
  it('rejects an invalid evaluation clock',()=>expect(()=>validateGrant(makeGrant(),'invalid')).toThrow());
  it('limits opening questions',()=>expect(connectionStrategySchema.safeParse({...makeStrategy(),openingQuestions:['one','two','three']}).success).toBe(false));
  it('rejects an unsupported recipient input scheme',()=>expect(recipientInputSchema.safeParse({kind:'public_url',value:'file:///private',contextId:'context_demo'}).success).toBe(false));
  it('rejects oversized input',()=>expect(recipientInputSchema.safeParse({kind:'text',value:'x'.repeat(20001),contextId:'context_demo'}).success).toBe(false));
  it('rejects SVG assets',()=>expect(localAssetSchema.safeParse({id:'asset',mime:'image/svg+xml',bytes:new Uint8Array([1])}).success).toBe(false));
  it('rejects oversized local images',()=>expect(localAssetSchema.safeParse({id:'asset',mime:'image/png',bytes:new Uint8Array(5*1024*1024+1)}).success).toBe(false));
});
