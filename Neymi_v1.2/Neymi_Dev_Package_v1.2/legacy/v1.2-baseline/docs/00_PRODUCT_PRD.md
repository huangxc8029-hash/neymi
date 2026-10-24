# PRD — Neymi v1.2 · Relationship-first Digital Identity Cards

| Field | Value |
|---|---|
| Status | **Approved product direction / proposed implementation, pre-MVP evaluation** |
| Version | 1.2.0 · 2026-10-24 |
| Product owner | Founder / product owner (not a guessed named person) |
| Intended readers | PM, UX, fullstack, AI/ML, QA, Codex |
| Existing baseline | v1.1 dynamic local-card HTML prototype and dev docs |
| Technical source of truth | `03_ARCHITECTURE_PRIVACY.md`, `04_DATA_CONTRACTS.md`, Accepted ADRs |

## 1. Problem and opportunity

A person at a conference often knows **who is attending** but not whom to prioritize, which publicly stated professional interests intersect with their own work, or how to introduce themselves briefly and truthfully. Static digital business cards send the same information to every person, and conventional personalization tools stop at text generation. The costly outcome is not an ugly card; it is **a missed, potentially relevant conversation**.

**Job to be done**: "When I am preparing for an event or have just met someone, help me discover credible common ground, present the most relevant true information about myself, and take a natural next step—without uploading my entire personal profile or forcing others to register."

## 2. Product thesis (hypothesis, not proof)

Evidence-grounded recipient research + user goals + opt-in local profile composition yields more useful, relevant introductions and meaningful follow-ups than a generic static card. Need empirical validation; don't preclaim conversion improvement, ARR or differentiation as established fact.

**North-star candidate**: `qualified_next_steps_per_event`, user-confirmed substantive continued interaction (meeting scheduled, demo requested, exchange of requested materials, collaboration discussion). Supporting metrics: relevant target precision at K, factual citation coverage, strategy acceptance, card readiness time, genuine reply rate where consensually measured, guest card completion and return share. **Privacy guardrails**: zero unauthorized field disclosures, no unsupported high-confidence assertions; report adverse outcomes and opt-outs.

## 3. People and roles

| Role | Goals | Responsibilities / limitations |
|---|---|---|
| Guest Creator | Build beautiful cards and exchange freely | No account, fee, required identity proof |
| Guest Recipient | Read/save/reciprocate card | No account or tracking gate |
| Event Networker | Prepare to meet relevant attendees | Controls goals, permitted research, and share approval |
| Signature Member | Buy premium styles/Identity Sleeve | No privileged access to anyone else's information |
| Operator | Maintain official bot and catalog | No plaintext local Profile or automated DM privileges |

First paid persona hypothesis: founder/sales professional/conference networker with repeated high-value meetings. **Not yet validated**. Non-business people keep core free card experience.

## 4. Goals and non-goals

**G-01** Independent, beautiful, local-first digital cards: free create/receive/save/return. **G-02** For one event, analyze speaker information and publicly verifiable professional interests. **G-03** Rank credible matches with reasoning and evidence; allow "not a good fit." **G-04** Prepare `ConnectionStrategy` + multiple named `CardRecipe` objects per event. **G-05** User can grant selected local data for composition and review *actual* share before release. **G-06** Quick retrieve/reuse at the event via familiar messenger + lightweight browser/composer. **G-07** Optional user-entered follow-up status (not covert tracking).

**Explicitly OUT OF SCOPE for Pilot**: automatic outreach; auto-adding/following on social platforms; covert profiling; scraping restricted LinkedIn/WeChat/WhatsApp profiles; buying third-party contact lists; scraping personal phone/email; prediction of wealth/personality/mental health/politics; collecting social graph; guaranteed meetings; AI sending without review; fully self-running cross-device cloud profile access; simultaneous production rollout to every messenger; building CRM/feed/social network; cryptocurrency/Coins/NFT; mobile native app. Membership/vouchers remain a separate feature track, *not a pilot prerequisite*.

## 5. Use cases / journeys (stable IDs)

| ID | User story | Priority | Acceptance summary |
|---|---|---|---|
| UC-01 | As a Guest I can build and share a beautiful card | Existing Core P0 | No account; dynamic card; share-level filtering |
| UC-02 | As a participant I submit a speaker page/PDF and event goal | Pilot P0 | Link/text/file validation and clear errors; source recorded |
| UC-03 | As a participant I receive evidence-based candidate matches | Pilot P0 | Cite professional claims; resolve ambiguous names or abstain |
| UC-04 | As a participant I get a personalized introduction strategy | Pilot P0 | Highlight true fit, mismatch, opening question, achievable next step |
| UC-05 | As a participant I get several named, reusable card recipes | Pilot P0 | Saved without copying private profile content |
| UC-06 | As a user I authorize local information to make specific drafts | Pilot P0 | Field-specific local permission; expiry; separate cloud opt-in |
| UC-07 | As a user I review/share selected real fields | Pilot P0 | Unselected nested fields absent from serialized output |
| UC-08 | As a participant I retrieve a prepared variant at an event | Pilot P1 | Search by name/event/purpose, no AI call necessary |
| UC-09 | As a user I can talk with a bot in an existing messenger | Beta P1 | One official channel at a time, conversation and deep-link handoff |
| UC-10 | As a user I save next-step and outcome notes locally | Pilot P1 | Explicit opt-in, exportable, no auto-send |
| UC-11 | As a paid member I can use Identity Sleeve / numbered edition | Separate P2 | Free exchange unaffected; credential separated |

## 6. Functional requirements

### FR-01 — Ingest event & speaker sources
- Input: public event URL, conference agenda PDF, pasted intro/text; supported upload only with explicit user action.
- Extract candidates `name, organization, role, text, sourceId`; detect same-name collisions; users can confirm identity.
- Check page fetch policies; do not bypass paywalls, authentication, robots or rate limits; no private platform profile scraping.
- Render partial results on retrieval failure; label source quality; avoid silently manufacturing candidates.

### FR-02 — Research recipient, not "personality"
- Research investment stage/sector, portfolio, public statements, event talks, publicly volunteered professional communication preferences, and specific domain interests *when directly relevant*.
- Every factual assertion has source URL/title, access time, source-publication time if known, confidence and claim classification (`verified_public`, `inferred`, `unknown`). User-visible citations required for factual claims.
- Explicitly allow abstain when conflict, staleness, ambiguous identity or insufficient evidence. No claims that recipient "will invest," "has money," or "wants to meet" without evidence.

### FR-03 — Matching & connection plan
- Inputs `UserGoal`, `RecipientResearch`, optional *user-approved* portfolio highlights. Output `RelevanceAssessment` with reason for ranking and deal-breakers; separate relevance from receptiveness.
- `ConnectionStrategy` MUST specify: why this recipient, why my true material matters to them, proposed conversation opener / question, selected truthful proof points, recommended CTA or next step, risk/mismatch, evidence references, draft confidence.
- This is the **first-class business object**. Card recipe is derived from strategy and cannot be finalized without it.

### FR-04 — Named card variants (Card Recipe)
- Each recipe: stable local ID, nickname, event/candidate reference or reusable persona, modules, order, emphasis, copy suggestions, template/layout, date/version, provenance of selected facts. No raw phone/email, precise location, profile dump, or payment identifiers inside.
- Prepare one card per *meaningful communication strategy*, not automatically for all attendees. Multiple candidates may reuse a single card.
- Recipes are locally stored after user's explicit import/approval; a server may hold short-lived nonsensitive proposals but not full Profile.

### FR-05 — Temporary access & consent
- Permission screen: what profile categories/individual items, purpose, mode local/cloud, optional max expiry, which recipe/job, and explicit user action.
- Local mode: only device-side component can read vault. Cloud mode: separate opt-in; selected material may leave device and cannot be un-sent simply by token expiry.
- Permission to *analyze/compose* is separate from permission to *publish/send/share*; no bot direct dispatch without explicit per-share intent.

### FR-06 — Local preview & share
- 5:3 horizontal card, header anchored upper left, custom sizes/counts, polished animations; accessible and reduced-motion.
- Sender may choose actual identity fields, full/partial Contact, Social account, image and logo. Projection allowlist is the single serializer for `.ncard`/vCard/browser share and recipient preview.
- Public OG links require user-authorized public information and server-accessible preview; generic Sleeve only for private mode. Local-only content **cannot** magically render in chat link previews.
- In-app browsers might not share Safari/installed PWA local storage: explicit cross-context handoff design and tests required.

### FR-07 — Messenger entry
- A bot receives explicit text/source uploads via official adapter; returns researched summary, source links and an expiring `Preview my cards` handoff.
- Bot can retrieve recipe summaries but does not impersonate the user, connect to contact list or send final cards to others.
- One channel pilot; WhatsApp/WeChat/Telegram are provider-dependent, and iMessage business access is not ordinary automatic bot API. Select after provider feasibility and target geography validation.

### FR-08 — Follow-up loop
- User can manually mark `Not met`, `Brief chat`, `Exchanged`, `Requested material`, `Meeting scheduled`, `No fit`, and add a private note.
- Show proposed next action only with user confirmation; no automatic outbound follow-ups, no covert link opening analytics.
- Retain user notes locally by default; for personal follow-up automation use opt-in and explicit scheduling design in a later increment.

## 7. Reference UX / visual language

Retain v1.1 prototype's strong card aesthetics. **Identity Header: top-left; Company/Role immediately below; no obligatory QR/avatar; optional logo/photo.** Main content region uses unequal floating transparent tiles with only module names. Detail fills card, copy glyph next to each data value, small back arrow. Three switchable motion modes: Floating Glass, Piano Keys, Orbit Reveal; Sleeve separate. Share cover and full animated card are different products. Read `01_USER_JOURNEYS_UX.md`.

## 8. Scope & release gates

| Release | Outcome | Gate |
|---|---|---|
| Core baseline | Reliable Guest card, projection, export/import | Privacy, offline backup and no-login exchange verified |
| **Pilot v1.2 P0** | One event, ≤20 candidates, sources, top matches, strategies and card recipes | Evidence coverage and zero unauthorized exports |
| Pilot P1 | Prepared Cards library, one working official messaging adapter, local notes | Provider approval and realistic in-app browser test |
| Beta | Better evaluation, consented cloud text options, optional public OG cover | Observed real-user benefit, provider compliance |
| Later | Member commerce/Sleeve, NFC enhancements, secure recipient encryption | Independent business, crypto and platform-specific gates |

## 9. Success metrics & experiment

Pilot design: 5–10 consenting users each attend 1–2 real professional events when feasible; prepare up to 20 speakers/event; compare generic card vs AI-guided introduction without forced randomization or hidden tracking. Measure user-confirmed qualified conversations and next actions. **Exploratory targets only, NOT promised KPI**: top-5 relevance user-rating ≥4/5 median; critical research claims 100% linked to an accessible source or explicitly marked unverified; ≤60 seconds to retrieve already prepared card (better target after real testing); zero unauthorized export cases. No claim of significant conversion uplift at this sample size. Record time/cost per researched recipient, failed links, false-person matches, edits of intro text, and opt-outs.

## 10. Constraints, risks and open dependencies

- Backend chatbot can see provider user ID/message content; this is different from user-owned local card vault. Set clear retention & deletion rules.
- Public research content may be false, outdated or prompt-injected; sources are never instructions to the assistant.
- Mobile web local storage/OS share compatibility across iOS webviews is not guaranteed. Test on devices before public launch.
- Bot provider review, message cost, rate limits and business policies are external dependencies; avoid hardcoding unverified approval as already completed.
- "Temporary permission" cannot let a remote server read data stored only on a phone; client must run or explicitly transmit selected values.
- Evidence of professional preference is useful; unsupported psychological traits/sensitive personal inference is not a product feature.
- Formal product brand and naming remain undecided; use Neutral configuration rather than mass renaming.

## 11. Traceability

Every `FR-xx` must map to `API/Domain` (docs 04/05), a `WP-xx` (docs 06), and at least one `AC-xx` (docs 07). Do not mark `Done` based on a screenshot or a mock returning hardcoded data. Pending acceptance questions in `08_DECISIONS_AND_RISKS.md`.
