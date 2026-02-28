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
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
  ],
})
```

- `headless: false` は絶対に外せない。Chrome 拡張は headless モードで動作しない
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
  if (!worker) throw new Error('Service Worker did not start')
  return worker
}
```

### よくある失敗

- **`serviceWorkers()` が常に空**: warmup URL が `content_scripts.matches` に合っていない
- **`channel: 'chromium'` を設定しても解決しない**: SW の起動には実際のページ遷移が必要

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

---

## playwright.config.ts テンプレート

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  workers: process.env.CI ? 1 : 4,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  projects: [
    {
      name: 'extension-e2e',
      testDir: './e2e/scenarios',
      use: { trace: 'on-first-retry' },
    },
  ],
})
```
