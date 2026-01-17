---
name: e2e-playwright
description: Playwright E2E workflow for this extension. Use when E2E fails or is flaky, or mentions Playwright/e2e/fixtures/spec/trace/PWDEBUG.
metadata:
  short-description: Debug Playwright E2E tests
---

# Goal
- Reproduce, debug, and fix Playwright E2E failures with minimal flakiness.

# Inputs (ask only if missing)
- Which spec to focus on (file name / test title / failing step).
- Target build (Chrome/Firefox) if relevant.

# Steps
1. Ensure build artifact exists (E2E前提)
   - `yarn build`
2. Run E2E
   - `yarn e2e`
3. If tests depend on a live stream URL
   - Prefer search results (e.g. `https://www.youtube.com/results?search_query=vtuber&sp=EgJAAQ%253D%253D`)
   - Pick a result with a "Live" badge; if it fails to open, fall back to the next one
   - Avoid hardcoding a single live URL (streams end and cause flaky tests)
3. If you need to focus on a single test/spec
   - Try passing Playwright args through yarn:
     - `yarn e2e -- <args>`（例: `yarn e2e -- e2e/foo.spec.ts`）
   - If pass-through is not supported, run Playwright directly (repoの慣習に合わせる)
4. Gather debugging artifacts (when failing)
   - Prefer Playwright trace/screenshots/video if enabled in config
   - Re-run once to confirm determinism (no infinite retries)
5. Fix strategy (flakinessを増やさない)
   - Avoid sleep/timeouts; wait on explicit UI/state:
     - `await expect(locator).toBeVisible()`
     - `await expect(locator).toHaveText(...)`
   - Use stable selectors (role/text/testid など、プロジェクトの既存パターンに合わせる)
   - Network依存はfixturesで置き換える（可能なら）
6. Validate
   - `yarn e2e` が連続で通ることを確認（最低2回が理想）

# Notes
- `e2e/fixtures.ts` の拡張 `test/expect` を使う前提。
- 非決定的挙動を増やす修正（ランダム待ち/過剰リトライ）は避ける。
- ネイティブチャットの表示/操作可否は「拡張ON/OFFの前後」で必ず確認する。

# Output format
- Repro steps（実行したコマンド）
- Live URL used（該当時）
- Root cause（推定でなく根拠ベース）
- Fix summary（どこをどう変えたか）
- Verification（通ったコマンド）
