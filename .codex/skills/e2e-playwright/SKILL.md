---
name: e2e-playwright
description: Playwright E2E workflow for this extension. Use when E2E fails/flaky, or mentions Playwright, fullscreen chat, live/replay URL, trace, PWDEBUG.
metadata:
  short-description: Debug Playwright E2E tests
---

# Goal
- Reproduce, debug, and fix Playwright E2E failures with minimal flakiness.

# Inputs (ask only if missing)
- Which spec to focus on (file name / test title / failing step).
- Target build (Chrome/Firefox) if relevant.
- Test URL overrides (`YLC_LIVE_URL`, `YLC_ARCHIVE_URL`) if the user already has known-good URLs.

# Non-goals / Guardrails
- Do not run multiple E2E commands in parallel on the same machine/session.
- Do not rely on search result "Live" badges alone (replay videos are mixed in).
- Do not "fix" flaky tests by adding random sleeps or broad timeout inflation.

# Steps
1. Ensure build artifact exists (E2E前提)
   - `yarn build`
   - If recent code edits are not reflected in E2E behavior, rebuild again explicitly before rerun (Playwright loads `.output/chrome-mv3`).
2. Run target tests sequentially
   - Prefer direct Playwright for focused runs and JSON stats:
     - `yarn playwright test e2e/<spec>.spec.ts --reporter=json > /tmp/<name>.json`
   - For repeat checks:
     - `yarn playwright test e2e/<spec>.spec.ts --repeat-each=2 --reporter=json > /tmp/<name>.json`
   - Note: `yarn e2e -- <args>` may not forward all Playwright flags consistently; if repeats/filters look ignored, switch to `yarn playwright test`.
3. Live/replay URL strategy (YouTube-specific)
   - Prefer explicit env override first:
     - `YLC_LIVE_URL='<url>' yarn playwright test ...`
     - `YLC_ARCHIVE_URL='<url>' yarn playwright test ...`
   - If auto-discovering live URLs, validate with page signals, not badge text:
     - Positive live-now signals:
       - `.ytp-time-display.ytp-live`
       - `.ytp-live-badge.ytp-live-badge-is-livehead`
       - `ytd-watch-flexy[live-chat-present]` or `[live-chat-present-and-expanded]`
       - Inline `ytInitialPlayerResponse` includes `"isLiveNow":true` or `"is_viewed_live":"True"`
     - Reject candidates where only generic `ytp-live-badge` exists (often replay).
4. Gather hard evidence when failing/skipping
   - Parse JSON report and extract:
     - `expected / skipped / unexpected`
     - skip reason text (e.g. `Extension iframe did not load within the timeout.`)
   - Capture DOM state at failure point:
     - switch visibility / `aria-pressed`
     - `#shadow-root-live-chat` iframe presence (`data-ylc-chat`, `data-ylc-owned`, `src`)
     - native chat state (`#chatframe`, `ytd-live-chat-frame`, `#show-hide-button`, close button availability)
     - `#chatframe` URL signals (`src`, `contentDocument.location.href`) and `about:blank` persistence
     - fullscreen player control chat toggles (`.ytp-right-controls` chat button list and `aria-pressed`)
5. Fix strategy (flakinessを増やさない)
   - Avoid sleep/timeouts; wait on explicit UI/state:
     - `await expect(locator).toBeVisible()`
     - `await expect(locator).toHaveText(...)`
   - Use stable selectors (role/text/testid など、プロジェクトの既存パターンに合わせる)
   - Keep source-policy assumptions explicit:
     - Live: direct `live_chat?v=<videoId>` route
     - Archive: native iframe borrow route
     - Archive borrow is valid only for `live_chat_replay` iframe
   - Archive の順序を崩さない:
     - `fullscreen -> native chat open -> replay playable -> extension attach`
   - `about:blank` は loaded 扱いしない（native playable まで待つ）
   - Live fullscreen overlay should latch after first success; avoid remount loops from unstable polling signals
6. Validate
   - Minimum:
     - `yarn lint`
     - `yarn build`
   - E2E:
     - target spec(s) with `--repeat-each=2`
     - run full `yarn e2e` only when needed

# Notes
- `e2e/fixtures.ts` の拡張 `test/expect` を使う前提。
- 非決定的挙動を増やす修正（ランダム待ち/過剰リトライ）は避ける。
- ネイティブチャットの表示/操作可否は「拡張ON/OFFの前後」で必ず確認する。
- 同一セッションでE2Eを並列起動すると `context setup timeout` が出ることがあるため直列実行を優先。
- Archive replay E2Eでは「メッセージ件数増加」を必須にすると外部要因で不安定になりやすい。まず `iframe loaded + playable` を主判定にする。

# Output format
- Repro steps（実行したコマンド）
- Live URL used（該当時）
- Live/Archive判定シグナル（何を根拠にURLを採用/除外したか）
- Root cause（推定でなく根拠ベース）
- Fix summary（どこをどう変えたか）
- Verification（通ったコマンド + expected/skipped/unexpected）
- Archive時は順序証跡（fullscreen後にnative openし、playable後にattachしたか）

# Edge cases
- `No live URL with chat found`: `YLC_LIVE_URL` を指定して再実行。
- `No archive video with chat replay found`: `YLC_ARCHIVE_URL` を指定して再実行。
- `Extension iframe did not load within the timeout`: switch表示可否・`aria-pressed`・overlay iframe属性を同時に採取して切り分け。
- Archive + fullscreenで `player chat button` が0件になるケースがある:
  - この場合、`.ytp-right-controls` 依存のみで開こうとしない
  - `#show-hide-button` と `#chatframe` の `about:blank` 継続を合わせて確認する
- `switchPressed: true` かつ `hasExtensionIframe: false` は「拡張表示ONでもsource未解決」のサイン:
  - 多くは native iframe が `about:blank` のまま
  - 判定系（is-open）で false positive を出して再試行が止まっていないか確認する
- live で extension iframe が繰り返し作り直される:
  - overlay gating が polling で true/false を往復していないか確認
  - `stopOnSuccess` 相当で一度成功したらラッチする
- native chat トグル押下時の仕様確認:
  - fullscreen chat を OFF にする
  - native chat はそのまま維持する（強制 close しない）
- fullscreen chat OFF 後に native chat が見えない:
  - detach 後の restore 先を確認
  - native open 状態判定が hidden でも true になっていないか確認

# Trigger examples
- "playwrightが不安定なので直して"
- "fullscreen chat の e2e を確認して"
- "live と archive の見分け込みでテストして"
- "PWDEBUG/trace で失敗原因を詰めて"
