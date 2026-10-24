import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const shortText = z.string().trim().min(1).max(1000);
const text = z.string().trim().min(1).max(20000);
const isoTime = z.iso.datetime({ offset: true });
const unique = (values: string[]) => new Set(values).size === values.length;
const issue = (ctx: z.RefinementCtx, message: string) => ctx.addIssue({ code: 'custom', message });
const safeCopy = shortText.refine(value => !/(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s().-]{7,}\d|\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(?:street|st|road|rd|avenue|ave|lane|ln|boulevard|blvd)\b)/i.test(value), 'Contact details do not belong in an AI recipe');
const mime = z.enum(['image/png', 'image/jpeg', 'image/webp']);
const layout = z.enum(['editorial', 'constellation', 'ribbon']);
const animation = z.enum(['float', 'keys', 'orbit']);
const identity = z.strictObject({ name: shortText.optional(), company: shortText.optional(), role: shortText.optional() });
export const fieldRefSchema = z.strictObject({ moduleId: id, itemId: id });
const fieldRef = fieldRefSchema;
export const userGoalSchema = z.strictObject({id,goalType:z.enum(['fundraise','sales','partner','research','social','other']),specificAsk:shortText});
export const interactionContextSchema = z.strictObject({id,scenario:shortText,goal:userGoalSchema,eventId:id.optional()});
export const moduleRefSchema = z.strictObject({ localModuleId: id, kind: shortText, emphasis: z.enum(['high', 'normal', 'low']) });
const moduleRef = moduleRefSchema;
const cardBase = { schemaVersion: z.literal(1), id, label: shortText, templateId: id, layout, animation,
  orderedModules: z.array(moduleRef), createdAt: isoTime, updatedAt: isoTime };
const cardValid = (card: {orderedModules: Array<{localModuleId:string}>; createdAt:string; updatedAt:string}, ctx: z.RefinementCtx) => {
  if (!unique(card.orderedModules.map(module => module.localModuleId))) issue(ctx, 'Duplicate module reference');
  if (Date.parse(card.updatedAt) < Date.parse(card.createdAt)) issue(ctx, 'updatedAt precedes createdAt');
};
export const manualCardSchema = z.strictObject({ ...cardBase, kind: z.literal('manual') }).superRefine(cardValid);
export const aiRecipeSchema = z.strictObject({ ...cardBase, label:safeCopy, kind: z.literal('ai'), strategyId: id,
  goalId: id, contextId: id, recipientId: id, eventId: id.optional(),
  headlineDraft: safeCopy.optional(), introDraft: safeCopy.optional(), missingProofPointIds: z.array(id),
  status: z.enum(['proposed', 'ready', 'stale', 'archived']) }).superRefine(cardValid);
export const cardConfigSchema = z.union([manualCardSchema, aiRecipeSchema]);
export const recipientSchema = z.strictObject({ id, displayName: shortText, organization: shortText.optional(),
  role: shortText.optional(), eventId: id.optional(), identityStatus: z.enum(['verified', 'ambiguous', 'unverified']) });
export const recipientInputSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind:z.literal('text'),value:text,contextId:id}),
  z.strictObject({kind:z.literal('public_url'),value:z.url({protocol:/^https?:$/}),contextId:id}),
]);
export const localAssetSchema = z.strictObject({ id, mime, bytes:z.instanceof(Uint8Array).refine(bytes => bytes.byteLength <= 5*1024*1024,'Image exceeds 5 MiB') });
export const candidateSelfFactSchema = z.strictObject({id,text,category:shortText,origin:z.enum(['user_text','ai_extracted'])});
export const confirmedSelfFactSchema = candidateSelfFactSchema.extend({confirmedAt:isoTime,revision:z.int().positive()});
const fact = confirmedSelfFactSchema;
export const profileItemSchema = z.strictObject({id,label:shortText,value:text,valueKind:z.enum(['text','phone','email','address']).optional(),
  sensitivity:z.enum(['ordinary','sensitive']),confirmedFactId:id.optional()}).refine(item => !item.valueKind || item.valueKind === 'text' || item.sensitivity === 'sensitive','Contact values must be sensitive');
const profileItem = profileItemSchema;
export const profileModuleSchema = z.strictObject({id,kind:shortText,title:shortText,items:z.array(profileItem)}).refine(section => unique(section.items.map(item => item.id)), 'Duplicate item ID');
const profileModule = profileModuleSchema;
export const localProfileSchema = z.strictObject({schemaVersion:z.literal(1),id,revision:z.int().positive(),identity,
  modules:z.array(profileModule),facts:z.array(fact),assets:z.array(localAssetSchema)}).superRefine((profile,ctx) => {
    if (!unique(profile.modules.map(module=>module.id))) issue(ctx,'Duplicate module ID');
    if (!unique(profile.facts.map(item=>item.id))) issue(ctx,'Duplicate fact ID');
    if (!unique(profile.assets.map(item=>item.id))) issue(ctx,'Duplicate asset ID');
    const factIds = new Set(profile.facts.map(item=>item.id));
    for (const profileSection of profile.modules) for (const item of profileSection.items) {
      if (item.confirmedFactId && !factIds.has(item.confirmedFactId)) issue(ctx,'Missing confirmed fact');
    }
  });
export const consentGrantSchema = z.strictObject({grantId:id,profileId:id,deviceId:id,operation:z.literal('compose_local'),
  purpose:shortText,cardIds:z.array(id),allowedFields:z.array(fieldRef),allowedIdentity:z.array(z.enum(['name','company','role'])),
  allowedAssetIds:z.array(id),createdAt:isoTime,expiresAt:isoTime,revokedAt:isoTime.optional()})
  .refine(grant => Date.parse(grant.expiresAt)>Date.parse(grant.createdAt),'Invalid grant interval');
const publicItem = z.strictObject({label:shortText,value:text});
const publicModule = z.strictObject({kind:shortText,title:shortText,items:z.array(publicItem)});
const base64 = z.string().max(7_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
export const shareProjectionSchema = z.strictObject({schemaVersion:z.literal(1),format:z.literal('ncard-public-share'),
  identity,modules:z.array(publicModule),assets:z.array(z.strictObject({mime,base64})),templateId:id,layout,animation,publicDedication:shortText.optional()});
export const privateCardLabelSchema = z.strictObject({cardId:id,recipientLabel:shortText,scenario:shortText});
export const localDraftSchema = z.strictObject({id,profileRevision:z.int().positive(),config:cardConfigSchema,
  identity,modules:z.array(profileModule),assets:z.array(localAssetSchema)});
export const shareSelectionSchema = z.strictObject({identity:z.array(z.enum(['name','company','role'])),fields:z.array(fieldRef),
  assetIds:z.array(id),publicDedication:shortText.optional()});
export const shareConfirmationSchema = z.strictObject({digest:z.string().regex(/^[a-f\d]{64}$/i),
  action:z.enum(['file','image','vcard','publish']),confirmedAt:isoTime});
export const publicationSchema = z.strictObject({publicId:id,url:z.url({protocol:/^https?:$/}),createdAt:isoTime,
  expiresAt:isoTime,revokedAt:isoTime.optional()}).refine(publication => Date.parse(publication.expiresAt)>Date.parse(publication.createdAt),'Invalid publication interval');
export const publicationReceiptSchema = z.strictObject({publication:publicationSchema,revokeToken:shortText});
export const cloudContextApprovalSchema = z.strictObject({id,contextId:id,contentDigest:z.string().regex(/^[a-f\d]{64}$/i),purpose:shortText,approvedAt:isoTime});
export const approvedCloudContextSchema = z.strictObject({approval:cloudContextApprovalSchema,
  text, factIds:z.array(id),moduleMetadata:z.array(z.strictObject({id,kind:shortText,label:shortText}))});
export const relevanceAssessmentSchema = z.strictObject({id,recipientId:id,goalId:id,
  result:z.enum(['qualified','uncertain','not_recommended']),evidenceQuality:z.enum(['strong','mixed','insufficient']),
  positives:z.array(z.strictObject({reason:shortText,claimIds:z.array(id)})),
  misfits:z.array(z.strictObject({reason:shortText,claimIds:z.array(id)})),openQuestions:z.array(shortText)});
export const connectionStrategySchema = z.strictObject({id,recipientId:id,goalId:id,contextId:id,assessmentId:id,
  recommendation:z.enum(['prepare_introduction','verify_first','no_outreach_recommended']),recommendedFocus:shortText,
  whyMeet:shortText,whyTheyMayCare:shortText,mainPoint:shortText,proofPointIds:z.array(id),recipientClaimIds:z.array(id),
  selectionReasons:z.array(z.strictObject({proofPointId:id,claimIds:z.array(id),reason:shortText})),openingLine:shortText,
  openingQuestions:z.array(shortText).max(2),suggestedNextStep:shortText,misfitRisks:z.array(shortText),
  uncertainties:z.array(shortText),confidence:z.enum(['high','medium','low']),createdAt:isoTime});
export const researchSourceSchema = z.strictObject({id,url:z.url({protocol:/^https?:$/}).optional(),title:shortText,
  origin:z.enum(['official','primary','reputable_news','other','user_provided']),accessedAt:isoTime,publishedAt:isoTime.nullable(),excerpt:text});
export const researchClaimSchema = z.strictObject({id,recipientId:id,kind:z.enum(['fact','explicit_preference','inference','unknown']),
  claim:text,sourceIds:z.array(id),confidence:z.enum(['high','medium','low','unknown']),checkedAt:isoTime,conflictWithClaimIds:z.array(id).optional()});
export const researchSchema = z.strictObject({recipient:recipientSchema,state:z.enum(['queued','researching','needs_confirmation','ready','partial','failed','cancelled']),
  sources:z.array(researchSourceSchema),claims:z.array(researchClaimSchema),
  warnings:z.array(shortText)});
