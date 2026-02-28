# E2E Architecture Reference

ソースファイル: `e2e/fixtures.ts`, `e2e/pages/`, `e2e/support/`, `e2e/utils/`

---

## 1. Fixture 階層

### Worker-scoped（全テストで共有）

| Fixture | 役割 | 備考 |
|---------|------|------|
| `urlLookupContext` | URL 探索専用の別ブラウザコンテキスト | テストコンテキストの状態を汚さない |
| `sharedContext` | テスト共有ブラウザコンテキスト | `launchPersistentContext` + `headless: false` + `--load-extension` |
| `sharedExtension` | Extension 情報（ID, worker, storage） | SW URL → Extension ID。SW 不在時は `chrome://extensions` からフォールバック |
| `sharedPage` | 共有ページ（close しない） | Chrome フルスクリーンバグ回避: close すると全ページでフルスクリーン不可 |
| `liveUrl` | live 動画 URL（chat 付き） | `urlLookupContext` で `findLiveUrlWithChat` 実行 |
| `archiveReplayUrl` | archive replay URL | `urlLookupContext` で `selectArchiveReplayUrl` 実行 |

### Test-scoped（各テストで初期化）

| Fixture | 役割 | 備考 |
|---------|------|------|
| `context` | `sharedContext` のエイリアス | テストが `context.newPage()` を呼べるように |
| `extension` | `sharedExtension` のエイリアス | storage accessor 付き |
| `page` | `sharedPage` + クリーンアップ | テスト前に: storage.clear → exitFullscreen → about:blank → bringToFront |

### Extension 型

```typescript
type Extension = {
  id: string
  worker: Worker | null
  url: (path: string) => string  // chrome-extension://<id>/<path>
  storage: {
    get(keys?: string | string[] | null): Promise<Record<string, unknown>>
    set(items: Record<string, unknown>): Promise<void>
    clear(): Promise<void>
  }
}
```

Storage accessor は SW が利用可能なら Worker ベース（高速）、不在なら一時 popup ページ経由（`about:blank` に遷移して rehydration を防ぐ）。

---

## 2. Page Object Model

### YouTubeWatchPage (`e2e/pages/YouTubeWatchPage.ts`)

YouTube 視聴ページの操作を抽象化。

| メソッド | 動作 |
|---------|------|
| `goto(url, options?)` | ページ遷移 + consent 処理 + `#movie_player` 待機 |
| `enterFullscreen(options?)` | player hover → fullscreen ボタン click → `document.fullscreenElement` 待機 |
| `exitFullscreen(options?)` | fullscreen ボタン click → fullscreen 解除待機。成否を boolean で返す |
| `ensureFullscreen(options?)` | 冪等なフルスクリーン進入。既にフルスクリーンなら何もしない |
| `isInFullscreen()` | `document.fullscreenElement !== null` を評価 |
| `waitForNativeChat(options?)` | `ytd-live-chat-frame` の出現を待機。成否を boolean で返す |

### ExtensionOverlay (`e2e/pages/ExtensionOverlay.ts`)

フルスクリーンチャットオーバーレイの操作を抽象化。

| メソッド | 動作 |
|---------|------|
| `switchButton()` | switch ボタンの Locator を返す |
| `waitForSwitchReady(options?)` | player hover → switch の visible 待機 |
| `toggleOn()` | `aria-pressed !== "true"` なら `reliableClick` → `aria-pressed="true"` 待機 |
| `toggleOff()` | `aria-pressed !== "false"` なら `reliableClick` → `aria-pressed="false"` 待機 |
| `ensureSwitchOff()` | 冪等な toggle off |
| `waitForChatLoaded(options?)` | 拡張 iframe の href が非 blank になるまで `expect.poll` |
| `waitForArchiveChatPlayable(options?)` | archive iframe が borrowed + playable になるまで `expect.poll`（60s） |
| `waitForChatDetached(options?)` | 拡張 iframe が DOM から消えるまで `expect.poll` |

---

## 3. addInitScript ヘルパー (`window.__ylcHelpers`)

`context.addInitScript(PAGE_HELPERS_INIT_SCRIPT)` で全ページに注入。`page.evaluate()` / `page.waitForFunction()` から参照可能。

| メソッド | 戻り値 | 用途 |
|---------|--------|------|
| `getNativeIframe()` | `HTMLIFrameElement \| null` | `#chatframe` or `ytd-live-chat-frame iframe` |
| `getExtensionIframe()` | `HTMLIFrameElement \| null` | Shadow DOM 内 `iframe[data-ylc-chat="true"]` |
| `readIframeHref(iframe)` | `string` | CORS 安全に href 取得（contentDocument → src フォールバック） |
| `isDocUnavailable(doc)` | `boolean` | unavailable renderer or テキストマーカー検出 |
| `isDocPlayable(doc)` | `boolean` | `yt-live-chat-renderer` + `yt-live-chat-item-list-renderer` 存在 |
| `hasUnavailableText(text)` | `boolean` | "live chat replay is not available" 等のマーカー |
| `isLiveNow()` | `boolean` | `is-live-now` 属性 / `getVideoData()` / `ytInitialPlayerResponse` の 3 ソース |
| `isNativeChatUsable()` | `boolean` | サイドバー可視・ポインタ有効・最小サイズチェック |
| `resolveClickable(target)` | `HTMLElement \| null` | `button` / `yt-icon-button` / `[role="button"]` 解決 |
| `isElementVisible(element)` | `boolean` | hidden 属性 / display / visibility / clientRects チェック |
| `getButtonLabelText(element)` | `string` | aria-label + title + data-* を結合 |

`unavailableMarkers`: `['live chat replay is not available', 'chat is disabled', 'live chat is disabled']`

---

## 4. 診断システム (`e2e/support/diagnostics.ts`)

### captureChatState

```typescript
captureChatState(page, testInfo, reason) → DiagnosticState | null
```

テスト結果の attachments に `chat-diagnostics-{reason}` として JSON 保存。

**DiagnosticState 構造:**

```typescript
{
  reason: string
  url: string
  mode: 'live' | 'archive' | 'unknown'
  fullscreen: boolean
  switchPressed: string | null
  native: { hasFrame, href, unavailable, playable }
  extension: { hasFrame, href, owned, unavailable, playable }
}
```

- `mode`: iframe の href から推定（`/live_chat_replay` → archive、`/live_chat` → live）
- `extension.owned`: `data-ylc-owned="true"` → live 用に新規作成。`false` → archive borrow

### shouldSkipArchiveFlowFailure

```typescript
shouldSkipArchiveFlowFailure(state) → boolean
```

環境問題かどうかを判定: native frame 不在 / unavailable / blank href → `true`（skip 推奨）。

### その他の診断関数

| 関数 | 用途 |
|------|------|
| `openArchiveWatchPage(page, url, options)` | archive 動画を開く。deadline ベースでタイムアウト管理 |
| `ensureArchiveNativeChatPlayable(page, options)` | サイドバー/プレーヤー内ボタンで native chat パネルを開く。リトライループ |
| `ensureNativeReplayUnavailable(page, options)` | replay が unavailable であることを確認 |
| `isExtensionChatLoaded()` | 拡張 iframe の href が非 blank |
| `isExtensionArchiveChatPlayable()` | 拡張 iframe が borrowed (`data-ylc-owned !== "true"`) + playable |
| `hasPlayableChat()` | native iframe が playable（live/archive 両方） |
| `isNativeLiveChatPlayable()` | native iframe が `/live_chat` href + playable |
| `timeoutFromRemaining(remainingMs, maxMs)` | deadline ベースのタイムアウト計算（最低 1000ms） |

---

## 5. URL 探索

### findLiveUrlWithChat (`e2e/utils/liveUrl.ts`)

Live 動画を自動検出する 3 層フォールバック:

1. **キャッシュ** — 前回検出した URL がまだ playable なら再利用
2. **環境変数** — `YLC_LIVE_URL` が設定されていれば検証して使用
3. **検索** — VTuber 検索 → 最大 18 候補を巡回。各候補で `isLiveNow()` + `hasPlayableChat()` を確認

各候補の検証: goto → consent 処理 → `#movie_player` 待機 → `isLiveNow()` → `hasPlayableChat()` polling。

### selectArchiveReplayUrl (`e2e/support/urls/archiveReplay.ts`)

Archive replay URL の選択・検証:

1. `testTargets.ts` からデフォルト URL 取得
2. `openArchiveWatchPage` でページ読み込み + player / frame 待機
3. `ensureArchiveNativeChatPlayable` で native chat パネルを開いて playable 確認

### selectArchiveReplayTransitionPair

Video transition テスト用に 2 つの異なる動画 URL ペアを検証。同一 playlist 内の別動画。

### selectReplayUnavailableUrl

Replay unavailable URL の検証。`ensureNativeReplayUnavailable` で unavailable 状態を確認。

---

## 6. ユーティリティ

### reliableClick (`e2e/utils/actions.ts`)

YouTube の player controls はオーバーレイ要素でクリックがブロックされることがある。Playwright click (`force: true`) + JS 直接 click の二重パターン。

### storageHelper (`e2e/utils/storageHelper.ts`)

`patchOverlayStore(extension, overrides)`: Zustand persist 形式（`{ state: {...}, version: N }`）の `ytdLiveChatStore` を read-modify-write。書き込み後に verify。

### popupHelpers (`e2e/utils/popupHelpers.ts`)

- `importSettingsViaPopup(page, extension, settings)`: popup.html でファイルインポートをシミュレート
- `readStorageEntry(source, key)`: Extension or Page から Zustand persist エントリを読む

### nativeChat (`e2e/utils/nativeChat.ts`)

`closeNativeChat(page)`: サイドバーの hide/close ボタンを探してクリック。

### selectors (`e2e/utils/selectors.ts`)

| 定数 | 値 |
|------|-----|
| `switchButtonSelector` | `#ytd-live-chat-switch-button button.ytp-button` |
| `MOVIE_PLAYER` | `#movie_player` |
| `FULLSCREEN_BUTTON` | `button.ytp-fullscreen-button` |
| `SHADOW_HOST` | `#shadow-root-live-chat` |
| `NATIVE_CHAT_FRAME` | `ytd-live-chat-frame` |

### constants (`e2e/support/constants.ts`)

**TIMING**（`waitForTimeout` 用）: `SEEK_STABILIZE_MS` (2000), `OVERLAY_HOVER_ANIMATION_MS` (300), `NATIVE_CHAT_SETTLE_MS` (1500), `ARCHIVE_CHAT_OPEN_INTERVAL_MS` (800) 等。

**TIMEOUT**（assertion / wait 用）: `SWITCH_VISIBLE` (10s), `EXTENSION_CHAT` (20s), `ARCHIVE_CHAT` (60s), `FULLSCREEN` (8s), `PAGE_GOTO` (45s) 等。
