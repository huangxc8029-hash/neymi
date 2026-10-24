# UX Spec · Activity-first introduction & card exchange

**Status:** Spec for Pilot, not a complete clickable v1.2 prototype. Existing HTML at `../prototypes/` demonstrates v1.1 card composer, not AI integration.

## A. Interaction principles

- **Messaging-first, not messenger-only**: user sends an event URL and goal in preferred official bot or lightweight web entry; the agent returns research, preview links, and named card plans. Sensitive approval and share happen in local Card Composer.
- **Prepared before meeting**: batch preparation happens pre-event; retrieval does **not** trigger a slow new research run by default.
- **Trust ahead of persuasion**: each recipient fact links to source; separate verified/inferred/unknown; offer "not a fit"; avoid using private habit profiling.
- **Expressive but clean**: 5:3 canvas; top-left identity; variable-sized floating tiles; Story/Projects can be large; no QR or headshot obligation; Sleeve opens/skips separately.
- **No register wall** for guest sender or recipient; no pressure to follow brand or buy gift to view.

## B. Event preparation · pre-event (UX-J-01)

1. Input event link / agenda PDF / paste speakers; provide purpose in one sentence. Optional `goalType` (`fundraise`, `sales`, `partner`, `research`, `social`, `other`) and `specificAsk`.
2. Show progress by states `submitted`, `extracting`, `researching`, `needs_identity_confirmation`, `ready`, `partial`, `failed`. Show reference sources and what could not be checked.
3. List up to 20 candidates; each row: identity, fit category, **reason grounded in evidence**, missing-data flag; no numeric probability-of-success claims.
4. User reviews candidate shortlist; agent suggests top five, not all automatically; user may remove or reorder.
5. Each target receives a **Connection Strategy** with four short panels: public facts/source, relevance, opening/ask, next-step/risk.
6. AI proposes one reusable `CardRecipe` per common strategy; user may duplicate/rename per specific recipient. No profile field automatically inserted into bot response.
7. Provide `Prepare cards` action invoking **scoped local permission**. If user declines: show incomplete recipe previews/placeholder fields without extracting local data.

## C. Temporary permission · UX-J-02

- Permission modal shows **purpose**, **which device**, **selected module and nested field IDs**, **local vs cloud**, **max session lifetime** (example 5/15/60 min), recipient or event scope, and **what will not happen** (no external share).
- This is a **client-side capability**, not a chatbot command with remote powers. On expiration/revocation: future local reads denied, existing already-generated local drafts may remain; cloud-disclosed content cannot be retroactively erased by expiry.
- Name, story, projects, experience may be selected; phone, personal email, photo, exact location **off by default**. Allow selected professional email explicitly.
- Permission summary clearly differentiates (a) analyzing content (b) including field in a draft (c) sending it. Each requires relevant approval.

## D. My Prepared Cards · UX-J-03

- Card shelf grouped `Event`, `People`, `Purpose`, date; card entries have `draft`, `ready`, `stale`, `shared`, `revoked` statuses. A recipe isn't a copy of a personal profile.
- Tap `Investor — Sarah` or ask bot "Show my card for Sarah" → light composer deep-link, **local recipe lookup**, local field substitution, no forced research.
- If using an in-app browser that cannot access the encrypted local vault, show *Open Neymi on the device where you created this card* with file/import/recovery options. **Never claim it already knows the profile**.
- Before Share, show `Recipient Preview`, actual selected fields and optional public share cover. Allow last-minute removal of any field.
- Recipient sees chat image/link preview if public OG explicitly enabled, generic sleeve otherwise; click for interactive card; save vCard/system contacts with confirmation; free `Return My Card`.

## E. Contact after event · UX-J-04

- If user opts in, record `contacted, met, nextStep`, notes and chosen card recipe locally. No read receipts, open analytics or auto-send.
- Bot may suggest a follow-up draft, but requires review and user-triggered dispatch. Recipients must not be targeted by inferred private vulnerabilities.

## F. Exceptional flows

| Failure | Expected UI | Fallback |
|---|---|---|
| Event URL blocked / login required | “Cannot access this page” with cause; no fake success | Paste public speaker details / authorized file |
| Same name at two firms | Prompt identity selection; mark as unverified | Skip recipient |
| No source of investment preference | “Unknown—not found in checked public sources” | Generic verified-role-based introduction |
| Profile is not available in this browser | “Local profile unavailable on this device/browser” | Open original PWA or restore encrypted backup |
| AI cloud consent declined | Local-only recipe generation / simple template | No forced cloud upload |
| Unsupported app channel | Give shareable file/copy link / web form | Retain user control |
| Private share link accidentally forwarded | Do not present public URL as recipient-only secure | Explicitly limit share fields or use future verified recipient-encryption flow |
| Provider rate limit / outage | Queue / retry with bounded expiration | Browser entry, cached already-prepared cards |
| In-app share image preview fails | Standard text message + human-readable fallback | Receiver still opens link |

## G. Motion / media behavior

- `Floating Glass`: rise/blur/scale softly; `Piano Keys`: light staggered window motion; `Orbit Reveal`: circular reveal originating near selected tile.
- 5:3 logical card, 1–N modules: suggest 3–7 per face but do not impose schema max; multiple pages/back or adaptive alternative for large set.
- Animated Sleeve has smile/handshake/seal as optional premium style, separately skippable; avoid long intro gate.
- `prefers-reduced-motion` disables nonessential transitions, keyboard access and focus restoration mandatory.
- Photo/logo optional; strip EXIF on local export and sanitize user SVG.

## H. Key UI copy / product trust

- “Based on [source] published [date], this investor focuses on…” vs “Likely prefers…” with explicit caveat.
- “Not enough public information to infer a communication preference.”
- “This drafts a card on your device. Your full profile is not sent to the assistant.”
- “You are sharing exactly these fields.”
- “This published preview may be fetched and cached by LinkedIn, WhatsApp, WeChat or other services.”

## I. Usability acceptance

- New Guest creates, exports and returns a card without registration.
- Pre-event 20-person research allows user to locate top five and see their source URLs.
- Target card can be retrieved offline after preparation **if local recipe and assets are available**; no guarantee if only a remote bot conversation exists.
- All phone/email/photo exports are selective down to nested item IDs; accessibility on iPhone 360/390 widths.
