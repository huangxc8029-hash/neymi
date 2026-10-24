# ADR-003 — Separate analysis consent and share consent

**Status**: Accepted (product design) · 2026-10-24

## Context
Users require recipient-specific authentic introductions and locally controlled private information without adding friction.

## Decision
AI preparation grants do not permit external send; a user gesture and allowlist projection are required.

## Consequences
Clear boundaries and user trust; implementation requires explicit authorization, tests and, where relevant, alternate-device recovery.

## Alternatives rejected
Upload complete profile by default; automatic outbound messaging; blindly copy legacy six-equal-grid and assumed provider capabilities.
