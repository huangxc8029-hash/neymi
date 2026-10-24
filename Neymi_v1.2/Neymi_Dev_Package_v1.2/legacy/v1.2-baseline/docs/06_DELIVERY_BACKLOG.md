# Delivery Plan & Task Backlog · v1.2

**Rule:** one ticket per PR with tests. Status defaults TODO; completion requires actual runnable evidence. Estimates are planning hypotheses, not delivery commitments.

## Release gates

- **G0 · Foundation**: repo discovery, runnable baseline, types/schemas, offline fixtures, privacy tests.
- **G1 · Guest Card**: local profile, dynamic modular card, accessibility, export projection, public share flow.
- **G2 · Event Connection Pilot**: event ingestion and evidence provenance, recipient matching, strategy & recipe generation, local confirmation, prepared card retrieval, optional feedback.
- **G3 · Channel Beta**: one officially provisioned messaging adapter, signed webhook, messages with deep links; no automations.
- **G4 · Paid Sleeve**: payments/invites, signed edition credential, premium motion separate from private content.

## Ordered tickets

| ID | Priority | Dependency | Deliverable | Acceptance evidence |
|---|---|---|---|---|
| T00 | P0 | — | Read-only repo audit, architecture conflict list | Real commands + current repo map |
| T01 | P0 | T00 | TS schemas: LocalProfile, Evidence, Strategy, Recipe, Grant, SharePackage | valid/invalid fixture unit tests |
| T02 | P0 | T01 | Local vault interface, local-only sample profile + import/export demo | no network on local edits; recovery documented |
| T03 | P0 | T01/T02 | Card compositor: 3–7 demo modules with variable spans; reduce-motion | visual/keyboard tests at 360,390,768,1440 |
| T04 | P0 | T02/T03 | Share projection, selected fields only | byte-level non-disclosure regression tests |
| T05 | P0 | T01 | Event URL/text importer w/ offline fixtures, SSRF guard | rejected localhost/private IP/redirect cases |
| T06 | P0 | T05 | Source-backed recipient evidence extractor | fact citation + uncertainty tests |
| T07 | P0 | T06 | explainable matching, no-fit | expert-reviewed expected ranking fixture |
| T08 | P0 | T07 | Connection Strategy: reasons, opening, questions, next-step | groundedness and no-fabrication checks |
| T09 | P0 | T08/T03 | Recipes and prepared card library with local binding | no sensitive plaintext in recipe snapshot |
| T10 | P0 | T02/T09 | Purpose/field/time/scope grants, local decision UI | deny/expired/revoked/remote-no-access tests |
| T11 | P0 | T09/T10/T04 | End-to-end pilot from sample event to deliberate share | executable acceptance scenarios |
| T12 | P1 | T11 | Opt-in follow-up notes and result logging | no involuntary recipient tracking |
| T13 | P1 | T11 | One production messaging adapter, provider account prereqs | signature, retry/idempotency, provider sandbox |
| T14 | P2 | T11 | Signature Sleeve/paid invite credential | license verification + nonmember access test |
| T15 | P2 | T11 | OS sharing: NFC link, iOS AirDrop via share sheet | real device matrix; no automatic contact import |

## Definition of Ready

- Has user story + scenario IDs + input/output schema + trust boundary + dependency + estimated complexity.
- Fixtures and clear scope; any externally controlled provider access shown as prerequisite, not invented.

## Definition of Done

- Implementation merged locally, strict type-check/lint/unit/integration tests pass, negative security cases, manual UX check, `prefers-reduced-motion`, docs updated; exact commands and output attached.
- No claims of production integration without live provider verification. No secret material or private data in PR logs. Never deploy or send without explicit instruction.

## Outcome test

For each pilot event, record number of guests analyzed, factual sourcing rate, precision of matching by user review, prep time, number of meaningful follow-ups and booked next meetings; compare with generic-card baseline and disclose small-sample limits. Do not optimize for number of links sent or coercive response rates.
