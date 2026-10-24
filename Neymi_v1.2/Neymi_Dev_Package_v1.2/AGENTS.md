# AGENTS.md — Neymi repository guidance for coding agents

## Current baseline (v1.3, 2026-10-24)
Follow `docs/00_PRODUCT_PRD.md` and `docs/superpowers/plans/2026-10-24-phase-a-implementation.md`: A single-recipient personalization first, B event preparation next, C one official messaging channel last. Use A00–A12 task IDs. `legacy/v1.2-baseline/` is historical, not executable guidance. Manual cards require no AI strategy; AI recipes still do. Recipients need not belong to an event. Approved dialogue/professional excerpts may reach cloud AI; sensitive vault values never do. An explicitly published allowlisted snapshot is separate from the private profile and from research storage. Public links are forwardable.

## Mission
Build **privacy-first local digital cards** and the **AI Relationship Agent** that helps a user prepare authentic, context-relevant introductions. Measure meaningful connections, not volume of cards or persuasive tricks. Neymi is a **temporary product codename**.

## Before editing ANY code
1. Inspect the actual working repository: `pwd`, `git status --short`, package manager/lockfile, README, tests, folder structure. Do not assume a scaffold, a deployed API, configured secrets or connected provider account.
2. Read `docs/00_PRODUCT_PRD.md`, applicable ADRs, `docs/03_ARCHITECTURE_PRIVACY.md`, `docs/04_DATA_CONTRACTS.md` and **one** assigned file from `harness/build/`. Avoid loading all long documents into a single prompt.
3. Report scope, files to change, test plan. Do not overwrite uncommitted edits or rename the brand without explicit authorization.
4. If requirement is undecided, use an interface + mocked fixture and log in `docs/08_DECISIONS_AND_RISKS.md`; do not invent an approved production integration.

## Non-negotiable invariants
- Anonymous Guest can create / view / save / reciprocate base cards, no signup wall or member purchase.
- `LocalProfile` never travels to Research/Messaging backend in its entirety. AI may see only user-selected context with separate explicit cloud permission.
- `CardRecipe` contains stable IDs, order, emphasis, tone, layout and **non-sensitive suggested copy**; **no phone, email, addresses, secrets, raw profile dumps, other people's private details**.
- Cloud research may store event/recipient public professional data and consented chat content; keep this logically & technically separate from local Profile vault. Do not describe the backend as storing literally nothing.
- Distinguish evidence-backed claim vs inference vs unknown; include `sourceId`, citation URL, timestamps on recipient facts; unsupported claims must not be stated as facts.
- AI must not fabricate user's achievements or investment metrics; no manipulation using inferred intimate/private traits.
- Consent to AI analysis != consent to external transmission; **final share is separate, always user initiated**.
- Share projections from allowlisted selections only, generated as new data objects; deny export of unselected phone, photo, private data at byte-level tests.
- No automatic outbound messages, connections or follow-ups; no hidden open tracking or contact scraping.
- Keep recipient restrictions honest: a public share link is not recipient-only E2EE. Secure sharing is a later separately audited milestone.
- No secrets committed, no raw messaging webhooks or personal data in logs/analytics/error reporting.

## Coding conventions
- TypeScript strict mode; schemas validated at boundaries (e.g. Zod in implementation); pure functions for scoring, recommendation-to-recipe and share projection.
- Keep adapters (`messaging`, `research`, `llm`) behind ports; fixtures must work offline without API credentials. Never silently fake an API call as a live result.
- API errors use stable typed codes. Verify signatures on provider webhooks; SSRF-safe server fetch of externally provided event URLs.
- Accessible keyboard/touch states; `prefers-reduced-motion` honor; phone widths 360/390 with 5:3 responsive card; no fixed equal six-grid requirement.
- Use TypeScript/Javascript test runner available in target repo. Add regression tests for security and hallucination safeguards before new features.

## Task completion format
`Implemented` (file list), `Tests` (commands and actual pass/fail), `Privacy/Security` (data boundary), `Open questions`, `Next task`. No unverified claims. Pull requests should be small and scoped. Never push/deploy/pay/send real messages without explicit user instruction and configured environment.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
