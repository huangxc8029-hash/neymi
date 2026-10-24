# ADR-002 — Strategy is the primary AI artifact

**Status**: Accepted (product design) · 2026-10-24

## Context
Users require recipient-specific authentic introductions and locally controlled private information without adding friction.

## Decision
Research and match produce ConnectionStrategy, and only then CardRecipe; never optimize for card volume.

v1.3 clarification: this applies to AI CardRecipe. Guest manual cards use ManualCardConfig without an invented strategy. Phase A assesses one recipient; multi-candidate ranking belongs to B.

## Consequences
Clear boundaries and user trust; implementation requires explicit authorization, tests and, where relevant, alternate-device recovery.

## Alternatives rejected
Upload complete profile by default; automatic outbound messaging; blindly copy legacy six-equal-grid and assumed provider capabilities.
