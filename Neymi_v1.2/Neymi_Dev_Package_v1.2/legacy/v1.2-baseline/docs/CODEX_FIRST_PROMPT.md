# First Codex instruction (copy as a single prompt)

You are implementing Neymi v1.2 using the attached specification package. **Start with read-only discovery, not coding.**

1. Read `AGENTS.md`, `README.md`, `docs/00_PRODUCT_PRD.md`, `docs/03_ARCHITECTURE_PRIVACY.md`, `docs/04_DATA_CONTRACTS.md`, `docs/06_DELIVERY_BACKLOG.md` and `harness/build/00_repo_discovery.md`.
2. Inspect the ACTUAL codebase: `pwd`, `git status --short`, package manager, stack, tests, structure, env example. Do not overwrite local edits, assume deployment or change branding.
3. Produce `REPO_DISCOVERY_REPORT.md` containing actual evidence, whether v1.1 HTML is only a prototype, risky collisions, a minimal runnable architecture and T00 acceptance evidence.
4. Propose implementation of T01 strictly typed domain schema + fixtures, listing files, tests, negative privacy cases. Only implement after verifying repository baseline. For new or missing scaffolding, report that explicitly.
5. Never simulate real research results as genuine, never auto-send messages, never request or upload complete local private profiles. Treat `legacy/` as reference only.
6. On completion report: Implemented files; Tests with actual commands and pass/fail; Security/Privacy; unresolved decisions; next task. Do not push or deploy.
