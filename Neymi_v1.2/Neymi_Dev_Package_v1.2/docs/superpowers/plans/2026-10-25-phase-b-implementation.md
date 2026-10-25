# Phase B — Event Preparation Implementation Plan

**Goal:** Let a guest prepare for an event with up to 20 user-confirmed people, see evidence-grounded relevance and individual draft outcomes, and keep working when one person fails.

**Constraints:** Reuse A research/strategy seams. Keep recipient data separate per person. Enforce a hard 20-person cap and bounded input/processing budgets. Unknown fit remains a separate group and wording cannot increase rank. Cancellation, reuse, and follow-up are user-controlled. PDF, URL, and pasted text are untrusted input; reject malformed files and active/injected content. No fixtures may be represented as live research. Do not add outbound messaging, automated contact, success-probability language, or cloud profile storage.

## B01 — Activity intake and identity confirmation

- [x] Define strict activity and candidate contracts with source provenance, input kind, and explicit per-person confirmation; enforce 1–20 candidates and bounded text/PDF size.
- [x] Add supported URL/text/PDF extraction with hostile/malformed input rejection and no execution of embedded instructions. Keep the extracted candidates pending until user identity confirmation.
- [x] Add contract and parser tests for oversized activity, 21 people, bad PDF, prompt injection, and source retention.

## B02 — Transparent matching and prepared cards

- [x] Score each person from evidence quality, confirmed identity, and topic overlap; preserve stage/goal mismatches and unknowns as visible outcomes, never rank them higher due to promotional wording.
- [x] Reuse existing grounded strategy creation; scope each result to the matching person/event and use the existing approved self-context boundary.
- [x] Add ranking, cross-person isolation, and reusable-plan tests.

## B03 — Resilient event batch and pilot evidence

- [x] Process at most 20 candidates independently with partial success, cancellation, reusable completed outcomes, and bounded request/source budget.
- [x] Offer an explicit opt-in local follow-up note/reminder; create no messages or external contacts.
- [x] Add event acceptance coverage and a verification report that distinguishes local proof from live providers, deployment, or device work not available in this environment.

## Verification

Run focused Vitest cases, then typecheck, lint, full Vitest, Playwright, and production build. Record exact commands/results and unresolved external gates in `docs/verification/phase-b-report.md`.
