# Product recovery verification — 2026-10-25

This report follows `product-gap-audit-2026-10-25.md`. It records new work without changing historical test reports.

## Implemented

- Reworked the first-use homepage into a two-column card workspace with a visible example card, contact-channel previews and an AI-preparation entry. The visitor card updates as the display name is edited. Bumped the service-worker cache and made page navigations network-first so returning visitors receive current UI while offline navigation can still use the cached shell.
- Optional email, phone, WeChat and WhatsApp entry on the free card. Values are encrypted in the existing local vault; the public profile retains only an empty contact-module placeholder. The basic card still works without creating a vault. Ordinary profile and confirmed facts can be updated while the vault is locked without replacing ciphertext.
- The user must unlock to preview contacts. Share projection still starts with contact fields unselected; JSON, vCard, PNG and public publication consume that allowlisted projection. AI card composition can unlock and select contacts locally after strategy generation. The values are excluded from cloud-context construction.
- A multi-turn coach interface sends only the current user text after explicit approval. Earlier turns stay in browser memory and are not automatically resent; extracted facts remain candidates until the user confirms them locally.
- DeepSeek Chat Completions and Tavily Search adapters use Neymi-specific server environment variables; existing host/tool credentials are not reused. DeepSeek uses JSON mode and validates each proposed fact against an exact excerpt. A configured provider failure is surfaced as failure; rule fallback applies only when the model is unconfigured.

## Fresh checks

- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- `npm run test -- --reporter=dot`: 139 passed, 2 opt-in live-provider tests skipped.
- `npm run test:e2e`: 21 Chromium tests passed, including homepage visuals, 360/390/768/1440 widths, full personalization, contact and coach interaction paths. The coach response is stubbed in this browser test; it is not a live model result.
- `npm run build`: exit 0.

## Remaining release gates

- G-A1: basic contact entry/export now has local Chromium evidence. Device-specific visual review and recipient feedback remain outstanding.
- G-A2: provider choice is DeepSeek + Tavily and adapters are code complete, but no Neymi-specific provider credentials or live canary results are present. Real source support, model quality, usage cost and provider retention are unverified.
- G-A3: no approved deployment, durable production storage, cleanup scheduler, backup retention proof or phone/in-app-browser pilot. Public publication is not production ready.
- G-C: no official messaging channel adapter or real platform test.

Before enabling live providers, review vendor terms, data region/retention and budget; set `NEYMI_DEEPSEEK_API_KEY`, optional `NEYMI_DEEPSEEK_MODEL` (defaults to `deepseek-flash`), and `NEYMI_TAVILY_API_KEY` only in the server environment. The user currently has no credentials; run opt-in canaries with synthetic data once configured and record costs and source support. Do not use a real person's data for the initial canary.
