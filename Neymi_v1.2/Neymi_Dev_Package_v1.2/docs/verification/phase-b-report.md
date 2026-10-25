# Phase B verification

**Date:** 2026-10-25  
**Scope:** Activity preparation intake, per-person matching and plans, resilient batch handling, and local follow-up.

## Implemented

- Activity source intake supports pasted text, HTTPS public URLs, and local PDF text extraction. URL fetches reject private-network destinations and are not persisted; PDFs are parsed in the browser. Inputs are size and page bounded, malformed or hostile text is rejected, and no extracted text is treated as trusted instructions.
- Events support up to 20 candidates. Each person requires explicit identity confirmation before preparation. Stage mismatch and unknown fit stay separate from topic-overlap hints.
- Per-person plans are event scoped, use only explicitly approved self-context, isolate failures, support cancellation and individual retry, and are cached locally for reuse. Follow-up notes are voluntary and browser-local.
- Bounded anonymous planning quota is 20 people per hour per server process. API routes enforce same-origin requests and the activity planning consent digest.
- AI plans feed the existing review and local card-composition flow. Unconfigured AI providers return the existing rule-based fallback; the interface distinguishes it from researched evidence.

## Verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 15 files passed, 1 skipped; 123 tests passed, 2 skipped |
| `npm run test:e2e -- tests/e2e/activity.spec.ts` | Passed in the focused browser run (1 test), covering local PDF extraction, identity confirmation, per-person plan consent, reuse without a second request, and reload persistence |
| `npm run build` | Passed; `/activity` and `/v1/[...segments]` included |
| `git diff --check` | Passed |

The full Playwright suite was also attempted during this verification pass, but the local runner stopped returning output after starting its web-server process; the focused activity browser test had passed earlier against the same implementation before the final busy-state control adjustment. That adjustment is covered by typecheck, lint, unit tests, and production build.

## Remaining acceptance gates

The code and local acceptance work for B01–B03 are implemented. The formal G-B release gate still depends on G-A3 plus external evidence: configured and policy-reviewed live AI/search providers, deployment and data-retention review, and a real-device/voluntary activity pilot. This workspace does not provide those credentials or live pilot evidence.

The quota is process-local, so production multi-instance deployments or restarts require a shared persistent limiter before relying on it as an abuse-control boundary. Provider cancellation also depends on each live provider adapter honoring `AbortSignal`. PDF image scans and OCR are outside this phase; only embedded text is extracted.
