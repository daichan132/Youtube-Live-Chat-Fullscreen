---
name: quality-gates
description: Run repo quality gates. Use when asked to run tests/lint/build/CI checks, or mentions "lint/typecheck/build/e2e/Playwright/CI" or "動作確認/テストして".
metadata:
  short-description: Run lint/build/e2e safely
---

# Goal
- Run the right quality gates (lint/build/e2e) for the current change and summarize results.

# Inputs (ask only if missing)
- Target browser build: Chrome only, Firefox only, or both.
- Whether E2E is required (UI/behavior change usually => yes).

# Steps
1. Inspect what changed
   - `git status -sb`
   - If needed: `git diff --name-only`
2. Always run lint/typecheck for code changes
   - `yarn lint`
3. Build
   - Chrome: `yarn build`
   - Firefox (if requested / relevant / uncertain): `yarn build:firefox`
4. Format only when needed (formatting churnを最小化)
   - `yarn format`（基本 `entrypoints/**` と `shared/**`）
5. E2E when behavior/UI or e2e specs changed
   - `yarn build` → `yarn e2e`
6. Summarize pass/fail and next actions

# Edge cases
- If E2E fails/flaky, switch to the `e2e-playwright` skill to debug (trace/screenshots/etc).
- If builds differ between Chrome/Firefox, call it out explicitly and propose a compatibility fix.

# Output format
- Commands executed
- Result summary (pass/fail + key error excerpt)
- What to do next (exact command or file to inspect)
