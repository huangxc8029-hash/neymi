import { z } from 'zod';
import { contentModuleKinds } from '../card/module-kinds';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const shortText = z.string().trim().min(1).max(1000);
const sourceTime = z.iso.datetime({ offset: true });

export const contentSourceRefSchema = z.strictObject({
  kind: z.enum(['user_text', 'voice_transcript', 'file', 'public_url']),
  sourceId: id,
  page: z.int().positive().optional(),
  paragraph: z.int().positive().optional(),
  startMs: z.int().nonnegative().optional(),
  endMs: z.int().nonnegative().optional(),
  createdAt: sourceTime,
}).superRefine((source, ctx) => {
  if ((source.startMs === undefined) !== (source.endMs === undefined)) {
    ctx.addIssue({ code: 'custom', message: 'Both time range endpoints are required' });
  } else if (source.startMs !== undefined && source.endMs !== undefined && source.endMs < source.startMs) {
    ctx.addIssue({ code: 'custom', message: 'Source time range is inverted' });
  }
});
const candidateItemSchema = z.strictObject({
  id, label: shortText, value: z.string().trim().min(1).max(20000),
  valueKind: z.enum(['text', 'phone', 'email', 'address']).optional(),
});

export const contentCandidateSchema = z.strictObject({
  id,
  kind: z.enum(contentModuleKinds),
  title: shortText,
  items: z.array(candidateItemSchema).min(1),
  sourceRefs: z.array(contentSourceRefSchema).min(1),
  status: z.enum(['candidate', 'needs_review', 'confirmed', 'rejected']).default('candidate'),
  revision: z.int().positive(),
}).superRefine((candidate, ctx) => {
  if (new Set(candidate.items.map(item => item.id)).size !== candidate.items.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate candidate item ID' });
  }
});

export const persistableContentCandidateSchema = contentCandidateSchema.refine(
  candidate => candidate.status === 'confirmed',
  'Only confirmed content candidates can be persisted as profile facts',
);
