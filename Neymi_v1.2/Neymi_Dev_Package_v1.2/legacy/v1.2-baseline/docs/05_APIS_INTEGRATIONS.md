# API & Integration Contracts · v1.2

**Status:** proposed interfaces, not implemented. API gateway never reads `LocalProfile` directly. All examples use fictional data.

## 1. Adapter boundary

`MessagingAdapter.receive(event)` → `ConversationCommand` → `ResearchJob`; `ResearchProvider.search(query)` → `EvidenceSource[]`; `Planner.plan(evidence, goal, publicOrConsentedContext)` → `ConnectionStrategy[]` + `CardRecipe[]`; `LocalComposer.apply(recipe, grant, localProfile)` → `DraftCard`; `ShareProjector.project(draft, selectedFieldIds)` → `SharePackage`.

Use interfaces to permit fake/offline adapters. Initial integration: manual event URL into web flow; provider bot adapters come after end-to-end pilot works. No WhatsApp, WeChat, Telegram, or iMessage bot is assumed enabled.

## 2. Backend endpoint candidates

| Endpoint | Request | Response | Auth/storage rules |
|---|---|---|---|
| `POST /v1/research/jobs` | `{eventUrl?, eventText?, goal, limit}` | `{jobId, status}` | explicit initiation; SSRF-safe URL restrictions, quotas |
| `GET /v1/research/jobs/:id` | none | `{status, recipients[], evidence[], errors[]}` | job owner only; bounded retention |
| `POST /v1/strategies` | `{jobId, selectedRecipientIds[], objectives[]}` | `{strategies[], recipes[]}` | evidence required; no full profile uploads |
| `GET /v1/recipes/:id` | none | `CardRecipe` | bearer authorization; unguessable ID |
| `POST /v1/messaging/:provider/webhook` | signed provider envelope | provider acknowledgement | verify provider signature/timestamp/idempotency; never log body |
| `POST /v1/temporary-links` | `{recipeId, audience, ttlSeconds}` | `{url, expiresAt}` | links are not automatically private; no private data in URL query |

All endpoints MUST enforce schema validation, max lengths, predictable errors (`INVALID_REQUEST`, `SOURCE_UNAVAILABLE`, `INSUFFICIENT_EVIDENCE`, `PERMISSION_DENIED`, `RATE_LIMITED`, `EXPIRED`, `INTERNAL`). API routes, HTTP methods and storage layouts remain subject to target-repository discovery and an accepted ADR.

## 3. LocalComposer interfaces

`readLocalField(ids, grant)` checks **both** field allowlist and active authorization; `buildDraft(recipe, fieldValues)` keeps user text and model suggestions separated; `exportShare(draft, recipientShareSelection)` MUST project an allowlist into a new object; `revokeGrant(grantId)` stops future access, not disclosure already sent externally. Send action always direct user gesture.

A server-issued `recipeId` is not permission to read a device. Cross-browser WebViews may have isolated storage; present secure open-in-app/import/recovery route without lying about automatic access.

## 4. Messenger specifics & dependency gates

- WhatsApp: official Business Platform account, verified webhook, customer-service reply rules, templates and pricing need current provider review. No unofficial personal-account automation.
- WeChat: official account / customer service integration, corresponding registration and platform policy checks. Do not automate a personal account.
- Telegram: Bot API + signed Telegram WebApp initData (when applicable). Production secrets required, never in shipped frontend.
- Apple Messages: consumer iMessage has no equivalent general-purpose unrestricted bot API; evaluate Messages for Business separately and do not promise channel parity.

## 5. Preview/Share constraints

Public share: render Open Graph snapshot with **only user-approved published fields**; platforms may cache images. Private share: generic sleeve thumbnail; content access requires recipient key/authorization. Sending `.vcf` is plaintext and should warn users. Plain link ≠ recipient-only encrypted message. NFC should carry a link or short token, not a magical cross-platform profile transfer.

## 6. Observability and retention

Record task status, latencies, provider errors, token counts, limited anonymous usage aggregates. Never log raw prompts, inbound full messages, private fields, contact lists, session tokens or cryptographic keys. Job/event retention policy must be selected before production; until decided use ephemeral test fixtures only. Consent screens describe that a messaging provider sees messages users send it.
