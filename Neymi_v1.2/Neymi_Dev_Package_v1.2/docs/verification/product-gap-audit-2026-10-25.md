# Product gap audit — 2026-10-25

Follow-up implementation and fresh verification are recorded in `product-recovery-2026-10-25.md`; the findings below describe the baseline before that work.

This audit compares the current application with `docs/00_PRODUCT_PRD.md`,
`docs/01_USER_JOURNEYS_UX.md`, `docs/07_EVAL_AND_QA.md`, and
`docs/superpowers/plans/2026-10-24-phase-a-implementation.md`. A checked plan
step means work was recorded, not that the user journey or release gate passed.

## Findings

| Priority | Requirement | Current evidence | Result |
|---|---|---|---|
| P1 | A usable business card should let the user supply contact methods and choose which to share. PRD §5 requires a separate local form for phone/email; AC-A12 explicitly tests selective contact export. | `src/modules/card/editor.tsx` has name, company, role, and a generic highlight only. `src/modules/vault/vault.ts` can store sensitive `ProfileItem`s, but there is no contact-entry UI. No first-class WeChat/WhatsApp fields or user path to select these contacts for a basic card. | Missing user journey. G-A1's earlier PASS was narrower than the product's usable-card goal. |
| P1 | J-A02/A06 call for a short guided conversation and confirmation of extracted facts. | `src/app/prepare/page.tsx` submits one textarea to `/v1/facts`; it is not a multi-turn assistant. `src/server/providers/llm.ts` always returns an unconfigured provider. | A06 plan's checked implementation step does not match the described experience. Live AI remains blocked. |
| P1 | A07/A08 require public evidence and recipient-specific AI strategy. | `src/server/providers/research.ts` is unconfigured; `src/modules/strategy/plan.ts` falls back to a labeled rule-based draft. `tests/e2e/personalization.spec.ts` stubs session, research, plan, publication, and handoff endpoints. | Synthetic flow is useful regression coverage, not live end-to-end proof. G-A2 remains blocked. |
| P1 | A12 requires live services, retention evidence, devices, and a pilot before release. | The A12 plan still has unchecked items; `docs/verification/phase-a-report.md` says G-A2/G-A3 are blocked. | The product is not release-ready. |

## Fresh verification

On 2026-10-25, `npm run typecheck` and `npm run lint` exited 0.
`npm run test -- --reporter=dot` exited 0: 130 passed, 2 skipped. The skipped
tests in `tests/live/providers.test.ts` are the opt-in real provider canaries.
These commands prove code health in their scope; they do not close the product
gaps above. This audit did not run the browser suite or build again.

## Corrective acceptance work

1. Add a separate local contact form for email, phone, WeChat, and WhatsApp;
   store sensitive values in the vault, keep them out of AI context, and allow
   explicit field-by-field composition and sharing. Add tests for selected and
   unselected contact values in JSON, vCard, image, and public publication.
2. Replace the single textarea extraction experience with the planned guided
   assistant flow, preserving per-send context preview, consent, and local fact
   confirmation. Connect a reviewed real LLM adapter before calling this live AI.
3. Configure and review a real public research provider; run opt-in canaries,
   source-support checks, costs, retention review, and device/pilot acceptance.
4. Regrade G-A1/G-A2/G-A3 against the actual user journeys and update plan
   checkboxes and verification reports so they distinguish code, mocks, live
   services, and release readiness.
