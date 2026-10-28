# Output contract reference

The source of truth is `src/modules/assistant/designer/schemas.ts` and its exported inferred types. A turn returns `{reply,slotCandidates,factCandidates}`; a proposal returns the strict DesignerProposal shape. Use only provided IDs. Slot names, module kinds, field references, template IDs, item counts, and text lengths are validated by the app.

A proposal item must cite confirmed evidence. `verbatim` must match its cited quote. Every `rewrite` remains unconfirmed and is shown beside its source for user review. The model cannot create IDs, timestamps, revisions, session state, confirmation, visibility, or publication records. Unknown or invalid fields must cause a validation error, not be ignored.
