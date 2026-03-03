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

- `headless: false` が基本。CI で headless にするには `channel: 'chromium'`（New Headless）を使う
- **Playwright 同梱 Chromium / Chrome for Testing を使う**。Chrome branded build は Chrome 137 で `--load-extension` を、Chrome 139 で `--disable-extensions-except` を削除した
- `ignoreDefaultArgs: ['--disable-extensions']` は必要に応じて指定。Playwright のデフォルト引数に `--disable-extensions` が含まれている（[chromiumSwitches.ts](https://raw.githubusercontent.com/microsoft/playwright/main/packages/playwright-core/src/server/chromium/chromiumSwitches.ts)）。`--disable-extensions-except` で上書きされるため多くの場合は不要だが、環境差異で拡張がロードされない場合に有用
- CI では `xvfb-run --auto-servernum` で仮想ディスプレイを提供するか `channel: 'chromium'` で headless
- `userDataDir` は空文字列 `''` で worker-scoped 共有、`testInfo.outputPath('user-data-dir')` でテスト分離
- **MV2 注意**: Playwright v1.55 で MV2 サポートが終了。MV2 拡張は Playwright 1.54 以下を使うこと

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
const isExtensionWorker = (w: Worker) => w.url().startsWith('chrome-extension://')

async function waitForServiceWorker(context: BrowserContext, timeoutMs = 45_000) {
  const find = () => context.serviceWorkers().find(isExtensionWorker) ?? null

  let worker = find()
  if (worker) return worker

  // waitForEvent を warmup 前に仕込む（レース削減）
  // waitForEvent は NEW イベントのみキャプチャするため、先にリスナーを設定する
  const swPromise = context
    .waitForEvent('serviceworker', { predicate: isExtensionWorker, timeout: timeoutMs })
    .catch(() => null)

  // warmup: matches に合う URL へ遷移して SW をトリガー
  const warmupPage = await context.newPage()
  await warmupPage.goto('https://example.com', {
    waitUntil: 'domcontentloaded', timeout: 15_000,
  }).catch(() => {})

  worker = find() ?? await swPromise
  await warmupPage.close()

  if (worker) return worker

  // CDP restart fallback (Playwright #39075)
  // 同じパターン: リスナーを先に仕込んでから再ウォームアップ
  try {
    const cdp = await context.newCDPSession(context.pages()[0] ?? await context.newPage())
    await cdp.send('ServiceWorker.enable')
    await cdp.send('ServiceWorker.stopAllWorkers')
    await cdp.detach()

    const retryPromise = context
      .waitForEvent('serviceworker', { predicate: isExtensionWorker, timeout: 10_000 })
      .catch(() => null)

    const rewarmup = await context.newPage()
    await rewarmup.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {})

    worker = find() ?? await retryPromise
    await rewarmup.close().catch(() => null)
  } catch {
    // CDP fallback is best-effort
  }

  if (!worker) throw new Error('Service Worker did not start')
  return worker
}
```

### SW idle termination と Playwright CDP の関係

MV3 の SW はアイドル約 30 秒で停止されるが、Playwright が取得した Worker 参照は経験上 idle termination 後も有効（保証はない）。`context.serviceWorkers()` は停止後に空を返すため毎回取り直す設計は避ける — フォールバック先の副作用（rehydration 等）を踏むリスクがある。起動時に取得した参照を保持し、`Target closed` が出たら e2e.html bridge に切り替える。アドホックに再取得したい場合:

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
const extensionId = new URL(worker.url()).host

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
