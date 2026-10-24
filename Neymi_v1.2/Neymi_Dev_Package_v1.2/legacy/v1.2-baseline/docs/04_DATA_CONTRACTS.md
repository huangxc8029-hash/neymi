# Domain & Data Contracts v1.2

All examples are proposed TypeScript domain interfaces, **not deployed API guarantees**. Production implementation MUST use runtime input/output validation (e.g., Zod), versioned migrations and test fixtures. Never conflate recipient research, strategy and local profile.

## A. Reference types

```ts
export type UUID = string;
export type ISOTime = string;
export type KnowledgeKind = 'fact' | 'explicit_preference' | 'inference' | 'unknown';
export type ResearchState = 'queued'|'extracting'|'researching'|'needs_confirmation'|'ready'|'partial'|'failed';
export type SourceOrigin = 'official'|'primary'|'reputable_news'|'other';

export interface UserGoal {
  id: UUID;
  goalType: 'fundraise'|'sales'|'partner'|'research'|'social'|'other';
  specificAsk: string; // e.g. request product demo, not fake a meeting guarantee
  context?: string; // user-provided; sanitize before external LLM use
}
export interface EventSource {
  id: UUID; kind: 'public_url'|'pasted_text'|'user_uploaded_pdf';
  url?: string; title?: string; accessedAt?: ISOTime;
  consentedUpload: boolean;
}
export interface ResearchSource {
  id: UUID; url: string; title: string; origin: SourceOrigin;
  accessedAt: ISOTime; publishedAt: ISOTime|null; identityCheckNote?: string;
}
export interface Recipient {
  id: UUID; displayName: string; organization?: string; role?: string;
  eventId: UUID; identityStatus: 'verified'|'ambiguous'|'unverified';
}
export interface ResearchClaim {
  id: UUID; recipientId: UUID; kind: KnowledgeKind;
  claim: string; sourceIds: UUID[]; confidence: 'high'|'medium'|'low'|'unknown';
  conflictWithClaimIds?: UUID[]; checkedAt: ISOTime;
}
export interface RecipientResearch {
  recipient: Recipient; state: ResearchState;
  sources: ResearchSource[]; claims: ResearchClaim[]; warnings: string[];
}
export interface RelevanceAssessment {
  id: UUID; recipientId: UUID; goalId: UUID;
  result: 'qualified'|'uncertain'|'not_recommended';
  relevanceScore?: number; // 0-100 evidence relevance, NEVER success probability
  evidenceQuality: 'strong'|'mixed'|'insufficient';
  positives: Array<{ reason: string; claimIds: UUID[] }>;
  misfits: Array<{ reason: string; claimIds: UUID[] }>;
  openQuestions: string[];
}
export interface ConnectionStrategy {
  id: UUID; recipientId: UUID; goalId: UUID; assessmentId: UUID;
  recommendation: 'prepare_introduction'|'verify_first'|'no_outreach_recommended';
  whyMeet: string; whyTheyMayCare: string;
  openingLine: string; openingQuestions: string[];
  mainPoint: string; proofPointIds: UUID[]; recipientClaimIds: UUID[];
  suggestedNextStep: string; misfitRisks: string[]; uncertainties: string[];
  confidence: 'high'|'medium'|'low'; createdAt: ISOTime;
}

export interface CardRecipe {
  schemaVersion: 1; id: UUID; label: string;
  strategyId: UUID; goalId: UUID; eventId?: UUID; recipientId?: UUID;
  templateId: string; layout: 'editorial'|'constellation'|'ribbon';
  animation: 'float'|'keys'|'orbit'; featuredModuleKind?: string;
  // Allowed references / no raw sensitive values
  orderedModules: Array<{ kind: string; localModuleId?: UUID; emphasis: 'high'|'normal'|'low' }>;
  headlineDraft?: string; introDraft?: string;
  missingProofPointIds?: UUID[]; createdAt: ISOTime; updatedAt: ISOTime;
  status: 'proposed'|'ready'|'stale'|'archived';
}
export type DataUsage = 'compose_local'|'cloud_copywriting'|'share_external';
export interface ConsentGrant {
  grantId: UUID; usage: DataUsage;
  jobId?: UUID; recipeIds?: UUID[]; allowedModuleIds: UUID[];
  allowedItemIds: UUID[]; purpose: string; createdAt: ISOTime; expiresAt: ISOTime;
  revokedAt?: ISOTime; // LOCAL ONLY; not proof of cloud erasure
}
export interface ShareDraft {
  identity: {name:boolean; company:boolean; role:boolean};
  selectedModuleIds: UUID[]; selectedItemIds: UUID[];
  selectedAssetIds: UUID[]; mode: 'public'|'recipient_encrypted_future';
}
export interface ShareProjection {
  schemaVersion: 1; format: 'ncard-public-share';
  identity: Record<'name'|'company'|'role', string|null>;
  modules: Array<{kind:string;title:string;value?:string;items?:Array<{label?:string;value:string}>}>;
  templateId: string; // must not contain internal IDs or unselected fields
}
export interface LocalOutcomeNote {
  id: UUID; recipientId: UUID; eventId?: UUID;
  stage: 'not_met'|'brief_chat'|'exchanged'|'requested_material'|'meeting_scheduled'|'no_fit';
  nextStep?: string; privateNote?: string; updatedAt: ISOTime;
}
```

## B. Invariants / runtime validation

1. A research claim of `fact`/`explicit_preference` **must** reference ≥1 known, accessible source ID; unknown must have no fabricated citation.
2. `ConnectionStrategy.recipientClaimIds` must exist in same `RecipientResearch` and be appropriately matched by identity.
3. `CardRecipe.strategyId` must resolve to a real strategy; `recipientId` must match strategy's recipient if present.
4. Recipe fields are **allowlisted**. Reject unrecognized fields; do not store actual Phone/Email/asset bytes, or full copy of Profile.
5. `LocalProfile` (v1.1 30-kind library) and `ConsentGrant` never sent as blanket JSON to research/agent APIs.
6. ShareProjection only from fields selected in `ShareDraft`, constrained by data visibility and valid per-operation consent; `recipient_encrypted_future` disabled until cryptographic protocol verified.
7. Keep `ShareProjection` and `CardRecipe` independent; changing a recipe does NOT modify canonical local Profile.
8. Expired grant invalid for future read. `CloudTextAssist` grant, even when expired, cannot retract previously sent plaintext.
9. If user identity/header omitted, layout handles it; don't silently insert identity from unsanitized model-generated prose.
10. `publishedAt` can be null; never imply an undated source is current.

## C. Stable ID and storage mapping

- Local: `profiles`, `modules`, `moduleItems`, `personas`, `cardRecipes`, `localDrafts`, `consentGrants`, `receivedCards`, `outcomeNotes`. Vault encryption at rest design must be separately reviewed, not merely localStorage obfuscation.
- Research backend: `publicEvents`, `sources`, `recipients`, `claims`, `assessments`, `strategies`, `proposalJobs`; `messageSessions` in logically separated store. Short-lived recipe proposal redemption.
- Commerce backend: existing vouchers/products/editions/signed entitlements; separate from profiles/research.
- Prefer opaque random IDs; do not reuse messaging telephone/username as global profile identifier.

## D. Example request/response relationships

```text
EventSource + UserGoal
  → ResearchSource[] + RecipientResearch[]
  → RelevanceAssessment[]
  → ConnectionStrategy[]
  → CardRecipe[]  (contains no user private values)
  → [user device] ConsentGrant(compose_local)
  → Local CardDraft(s) + ShareDraft
  → strict ShareProjection for each actual share
```

## E. JSON Schema examples

`../schemas/card-recipe.schema.json`, `../schemas/recipient-research.schema.json`, `../schemas/connection-strategy.schema.json`. Fixtures in `../fixtures/`. Run `python scripts/verify_contracts.py` from repository root for schema/sample sanity. **Note** runtime schema and test examples do not constitute security sign-off.
