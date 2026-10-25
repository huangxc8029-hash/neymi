# Phase C — Messaging Handoff Implementation Plan

> **For agentic workers:** execute inline with TDD; no provider-specific behavior is enabled until a channel is approved.

**Goal:** Safely hand a user-published card to a messaging app and provide a provider adapter seam with signature, replay, and idempotency checks.

**Architecture:** A provider-neutral messaging service verifies raw-body webhook signatures through an explicit fixture adapter, stores only event IDs, and issues short-lived single-use tokens that reference an already-public publication. A client handoff page consumes the token from the URL fragment and opens that public card; it never reads or transfers the device vault.

**Tech Stack:** Existing TypeScript, Zod, Node crypto, Node SQLite adapter, Next Route Handler, Web Share API, Vitest, Playwright.

**Spec:** `harness/build/05_messaging_adapter.md`, `docs/06_DELIVERY_BACKLOG.md` C01–C02, and AC-C01–C02 in `docs/07_EVAL_AND_QA.md`.

## Global Constraints

- G-A3 and G-B are prerequisites for formal G-C; their external pilot gates remain independent.
- Do not choose or imply approval of a real provider without credentials, policy, pricing, and admission review.
- No automatic outbound messages, no raw webhook body in persistent storage or logs, and no access to the browser vault from server code.
- Handoff ticket lifetime is at most five minutes, single use, and carries only a reference to a live public publication.
- The fragment ticket is exchanged by same-origin POST so link-preview requests do not consume it or put it in server request URLs.

## Review Focus

- Modified body, invalid signature, stale timestamp, replayed event ID, duplicate webhook: reject or acknowledge duplicate without side effects; no content persistence.
- Missing production provider configuration: return unavailable; fixture adapter only when explicitly enabled.
- Ticket expiration, second consume, revoked/expired publication, or hostile origin: reject without exposing unpublished data.
- Messaging webview with no local vault: show the public card if the ticket is valid; otherwise explain that local drafts remain in the original browser and offer a return path without claiming sync.
- Share cancellation or unsupported Web Share API: retain a user-visible handoff URL for manual copy; never report a send as completed.

---

### Task 1: Signed webhook boundary

**Files:** `src/modules/messaging/protocol.ts`, `src/modules/messaging/store.ts`, `src/server/messaging-runtime.ts`, `src/server/router.ts`, `tests/unit/messaging.test.ts`, `tests/integration/messaging.test.ts`.

- [x] Test fixture adapter HMAC over timestamp and exact raw bytes, timestamp tolerance, malformed event rejection, per-event rate limit, and durable dedupe without storing body.
- [x] Implement explicit `fixture-hmac` adapter mode; production mode without configured official adapter returns 503.
- [x] Add SQLite event-ID-only idempotency records and expiry cleanup; webhook responses do not include submitted content.

### Task 2: One-time published-card handoff

**Files:** `src/modules/messaging/protocol.ts`, `src/modules/messaging/store.ts`, `src/server/router.ts`, `src/modules/publication/panel.tsx`, `src/app/handoff/page.tsx`, `tests/unit/messaging.test.ts`, `tests/integration/messaging.test.ts`, `tests/e2e/messaging.spec.ts`.

- [x] Test ticket hash-only storage, 5-minute upper bound, single-use consumption, and rejection after expiry.
- [x] Require an active public publication before issuing a ticket; consume only through same-origin POST; return only its public ID.
- [x] Add explicit user-triggered system share and manual-copy fallback. Put ticket in URL fragment, then clear fragment before showing the published card.
- [x] Add a recovery message that explains private/local drafts stay in their original browser; do not claim device sync.

### Task 3: Evidence and gate status

**Files:** `docs/04_DATA_CONTRACTS.md`, `docs/06_DELIVERY_BACKLOG.md`, `docs/08_DECISIONS_AND_RISKS.md`, `docs/verification/phase-c-report.md`.

- [x] Record local security and browser evidence; mark provider approval, credentials, live callback, and device pilot as BLOCKED/NOT RUN.
- [x] Run focused tests, typecheck, lint, complete Vitest suite, focused Playwright acceptance, production build, and `git diff --check`.
