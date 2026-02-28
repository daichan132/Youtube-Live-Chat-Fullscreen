# Mode Contracts Reference

ソースファイル: `e2e/scenarios/` 各 spec ファイル, `e2e/support/diagnostics.ts`

---

## 1. 4 モード概要

| モード | Native iframe | Switch | 拡張 iframe | `data-ylc-owned` |
|--------|--------------|--------|------------|-----------------|
| **live** | `live_chat?v=<id>` (playable) | 表示 (auto-open) | 新規作成 | `"true"` |
| **archive** | `live_chat_replay` (playable) | 表示 (手動 toggle) | borrow | `!= "true"` |
| **no-chat** | なし or 無関係 | **非表示** | **なし** | — |
| **replay-unavailable** | unavailable renderer | **非表示** | **なし** | — |

---

## 2. Live 契約

**ソース**: `e2e/scenarios/live/` (10 specs)

### 原則
- 公開 `live_chat?v=<videoId>` iframe を**新規作成**する。native iframe を borrow しない
- `data-ylc-owned="true"` で所有を明示
- フルスクリーン進入時に **auto-open**（switch が `aria-pressed="true"` に自動遷移）

### Fixture
- `liveUrl` fixture が `findLiveUrlWithChat` で live 動画を自動検出
- `liveUrl` が `null` → `test.skip('No live URL with chat found.')`

### 典型パターン（fullscreenChatAutoOpen.spec.ts）
```
1. liveUrl null チェック → skip
2. yt.goto(liveUrl)
3. waitForNativeChat + isNativeLiveChatPlayable → 不成立なら skip
4. yt.enterFullscreen()
5. overlay.waitForSwitchReady() → 不成立なら skip
6. expect(switchButton).toHaveAttribute('aria-pressed', 'true')
7. overlay.waitForChatLoaded() → 不成立なら captureChatState + 条件判定
```

### 検証ポイント
- switch の `aria-pressed` 状態
- 拡張 iframe の href が非 blank
- `isExtensionChatLoaded()` が `true`
- toggle off → `waitForChatDetached()` で iframe 消失確認

---

## 3. Archive 契約

**ソース**: `e2e/scenarios/archive/` (5 specs)

### 原則
- native `live_chat_replay` iframe を **borrow** する。動画遷移後に stale iframe を再利用しない
- `data-ylc-owned` が `"true"` でない（borrow の証跡）
- auto-open しない。ユーザーが手動で toggle on

### Fixture / URL 選択
- `archiveReplayUrl` fixture が `selectArchiveReplayUrl` で archive 動画を検証
- transition テストは `selectArchiveReplayTransitionPair` で 2 URL ペアを取得
- replay-unavailable テストは `selectReplayUnavailableUrl` を直接呼ぶ

### 典型パターン（liveChatReplay.spec.ts）
```
1. archiveReplayUrl null チェック → skip
2. openArchiveWatchPage(page, archiveReplayUrl) → 不成立なら skip
3. yt.enterFullscreen()
4. overlay.waitForSwitchReady() → 不成立なら skip
5. overlay.toggleOn()
6. overlay.waitForArchiveChatPlayable() → 不成立なら shouldSkipArchiveFlowFailure 判定
7. isExtensionArchiveIframeBorrowed() → data-ylc-owned !== "true" を確認
```

### Video transition 契約（fullscreenChatVideoTransition.spec.ts）
- SPA 遷移後に stale iframe を検出: `beforeTransition.href !== afterState.href`
- 遷移方法: next ボタン → playlist リンク → location.href の 3 層フォールバック
- 安定性確認: 4 秒間 × 250ms 間隔で stale iframe が復活しないことを検証

---

## 4. No-chat 契約

**ソース**: `e2e/scenarios/live/noChatVideo.spec.ts`

### 原則
- switch ボタンを**表示しない**
- 拡張 iframe を**出さない**
- overlay を読み込まない

### 典型パターン
```
1. getE2ETestTargets().noChat.url を使用
2. yt.goto(noChatUrl) → yt.enterFullscreen()
3. expect.poll(switchButton.count()).toBe(0)
4. → count > 0 なら hasPlayableChat() で precondition 崩壊を判定 → skip
5. expect.poll(hasPlayableChat).toBe(false)
6. expect.poll(isExtensionChatLoaded).toBe(false)
```

---

## 5. Replay-unavailable 契約

**ソース**: `e2e/scenarios/archive/liveChatReplayUnavailable.spec.ts`

### 原則
- switch ボタンを**表示しない**
- Shadow host (`#shadow-root-live-chat`) を**表示しない**

### 典型パターン
```
1. selectReplayUnavailableUrl(page) → null なら skip
2. yt.enterFullscreen()
3. expect.poll(switchButton.count()).toBe(0)
4. expect(page.waitForSelector(SHADOW_HOST)).toBe(false)  // 7 秒以内に出現しないことを確認
```

### 検証方法
`ensureNativeReplayUnavailable` は以下を確認:
- `yt-live-chat-unavailable-message-renderer` が存在する
- または unavailable テキストマーカーが body に含まれる
- またはフレームが存在せず、chat open コントロールもない

---

## 6. Precondition handling パターン

全 spec で共通する構造:

```
URL 検証 → 環境 skip → setup → action → skip/fail 判定 → assert
```

### 詳細フロー

1. **URL 検証**: fixture (`liveUrl`, `archiveReplayUrl`) または helper (`selectReplayUnavailableUrl`) が URL を返す
2. **環境 skip**: URL が `null` → `test.skip(true, 'reason')`。`captureChatState` で診断添付
3. **Setup**: `yt.goto()` → `waitForNativeChat()` / `openArchiveWatchPage()`
4. **Setup skip**: native chat が playable でない → `test.skip()`
5. **Action**: `yt.enterFullscreen()` → `overlay.waitForSwitchReady()` → `overlay.toggleOn()`
6. **Action skip**: switch 未出現 → `test.skip()`
7. **Skip/fail 判定**: `shouldSkipArchiveFlowFailure(state)` で環境問題かを判定
8. **Assert**: `expect()` / `expect.poll()` で最終検証

### captureChatState の reason 命名規則

| Reason | 意味 |
|--------|------|
| `*-precondition-missing` | URL は有効だが native chat が不成立 |
| `*-switch-missing` | フルスクリーン後に switch が出現しない |
| `*-extension-unready` | switch on 後に拡張チャットが ready にならない |
| `*-url-selection-failed` | URL 選択自体が失敗 |
| `*-fullscreen-failed` | フルスクリーン進入が失敗 |

---

## 7. Skip vs Fail decision tree

```
テスト失敗
├── URL が null / 取得失敗
│   └── SKIP: "No {mode} URL found"
│       → URL ドリフト。testTargets.ts を更新
│
├── ページロード / native chat 不成立
│   └── SKIP: "precondition not met"
│       → YouTube 側の変更 or 一時障害
│
├── Switch 未出現
│   ├── native chat が playable でない
│   │   └── SKIP: 環境問題
│   └── native chat は playable だが switch が出ない
│       └── FAIL: 拡張のバグ（switch 表示ロジック）
│
├── 拡張チャット未ロード (extension unready)
│   ├── shouldSkipArchiveFlowFailure → true
│   │   └── SKIP: native frame 問題
│   ├── native.playable === false
│   │   └── SKIP: ソース不成立
│   └── native.playable === true + extension 問題
│       └── FAIL: 拡張のバグ（iframe ソース解決）
│
└── Assert 失敗
    └── FAIL: 拡張の振る舞いが契約に違反
```

### 具体例

| シナリオ | 判定 | 理由 |
|---------|------|------|
| live 検索で playable な live 動画が 0 件 | skip | YouTube の live 動画供給が一時的に不足 |
| archive URL の動画が削除されていた | skip | URL ドリフト → testTargets.ts 更新 |
| native chat は playable だが拡張 iframe が blank | **fail** | iframe ソース解決のバグ |
| フルスクリーンで switch が `aria-pressed="true"` にならない | **fail** | auto-open ロジックのバグ |
| archive toggle on 後に `data-ylc-owned === "true"` | **fail** | borrow ではなく新規作成している |
| video transition 後に stale iframe が残る | **fail** | SPA 遷移時の cleanup バグ |
| no-chat 動画で switch が表示される | skip or **fail** | URL が実は chat ありなら skip。正しい URL なら fail |
