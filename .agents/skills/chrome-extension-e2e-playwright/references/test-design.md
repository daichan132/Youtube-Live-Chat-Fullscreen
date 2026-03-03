# Test Design — Chrome Extension E2E

Fixture 設計、外部 URL 管理、失敗診断、アンチパターン。テスト基盤の設計・保守時に参照する。

---

## Worker-scoped Fixtures

テストごとにブラウザを起動すると遅い。Worker-scoped fixtures でコンテキストとページを共有する。

```ts
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test'

const pathToExtension = path.resolve(__dirname, '../dist')

interface WorkerFixtures { sharedContext: BrowserContext; sharedPage: Page; extensionId: string }
interface TestFixtures { page: Page; context: BrowserContext }

export const test = base.extend<TestFixtures, WorkerFixtures>({
  sharedContext: [async ({}, use) => {
    const ctx = await chromium.launchPersistentContext('', {
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'], // Playwright デフォルトに含まれる; 必要に応じて
      args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
    })
    await use(ctx)
    await ctx.close()
  }, { scope: 'worker', timeout: 60_000 }],

  sharedPage: [async ({ sharedContext }, use) => {
    const page = sharedContext.pages()[0] ?? await sharedContext.newPage()
    await use(page)
    // Do NOT close — fullscreen blocking bug workaround
  }, { scope: 'worker' }],

  page: async ({ sharedPage }, use) => {
    if (await sharedPage.evaluate(() => !!document.fullscreenElement))
      await sharedPage.evaluate(() => document.exitFullscreen())
    await sharedPage.goto('about:blank')
    await sharedPage.bringToFront()
    await use(sharedPage)
  },

  context: async ({ sharedContext }, use) => { await use(sharedContext) },
})
export { expect } from '@playwright/test'
```

### Persistent context のフルスクリーンバグ

`launchPersistentContext` で、フルスクリーンに入ったページを `close()` すると、同一コンテキストの全ページでフルスクリーンが永久にブロックされる。Chromium 側のバグ。共有ページを close しないことで回避する。

### URL 探索の分離

動的にテスト用 URL を探索する場合（API 検索等）、テスト本体とは別のコンテキストで実行する。Cookie・キャッシュ等でテストが汚染されるのを防ぐため。

---

## 外部サービス依存の URL 管理

### 3層フォールバック

```ts
function getTestUrl(): string | null {
  if (process.env.E2E_TARGET_URL) return process.env.E2E_TARGET_URL  // 層1: 環境変数
  const KNOWN_URL = 'https://...'                                     // 層2: ハードコード
  return KNOWN_URL                                                    // 層3: 動的探索（fixture 内でキャッシュ）
}
```

### skip と assert の判断基準

```ts
test('feature on external page', async ({ targetUrl }) => {
  test.skip(!targetUrl, 'Target URL not available')  // 環境の問題 → skip
  await page.goto(targetUrl)
  await expect(page.locator('#extension-btn')).toBeVisible()  // 拡張の振る舞い → assert
})
```

**環境の問題（URL 不在、外部サービス障害）→ `test.skip()`。拡張の振る舞い（ボタン表示、iframe ロード）→ `expect()`。**

### よくある失敗

- **ハードコード URL の腐敗**: 外部サービスの URL は予告なく無効化される → 3層フォールバック
- **`test.skip()` で振る舞い結果をスキップ**: テスト価値が無声劣化する → skip は環境のみ

---

## テスト失敗時の診断

### 自動状態キャプチャ

```ts
/** テストを壊さず診断データを収集し、testInfo に attach する */
async function captureDiagnosticState(page: Page, testInfo: TestInfo, label: string) {
  try {
    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      iframes: [...document.querySelectorAll('iframe')].map(f => ({
        id: f.id, src: f.src,
        visible: getComputedStyle(f).display !== 'none',
      })),
      shadowHosts: [...document.querySelectorAll('[id*="shadow"], [id*="extension"]')]
        .map(el => ({ id: el.id, hasShadow: !!el.shadowRoot })),
    }))
    await testInfo.attach(`state-${label}`, {
      body: JSON.stringify(state, null, 2),
      contentType: 'application/json',
    })
  } catch { /* page may have crashed */ }
}
```

### 使い捨て診断スペック

原因不明の問題には、一時的な E2E スペックを作成して DOM メトリクスを収集する:

1. 最小再現スペックを書く
2. `page.evaluate()` で computed styles / bounding rect / 属性値を収集
3. 原因を特定して修正
4. 診断スペックを削除

---

## Timeout budgeting

複数の逐次操作がそれぞれタイムアウトを持つと、全体時間が爆発する。残り時間から予算を配分する:

```ts
function budgetTimeout(deadlineMs: number, maxMs: number, minMs = 2_000) {
  return Math.max(minMs, Math.min(maxMs, (deadlineMs - Date.now()) * 0.8))
}
```

---

## アンチパターン

| やりがち | なぜダメか | 代わりに |
|---------|----------|---------|
| `waitForTimeout(N)` | 状態変化を待っていない。flaky の温床 | `expect.poll()` / `waitForFunction()` |
| evaluate 内でクロージャ参照 | TypeScript が検出しない | 引数で渡す / addInitScript |
| フルスクリーン後に page.close() | persistent context が壊れる | close しない。about:blank で清掃 |
| iframe を `display: none` | Chrome がスロットル | `visibility: hidden` + `position: fixed` |
| テストの大規模一括リファクタ | fixtures 変更が全テストに波及 | 段階的。失敗時は即 revert |

---

## 推奨ディレクトリ構成

```
e2e/
├── config/          # テスト設定、URL 管理
├── fixtures.ts      # Playwright custom fixtures
├── global-setup.ts  # ビルド出力確認
├── pages/           # Page Object Model
├── scenarios/       # テストスペック（機能カテゴリ別）
├── support/         # 共通ヘルパー、診断、addInitScript
└── utils/           # 汎用ユーティリティ
```

`scenarios/`（テスト）+ `support/`（共通基盤）+ `config/`（設定）の3層分離が保守の鍵。
