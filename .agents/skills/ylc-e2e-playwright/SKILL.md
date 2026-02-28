---
name: ylc-e2e-playwright
description: この拡張の Playwright E2E 運用ガイド。E2E テスト実行・新テスト追加・失敗/フレーク調査・URL ドリフト修正・trace/PWDEBUG デバッグで使う。フルスクリーンチャット・チャットなし動画・リプレイ不可・アーカイブ遷移・SPA 遷移の E2E テストを扱う。
---

# E2E Playwright — YLC プロジェクト固有ガイド

Chrome 拡張の Playwright 汎用パターン（拡張ロード、SW 起動、evaluate スコープ、chrome.storage、Shadow DOM、iframe）は **chrome-extension-e2e-playwright** スキルを参照。本スキルはこのプロジェクト固有のインフラ・契約・ワークフローに特化する。

## Reference table

| トピック | 参照先 |
|---------|--------|
| Fixture 階層・POM・addInitScript・診断・URL 探索 | `references/architecture.md` |
| 4 モード契約・precondition パターン・skip/fail 判定 | `references/mode-contracts.md` |
| 拡張ロード・SW 起動・evaluate・storage・iframe 汎用 | `chrome-extension-e2e-playwright` スキル |

## Directory map

```
e2e/
├── config/testTargets.ts       # URL 環境変数 + デフォルト値
├── fixtures.ts                 # worker-scoped / test-scoped fixtures
├── global-setup.ts             # ビルド出力存在確認
├── pages/                      # Page Object Model
│   ├── YouTubeWatchPage.ts     #   goto, enterFullscreen, waitForNativeChat
│   └── ExtensionOverlay.ts     #   switchButton, toggleOn/Off, waitForChat*
├── scenarios/                  # spec ファイル
│   ├── live/                   #   @live タグ (10 specs)
│   ├── archive/                #   @archive タグ (5 specs)
│   └── popup/                  #   @popup タグ (1 spec)
├── support/
│   ├── constants.ts            #   TIMING / TIMEOUT 定数
│   ├── diagnostics.ts          #   captureChatState, shouldSkipArchiveFlowFailure
│   ├── pageHelpers.ts          #   window.__ylcHelpers (addInitScript)
│   └── urls/archiveReplay.ts   #   selectArchiveReplayUrl, selectReplayUnavailableUrl
└── utils/
    ├── actions.ts              #   reliableClick
    ├── liveUrl.ts              #   findLiveUrlWithChat
    ├── nativeChat.ts           #   closeNativeChat
    ├── popupHelpers.ts         #   importSettingsViaPopup, readStorageEntry
    ├── selectors.ts            #   switchButtonSelector, SHADOW_HOST, etc.
    └── storageHelper.ts        #   patchOverlayStore (Zustand persist 形式)
```

## Input

URL は環境変数で上書き可能。デフォルト値は `e2e/config/testTargets.ts` に定義:

| 環境変数 | 用途 | デフォルト |
|---------|------|----------|
| `YLC_LIVE_URL` | 優先 live URL | なし（動的探索） |
| `YLC_ARCHIVE_URL` | archive replay URL | ハードコード（playlist 動画） |
| `YLC_ARCHIVE_NEXT_URL` | transition 先 URL | ハードコード（同 playlist 別動画） |
| `YLC_REPLAY_UNAVAILABLE_URL` | replay 不可 URL | ハードコード |
| `YLC_NOCHAT_URL` | チャットなし URL | ハードコード |

Live URL は `findLiveUrlWithChat` で VTuber 検索 → 最大 18 候補を巡回して自動検出する。

## Guardrails

1. **並列実行禁止** — 同一マシンで Playwright を並列実行しない（`--workers=1`）
2. **ランダム sleep 禁止** — `waitForTimeout()` で flaky を隠さない。`expect.poll()` / `waitForFunction()` を使う
3. **skip で実装不具合を隠さない** — 環境の問題 → skip、拡張のバグ → fail
4. **POM を使う** — `YouTubeWatchPage` / `ExtensionOverlay` を経由する。spec 内で直接 DOM 操作しない
5. **addInitScript ヘルパーを使う** — `window.__ylcHelpers` の既存メソッドを活用する。evaluate 内で DOM ヘルパーを再実装しない

## Workflow: E2E 実行

1. **ビルド確認**
   ```bash
   yarn build
   ```
2. **対象 spec を単体実行**
   ```bash
   yarn playwright test e2e/scenarios/live/fullscreenChatAutoOpen.spec.ts --workers=1
   ```
3. **project 選択**（通常は `e2e`、スクリーンショットテストは `screenshots`）
   ```bash
   yarn playwright test --project=e2e --workers=1
   ```
4. **デバッグモード**
   ```bash
   PWDEBUG=1 yarn playwright test e2e/<spec>.spec.ts --workers=1
   ```
5. **再検証**
   ```bash
   yarn playwright test e2e/<spec>.spec.ts --workers=1 --repeat-each=2
   ```
6. **全テスト**
   ```bash
   yarn e2e
   ```

## Workflow: 新テスト追加

1. **モード選択** — live / archive / no-chat / replay-unavailable のどれか。`references/mode-contracts.md` で契約を確認
2. **spec 作成** — `e2e/scenarios/{mode}/` に配置。適切なタグ (`@live`, `@archive`) を付ける
3. **fixture 活用** — `liveUrl` / `archiveReplayUrl` fixture を使う（URL 探索は fixture が担当）
4. **POM 使用** — `YouTubeWatchPage` で goto / fullscreen、`ExtensionOverlay` で switch / chat 操作
5. **Precondition** — URL 取得失敗やネイティブチャット不成立は `test.skip()` で早期離脱。`captureChatState()` で診断を添付
6. **Assertion** — `expect.poll()` で状態変化を待つ。`data-ylc-owned` / `data-ylc-chat` で iframe 状態を検証
7. **診断添付** — 失敗パスでは `captureChatState(page, test.info(), 'reason')` を呼ぶ
8. **Timeout 設定** — `test.setTimeout()` で十分な余裕を持たせる（live: 160s、archive: 150s 目安）

## Workflow: 失敗デバッグ

1. **単体実行** — 対象 spec だけを `--workers=1` で実行し再現確認
2. **HTML レポート確認**
   ```bash
   yarn playwright show-report
   ```
3. **診断 JSON 確認** — テスト結果の attachments に `chat-diagnostics-*` JSON がある。native/extension iframe の状態を確認
4. **`captureChatState` 活用** — DiagnosticState の `native.playable` / `extension.owned` / `mode` を確認
5. **`shouldSkipArchiveFlowFailure` 判定** — archive 系テストで native frame 不在 / unavailable / blank href なら環境問題（skip 相当）
6. **skip/fail 判断**
   - URL ドリフト（動画削除・非公開化）→ skip + URL 更新
   - YouTube DOM 変更 → selectors / pageHelpers 更新
   - 拡張のバグ → fail のまま修正

## Workflow: URL 更新

1. **`e2e/config/testTargets.ts`** のデフォルト URL を更新
2. **要件確認**
   - archive: playlist 内の動画で `live_chat_replay` が playable
   - replay-unavailable: `yt-live-chat-unavailable-message-renderer` が表示される動画
   - no-chat: ライブチャットフレームが存在しない通常動画
3. **検証**
   ```bash
   yarn playwright test e2e/scenarios/ --workers=1 --repeat-each=2
   ```
4. **CI 確認** — `yarn e2e` で全 spec pass を確認
