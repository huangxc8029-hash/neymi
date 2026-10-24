import { aiRecipeSchema, connectionStrategySchema, consentGrantSchema, researchSchema } from './schemas';
import type { CardRecipe, ConnectionStrategy, RecipientResearch, ConsentGrant } from './types';

export function validateRecipe(value: unknown, strategy: ConnectionStrategy, moduleIds: string[]): CardRecipe {
  const recipe = aiRecipeSchema.parse(value);
  const checkedStrategy = connectionStrategySchema.parse(strategy);
  for (const key of ['strategyId','recipientId','goalId','contextId'] as const) {
    const expected = key === 'strategyId' ? checkedStrategy.id : checkedStrategy[key];
    if (recipe[key] !== expected) throw new Error(`Recipe ${key} does not match strategy`);
  }
  const allowed = new Set(moduleIds);
  if (recipe.orderedModules.some(module => !allowed.has(module.localModuleId))) throw new Error('Unknown local module');
  return recipe;
}
export function validateResearch(value: unknown): RecipientResearch {
  const research = researchSchema.parse(value);
  const sourceIds = research.sources.map(source=>source.id);
  const claimIds = research.claims.map(claim=>claim.id);
  if (new Set(sourceIds).size !== sourceIds.length || new Set(claimIds).size !== claimIds.length) throw new Error('Duplicate evidence ID');
  const sourceSet = new Set(sourceIds), claimSet = new Set(claimIds);
  for (const source of research.sources) if (source.origin !== 'user_provided' && !source.url) throw new Error('Public source requires URL');
  for (const claim of research.claims) {
    if (claim.recipientId !== research.recipient.id) throw new Error('Cross-recipient claim');
    if (!claim.sourceIds.length || claim.sourceIds.some(id=>!sourceSet.has(id))) throw new Error('Missing claim source');
    if (claim.conflictWithClaimIds?.some(id=>!claimSet.has(id))) throw new Error('Missing conflicting claim');
  }
  return research;
}
export function validateGrant(value: unknown, now: string): ConsentGrant {
  const grant = consentGrantSchema.parse(value);
  const clock = Date.parse(now);
  if (!Number.isFinite(clock) || clock < Date.parse(grant.createdAt) || clock >= Date.parse(grant.expiresAt) || grant.revokedAt) throw new Error('Grant is not active');
  return grant;
}
