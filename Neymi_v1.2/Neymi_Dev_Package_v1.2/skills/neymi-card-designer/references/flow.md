# Flow reference

The app state machine decides stages; the model never advances one by itself. Required collection order is: purpose → audience mode → display name → primary highlight or explicit basic-card choice. The user can answer several at once. `general` is a valid audience. Optional details: desired outcome, recipient role/organization, extra highlights, tone, density, language, template preference.

After required slots exist, show a user-editable summary. The user explicitly confirms factual candidates before they can support a generated proposal. Then proposal generation selects a supplied template and supported items. Applying a proposal creates a new card draft; publishing remains a separate user action after public-field review.

Unknown stays unknown. Skip never means consent, factual confirmation, public visibility, or approval to send additional context. Changing a slot marks the proposal stale but keeps the old draft until replacement is confirmed. See `docs/design/2026-10-27-ai-card-designer-plan.md` for the complete state table and information priority.
