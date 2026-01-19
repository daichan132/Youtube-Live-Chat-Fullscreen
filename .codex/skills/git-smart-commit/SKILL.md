---
name: git-smart-commit
description: Create one or more well-scoped commits with good messages. Use when asked to commit/save changes with good granularity, Conventional Commits, or "良い粒度でコミット".
metadata:
  short-description: Create commits with good granularity and messages
---

# Goal
- Turn current changes into clean commit(s) with clear messages and minimal scope.

# Inputs (ask only if missing)
- Commit intent/topic (one sentence).
- Whether to split into multiple commits (if unclear).
- Required checks (if the user is specific).

# Non-goals / Guardrails
- Do not rewrite history (no amend/rebase/force-push) unless explicitly requested.
- Do not touch unrelated files.
- Do not discard local changes unless explicitly requested.

# Steps
1) Inspect state
- `git status --porcelain`
- `git diff --stat`
- If no changes: report and stop.

2) Ensure a feature branch
- `git branch --show-current`
- If on default branch, create: `git switch -c codex/<topic>-<YYYYMMDD>`.

3) Decide commit granularity (default: 1)
- Split only when there is a clear separation (refactor/feature/tests/docs).
- Explain the split briefly before staging.

4) Stage and commit
- Stage only relevant paths (use `git add -p` if partial staging is needed).
- Compose Conventional Commit message: `type(scope): summary`.
- Commit with `git commit -m "<subject>" -m "<optional body>"`.

5) Verify and report
- `git log -1 --oneline`
- `git status --porcelain`
- If checks are required by the repo, run the smallest relevant set:
  - Prefer `yarn lint` for quick validation.
  - If behavior changed, add `yarn build` (and `yarn build:firefox` if relevant).

# Output format
- Commit(s) created: hash + subject.
- Files included per commit (short list).
- Checks run (or explicitly skipped).
- Remaining dirty files, if any.

# Edge cases
- Untracked files: confirm whether to include.
- Mixed concerns in one file: use partial staging if requested.

# Trigger examples
- "良い粒度でコミットして"
- "Conventional Commits でコミット作って"
- "この変更をコミットして"
