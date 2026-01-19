---
name: gh-open-pr
description: Create a GitHub pull request with gh. Use when asked to open/create a PR (pull request), "PR作って", "draft PR", or "gh pr create".
metadata:
  short-description: Open a draft PR using GitHub CLI
---

# Goal
- Create a draft PR for the current branch with a clear title/body and test notes.

# Inputs (ask only if missing)
- Target base branch (if not default).
- Issue reference (if any).
- Whether to make it draft (default: draft).

# Preconditions
- `gh` is installed and authenticated.
- Must be on a feature branch (not default).

# Non-goals / Guardrails
- Do not push or create PRs without user approval when approvals are required.
- Do not include secrets in PR body.

# Steps
1) Validate auth + repo
- `gh auth status`
- `gh repo view`
- If not authenticated: ask the user to run `gh auth login` and stop.

2) Determine base branch
- If user specifies, use it.
- Otherwise detect default:
  - `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3) Ensure branch is pushed
- If upstream missing: `git push -u origin HEAD`.

4) Compose PR title/body
- Title: use latest commit subject unless unclear.
- Body must include:
  - Summary (1–3 bullets)
  - Key changes (bullets)
  - How to test (exact commands)
  - Risks/notes (optional)
  - Issue links (e.g. "Fixes #123") if provided
- If a PR template exists, prefer it and fill required sections:
  - Check for `.github/PULL_REQUEST_TEMPLATE*` or `.github/pull_request_template*`.

5) Create PR (draft by default)
- `gh pr create --draft --base <base> --title "<title>" --body "<body>"`
- If using a template: add `--template <template>`.

# Output format
- PR URL (from gh output).
- Base branch and draft/non-draft status.
- Summary of what went into the PR body.

# Edge cases
- If the branch is ahead but not pushed, push first.
- If there are uncommitted changes, warn and confirm before PR creation.

# Trigger examples
- "PR作って"
- "draft PR を作成して"
- "gh pr create して"
