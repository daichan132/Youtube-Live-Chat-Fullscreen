---
name: git-ops
description: Safe git workflow for Codex. Use when asked to stage/branch/revert/inspect changes, or mentions 差分/ブランチ or "git add/status/diff/switch/revert". For commit quality use git-smart-commit.
metadata:
  short-description: Safe git operations workflow
---

# Goal
- Perform safe, minimal git operations (inspect, stage, branch, revert) without destructive history rewrites.

# Inputs (ask only if missing)
- The exact action requested (inspect / stage / branch / revert / undo local changes).
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
3. If branching is requested
   - Create: `git switch -c <branch>`
   - Switch: `git switch <branch>`
4. If revert is requested (safe undo for shared history)
   - Prefer `git revert <sha>` over reset.
5. Finish by confirming state
   - `git status -sb`

# Safety checks
- If there are unrelated changes, do not touch them; mention them and continue only with requested files.
- If unexpected changes appear (not explained by the task), stop and ask how to proceed.
- Never delete files or reset history unless the user explicitly asks.

# Output format
- What was inspected (paths / branch).
- What was staged (paths).
- Any remaining dirty files (unstaged/untracked/staged).

# Trigger examples
- "git add して"
- "差分を確認して"
- "ブランチを切って"
- "このコミットを取り消したい"
