# System Design · Architecture, Consent & Threat Model

## 1. Design drivers

- Privacy-first / Guest free / no registration; modular high-quality card & paid sleeve separate.
- Reliable event research and AI proposals from public material; no unauthorized platform scraping.
- AI *needs recipient context and task-relevant user professional highlights*, **does not need full personal vault**.
- Prepared cards ready to retrieve quickly; offline when possible; mobile in-app browsers may isolate storage.
- Messaging external providers are regulated integrations with retries and webhooks.

## 2. Logical architecture

```text
[WhatsApp / WeChat / Telegram / Web text + User-provided event URL/PDF]
             │ provider webhooks (verify signatures)
             ▼
  Messaging Adapters + Event Intake ──► Job Queue & State Machine
                                         │
                            Research Sources / Fetch Safety
                                         │
                            Evidence Store (public research)
                                         │
                            Ranking & ConnectionStrategy
                                         │
                           Proposal Store: CardRecipe ONLY
                                         │
                      one-time short-lived handoff ticket
                                         │
              ┌──────────────────────────┘
              ▼
       Neymi PWA (same origin as profile vault, IF available)
         │         │
         │      Permission Broker (device-local, scoped, revocable)
         │         │
  [Local Vault]─┴─► Card Composer / Real Content / Approval
                    │
       strict ShareProjection + Recipient Preview
                    │
         .ncard / vCard / native Web Share
                    │
              Recipient Guest Reader

  Separate Commercial Backend: templates, sleeves, vouchers, edition certs
``` 

## 3. Trust boundaries & storage

| Data | Where by default | Sent to Cloud AI? | Retention / visibility |
|---|---|---|---|
| Local Profile, contact items, photo, logo, secrets | user device local vault | **Never by default**; selected value only on explicit cloud consent | user-controlled; backup with audited encryption before production claims |
| CardRecipe config, metadata | local; short-lived sanitized agent proposal store possible | no plaintext personal fields | remove expired draft server jobs |
| Event URL, public agenda, speaker details | research backend & user-device cache | yes for research | bounded, documented retention; public sources may still include personal data |
| Chat platform sender ID / message content | provider + messaging backend | may be used for request | disclose in privacy notice; least retention, redacted logs |
| Recipient public professional facts/citations | research backend | yes | timestamps + source URLs; user can remove saved task |
| Connection strategy | proposal store then local | AI product output | never automatically shared with recipient |
| Public preview cover | optionally published after user confirmation | platform preview bots can fetch | cached by third parties; cannot guarantee purge |
| Member entitlement, payment reference, serial | separate commercial backend | no | business/legal retention differs from local profile |

**Data minimization rule:** conversation/provider identifier is NOT an anonymous session. Do not claim zero knowledge of user identity simply because card profile is local. Avoid joining chat IDs, edition numbers, card contents and received-card graph in one backend DB.

## 4. Temporary permission design

### Grant distinctions

1. `ResearchPublicSources`: user-submitted target/context (not vault access).
2. `ComposeFromLocalProfile`: local-only read of allowed field IDs and selected purpose for one or a batch of recipes.
3. `CloudTextAssist`: optional **separate** approval to send minimal selected professional excerpts to an LLM/service.
4. `ShareProjection`: independent final per-recipient/purpose choice of actual public fields. Never inherited from #2/#3.

### Enforcement

`ConsentGrant` is generated and held in local device context; signed/capability semantics as appropriate to actual implementation. Example: `grantId`, `profileId` local-only, `allowedSectionIds`, `allowedItemIds`, `purpose`, `jobId`, `expiresAt`, `revokedAt?`, `allowCloudProcessing:boolean`, `allowedOperation:compose`. Must check allowlist **each time** local code asks vault for a value; protect against extra reads via UI or unrelated browser origin. Expiry prevents *future reads*, not the contents of an already-produced card, nor already transmitted cloud data.

A bot response saying "I allow it" is **not** device vault authorization. Only client-side user gesture in origin holding vault (or authenticated OS-to-app handoff) can grant. Provider deep link/one-time token only communicates recipe or job reference, not arbitrary direct vault access. Plain URL tokens are bearer credentials and can leak through logs, previews, browser history and referrers; design short TTL, single use, unguessable token, token exchange, `Referrer-Policy: no-referrer`, and removal from address bar once redeemed. Authorization checks on server independent of UI.

### Security barriers

- Server URL fetch: mitigate SSRF: public HTTPS, reject localhost/private/reserved IP and redirects to private targets; enforce byte/time limits; sanitize HTML/PDF; malware content scanning as appropriate.
- Webhook: validate signature/provider challenge, dedupe event IDs, replay protection, bounded retry, no PII logs.
- Model: tool responses untrusted, no executing page instructions, egress allowlist, citation/source-ID validation.
- Sharing: allowlist projection built from selected fields, never `serialize(profile)` then hide; nested Contact/Social item selection enforced.
- Media: sanitize SVG; remove EXIF including geolocation; limits on image/video size; strip nonessential metadata.
- Data stored for browser preview pages: public only after affirmative user publication; no claim of encrypted recipient-only access from ordinary HTTPS URL or URL fragment.
- Encrypted receiver exchange needs independently reviewed key resolution + cryptographic protocol (future scope); do not invent E2EE badge based on presence of Crypto API.
- Cross-browser: WhatsApp/WeChat webview may have a different cookie/storage partition from Safari/PWA; test and provide import/recovery, not an undocumented sync.

## 5. User/device states

```text
BOT_REQUESTED → RESEARCH_READY → RECIPE_PROPOSED
  → (Open official composer) → LOCAL_PROFILE_AVAILABLE?
       YES → CONSENT_REQUESTED → GRANTED / DENIED / EXPIRED / REVOKED
                  → LOCAL_DRAFTS → USER_REVIEW → EXPORTED/SHARED
       NO  → TRANSFER_ASSIST / OPEN_IN_APP / RECOVERY / READ_ONLY_RECIPE
```

No state automatically triggers external message send. A server job can finish when device is offline because it uses public event material; a genuine local card cannot be finished without device execution or preauthorized selected-value upload (not Pilot default).

## 6. Nonfunctional requirements / quality budgets (targets pending measurement)

- Client UI: 390px viewport, no horizontal overflow/overlapping tiles; 60 FPS *goal* for supported hardware animations; reduced-motion no transform dependencies.
- Security: zero unauthorized field serialization in tests, no secrets in telemetry, no remote vault access without explicit chosen transfer.
- Agent: no unsourced confident professional facts; 100% factual claims either citation or clear unknown/inference marker; top-K rating documented; status backpressure.
- Availability: service failure should not block already prepared local card sharing.
- Accessibility: focus, keyboard navigation, ARIA labels and semantic fields, meaningful contrast.
- Cost: provider message fees, fetch calls, model token use instrumented per job without storing message body in analytics.

## 7. Threat model (prioritized)

| Threat | Impact | Control | QA |
|---|---|---|---|
| Prompt-injected event webpage asks bot to fetch vault | leakage | tool/page content never agent instruction, vault inaccessible | AC-AI-06 |
| Incorrect same-name recipient | harmful embarrassment | candidate disambiguation/abstention | AC-AI-02 |
| Unauthorized field in card export | privacy breach | strict projection allowlist + byte tests | AC-PRIV-01 |
| OAuth-like grant used as remote read bypass | privacy breach | local broker + user gesture + origin boundary | AC-PRIV-02 |
| Messenger account/user ID correlation | privacy | separate stores, minimal linkage/retention | AC-PRIV-04 |
| Event URL SSRF | server compromise | URL/IP/redirect validation | AC-SEC-01 |
| Preview crawler sees sensitive field | public disclosure | generic cover default; explicit publication | AC-PRIV-05 |
| Leaked deep-link token | hijack | short TTL, single use, no-referrer, cleanup | AC-SEC-02 |
| Cloud data after permission expiry | misunderstood policy | retention notice, no false revocation promise | AC-PRIV-03 |
| False/misleading claims about user achievements | reputation | verified user proof point refs; hard validation | AC-AI-05 |

Reference checklist: OWASP ASVS 5.0 (controls must be selected/tested, not claimed as certified), NIST AI RMF provenance/validation.
