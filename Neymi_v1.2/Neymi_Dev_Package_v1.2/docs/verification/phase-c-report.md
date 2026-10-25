# Phase C verification

**Date:** 2026-10-25  
**Scope:** Signed messaging webhook boundary, one-time handoff for published cards, and in-app-browser recovery guidance.

## Implemented

- Added a provider-neutral adapter seam with an explicitly enabled `fixture-hmac` adapter. It checks HMAC over the exact raw UTF-8 body and timestamp, enforces a five-minute signature window, rejects extra payload fields and non-opaque event IDs, limits valid fixture events to 60 per minute, and deduplicates event IDs for seven days.
- The SQLite messaging store persists only event IDs and expiry metadata for webhook idempotency. It never persists webhook bodies or message text. Production webhook requests return unavailable until an official provider adapter is approved and configured.
- Added user-initiated handoff for an active, already-published card. Tickets are 256-bit random values; only their SHA-256 hashes and public publication references are stored. Tickets expire within five minutes, are consumed once by same-origin POST, and are carried in URL fragments so link-preview fetches do not send them to the server.
- Added system-share and manual-copy paths. The handoff page clears the fragment before exchange and opens the public snapshot. It explains that private drafts and the local vault stay in the original browser; no device sync or recipient-only privacy is promised.

## Verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 17 files passed, 1 skipped; 130 tests passed, 2 skipped |
| `npm run test:e2e` | 17 Chromium browser tests passed, including both messaging handoff/recovery cases |
| `npm run build` | Passed; `/handoff` and messaging API routes included |
| `git diff --check` | Passed |

## Formal C gate status

The local protocol, UI path, and tests are implemented. **G-C remains BLOCKED**: no official channel has been selected or approved, and provider credentials, pricing/admission and retention review, live callback integration, provider-specific finite retry policy, and real-device WebView pilot are unavailable here. G-A3 and G-B also retain their documented live-service and user-pilot gates. The fixture adapter is not production integration.

The webhook rate limiter is process-local, so production multi-instance deployments require shared state. Handoff references only public cards; it does not transfer a private strategy or access the device vault. Automated outbound messages remain out of scope.
