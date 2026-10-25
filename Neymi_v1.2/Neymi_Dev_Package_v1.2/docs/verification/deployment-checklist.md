# Neymi Phase A deployment checklist

This is an operator checklist. None of the external items below is configured or claimed complete by the local implementation.

- [ ] Deploy only after an explicit deployment request; use TLS and a controlled production origin.
- [ ] Configure `NEYMI_SESSION_SECRET`, `NEYMI_PUBLICATION_SECRET`, and `NEYMI_CLEANUP_SECRET` from a secret manager (each at least 32 bytes); keep them separate and stable across restarts.
- [ ] Mount `NEYMI_SQLITE_PATH` on durable storage, verify SQLite WAL files and backups are included, and test restore without overwriting active data.
- [ ] Schedule authenticated `POST /v1/maintenance/cleanup` at least daily. Alert on failed runs; verify expired application snapshots are removed. Vendor retention and backups need separate evidence.
- [ ] Set provider credentials only after reviewing provider logging/retention and expected cost. Keep live tests opt-in and budgeted.
- [ ] Verify deployment logs omit request text, profile data, recipient research, session cookies, idempotency keys, and revoke tokens.
- [ ] Verify public pages and `/v1/publications/*` responses are not cached by the CDN, proxy, browser service worker, or platform cache.
- [ ] Confirm the actual origin used in generated public URLs, upload/body limits, rate limiting, error monitoring, and cleanup retries.
- [ ] Exercise publish, open from another browser, revoke, expire, and recover from a durable backup before a pilot.
- [ ] Conduct desktop, mobile Safari/Chrome, and target in-app browser checks; document opt-in pilot observations without adding tracking.
