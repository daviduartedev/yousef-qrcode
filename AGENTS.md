<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

- Each lot belongs to one feature branch created from the updated `main` of `daviduartedev/yousef-qrcode`.
- The lot workflow is specification → tickets → implementation → code review → dvd-tests → human validation → commit/push. Do not commit, push implementation, open a PR or merge until the human has completed the requested validation.
- The initial empty main commit contains no imported application history. Do not import the old repository's Git history or environment files.
- Integrated Lotes 1 and 2 are documented in `docs/lotes/01-nextjs-postgres/spec.md` and `docs/lotes/02-editor-qrcode/spec.md`; their local human validations are complete. Lote 3 prepares the operational closure of R0–R2 under `docs/lotes/03-transicao-operacional/`. Its number does not authorize roadmap R3 or later modules. Preserve installed skills/configuration; do not repeat setup or prior validations without a relevant change.
- On 2026-11-02 the owner explicitly chose a fresh start: no legacy users, QR records, scans, credential compatibility or legacy URL bridge. Active Lote 3 sequence is #12 → #13 → #15; #14 is out of scope. Keep new-environment backups, restoration, staging, publication and rollback. This does not authorize deleting or shutting down the old service, or treating future production data as disposable.
- Database, auth and private environment access belong to modules marked `server-only`. Derive resource ownership from the server session.
- Never print secrets or place credentials in public environment variables, Git, issues, logs, screenshots or manual validation instructions. Only dummy configuration examples may be versioned.
- Run credential checks before staging/reviewing files; preserve the local Git hooks and the CI checks.
- Tests verify behavior through HTTP and Git/CLI boundaries, using disposable local data. Browser credentials require user authorization; do not create default login profiles.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `daviduartedev/yousef-qrcode`, operated through `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage labels without aliases. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` and `docs/adr/`, read when present. See `docs/agents/domain.md`.
