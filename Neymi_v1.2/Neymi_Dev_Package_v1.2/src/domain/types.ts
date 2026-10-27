export type ID = string;
export type ISOTime = string;
export type KnowledgeKind = 'fact'|'explicit_preference'|'inference'|'unknown';
export type ResearchState = 'queued'|'researching'|'needs_confirmation'|'ready'|'partial'|'failed'|'cancelled';
export type Motion = 'float'|'keys'|'orbit';
export type Layout = 'editorial'|'constellation'|'ribbon';
export type FieldRef = { moduleId: ID; itemId: ID };
export interface UserGoal { id: ID; goalType: 'fundraise'|'sales'|'partner'|'research'|'social'|'other'; specificAsk: string; }
export interface InteractionContext { id: ID; scenario: string; goal: UserGoal; eventId?: ID; }
export interface RecipientInput { kind: 'text'|'public_url'; value: string; contextId: ID; }
export interface Recipient {
 id: ID; displayName: string; organization?: string; role?: string;
 eventId?: ID; identityStatus: 'verified'|'ambiguous'|'unverified';
}
export interface ResearchSource {
 id: ID; url?: string; title: string; origin: 'official'|'primary'|'reputable_news'|'other'|'user_provided';
 accessedAt: ISOTime; publishedAt: ISOTime|null; excerpt: string;
}
export interface ResearchClaim {
 id: ID; recipientId: ID; kind: KnowledgeKind; claim: string; sourceIds: ID[];
 confidence: 'high'|'medium'|'low'|'unknown'; checkedAt: ISOTime; conflictWithClaimIds?: ID[];
}
export interface RecipientResearch {
 recipient: Recipient; state: ResearchState; sources: ResearchSource[]; claims: ResearchClaim[]; warnings: string[];
}
export interface CandidateSelfFact { id: ID; text: string; category: string; origin: 'user_text'|'ai_extracted'; }
export interface ConfirmedSelfFact extends CandidateSelfFact { confirmedAt: ISOTime; revision: number; }
export interface ProfileItem {
 id: ID; label: string; value: string; valueKind?: 'text'|'phone'|'email'|'address'; sensitivity: 'ordinary'|'sensitive'; confirmedFactId?: ID;
 sourceRefs?: ContentSourceRef[]; confirmedAt?: ISOTime;
}
export interface ProfileModule { id: ID; kind: string; title: string; items: ProfileItem[]; }
export interface ContentSourceRef {
 kind: 'user_text'|'voice_transcript'|'file'|'public_url'; sourceId: ID;
 page?: number; paragraph?: number; startMs?: number; endMs?: number; createdAt: ISOTime;
}
export interface ContentCandidateItem { id: ID; label: string; value: string; valueKind?: 'text'|'phone'|'email'|'address'; }
export interface ContentCandidate {
 id: ID; kind: string; title: string; items: ContentCandidateItem[]; sourceRefs: ContentSourceRef[];
 status: 'candidate'|'needs_review'|'confirmed'|'rejected'; revision: number;
}
export interface LocalProfile {
 schemaVersion: 1; id: ID; revision: number;
 identity: { name?: string; company?: string; role?: string };
 modules: ProfileModule[]; facts: ConfirmedSelfFact[]; assets: LocalAsset[];
}
export interface LocalAsset { id: ID; mime: 'image/png'|'image/jpeg'|'image/webp'; bytes: Uint8Array; }
export interface CloudContextApproval {
 id: ID; contextId: ID; contentDigest: string; purpose: string; approvedAt: ISOTime;
}
export interface ApprovedCloudContext {
 approval: CloudContextApproval; text: string; factIds: ID[];
 moduleMetadata: Array<{ id: ID; kind: string; label: string }>;
}
export interface RelevanceAssessment {
 id: ID; recipientId: ID; goalId: ID; result: 'qualified'|'uncertain'|'not_recommended';
 evidenceQuality: 'strong'|'mixed'|'insufficient';
 positives: Array<{ reason: string; claimIds: ID[] }>;
 misfits: Array<{ reason: string; claimIds: ID[] }>; openQuestions: string[];
}
export interface ConnectionStrategy {
 id: ID; recipientId: ID; goalId: ID; contextId: ID; assessmentId: ID;
 recommendation: 'prepare_introduction'|'verify_first'|'no_outreach_recommended';
 recommendedFocus: string; whyMeet: string; whyTheyMayCare: string; mainPoint: string;
 proofPointIds: ID[]; recipientClaimIds: ID[];
 selectionReasons: Array<{ proofPointId: ID; claimIds: ID[]; reason: string }>;
 openingLine: string; openingQuestions: string[]; suggestedNextStep: string;
 misfitRisks: string[]; uncertainties: string[]; confidence: 'high'|'medium'|'low'; createdAt: ISOTime;
}
export interface ModuleRef { localModuleId: ID; kind: string; emphasis: 'high'|'normal'|'low'; }
export interface BaseCardConfig {
 schemaVersion: 1; id: ID; label: string; templateId: string; layout: Layout; animation: Motion;
 orderedModules: ModuleRef[]; createdAt: ISOTime; updatedAt: ISOTime;
}
export interface ManualCardConfig extends BaseCardConfig { kind: 'manual'; }
export interface CardRecipe extends BaseCardConfig {
 kind: 'ai'; strategyId: ID; goalId: ID; contextId: ID; recipientId: ID; eventId?: ID;
 headlineDraft?: string; introDraft?: string; missingProofPointIds: ID[];
 status: 'proposed'|'ready'|'stale'|'archived';
}
export type CardConfig = ManualCardConfig | CardRecipe;
export interface PrivateCardLabel { cardId: ID; recipientLabel: string; scenario: string; }
export interface ConsentGrant {
 grantId: ID; profileId: ID; deviceId: ID; operation: 'compose_local';
 purpose: string; cardIds: ID[]; allowedFields: FieldRef[]; allowedIdentity: Array<'name'|'company'|'role'>;
 allowedAssetIds: ID[]; createdAt: ISOTime; expiresAt: ISOTime; revokedAt?: ISOTime;
}
export interface LocalDraft {
 id: ID; profileRevision: number; config: CardConfig;
 identity: LocalProfile['identity']; modules: ProfileModule[]; assets: LocalAsset[];
}
export interface ShareSelection {
 identity: Array<'name'|'company'|'role'>; fields: FieldRef[]; assetIds: ID[];
 publicDedication?: string;
}
export interface ShareProjection {
 schemaVersion: 1; format: 'ncard-public-share';
 identity: { name?: string; company?: string; role?: string };
 modules: Array<{kind: string; title: string; items: Array<{label: string; value: string}>}>;
 assets: Array<{mime: LocalAsset['mime']; base64: string}>;
 templateId: string; layout: Layout; animation: Motion; publicDedication?: string;
}
export interface ShareConfirmation {
 digest: string; action: 'file'|'image'|'vcard'|'publish'; confirmedAt: ISOTime;
}
export interface Publication {
 publicId: ID; url: string; createdAt: ISOTime; expiresAt: ISOTime; revokedAt?: ISOTime;
}
export interface PublicationReceipt { publication: Publication; revokeToken: string; }
