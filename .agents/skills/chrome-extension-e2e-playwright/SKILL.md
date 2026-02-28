---
name: chrome-extension-e2e-playwright
description: Playwright E2E testing guide for Chrome extensions. Covers extension loading, MV3 Service Worker startup, page.evaluate() serialization boundary, chrome.storage test access, Shadow DOM interaction, iframe throttling, fixture design, and failure diagnostics — practical knowledge not found in official docs. Use this skill whenever writing, debugging, or stabilizing Playwright E2E tests for Chrome extensions, even if the user doesn't explicitly mention "E2E" — any mention of Playwright + extension testing should trigger this skill.
---

# Chrome Extension E2E with Playwright

Playwright で Chrome 拡張をテストするための実戦ガイド。通常の Web アプリ E2E とは異なるポイントに絞る。

各セクションの詳細コードと関連ピットフォールは references を参照:

| やりたいこと | 参照先 |
|------------|--------|
| 拡張ロード・SW 起動・Extension ID 取得 | `references/getting-started.md` |
| page.evaluate・chrome.storage・Shadow DOM・iframe | `references/browser-apis.md` |
| Fixture 設計・URL 管理・診断・アンチパターン | `references/test-design.md` |

---

## 1. 拡張のロード

Chrome 拡張は `chromium.launchPersistentContext` + `headless: false` でしかロードできない。通常の `browser.newContext()` は使えない。CI では `xvfb-run` で仮想ディスプレイを提供する。global setup でビルド出力の存在確認をしておくとよい。

## 2. MV3 Service Worker の起動

MV3 の SW はイベント駆動で lazy 起動。テスト開始時には起動していない。`content_scripts.matches` に合う URL への warmup 遷移 + deadline polling で確実に起動を待つ。Extension ID は SW の URL から取得するが、SW が起動しない場合は `chrome://extensions` の Shadow DOM から scrape するフォールバックがある。

## 3. page.evaluate() のスコープ

`page.evaluate()` のコールバックはブラウザプロセスで実行される。Node.js スコープの変数・インポートは参照できず、**TypeScript はこのエラーを検出しない**。引数として明示的に渡すか、`context.addInitScript()` で共通ヘルパーを `window` に注入する。拡張 E2E は `page.evaluate()` を多用するため、addInitScript パターンはほぼ必須。

## 4. chrome.storage へのアクセス

テストから `chrome.storage` を読み書きするには、拡張のコンテキスト（SW または拡張ページ）を経由する。SW 経由が高速で推奨。SW が使えない場合は popup 等の拡張ページ経由。persist ミドルウェア（Redux Persist, Zustand persist 等）を使っている拡張では、初回起動時のキー不在・rehydration による上書き・async write レースの3つの地雷がある。

## 5. Shadow DOM の操作

Content script で Shadow DOM を使う拡張は多い。Playwright の標準セレクタでは内部にアクセスできない場合がある。`page.evaluate()` 内で `shadowRoot` を直接トラバースする。ホストサイトの要素に遮蔽される場合は `click({ force: true })` + JS 直接クリックの二重パターンで対処。状態変化の待機には `expect.poll()` が有効。

## 6. iframe の取り扱い

`frameLocator()` は cross-origin iframe では使えない。`page.evaluate()` で DOM を直接操作する。Chrome は `display: none` の iframe を強くスロットルするため、隠す場合は `visibility: hidden` + `position: fixed` + 明示的 width を使う。SPA 遷移後に stale iframe が残る問題は、`src` を現在ページと照合して検出する。

## 7. Fixture 設計

Worker-scoped fixtures でコンテキストとページを共有すると、ブラウザ起動回数を大幅に削減できる。ただし `launchPersistentContext` には「フルスクリーンに入ったページを close すると全ページでフルスクリーンが永久にブロックされる」という Chromium バグがあるため、共有ページは close しない。動的 URL 探索はテスト本体とは別コンテキストで行い、状態汚染を防ぐ。

## 8. 外部サービス依存の URL 管理

外部サイトの URL はいつ無効化されるか予測できない。環境変数 → ハードコード → 動的探索の3層フォールバックと、前提条件不成立時の `test.skip()` で graceful degradation する。判断基準: **環境の問題 → skip、拡張の振る舞い → assert**。

## 9. テスト失敗時の診断

拡張の E2E 失敗は原因の切り分けが難しい（拡張のバグ / ホストサイト変更 / テストの問題）。`testInfo.attach()` で拡張の内部状態を JSON として自動保存する。原因不明の問題には使い捨て診断スペック（一時的に作成 → DOM メトリクス収集 → 修正 → 削除）が有効。

## 10. アンチパターン

- `waitForTimeout()` で安定化しない — `expect.poll()` や `waitForFunction()` で明示的に待つ
- `page.evaluate()` 内でクロージャを参照しない — 引数で渡すか addInitScript
- フルスクリーンに入ったページを close しない — persistent context が壊れる
- iframe を `display: none` で隠さない — スロットリングされる
- `test.skip()` で振る舞い結果をスキップしない — テスト価値の無声劣化
- テストコードを大規模一括リファクタしない — 段階的に行い、失敗時は即 revert
