---
name: git-ops
description: Safe git workflow for Codex. Use when asked to stage/commit/branch/revert/inspect changes, or mentions コミット/差分/ブランチ or "git add/commit/status/diff/switch/revert".
metadata:
  short-description: Safe git operations workflow
---

# Goal
- Perform safe, minimal git operations (inspect, stage, commit, branch, revert) without destructive history rewrites.

# Inputs (ask only if missing)
- The exact action requested (inspect / stage / commit / branch / revert / undo local changes).
- Commit message (if a commit is requested).
- Target paths (if the request is broad).
- If the user asks to "undo": whether to undo *staged*, *unstaged*, or a *committed* change.

# Non-goals
- Do not rewrite history or use destructive commands unless explicitly requested:
  - No `git reset --hard`, no force push, no implicit amend/rebase.
- Do not discard local changes (`git restore <path>`) unless the user explicitly asks to discard *those exact files*.

# Steps
1. Inspect current state
   - `git status -sb`
   - If needed: `git diff` and `git diff --staged`
2. If staging is requested
   - Stage only requested paths.
   - Prefer smallest possible scope:
     - Use `git add -p <path>` when partial staging is safer.
3. If commit is requested
   - Ensure staged content is what we intend: `git diff --staged`
   - Commit with the provided message: `git commit -m "<message>"`
   - (No amend unless explicitly asked.)
4. If branching is requested
   - Create: `git switch -c <branch>`
   - Switch: `git switch <branch>`
5. If revert is requested (safe undo for shared history)
   - Prefer `git revert <sha>` over reset.
6. Finish by confirming state
   - `git status -sb`

# Safety checks
- If there are unrelated changes, do not touch them; mention them and continue only with requested files.
- If unexpected changes appear (not explained by the task), stop and ask how to proceed.
- Never delete files or reset history unless the user explicitly asks.

# Output format
- What was inspected (paths / branch).
- What was staged (paths) and/or committed (hash + message).
- Any remaining dirty files (unstaged/untracked/staged).

# Trigger examples
- "コミットして"
- "git add して"
- "差分を確認して"
- "ブランチを切って"
- "このコミットを取り消したい"
