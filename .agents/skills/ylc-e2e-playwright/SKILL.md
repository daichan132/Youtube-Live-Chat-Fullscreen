---
name: ylc-e2e-playwright
description: この拡張の Playwright E2E 運用ガイド。E2E テスト実行・新テスト追加・失敗/フレーク調査・URL ドリフト修正・trace/PWDEBUG デバッグで使う。フルスクリーンチャット・チャットなし動画・リプレイ不可・アーカイブ遷移・SPA 遷移の E2E テストを扱う。
---

# E2E Playwright — YLC プロジェクト固有ガイド

Chrome 拡張の Playwright 汎用パターン（拡張ロード、SW 起動、evaluate スコープ、chrome.storage、Shadow DOM、iframe）は **chrome-extension-e2e-playwright** スキルを参照。本スキルはこのプロジェクト固有のインフラ・契約に特化する。

## Reference table

| トピック | 参照先 |
|---------|--------|
| Fixture の設計意図・URL 探索・非自明なパターン | `references/architecture.md` |
| 4 モード契約・skip/fail 判定基準 | `references/mode-contracts.md` |

## Guardrails

1. **CI は workers=1** — ローカルは `workers: 4` で高速化するが、CI は `workers: 1`。YouTube のフルスクリーン状態が Worker-scoped で共有されるため並列化すると干渉する
2. **ランダム sleep 禁止** — `waitForTimeout()` で flaky を隠さない。`expect.poll()` / `waitForFunction()` を使う
3. **skip で実装不具合を隠さない** — 環境の問題 → skip、拡張のバグ → fail。詳細は `references/mode-contracts.md` の Skip vs Fail tree
4. **POM を使う** — `YouTubeWatchPage` / `ExtensionOverlay` を経由する。spec 内で直接 DOM 操作しない
5. **addInitScript ヘルパーを使う** — `window.__ylcHelpers` の既存メソッドを活用する。evaluate 内で DOM ヘルパーを再実装しない
6. **`data-ylc-*` セレクタを使う** — Tailwind クラス名でなく `data-ylc-*` カスタム属性で要素を特定する。プロダクトコードに属性がなければ追加してから E2E を書く
7. **verify-then-fallback クリック** — `reliableClick(locator, verify)` を使う。常に二重クリックするとトグル UI が反転する
8. **consent handler が共通 fixture に登録済み** — `registerConsentHandler()` が `sharedPage`、`liveUrl`、`archiveReplayUrl` の各 fixture で自動登録される。YouTube の同意ダイアログは `addLocatorHandler` で自動処理される
9. **Storage は e2e.html bridge 経由** — `createStorageAccessor` の Page パスは `popup.html` ではなく `e2e.html`（React/Zustand なし）を使用。rehydration リスクなし、`about:blank` 遷移不要
