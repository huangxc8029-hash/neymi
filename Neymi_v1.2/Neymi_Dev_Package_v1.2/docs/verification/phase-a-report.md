# Phase A verification report

Date: 2026-10-25
Branch: `codex/phase-a-foundation`
Scope: local implementation A00–A11 plus A12 verification. This report distinguishes executable local evidence from services/devices that were not provided.

## Gate decisions

| Gate | Result | Evidence and remaining condition |
|---|---|---|
| G-A0 — 基础可信 | PASS | Strict schemas, encrypted local vault and recovery, ownership/consent boundaries. Unit/integration suite passed. Independent cryptographic audit and target-phone KDF timing remain unverified. |
| G-A1 — 免费名片 | PASS | Anonymous create/preview/export/receive journey passed in Chromium; widths 360/390/768/1440, keyboard and reduced motion covered. |
| G-A2 — 单人定制 | BLOCKED | Local facts, consent, grounded strategy validation and composition work; deterministic rule fallback is labeled. No real search or LLM adapter/credentials are configured, so a normal user cannot obtain verified public research or live AI output. E2E uses explicitly synthetic research/plan responses. |
| G-A3 — 可试用 | BLOCKED | Publish/revoke/expire and offline logic pass local tests. No production origin, durable mounted volume, secrets, scheduled cleanup execution, provider retention evidence, phone/Safari/in-app browser checks or opted-in pilot are available. |

## Automated verification

- `npm run test -- --reporter=dot`: **110 passed, 2 opt-in live-provider checks skipped**. The default suite makes no external requests. SQLite emitted Node 24 experimental-feature warnings.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; Next.js generated `/`, `/cards`, `/prepare`, `/receive`, `/manifest.webmanifest`, dynamic `/p/[publicId]`, and `/v1/[...segments]`.
- `npm run test:e2e`: **14/14 Chromium tests passed**, including the synthetic personalized preparation/share/receive/return journey and a Service Worker offline check proving `/p/*` and `/v1/publications/*` are not cached. Test startup uses the locally installed Chromium path; the main UI journey stubs session/research/plan responses, while real client storage, consent, composition, projection, export and receive paths run in-browser.

The build and E2E commands needed access to the local workspace/network namespace because the default sandbox blocks Next.js worker writes and localhost browser traffic. No deployment, external provider request, GitHub push or real message was performed.

## Acceptance evidence

| Acceptance IDs | Result | Evidence boundary |
|---|---|---|
| AC-A01–A05 | PASS | Guest flow, vault/backup, explicit fact confirmation, exact cloud-context digest and contact guard covered by unit/integration/browser checks. Contact detection remains heuristic. |
| AC-A06–A07 | PASS locally | Controlled-provider fixtures, identity confirmation, cancellation, SSRF/private-address/DNS/redirect/size and untrusted-page handling covered; no real search provider was used. |
| AC-A08–A09 | PASS as deterministic validation | Evidence references, cross-recipient rejection, unsupported claims and rule-based strategy fixtures covered; this does not establish real model quality. |
| AC-A10–A11 | PASS | Expiry/revocation/device/field scopes, private labels and stale profile revisions covered. |
| AC-A12–A14 | PASS | Allowlisted projection, JSON/vCard/PNG export, publish lifecycle, guest save/return and end-to-end file exchange covered. |
| AC-A15 | PARTIAL | Chromium widths, keyboard, reduced motion and actual offline shell covered. Real Safari/iOS/WeChat webview and native share-cancel behavior remain NOT RUN. |
| AC-A16 | PASS locally | Session ownership, origin checks, quota, safe errors and cleanup logic tested with controlled storage. |
| AC-A17 | PARTIAL | 24h/30d expiry and cleanup functions are testable; no deployed scheduler, backup lifecycle or vendor deletion/retention evidence. |
| AC-A18 | BLOCKED | Live-provider canaries are opt-in and skipped. Current provider factories intentionally return unavailable adapters; no credentials, cost sample or human pilot evidence. |

## Outstanding external gates

1. Implement and review actual LLM and public-search provider adapters; then configure secrets, run the opt-in canaries, check source support and record cost/retention.
2. Deploy only after explicit deployment authorization. Configure TLS/origin, three distinct secrets, a durable SQLite volume and a daily authenticated cleanup schedule; test backup/restore and cleanup failure alerting.
3. Run the product on desktop Safari/Chrome, iOS Safari, Android Chrome and the intended WeChat/in-app browser. Exercise native share cancellation and second-browser receiving.
4. Conduct an opt-in pilot and record first-use time, user edits and whether recipients remember the intended distinguishing trait, without adding tracking.

The implementation is locally reviewable, but these external items keep G-A2/G-A3 from being called complete.
