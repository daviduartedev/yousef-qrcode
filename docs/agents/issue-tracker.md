# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `daviduartedev/yousef-qrcode`. Use `gh` from this clone; verify the target with `gh repo view --json nameWithOwner` before the first creation in a session. Never file project work in an upstream skills repository.

## Conventions

- Create: `gh issue create --repo daviduartedev/yousef-qrcode --title "..." --body-file <file>`. Use a temporary UTF-8 file containing actual newlines for multiline bodies.
- Read body and comments: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels` with appropriate label and state filters.
- Sub-issues: use the native sub-issue operation supported by `gh`; otherwise `gh api --method POST repos/daviduartedev/yousef-qrcode/issues/<parent>/sub_issues -F sub_issue_id=<child-database-id>`. If unavailable, put `Part of #<parent>` in the child body.
- Blocking: use native dependencies. Where needed, `gh api --method POST repos/daviduartedev/yousef-qrcode/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-database-id>`. Get the database ID with `gh api repos/daviduartedev/yousef-qrcode/issues/<number> --jq .id`; it is not the issue number or node ID. If unavailable, record `Blocked by: #<number>` in the child body.
- Count open blockers: `gh api repos/daviduartedev/yousef-qrcode/issues/<number> --jq .issue_dependencies_summary.blocked_by`.
- Labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."` using `docs/agents/triage-labels.md`.
- Comments: use `gh issue comment <number> --body-file <file>`.
- Closing: post the explanation separately, then `gh issue close <number>`, only after its work is validated. Never close or rewrite a parent specification as part of publishing tickets.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill operations

“Publish to the issue tracker” means create a GitHub issue. “Fetch the relevant ticket” means read its full body and comments. Specs and tickets receive `ready-for-agent` after the applicable user confirmations. Creating issues does not authorize commits, pushes, PRs, deployment or merging; the lot workflow in AGENTS.md still applies.
