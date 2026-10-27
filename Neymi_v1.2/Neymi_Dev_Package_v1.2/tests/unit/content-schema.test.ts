import { describe, expect, it } from 'vitest';
import { contentCandidateSchema, persistableContentCandidateSchema, contentSourceRefSchema } from '../../src/modules/content/schemas';

const timestamp = '2026-10-26T00:00:00.000Z';
const source = { kind: 'file', sourceId: 'file_one', page: 2, createdAt: timestamp };
const candidate = {
  id: 'candidate_one', kind: 'project', title: 'Project',
  items: [{ id: 'item_one', label: 'Result', value: 'Reduced processing time' }],
  sourceRefs: [source], revision: 1,
};

describe('content sources and candidates', () => {
  it('defaults new content to an unconfirmed candidate', () => {
    expect(contentCandidateSchema.parse(candidate).status).toBe('candidate');
  });

  it('keeps source location metadata while rejecting empty or inverted ranges', () => {
    expect(contentSourceRefSchema.parse({ ...source, paragraph: 3 })).toMatchObject({ page: 2, paragraph: 3 });
    expect(contentSourceRefSchema.safeParse({ ...source, startMs: 900, endMs: 800 }).success).toBe(false);
    expect(contentSourceRefSchema.safeParse({ kind: 'file', createdAt: timestamp }).success).toBe(false);
  });

  it('rejects unknown module kinds and unknown source fields', () => {
    expect(contentCandidateSchema.safeParse({ ...candidate, kind: 'made_up' }).success).toBe(false);
    expect(contentSourceRefSchema.safeParse({ ...source, privateNote: 'secret' }).success).toBe(false);
  });

  it('does not allow an unconfirmed candidate to be persisted', () => {
    expect(persistableContentCandidateSchema.safeParse(candidate).success).toBe(false);
    expect(persistableContentCandidateSchema.safeParse({ ...candidate, status: 'confirmed' }).success).toBe(true);
  });
});
