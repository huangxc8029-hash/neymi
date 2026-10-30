# Social-card preview release checklist

This change adds personalized Open Graph and Twitter metadata for consented public snapshots, a dynamic card preview image, and a WhatsApp-first share action. It does **not** add WeChat JS-SDK integration or bypass platform preview rules.

## Production setup

1. Set `NEYMI_PUBLIC_ORIGIN=https://swtpic.com` to generate canonical card URLs. Do not trust arbitrary request Host headers.
2. Ensure `NEYMI_PUBLICATION_SECRET` is stable and `NEYMI_SQLITE_PATH` points to durable storage on an actual persistent server; **Vercel functions cannot persist this SQLite database**. Use the included Supabase/Postgres adapter and SQL migration before enabling publishing on Vercel.
3. If using Supabase storage, apply `docs/sql/neymi_publications.sql` in the trusted Supabase SQL editor. Set `NEYMI_PUBLICATION_STORAGE=supabase`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` only in server-only environment variables. Never prefix the service-role key with `NEXT_PUBLIC_`.
4. Data from an existing SQLite database is **not automatically migrated**. Do not switch backends if live snapshots exist without first exporting/importing them.
5. Public previews are intentionally based only on fields chosen for publication. The public ID is unguessable but anyone with the link can access the published snapshot. Messaging apps may cache preview images after revocation.
6. For WeChat, the PNG-sharing option is a fallback. Custom WeChat link cards require a separately configured, eligible WeChat JS-SDK integration and real-device tests.

## Verify before merging

- Publish two different test identities with different templates and verify unique `og:title`, `og:description`, `og:image`, `twitter:card` on `/p/<id>`.
- Verify `/p/<id>/opengraph-image` returns a PNG with valid Content-Type on a cold request, using both Latin and Chinese names.
- Test WhatsApp on iOS, Android, desktop, and plain pasted links. Real client preview is controlled by WhatsApp and not guaranteed.
- Revoke and expire snapshots; make sure title and image stop exposing identity on the origin (third-party cached copies may remain).
- Verify the WeChat PNG path remains shareable even without an official account.
- Re-deploy and re-open public links. Confirm storage persists and that revocation still works.
- Run `npm run typecheck`, `npm run lint`, `npm test`, and the sharing E2E suite.
