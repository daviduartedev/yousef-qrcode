<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

- Each lot belongs to one feature branch created from the updated `main` of `daviduartedev/yousef-qrcode`.
- The lot workflow is specification → tickets → implementation → code review → dvd-tests → human validation → commit/push. Do not commit, push implementation, open a PR or merge until the human has completed the requested validation.
- The initial empty main commit contains no imported application history. Do not import the old repository's Git history or environment files.
- Treat `docs/lotes/01-nextjs-postgres/spec.md` and GitHub issues #1–#4 as the scope of this lot. Editor fixes and new reference modules belong to later lots.
- Database, auth and private environment access belong to modules marked `server-only`. Derive resource ownership from the server session.
- Never print secrets or place credentials in public environment variables, Git, issues, logs, screenshots or manual validation instructions. Only dummy configuration examples may be versioned.
- Run credential checks before staging/reviewing files; preserve the local Git hooks and the CI checks.
- Tests verify behavior through HTTP and Git/CLI boundaries, using disposable local data. Browser credentials require user authorization; do not create default login profiles.
