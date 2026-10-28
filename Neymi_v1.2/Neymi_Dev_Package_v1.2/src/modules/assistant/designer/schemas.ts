import {z} from 'zod';
import {fieldRefSchema} from '../../../domain/schemas';
const id=z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const designerSlotsSchema=z.strictObject({
  displayName:z.string().trim().min(1).max(120).optional(),role:z.string().trim().min(1).max(120).optional(),organization:z.string().trim().min(1).max(120).optional(),
  purposeType:z.enum(['job','partner','sales','fundraise','research','social','general','other']).optional(),desiredOutcome:z.string().trim().min(1).max(300).optional(),
  audienceMode:z.enum(['person','group','general']).optional(),audienceRole:z.string().trim().min(1).max(120).optional(),audienceOrganization:z.string().trim().min(1).max(120).optional(),
  highlightRefs:z.array(id).max(20),primaryHighlightRef:id.optional(),tone:z.enum(['clear','friendly','bold']),density:z.enum(['compact','normal']),language:z.enum(['zh','en','bilingual']),templatePreference:z.string().trim().min(1).max(80).optional(),
});
export const designerEvidenceSchema=z.strictObject({id,sourceId:id,sourceRevision:z.number().int().positive(),quote:z.string().trim().min(1).max(2000),start:z.number().int().nonnegative(),end:z.number().int().positive(),status:z.enum(['candidate','confirmed','rejected'])}).refine(value=>value.end>value.start,'Evidence range is empty');
export const designerSlotCandidateSchema=z.strictObject({field:z.enum(['displayName','role','organization','purposeType','desiredOutcome','audienceMode','audienceRole','audienceOrganization','highlightRefs','primaryHighlightRef','tone','density','language','templatePreference']),value:z.unknown(),evidenceIds:z.array(id).max(10).optional()});
const identityField=z.enum(['name','company','role']);
export const designerProposalSchema=z.strictObject({
  templateId:id,alternatives:z.array(id).max(2),rationale:z.string().trim().min(1).max(480),identityFieldRefs:z.array(identityField).max(3),
  modules:z.array(z.strictObject({sourceModuleId:id.optional(),kind:z.string().trim().min(1).max(80),title:z.string().trim().min(1).max(120),items:z.array(z.strictObject({label:z.string().trim().min(1).max(80),text:z.string().trim().min(1).max(2000),evidenceIds:z.array(id).max(10),treatment:z.enum(['verbatim','rewrite']),needsConfirmation:z.boolean()})).max(4),evidenceIds:z.array(id).max(20)})).max(6),
  proposedFieldRefs:z.array(fieldRefSchema).max(30),omissions:z.array(z.strictObject({evidenceId:id,reason:z.string().trim().min(1).max(240)})).max(20),missingInformation:z.array(z.string().trim().min(1).max(240)).max(12),
});
export const designerTurnInputSchema=z.strictObject({
  message:z.string().trim().min(1).max(12000),slots:designerSlotsSchema,
  evidence:z.array(designerEvidenceSchema).max(30),recentMessages:z.array(z.strictObject({role:z.enum(['user','assistant']),text:z.string().max(2000)})).max(12),
  templateIds:z.array(id).min(1).max(20),approvedContext:z.unknown(),requestId:id,sessionRevision:z.number().int().nonnegative(),profileRevision:z.number().int().positive(),
});
export const designerTurnOutputSchema=z.strictObject({
  reply:z.string().trim().min(1).max(600),
  slotCandidates:z.array(designerSlotCandidateSchema).max(20),
  factCandidates:z.array(z.strictObject({text:z.string().trim().min(1).max(1000),evidenceIds:z.array(id).min(1).max(10)})).max(8),
  suggestedQuestion:z.strictObject({field:z.string().trim().min(1).max(80),text:z.string().trim().min(1).max(300),choices:z.array(z.string().trim().min(1).max(100)).max(3)}).nullable(),
});
export const designerProposalInputSchema=designerTurnInputSchema.extend({confirmedEvidenceIds:z.array(id).max(30),allowedFieldRefs:z.array(fieldRefSchema).max(30)});
