# T01 · Domain contracts · P0
**Inputs** `docs/04_DATA_CONTRACTS.md`, `fixtures/`, architecture. **Output** validated TypeScript/Zod schemas for EvidenceSource, RecipientBrief, ConnectionStrategy, CardRecipe, LocalProfile, TemporaryGrant and SharePackage plus unit tests.

**Do not store private contact values in CardRecipe.** Enforce time/purpose/field/action scoping. Evidence references must resolve to source IDs. Explicitly mark inferred/unknown facts. Tests include unknown/malicious enum, missing citation for asserted preference, recipe with phone number, expired grant.

**Acceptance** `npm run typecheck` or repo equivalent and unit tests pass; report exact command output. No backend call needed.
