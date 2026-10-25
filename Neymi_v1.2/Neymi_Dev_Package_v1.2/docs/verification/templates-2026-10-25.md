# Six free card templates — verification

2026-10-25. Added six selectable, free and registration-free card styles. Selection updates the sample or live preview and is carried into the manual card recipe, share projection, public card styling and PNG palette. The choice is stored as a non-sensitive preference in this browser. UX and QA now record this as AC-A19.

## Local checks

- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run test -- --run` — PASS, 139 passed and 2 skipped.
- `npm run build` — PASS; routes generated, including `/`, `/prepare`, and `/p/[publicId]`.
- `npm run test:e2e -- --grep "six free templates"` — BLOCKED. An existing Next dev server holds the workspace's dev lock on port 3100; its process is outside this shell's process/network namespace. Attempts to start a second dev server hit the same lock or host-owned local ports, so the browser acceptance test could not reach the updated build.

The current browser at `127.0.0.1:3000` still displays the previous server build. Do not report the template UI as live in that browser until the dev server is restarted and AC-A19 passes there.
