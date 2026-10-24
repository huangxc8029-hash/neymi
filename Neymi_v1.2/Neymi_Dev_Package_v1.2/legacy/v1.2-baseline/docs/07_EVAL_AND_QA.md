# Quality, Evaluation & Acceptance Tests · v1.2

## Functional Gherkin examples

### AC-EV-001 evidence required
```gherkin
Given a recipient has a public profile but no cited investment preferences
When the researcher produces a RecipientBrief
Then known employment may be stated with its source
And investment preferences must be marked unknown rather than invented
```
### AC-MATCH-002 negative fit
```gherkin
Given the user's funding stage is seed
And the only verified investor mandate is Series B and later
When matching is computed
Then the result flags stage mismatch
And the agent does not recommend that person as a top seed fundraising target
```
### AC-REC-003 first-class strategy
```gherkin
Given verified public evidence and a user's stated objective
When the agent plans an introduction
Then the result contains relevance reasons, evidence identifiers, uncertainties, opening suggestion, and an appropriate next-step ask
And it produces a CardRecipe separate from that strategy
```
### AC-PRIV-004 local authorization
```gherkin
Given Phone is stored only on the user's device
And the assistant recommends Contact
When the local user grants Story and Project but not Phone
Then the composer cannot read Phone through that grant
And the exported share package contains no phone field or phone value
```
### AC-PRIV-005 distinct consent
```gherkin
Given the user allowed cloud AI to analyze a selected public project summary
When the model creates a draft card
Then that permission does not authorize sending to a recipient
And a further explicit share action is required
```
### AC-PRIV-006 expiry/revocation
```gherkin
Given a local grant expires or is revoked
When the agent retries an access request
Then the device rejects it
And the server cannot bypass the local authorization decision
```
### AC-UI-007 animated modules
```gherkin
Given a landscape card with 4 variable-size modules
When the user opens a module using keyboard or touch
Then an accessible full-card detail view opens
And a small close/back icon restores the composition
And reduced-motion settings disable nonessential motion
```
### AC-BOT-008 provider reliability
```gherkin
Given a webhook has an invalid signature or is a duplicate
When the messaging adapter receives it
Then an invalid signature is rejected and a duplicate performs no repeated action
And message contents are not written to application logs
```
### AC-RETRIEVE-009 offline prepared card
```gherkin
Given a pre-prepared recipe exists locally with valid field references
When the user requests that card offline
Then the card can render from local data and cached styles
And the user can still review the field selection before sharing
```

## Evaluation fixture set

Create 20 fictional/non-sensitive cases covering: verified fit, verified nonfit, conflicting source dates, same-name collision, unverifiable personal preference, missing credentials, hallucinated achievement, unsafe personal profiling, explicit user-approved cloud text, wrong-device storage, revoked grant, import/injection payload, malicious external URL, short share URL cache, private OG preview, sender/recipient boundary and failed messaging retries.

Scoring dimensions: evidence precision (unsupported factual claims must be **zero** in release gate sample), factual uncertainty labeling, ranking agreement with human-reviewed examples, usefulness of suggested opening and next-step, card recipe field validity, privacy leak rate (**zero** in regression tests), task completion, UX time-to-share. Human review records rationale; experimental thresholds must be approved after first baseline.

## Security and negative testing

- URL fetch rejects SSRF, redirects to private addresses, oversized pages, unsupported content, scripts embedded as content, model prompt-injection attempts.
- LLM output schema validation and reference integrity; cannot escalate selected share fields.
- Consent grants enforce **purpose + fields + time + action + device**; user can revoke future access; server cannot reach local IndexedDB remotely.
- Byte-test exported JSON/vCard/thumbnail: unselected phone/email/story absent from payload and OG metadata.
- Public preview caching/tracking limitations stated; browser/link behavior may vary.
- Accessibility: screen reader/keyboard focus, thumb-friendly actions, high contrast, 360/390 viewport, reduced motion.

## Test evidence template

Task ID, commit hash, fixture IDs, command run, stdout/stderr summary, screenshots where appropriate, privacy check, result PASS/FAIL/BLOCKED with date. Claims without evidence marked NOT RUN.
