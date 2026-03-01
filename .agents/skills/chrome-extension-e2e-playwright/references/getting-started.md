# Getting Started — Chrome Extension E2E

拡張のロード、Service Worker の起動待機、Extension ID の取得。初回セットアップ時に参照する。

---

## 拡張を Playwright にロードする

```ts
import { chromium } from '@playwright/test'
import path from 'node:path'

const EXT_PATH = path.resolve(__dirname, '../dist') // manifest.json があるフォルダ

const context = await chromium.launchPersistentContext('', {
  headless: false, // 拡張は headed モード必須
  ignoreDefaultArgs: ['--disable-extensions'], // Playwright デフォルト引数を除去
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
  ],
})
```

- `headless: false` は絶対に外せない。Chrome 拡張は headless モードで動作しない
- `ignoreDefaultArgs: ['--disable-extensions']` は必須。Playwright のデフォルト引数に `--disable-extensions` が含まれている（[chromiumSwitches.ts](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/chromiumSwitches.ts)）
- CI では `xvfb-run --auto-servernum` で仮想ディスプレイを提供する
- `userDataDir` は空文字列 `''` で worker-scoped 共有、`testInfo.outputPath('user-data-dir')` でテスト分離

### Global setup でビルド確認

```ts
import { existsSync } from 'node:fs'

export default function globalSetup() {
  if (!existsSync(path.join(EXT_PATH, 'manifest.json'))) {
    throw new Error(`Extension build not found. Run your build command first.`)
  }
}
```

### よくある失敗

- **CI で全テスト失敗**: `headless: false` が設定されていない。または仮想ディスプレイがない
- **`Failed to create ProcessSingleton`**: 同一 `userDataDir` で複数の context が同時起動している

---

## MV3 Service Worker の起動を待つ

SW はイベント駆動で lazy 起動。`content_scripts.matches` に合う URL への遷移がトリガーになる。

```ts
async function waitForServiceWorker(context: BrowserContext, timeoutMs = 45_000) {
  // warmup: matches に合う URL へ遷移して SW をトリガー
  const warmupPage = await context.newPage()
  await warmupPage.goto('https://example.com') // 自分の拡張の matches に合わせる

  const deadline = Date.now() + timeoutMs
  let worker = null
  while (Date.now() < deadline) {
    worker = context.serviceWorkers()[0]
    if (worker) break
    worker = await context
      .waitForEvent('serviceworker', { timeout: 5_000 })
      .catch(() => null)
    if (worker) break
  }

  await warmupPage.close()

  // CDP restart fallback (Playwright #39075)
  // ウォームアップ + ポーリングで見つからない場合、
  // CDP で全 SW を停止→再起動して再度待機する
  if (!worker) {
    try {
      const cdp = await context.newCDPSession(context.pages()[0] ?? await context.newPage())
      await cdp.send('ServiceWorker.enable')
      await cdp.send('ServiceWorker.stopAllWorkers')
      await cdp.detach()
      worker = await context.waitForEvent('serviceworker', { timeout: 10_000 }).catch(() => null)
    } catch {
      // CDP fallback is best-effort
    }
  }

  if (!worker) throw new Error('Service Worker did not start')
  return worker
}
```

### SW idle termination と Playwright CDP の関係

MV3 の SW はアイドル状態が続くと Chrome に停止される。しかし **Playwright が `waitForEvent('serviceworker')` で取得した Worker 参照は、Chrome の idle termination 後も CDP セッション経由で有効**。つまり fixture 起動時に取得した Worker 参照は、テスト全体を通してそのまま `worker.evaluate()` に使える。

`context.serviceWorkers()` は「現在アクティブな SW」のみ返すため、idle termination 後は空になる。これを使って毎回 Worker を取り直す設計は一見安全に見えるが、SW が見つからなかったときのフォールバック（拡張ページ経由）で副作用（Zustand rehydration 等）を踏むリスクがある。

**推奨**: fixture の起動時に取得した Worker 参照を使い続ける（= boot-time bifurcation）。SW をアドホックに再取得したい場面では以下のヘルパーを使う:

```ts
async function getActiveWorker(context: BrowserContext): Promise<Worker | null> {
  const worker = context.serviceWorkers().find(w =>
    w.url().startsWith('chrome-extension://')
  ) ?? null
  if (worker) return worker
  return context.waitForEvent('serviceworker', { timeout: 10_000 }).catch(() => null)
}
```

### よくある失敗

- **`serviceWorkers()` が常に空**: warmup URL が `content_scripts.matches` に合っていない
- **`channel: 'chromium'` を設定しても解決しない**: SW の起動には実際のページ遷移が必要
- **fixture 起動時に Worker が null**: 並列 worker 起動時の負荷で SW 起動が遅れる。deadline polling のタイムアウトを十分に取る（45秒程度）

---

## Extension ID の取得

```ts
// 方法1: SW の URL から（推奨）
const extensionId = worker.url().split('/')[2]

// 方法2: chrome://extensions の Shadow DOM から（フォールバック）
async function getExtensionIdFromChromePage(page: Page) {
  await page.goto('chrome://extensions')
  return page.evaluate(() => {
    const mgr = document.querySelector('extensions-manager')
    const list = mgr?.shadowRoot?.querySelector('extensions-item-list')
    const item = list?.shadowRoot?.querySelector('extensions-item')
    return item?.id
  })
}
```

方法2は Chrome UI の内部構造に依存するため脆い。SW が起動するなら方法1を優先する。

### 方法3: manifest `"key"` で ID を固定する

`manifest.json` に `"key"` を入れると開発時の拡張 ID を固定できる（[Chrome docs](https://developer.chrome.com/docs/extensions/reference/manifest/key)）。E2E 用ビルドだけ注入すれば、SW 起動を待たずに ID を確定できる。ストア提出物からは除去すること。

---

## playwright.config.ts テンプレート

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  workers: process.env.CI ? 1 : 4,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  projects: [
    {
      name: 'extension-e2e',
      testDir: './e2e/scenarios',
      use: {
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
    },
  ],
})
```

- `trace: 'retain-on-failure'` は失敗テストのトレースを確実に残す。`on-first-retry` だとリトライなし設定（ローカル開発）でトレースが取れない
- `video: 'retain-on-failure'` はフルスクリーン遷移やアニメーション絡みの失敗で特に有用
