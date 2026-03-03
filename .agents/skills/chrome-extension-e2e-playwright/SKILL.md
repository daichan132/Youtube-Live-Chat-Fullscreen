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

Chrome 拡張は `chromium.launchPersistentContext` + `headless: false` でしかロードできない（[公式ガイド](https://playwright.dev/docs/chrome-extensions)）。通常の `browser.newContext()` は使えない。CI では `xvfb-run` で仮想ディスプレイを提供するか、`channel: 'chromium'`（New Headless）を使う。global setup でビルド出力の存在確認をしておくとよい。

**Playwright 同梱 Chromium / Chrome for Testing を使うこと。** Chrome branded build は `--load-extension` を Chrome 137 で、`--disable-extensions-except` を Chrome 139 で削除した。`ignoreDefaultArgs: ['--disable-extensions']` は必須ではないが、拡張がロードされない場合のトラブルシュートとして有用。MV2 は Playwright v1.55 で非対応。

## 2. MV3 Service Worker の起動と停止

MV3 の SW はイベント駆動で lazy 起動。`content_scripts.matches` に合う URL への warmup 遷移で起動を促す。`waitForEvent` を warmup 前に仕込み（NEW イベントのみキャプチャするため）、`predicate` で拡張 SW だけをフィルタする。必ず timeout を指定すること（[CI ハング報告](https://github.com/microsoft/playwright/issues/37347)）。

warmup で見つからない場合は CDP restart fallback（`stopAllWorkers` → 再 warmup）で再試行する（[Playwright #39075](https://github.com/microsoft/playwright/issues/39075)）。`stopAllWorkers` はホスト側 SW も止めるため最終手段。

SW idle termination（約 30 秒）後も Worker 参照は経験上有効だが保証はない。`Target closed` が出たら Page パス（e2e.html bridge）に切り替える。`manifest.json` の [`"key"`](https://developer.chrome.com/docs/extensions/reference/manifest/key) で Extension ID を固定する方法もある。

## 3. page.evaluate() のスコープと World 境界

`page.evaluate()` のコールバックはブラウザプロセスで実行される。Node.js スコープの変数・インポートは参照できず、**TypeScript はこのエラーを検出しない**。引数として明示的に渡すか、`context.addInitScript()` で共通ヘルパーを `window` に注入する。拡張 E2E は `page.evaluate()` を多用するため、addInitScript パターンはほぼ必須。

**引数の型**: 基本は JSON シリアライズ可能な値のみ。ただし Playwright の Handle（`ElementHandle`/`JSHandle`）は例外的に渡せる。DOM 操作が必要なら `evaluateHandle` も選択肢だが、Playwright 的には locator ベースの操作が基本。

**World 境界の整理:**
- `page.evaluate()` → Host Page の **Main World** のみ（Content Script World には到達しない）
- `worker.evaluate()` → Extension **Service Worker**
- `extPage.evaluate()` → Extension Pages (popup.html 等)
- Content Script World / Shadow DOM → `page.evaluate()` で `shadowRoot` を辿るか、`addInitScript` 経由

## 4. chrome.storage へのアクセス

テストから `chrome.storage` を読み書きするには、拡張のコンテキスト（SW または拡張ページ）を経由する。Worker パス（`worker.evaluate()`、高速）と Page パス（e2e.html bridge 経由）の 2 つがある。

**ランタイムフォールバック（推奨）**: Worker を試す → 失敗したら e2e.html にフォールバック。e2e.html は React/Zustand なしの最小ページなので rehydration リスクがない。popup.html 経由は persist ミドルウェアの rehydration でデータが上書きされるため避ける。

## 5. Shadow DOM の操作

**Playwright の locator は open Shadow DOM をデフォルトで貫通する**（[公式ドキュメント](https://playwright.dev/docs/locators)）。XPath は例外。つまり `page.locator('[data-testid="btn"]')` で Shadow DOM 内の要素を直接指定できる。`page.evaluate()` で `shadowRoot` を手動トラバースするのは、computed style の取得や複合条件の評価など locator では表現しにくい操作に限定する。

ホストサイトの要素に遮蔽される場合は **3段階フォールバッククリック**（通常クリック → force クリック → JS クリック）で対処。通常クリックを最初に試すのが重要 — `force: true` は actionability check をスキップするため `addLocatorHandler()` が発火しない。常に二重クリックするとトグル UI が反転するため、各段階で verify してから昇格する。状態変化の待機には `expect.poll()` が有効。

**予期せぬオーバーレイ（consent dialog 等）への対策**: `page.addLocatorHandler()` で YouTube の同意ダイアログ等を自動処理する。Cookie 事前注入と補完関係で併用する。同意ダイアログのように「クリックで消える UI」にはデフォルト動作（消滅を待機）が安定。`noWaitAfter: true` は常時表示される要素をトリガーにする特殊ケース向け。

## 6. iframe の取り扱い

`frameLocator()` は cross-origin iframe では使えない。`page.evaluate()` で DOM を直接操作する。Chrome は `display: none` の iframe を強くスロットルするため、隠す場合は `visibility: hidden` + `position: fixed` + 明示的 width を使う。SPA 遷移後に stale iframe が残る問題は、`src` を現在ページと照合して検出する。

## 7. Fixture 設計

Worker-scoped fixtures でコンテキストとページを共有すると、ブラウザ起動回数を大幅に削減できる。ただし `launchPersistentContext` には「フルスクリーンに入ったページを close すると全ページでフルスクリーンが永久にブロックされる」という Chromium バグがあるため、共有ページは close しない。動的 URL 探索はテスト本体とは別コンテキストで行い、状態汚染を防ぐ。

## 8. 外部サービス依存の URL 管理

外部サイトの URL はいつ無効化されるか予測できない。環境変数 → ハードコード → 動的探索の3層フォールバックと、前提条件不成立時の `test.skip()` で graceful degradation する。判断基準: **環境の問題 → skip、拡張の振る舞い → assert**。

## 9. テスト失敗時の診断

`testInfo.attach()` で拡張の内部状態を JSON として自動保存する。v1.56+ の `page.consoleMessages()` / `page.pageErrors()` で事後的にログを取得でき、v1.57+ の `worker.on('console')` で SW ログも拾える（SW 側で例外が出ているのにページは静かな事故が多い）。

## 10. アンチパターン

- `waitForTimeout()` で安定化しない — `expect.poll()` や `waitForFunction()` で明示的に待つ
- `page.evaluate()` 内でクロージャを参照しない — 引数で渡すか addInitScript
- フルスクリーンに入ったページを close しない — persistent context が壊れる
- iframe を `display: none` で隠さない — スロットリングされる
- `test.skip()` で振る舞い結果をスキップしない — テスト価値の無声劣化
- テストコードを大規模一括リファクタしない — 段階的に行い、失敗時は即 revert
