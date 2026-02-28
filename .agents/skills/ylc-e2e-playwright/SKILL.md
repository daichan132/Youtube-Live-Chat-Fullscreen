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

1. **並列実行禁止** — `--workers=1` で実行する。YouTube のフルスクリーン状態が共有されるため
2. **ランダム sleep 禁止** — `waitForTimeout()` で flaky を隠さない。`expect.poll()` / `waitForFunction()` を使う
3. **skip で実装不具合を隠さない** — 環境の問題 → skip、拡張のバグ → fail。詳細は `references/mode-contracts.md` の Skip vs Fail tree
4. **POM を使う** — `YouTubeWatchPage` / `ExtensionOverlay` を経由する。spec 内で直接 DOM 操作しない
5. **addInitScript ヘルパーを使う** — `window.__ylcHelpers` の既存メソッドを活用する。evaluate 内で DOM ヘルパーを再実装しない
