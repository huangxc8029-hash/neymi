# A00 — Repository discovery
2026-10-24 · inspected on Windows / PowerShell.

## Observed baseline
- Repository: E:/ChatGPT/neymi cybercard; application/document root: Neymi_v1.2/Neymi_Dev_Package_v1.2.
- Baseline commit cee7e73. No package.json, lockfile, src, installed application dependencies or runnable application tests existed at discovery.
- Existing material: v1.3 specifications, historical v1.2 backup, v1.1 HTML prototype, design PNGs and synthetic fixture. Untracked original assets remain preserved.
- Created development branch codex/phase-a-foundation; master unchanged. Git dir and common dir are both .git; this is a normal checkout, not a linked worktree.
- Node v24.12.0, npm 11.6.2; both commands executed successfully.
- Connected GitHub account huangxc8029-hash. Repository neymi now exists, empty, default main, public. Publication visibility confirmation requested before upload. Local gh account is a different invalid session; never reuse/export its token.

## Runtime/versions
Official npm registry returned Next 16.4.3 (Node >=20.9), React 19.3.1, Zod 4.6.7, Vitest 5.0.5 (Node ^22.12 || ^24 || >=26), Playwright 1.64.1. Node 24.12 satisfies Next/Vitest requirements. Use TypeScript 5.9 rather than unverified major 7 for the initial compatible toolchain; exact installation versions go in package-lock.json.
Sources: https://nextjs.org/docs/app/getting-started/installation and https://vitest.dev/guide/ plus npm view metadata. Registry access needed normal sandbox escalation; initial sandbox DNS failed, external query succeeded.

## Decisions and limits
- Keep application in the documented package directory; add a root README and ignore generated/secret files.
- Start with A01 runnable shell, typed schemas, valid fixtures and boundary regressions. No invented AI connection, persistence, encryption, or publication implementation.
- Use the existing checkout on a feature branch so untracked design references remain available. No destructive moves or main-branch implementation.
- Git Bash skill helper failed on a Windows sandbox named-object permission; use equivalent PowerShell ledger/brief handling without changing the skill or system permissions.
- SQLite/hosting, actual AI/search credentials, encryption parameters and device tests are not provisioned/verified. They remain later task gates.
- Contract defect: ProfileItem has no stable value kind, despite requiring telephone/email/address to remain sensitive regardless of labels. Add optional valueKind for legacy ordinary text, require sensitive classification for contact kinds; unknown legacy content does not become cloud-approved.

## A01 verification plan
Pin installed dependencies; establish Vitest RED→GREEN for strict unknown-key rejection, manual-vs-AI distinction, source/cross-person integrity, sensitive recipe rejection and grant timestamps. Run typecheck, lint, all unit tests, production build and local smoke. No app tests were runnable before scaffolding.
