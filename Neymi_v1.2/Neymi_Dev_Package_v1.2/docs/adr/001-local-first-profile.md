# ADR-001 — Local-first profile

**Status**: Accepted (product design) · 2026-10-24

## Context
Users require recipient-specific authentic introductions and locally controlled private information without adding friction.

## Decision
Only device holds plaintext profile; backend keeps separated public research and entitlement records.

v1.3 clarification: this means the complete canonical profile. Approved minimal dialogue/context may be processed in cloud AI (ADR-006), and an explicitly published field projection may be hosted separately (ADR-008). Neither grants backend access to the local vault.

## Consequences
Clear boundaries and user trust; implementation requires explicit authorization, tests and, where relevant, alternate-device recovery.

## Alternatives rejected
Upload complete profile by default; automatic outbound messaging; blindly copy legacy six-equal-grid and assumed provider capabilities.
