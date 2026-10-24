# Architecture Decision Records & Product Risks Index · v1.2

## Decisions

| ID | Status | Decision | Consequence |
|---|---|---|---|
| ADR-001 | Accepted | Personal profile and received contacts are local-first; backend research data separated | device storage & recovery complexity |
| ADR-002 | Accepted | Connection Strategy is agent's primary deliverable; Card Recipe is subordinate | strategy quality tests before UI polish |
| ADR-003 | Accepted | User grants analysis access separately from explicit outbound share | extra review action required |
| ADR-004 | Accepted | Flexible 5:3 landscape card + optional independent premium sleeve | compositions require responsive design testing |
| ADR-005 | Proposed | Initial one-channel messaging adapter only after web pilot | platform approval/operations uncertain |
| ADR-006 | Proposed | Temporary cloud AI use of explicitly selected profile text | legal/retention/security review required |
| ADR-007 | Proposed | Card recipients can access private content by E2EE share | key distribution & revocation unresolved |

## Risk register

| Risk | Severity | Mitigation / gate |
|---|---|---|
| Wrong same-name recipient linked to facts | High | source/organization corroboration; user correction |
| Invented recipient preference or fabricated personal achievement | High | evidence claims vs hypotheses; reject unsupported copy |
| Message platforms observe submissions | High | in-product disclosure; least data; channel policy audit |
| Public OG image leaks selected private fields | High | separate cover; safe default; byte assertions; caching warning |
| Cloud model receives more profile data than intended | Critical | opt-in per selected field; contracts; retention; never full dump |
| Permission mistaken for server remote control | Critical | local enforcement; mock remote denied fixture |
| In-app browser cannot access local vault | High | open-in-app / recovery route; cross-device tests |
| Premature complex CRM or scraper | Medium | limit pilot to 20 public speakers; manual user review |
| Paid sleeve entitlements imply legal identity validation | High | differentiate signed membership from verified person |
| User mistakes AI-generated connection score for objective personal worth | Medium | explanations, uncertainty, ability to reject |

## Open decisions (need explicit owner decision before production)

1. Exact first pilot channel + geography/provider onboarding constraints.
2. Consent text, storage retention days, data residency and deletion workflow.
3. Backup/recovery and browser partitioned storage UX.
4. Public share hosting vs encrypted ephemeral delivery; no deceptive E2EE claims.
5. Human-reviewed benchmark, research provider/source policy and rate limits.
6. Versioned entitlement specification and pricing model; naming/trademark checks.

## Change control

Every scope-changing request gets new requirement ID, updated ADR status, linked ticket and tests. Old v1.1 rules under `legacy/` cannot override this index. Do not silently select an undecided technical option.
