---
title: "Playwright × Chrome拡張 E2Eテスト完全ガイド — MV3対応・7つの落とし穴と実践パターン"
emoji: "💣"
type: "tech"
topics: ["playwright", "chrome拡張", "e2e", "testing", "typescript"]
published: false
---

## はじめに

Playwright の公式ドキュメントには「`--load-extension` で拡張をロードできます」という [1 ページ](https://playwright.dev/docs/chrome-extensions)があるだけで、ブラウザ拡張の E2E に関する実践的な情報はほぼ存在しません。筆者は Chrome 拡張（[YouTube Live Chat Fullscreen](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlkeccegfeelbfmlfnikoefnpgfkondj)、ユーザー 1 万人超、[WXT](https://wxt.dev/) + React + TypeScript）の E2E テストを Playwright で 1 年以上運用する中でハマった落とし穴と、試行錯誤の末にたどり着いた対処法をまとめます。

:::message
この記事は以下の環境を前提としています。
- **Playwright 1.50+**（MV2 サポートは Playwright v1.55 で終了。MV2 拡張は 1.54 以下を使ってください）
- **Chrome Extension Manifest V3**
- **TypeScript**
- **Playwright がインストールするブラウザ（Chromium / Chrome for Testing）を使用**（`npx playwright install chromium`）

Chrome / Edge の通常版（branded build）は `--load-extension` を **Chrome 137 で削除**、`--disable-extensions-except` を **Chrome 139 で削除** しています（[chromium-extensions PSA](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/FxMU1TvxWWg)）。拡張の E2E テストには Playwright がインストールする Chromium（または [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)）を使ってください。Playwright v1.57 以降は内部的に Chrome for Testing ビルドを使用しています。
:::

**この記事で解決する 7 つの問題:**

| # | 問題 | ひとことで |
|---|------|-----------|
| 1 | 拡張がロードされない | `launch()` では拡張非対応。`launchPersistentContext` を使う |
| 2 | Extension ID が取れない | Service Worker の遅延起動。ウォームアップで促す |
| 3 | `evaluate()` で `ReferenceError` | Node.js とブラウザのシリアライゼーション境界 |
| 4 | `chrome.storage` にアクセスできない | `page.evaluate()` は拡張の world 外。Worker → e2e.html bridge のランタイムフォールバック |
| 5 | Shadow DOM 内のクリックが効かない | actionability check とオーバーレイ遮蔽の問題 |
| 6 | テスト対象 URL が腐る | 外部サービスの状態変化。フォールバック戦略で対処 |
| 7 | 失敗原因がわからない | ホストページと拡張の切り分けを自動化 |

必要なセクションだけ拾い読みしても大丈夫な構成にしています。

## 1. 拡張を Playwright にロードする

`chromium.launch()` では拡張はロードできません。

### 最小テンプレート

```typescript
// e2e/fixtures.ts
import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ビルド済み拡張のパス（例: WXT なら .output/chrome-mv3）
const PATH_TO_EXTENSION = path.resolve('dist')

const isExtensionWorker = (w: Worker) => w.url().startsWith('chrome-extension://')

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-ext-'))
    let context: BrowserContext | null = null
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, // headed が安定。headless にする場合は下記「CI で回す」を参照
        ignoreDefaultArgs: ['--disable-extensions'], // Playwright デフォルト引数を除去
        args: [
          `--disable-extensions-except=${PATH_TO_EXTENSION}`,
          `--load-extension=${PATH_TO_EXTENSION}`,
        ],
      })
      await use(context)
    } finally {
      await context?.close().catch(() => null)
      fs.rmSync(userDataDir, { recursive: true, force: true })
    }
  },

  extensionId: async ({ context }, use) => {
    // MV3: Service Worker の URL から Extension ID を取得
    let worker = context.serviceWorkers().find(isExtensionWorker)
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', {
        predicate: isExtensionWorker,
        timeout: 30_000,
      })
    }
    const extensionId = new URL(worker.url()).host
    await use(extensionId)
  },
})

export const expect = test.expect
```

`try/finally` で一時ディレクトリを確実に削除し、`predicate` でホストページの SW を除外しています。`launchPersistentContext` は User Data Directory を持つため拡張のインストール状態を再現でき、`mkdtempSync` で毎回クリーンなプロファイルを作ることでテスト間の状態リークを防ぎます。`headless: false`（headed）が安定ですが、CI では `channel: 'chromium'` で New Headless モードが使えます（後述）。

### CI で回す

`channel: 'chromium'` を指定すれば New Headless（フル機能の Chromium headless）で拡張が動きます。テンプレートの `launchPersistentContext` に `channel: 'chromium'` を追加するだけです。Linux CI で headed のまま回す場合は `xvfb-run npx playwright test` を使ってください。

## 2. MV3 Service Worker の起動を待つ

前節のテンプレートには落とし穴があります。`context.serviceWorkers()` が空配列を返すケースです。

### なぜ起きるか

MV3 の Service Worker は遅延起動されます。ブラウザが起動しても、拡張の Service Worker はイベント（ページ遷移、メッセージ、アラームなど）が発生するまで起動しないことがあります。Playwright でコンテキストを作った直後は、まだ Service Worker が立ち上がっていない可能性が高いです。

```typescript
const context = await chromium.launchPersistentContext(/* ... */)
console.log(context.serviceWorkers()) // [] ← まだ起動していない
```

### 解決: ウォームアップ + ポーリング + フォールバック

```typescript
const BOOT_TIMEOUT_MS = 45_000
const isExtensionWorker = (w: Worker) => w.url().startsWith('chrome-extension://')

async function waitForExtensionWorker(context: BrowserContext) {
  const find = () =>
    context.serviceWorkers().find(isExtensionWorker) ?? null

  // すでに起動していればそのまま返す
  let worker = find()
  if (worker) return worker

  // waitForEvent を warmup 前に仕込む（レース削減）
  // waitForEvent は NEW イベントのみキャプチャするため、
  // 先にリスナーを設定してから warmup に行くと取りこぼしが減る
  const swPromise = context.waitForEvent('serviceworker', {
    predicate: isExtensionWorker,
    timeout: BOOT_TIMEOUT_MS,
  }).catch(() => null)

  // ウォームアップ: content script の matches に該当するページを開いて SW 起動を促す
  const warmup = await context.newPage()
  await warmup.goto('https://www.youtube.com', {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  }).catch(() => {})

  worker = find() ?? await swPromise
  await warmup.close()

  if (worker) return worker

  // CDP restart fallback (Playwright #39075 対策)
  try {
    const cdp = await context.newCDPSession(
      context.pages()[0] ?? await context.newPage()
    )
    await cdp.send('ServiceWorker.enable')
    await cdp.send('ServiceWorker.stopAllWorkers')
    await cdp.detach()

    // 同じパターン: リスナーを先に仕込んでから再ウォームアップ
    const retryPromise = context.waitForEvent('serviceworker', {
      predicate: isExtensionWorker,
      timeout: 10_000,
    }).catch(() => null)

    const rewarmup = await context.newPage()
    await rewarmup.goto('https://www.youtube.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    }).catch(() => {})

    worker = find() ?? await retryPromise
    await rewarmup.close().catch(() => {})
  } catch {
    // CDP fallback is best-effort
  }

  if (!worker) throw new Error('Extension Service Worker did not start')
  return worker
}
```

`waitForEvent` を warmup 前に仕込む（取りこぼし防止）→ content script の matches に該当するページで SW 起動を促す → CDP restart で再試行、という 3 段構えです。各ステップの意図はコード内のコメントを参照してください。

Service Worker がどうしても取得できない場合、`chrome://extensions` を開いて Shadow DOM 経由で Extension ID を読む方法もありますが、Chrome バージョンで DOM 構造が変わるため最終手段です。`manifest.json` に [`"key"`](https://developer.chrome.com/docs/extensions/reference/manifest/key) を入れれば開発時の拡張 ID を固定でき、SW の起動を待たずに ID を確定できます（ストア提出物からは除去すること）。

### Service Worker の idle termination

MV3 の SW はアイドル約 30 秒で [Chrome に停止されます](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)が、筆者の環境では Playwright が取得した Worker 参照は停止後も有効でした（保証はされていません）。起動時に取得した参照をそのまま保持する設計で問題ないケースが多いです。`Target closed` エラーが出たら後述の e2e.html bridge に切り替えてください。

## 3. `page.evaluate()` の境界を理解する

ブラウザ拡張の E2E テストでは `page.evaluate()` を多用します。ここにハマりやすい落とし穴があります。

まず、コードの実行場所が複数に分かれることを押さえてください。

```
┌─ Node.js (テストコード) ───────────────────────┐
│  page.evaluate()    → Host Page の Main World   │
│  worker.evaluate()  → Extension Service Worker  │
│  extPage.evaluate() → Extension Pages           │
└─────────────────────────────────────────────────┘

┌─ Browser ───────────────────────────────────────┐
│                                                 │
│  Host Page (例: youtube.com)                    │
│  ├─ Main World      ← page.evaluate() はここ   │
│  ├─ Content Script World (拡張が注入)           │
│  └─ Shadow DOM (拡張の UI)                      │
│                                                 │
│  Extension Service Worker                       │
│  └─ chrome.storage, chrome.runtime 等           │
│                                                 │
│  Extension Pages (popup.html, options.html)     │
│  └─ chrome.storage にアクセス可能               │
└─────────────────────────────────────────────────┘
```

`page.evaluate()` が到達できるのは Host Page の **Main World だけ**です。Content Script World、Service Worker、Extension Pages にはそれぞれ別の手段でアクセスする必要があります。この境界がセクション 3〜4、そして 7 の診断でも重要になります。

### Node.js とブラウザは別世界

`page.evaluate()` に渡したコールバックは、Node.js ではなくブラウザ内で実行されます。外側の変数はシリアライズされません。

```typescript
// ❌ ReferenceError: storageKey is not defined
const storageKey = 'settings'
await page.evaluate(async () => {
  return chrome.storage.local.get(storageKey)
})
```

TypeScript はこれをコンパイルエラーにしてくれません。クロージャとして有効な構文だからです。しかし実行時に `page.evaluate()` はコールバックを文字列化してブラウザに送るため、外側のスコープは消えます。

### 正しいパターン: 第 2 引数で渡す

```typescript
// ✅ 第 2 引数でブラウザ側に値を渡す
const storageKey = 'settings'
await page.evaluate(async (key) => {
  return chrome.storage.local.get(key)
}, storageKey)

// ✅ 複数の値はオブジェクトにまとめる
await page.evaluate(async ({ key, value }) => {
  await chrome.storage.local.set({ [key]: value })
}, { key: 'theme', value: 'dark' })
```

渡せるのは JSON シリアライズ可能な値のみです（Playwright の [Handle](https://playwright.dev/docs/api/class-page#page-evaluate) は例外）。

:::message alert
`page.evaluate()`、`page.waitForFunction()`、`worker.evaluate()` すべてに同じ制約があります。コールバックの中は Node.js とは別の世界だということを意識しておいてください。
:::

## 4. `chrome.storage` にテストからアクセスする

拡張の多くは `chrome.storage` で設定やユーザーデータを永続化しています。E2E テストでは「事前に設定を注入 → テスト実行 → 結果を検証」というパターンが頻出します。

### 問題: `page.evaluate()` は拡張の world で動かない

テスト対象のページ（例: YouTube）で `page.evaluate(() => chrome.storage.local.get())` を呼んでも動きません。`page.evaluate()` はページ本体の **main world** で実行されるため、拡張の content script world とも Service Worker world とも異なるコンテキストになります。つまり `chrome.storage` などの拡張 API には一切アクセスできません。

### 設計: ランタイムフォールバック（e2e.html があれば安全）

`chrome.storage` にアクセスする手段は 2 つあります。

```
storage 操作
├─ Worker が生きている → worker.evaluate() で操作（高速）
└─ Worker が死んだ / 取得できなかった → e2e.html を開いて page.evaluate() で操作
```

Worker を試して失敗したら e2e.html にフォールバックする設計です。e2e.html は React/Zustand を一切載せない最小ページなので、フォールバック時の副作用がありません。Worker が mid-test で `Target closed` になっても自動復旧します。popup.html 経由のフォールバックは React/Zustand の rehydration でテストデータが上書きされる危険があるため避けてください。

### Worker パス（推奨）

セクション 2 で述べたとおり、Playwright の CDP セッションは Worker 参照を keep alive します。起動時に取得した参照をそのまま使い続けるだけです。

```typescript
// Worker パス: 高速かつ副作用なし
const data = await worker.evaluate(
  async (k) => chrome.storage.local.get(k), key
)
await worker.evaluate(
  async (items) => chrome.storage.local.set(items), data
)
```

### Page パス: テスト専用の storage bridge ページ

並列テスト実行時の負荷で SW 起動がタイムアウトするケースがあります。その場合は **React/Zustand を一切載せない最小ページ（`e2e.html`）** を用意し、拡張ページ経由で操作します。

```html
<!-- public/e2e.html — ビルド時に拡張パッケージに含まれる -->
<!DOCTYPE html>
<html>
<head><title>E2E Storage Bridge</title></head>
<body><p id="ready">ready</p></body>
</html>
```

```typescript
async function withE2EBridge<T>(
  context: BrowserContext,
  extensionId: string,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const url = `chrome-extension://${extensionId}/e2e.html`
  const page = await context.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    return await fn(page)
    // about:blank 不要 — React/Zustand が載らないので rehydration リスクなし
  } finally {
    await page.close()
  }
}
```

### ファクトリ関数でまとめる

Worker を試して失敗したら e2e.html にフォールバックするファクトリ関数にまとめると、テストコードからはパスの違いを意識せずに使えます。

```typescript
type StorageAccessor = {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  clear(): Promise<void>
}

function createStorageAccessor(
  context: BrowserContext,
  extensionId: string,
  initialWorker: Worker | null,
): StorageAccessor {
  let worker = initialWorker
  const bridgeUrl = `chrome-extension://${extensionId}/e2e.html`

  // e2e.html bridge: React/Zustand なしの最小ページ → rehydration リスクなし
  const viaE2EPage = async <T>(fn: (page: Page) => Promise<T>): Promise<T> => {
    const page = await context.newPage()
    try {
      await page.goto(bridgeUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      return await fn(page)
    } finally {
      await page.close().catch(() => null)
    }
  }

  // Worker を試し、失敗（Target closed 等）したら e2e.html にフォールバック。
  // 一度失敗したら以降は Page パスを使い続ける（毎回落ちるなら無駄なので）。
  const withFallback = async <T>(
    workerFn: (w: Worker) => Promise<T>,
    pageFn: () => Promise<T>,
  ): Promise<T> => {
    if (worker) {
      try {
        return await workerFn(worker)
      } catch {
        worker = null // Worker 死亡 → 以降は Page パス
      }
    }
    return pageFn()
  }

  return {
    get: (keys) => withFallback(
      (w) => w.evaluate((k) => chrome.storage.local.get(k), keys ?? null),
      () => viaE2EPage(p =>
        p.evaluate((k) => chrome.storage.local.get(k), keys ?? null),
      ),
    ),
    set: (items) => withFallback(
      (w) => w.evaluate((i) => chrome.storage.local.set(i), items).then(() => {}),
      () => viaE2EPage(p =>
        p.evaluate((i) => chrome.storage.local.set(i), items).then(() => {}),
      ),
    ),
    clear: () => withFallback(
      (w) => w.evaluate(() => chrome.storage.local.clear()).then(() => {}),
      () => viaE2EPage(p =>
        p.evaluate(() => chrome.storage.local.clear()).then(() => {}),
      ),
    ),
  }
}
```

content script は初期化時に storage を読むため、`page.goto()` の前に seed してください。ページ読み込み後に変える場合は `chrome.storage.onChanged` の購読か `page.reload()` が必要です。

## 5. Shadow DOM 内の要素を確実にクリックする

多くのブラウザ拡張は Shadow DOM を使って UI をホストページから隔離しています。Shadow DOM 内の要素に対する Playwright の操作は、通常の DOM と異なる挙動を示すことがあります。

### 前提: Playwright の locator は open Shadow DOM を貫通する

まず押さえておきたいのは、**Playwright の locator は open Shadow DOM をデフォルトで貫通する**ということです（[公式ドキュメント](https://playwright.dev/docs/locators)、XPath は例外）。つまり `page.locator('[data-testid="btn"]')` で Shadow DOM 内の要素を直接指定できます。`page.evaluate()` で `shadowRoot` を手動トラバースするのは、computed style の取得や複合条件の評価など locator では表現しにくい操作に限定してください。

### 問題: `click()` が効いたり効かなかったり

Shadow DOM 内のボタンに対して `locator.click()` を呼ぶと、以下の理由で失敗することがあります。

- ホストページの要素（モーダル、オーバーレイ、**GDPR 同意ダイアログ**）が上に被さっている
- Playwright の actionability check（要素が visible、enabled、stable であること）が通らない
- イベントが Shadow DOM の境界を越えて伝播しない

### まず overlay を潰すのが本筋

`force: true` や JS クリックに逃げる前に、**オーバーレイ自体を除去するのが安定化の近道**です。次セクション（パターン 4）で説明する `addLocatorHandler()` で同意ダイアログ等を自動処理すれば、大半の「クリックが効かない」はそもそも発生しなくなります。以下の 3 段階フォールバックは、`addLocatorHandler()` を設定した上でまだ actionability が揺れる要素向けのパターンです。

### 解決: 3段階フォールバッククリック

通常クリック → force クリック → JS クリックの順に段階を上げ、各段階で期待状態に変わったか検証するパターンです。

```typescript
import type { Locator } from '@playwright/test'

async function reliableClick(
  locator: Locator,
  verify: () => Promise<boolean>,
) {
  // Stage 1: 通常クリック — actionability check が走り、addLocatorHandler も発火する
  try {
    await locator.click({ timeout: 5_000 })
  } catch {
    // actionability failure — 次の段階へ
  }
  if (await verify().catch(() => false)) return

  // Stage 2: force クリック — actionability check をスキップ
  try {
    await locator.click({ force: true })
  } catch {
    // click dispatch failure — 次の段階へ
  }
  if (await verify().catch(() => false)) return

  // Stage 3: JS クリック — 最終手段（isTrusted: false）
  await locator.evaluate(el => (el as HTMLElement).click())
  if (!(await verify().catch(() => false))) {
    throw new Error('reliableClick: all 3 stages failed to produce expected state')
  }
}

// 使い方
const toggle = page.locator('#my-ext').getByRole('switch')
await reliableClick(toggle, async () => {
  const value = await toggle.getAttribute('aria-pressed')
  return value === 'true'
})
```

ポイントは **「常にすべての段階を踏む」のではなく「各段階で検証して、成功していれば即 return する」** 点です。

:::message
**片方で十分なケース:** Shadow DOM を使っていない、かつホストページにオーバーレイがない場合は、通常の `locator.click()` だけで問題ありません。まずは普通のクリックで書き始め、CI でフレークが出たらこのフォールバックパターンに昇格する、という段階的な導入をおすすめします。
:::

### 状態変化の待機: `expect.poll()` パターン

Shadow DOM 内の状態変化を待つには、`expect.poll()` が `waitForSelector` より柔軟です。

```typescript
// iframe の src が設定されるまでポーリングで待つ
await expect.poll(async () => {
  return page.evaluate(() => {
    const root = document.querySelector('#my-ext')?.shadowRoot
    const iframe = root?.querySelector('iframe')
    const src = iframe?.src ?? ''
    return src !== '' && !src.includes('about:blank')
  })
}, { timeout: 15_000 }).toBe(true)
```

### テスタビリティのための `data-*` 属性

プロダクトコード側で `data-*` 属性を付けておくと、テストからの状態観測が楽になります。本番に残っても害がないので気軽に追加できます。

```typescript
// プロダクトコード: <iframe data-ext-state="ready" src="...">
// テスト側: 属性の変化をポーリング
await expect.poll(async () => {
  return page.evaluate(() => {
    const root = document.querySelector('#my-ext')?.shadowRoot
    return root?.querySelector('[data-ext-state="ready"]') !== null
  })
}).toBe(true)
```

## 6. 外部サービスに依存するテストを安定させる

ブラウザ拡張は特定のサイト上で動くため、テスト対象のページが外部サービスの都合で変わる問題が避けられません。筆者の拡張（YouTube ライブ配信ページ用）では、配信終了による URL 腐り、チャットリプレイ無効化、予期せぬライブ配信開始などを経験しました。

### パターン 1: テスト種別ごとの URL 管理

URL をハードコードすると確実に腐ります。テスト種別ごとにデフォルト URL と環境変数オーバーライドを用意します。

```typescript
// e2e/config/testTargets.ts
type E2ETestTargets = {
  archive: {
    replayUrl: string          // チャットリプレイ付きアーカイブ
    transitionFromUrl: string  // SPA 遷移テストの起点
    transitionToUrl: string    // SPA 遷移テストの遷移先
  }
  replayUnavailable: {
    url: string                // チャットリプレイなしアーカイブ
  }
  noChat: {
    url: string                // チャットが存在しない通常動画
  }
  live: {
    preferredUrl: string | null // 環境変数で指定するライブ URL
  }
  liveSearch: {
    urls: string[]             // ライブ配信を動的に探す検索 URL
  }
}
```

### パターン 2: ライブ配信 URL の動的探索

ライブ配信 URL は本質的に不安定です。「今この瞬間にライブ配信中の URL」はハードコードできません。3 段構えで探索します。

```typescript
async function findLiveUrlWithChat(page: Page): Promise<string | null> {
  const targets = getE2ETestTargets()

  // Tier 1: 前回のテストで見つけたキャッシュ
  if (cachedLiveUrl) {
    if (await isPlayableLiveCandidate(page, cachedLiveUrl)) return cachedLiveUrl
    cachedLiveUrl = null
  }

  // Tier 2: 環境変数で指定された優先 URL
  if (targets.live.preferredUrl) {
    if (await isPlayableLiveCandidate(page, targets.live.preferredUrl)) {
      cachedLiveUrl = targets.live.preferredUrl
      return targets.live.preferredUrl
    }
  }

  // Tier 3: YouTube 検索からライブ配信を探す
  for (const searchUrl of targets.liveSearch.urls) {
    const found = await searchForLiveUrl(page, searchUrl)
    if (found) {
      cachedLiveUrl = found
      return found
    }
  }

  return null
}
```

Tier 3 の動的探索は「YouTube で "vtuber" をライブ配信フィルタ付きで検索し、チャットが再生可能な配信を見つける」という処理です。ハードコードした URL より遅いですが、「テスト実行時にライブ配信が 1 つも存在しない」以外では失敗しません。

### パターン 3: `test.skip()` で前提条件と拡張バグを区別する

URL が見つからない、またはページの状態が想定外の場合、テストを失敗ではなくスキップにします。

```typescript
test('archive replay chat works in fullscreen', async ({ page, archiveReplayUrl }) => {
  if (!archiveReplayUrl) {
    await captureChatState(page, test.info(), 'archive-replay-url-selection-failed')
    test.skip(true, 'No archive replay URL satisfied preconditions.')
    return
  }
  // テスト本体...
})
```

こうしておくと、テストレポート上で「前提条件の問題（skip）」と「拡張のバグ（fail）」が明確に区別できます。

### パターン 4: 同意ダイアログの自動処理（`addLocatorHandler` + Cookie 高速パス）

外部サービスのテストで地味にハマるのが GDPR 同意ダイアログです。[`addLocatorHandler()`](https://playwright.dev/docs/api/class-page#page-add-locator-handler) を主セーフティネットとして登録し、Cookie 事前注入で高速パスを確保する 2 層構成で対処します。

**主セーフティネット: `addLocatorHandler()`**

```typescript
// 共通 fixture で登録しておく — ページ遷移のたびに自動発火
await page.addLocatorHandler(
  page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("同意する")'),
  async (btn) => {
    await btn.first().click()
  },
)
```

`addLocatorHandler()` はページ上で指定した locator が出現したときに自動でハンドラを実行します。デフォルトではハンドラ実行後にオーバーレイが消えるまで待機してから後続のアクションに進むため、同意ダイアログのような「クリックで消える UI」には最適です（常に表示される要素をトリガーにする場合は `{ noWaitAfter: true }` を使います）。

**高速パス: Cookie 事前注入**

```typescript
await page.context().addCookies([
  { name: 'CONSENT', value: 'YES+1', domain: '.youtube.com',
    path: '/', secure: true, sameSite: 'Lax' },
  { name: 'CONSENT', value: 'YES+1', domain: '.google.com',
    path: '/', secure: true, sameSite: 'Lax' },
])
```

Cookie 注入はダイアログの表示自体を防ぐため、`addLocatorHandler()` の発火コストをゼロにできます。YouTube の場合、`.google.com` にも CONSENT Cookie を設定しないとリダイレクトされることがあります。Cookie のフォーマットはサービス側で変更される可能性があるため、Cookie だけに頼らず `addLocatorHandler()` と併用するのがポイントです。

### パターン 5: locale / timezone を固定して DOM の揺れを減らす

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    locale: 'en-US',
    timezoneId: 'Asia/Tokyo',
  },
})
```

locale は `chrome.i18n.getUILanguage()` にも影響するため、拡張の i18n をテストする場合は注意が必要です。

### 設計指針: 実サービス E2E と疑似 E2E の使い分け

外部サービスに依存する E2E テストは本質的に不安定です。すべてのテストを実サービスに向けるのではなく、2 レイヤーに分けると運用が楽になります。

- **実サービス E2E（少数・skip 許容）** — 「拡張が実際のサイト上で動くか」を確認するスモークテスト。URL が腐ったらスキップする前提で設計する
- **ローカル固定 HTML での疑似 E2E（多数・常に安定）** — 拡張のロジック検証に集中。テスト用の HTML ファイルを用意し、外部要因でフレークしない環境で細かく検証する

筆者の拡張では、ライブ配信テスト（実サービス）は 2〜3 本に絞り、チャット表示ロジックや UI 操作の細かい検証はローカル HTML で回しています。実サービス E2E は「本当に動くか」の最終確認、疑似 E2E は「正しく動くか」の詳細検証、という役割分担です。

## 7. テスト失敗時の自動診断

E2E テストが落ちたとき、「何が起きたか」がわからないと調査が進みません。ブラウザ拡張の場合、ホストページの状態と拡張の状態の両方が失敗原因になるので、Web アプリのテストより切り分けが面倒です。

### `testInfo.attach()` で診断データを自動添付

Playwright には `testInfo.attach()` でテストレポートにファイルを添付する機能があります。これを使って、失敗時の DOM 状態を JSON で保存します。

```typescript
import type { Page, TestInfo } from '@playwright/test'

async function captureDiagnostics(page: Page, testInfo: TestInfo, label: string) {
  try {
    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      fullscreen: document.fullscreenElement !== null,
      // 拡張固有の状態
      extensionRoot: document.querySelector('#my-ext-root') !== null,
      shadowContent: (() => {
        const root = document.querySelector('#my-ext-root')?.shadowRoot
        return {
          exists: root !== null,
          childCount: root?.children.length ?? 0,
          iframeCount: root?.querySelectorAll('iframe').length ?? 0,
        }
      })(),
    }))

    await testInfo.attach(`diagnostics-${label}`, {
      body: JSON.stringify(state, null, 2),
      contentType: 'application/json',
    })

    return state
  } catch {
    // 診断収集自体がテストを壊さないようにする
    return null
  }
}
```

### Playwright の組み込み診断を有効にする

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'retain-on-failure',      // 失敗時のみ trace を保存
    video: 'retain-on-failure',      // 失敗時のみ動画を保存
    screenshot: 'only-on-failure',   // 失敗時のみスクリーンショット
  },
})
```

特に trace は強力で、Trace Viewer でネットワーク・DOM・コンソールをステップごとに追えるため、ホストページと拡張の切り分けに役立ちます。

### 新しい診断 API（Playwright v1.56+）

Playwright v1.56 以降で追加された API を使うと、イベントリスナーを事前に仕込まなくても事後的にログを取得できます。

```typescript
// v1.56+: afterEach で失敗時にログを収集
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return

  // page.consoleMessages() / page.pageErrors() は同期メソッド。
  // ページに蓄積されたログ・エラーの配列を返す（Promise ではない）。
  const logs = page.consoleMessages()
  const errors = page.pageErrors()

  await testInfo.attach('console-logs', {
    body: logs.map(m => `[${m.type()}] ${m.text()}`).join('\n'),
    contentType: 'text/plain',
  })

  if (errors.length > 0) {
    await testInfo.attach('page-errors', {
      body: errors.map(e => String(e)).join('\n'),
      contentType: 'text/plain',
    })
  }
})
```

### Service Worker のコンソールを拾う（Playwright v1.57+）

Playwright v1.57 以降では `worker.on('console')` で Service Worker の console もキャプチャできます。拡張 E2E ではここが最も欲しい機能です — **SW 側で例外が出ているのにページのコンソールは静か**という状況が頻発するためです。

```typescript
// モジュールスコープで宣言し、worker fixture と afterEach で共有する
const swLogs: string[] = []

// worker-scoped fixture 内で1回だけ呼ぶ
worker.on('console', (msg) => {
  swLogs.push(`[${msg.type()}] ${msg.text()}`)
})

// afterEach で失敗時に attach → テストごとにクリア
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus && swLogs.length > 0) {
    await testInfo.attach('sw-console', {
      body: swLogs.join('\n'),
      contentType: 'text/plain',
    })
  }
  swLogs.length = 0
})
```

## まとめ

ここまでの内容を表にまとめます。

| 問題 | 原因 | 解決パターン |
|------|------|-------------|
| 拡張がロードされない | `launch()` では拡張非対応 | `launchPersistentContext` + `--load-extension`。Playwright 同梱 Chromium 必須 |
| Extension ID が取れない | Service Worker が遅延起動 | ウォームアップ + predicate 付き `waitForEvent` + CDP restart fallback |
| `page.evaluate()` で `ReferenceError` | シリアライゼーション境界 | 第 2 引数で値を渡す |
| `chrome.storage` にアクセスできない | `page.evaluate()` は拡張の world 外 | Worker → e2e.html bridge のランタイムフォールバック |
| Shadow DOM 内のクリックが効かない | actionability check / オーバーレイ遮蔽 | 通常→force→JS の3段階フォールバック + `addLocatorHandler` |
| テスト対象 URL が腐る | 外部サービスの状態変化 | 種別ごとの URL 管理 + 動的探索 + `test.skip()` + `addLocatorHandler` + locale 固定 |
| 失敗原因がわからない | ホストページ / 拡張の切り分け困難 | `testInfo.attach()` + `page.consoleMessages()` + `worker.on('console')` で診断自動収集 |

ブラウザ拡張の E2E テストは、仕組みができるまでが大変です。ただ一度回り始めると、E2E でバグを先に見つけてプロダクトコードを直す、というサイクルが回り始めます。筆者の拡張でも、SPA 遷移時の iframe リークや MutationObserver の過剰発火を E2E テストが先に検出して、プロダクトコードの修正に繋がりました。

## 参考リンク

- [Playwright - Chrome Extensions](https://playwright.dev/docs/chrome-extensions) — 拡張ロードの公式ガイド（本記事のセクション 1 の出発点）
- [Playwright - Browsers](https://playwright.dev/docs/browsers) — `chrome-headless-shell` と New Headless の違い
- [Playwright - Evaluating JavaScript](https://playwright.dev/docs/evaluating) — `page.evaluate()` のシリアライゼーション仕様
- [Playwright - Service Workers](https://playwright.dev/docs/service-workers) — `context.serviceWorkers()` と `waitForEvent` の API リファレンス
- [Playwright - Locators](https://playwright.dev/docs/locators) — locator の Shadow DOM 貫通、`testIdAttribute` の設定
- [Playwright - `addLocatorHandler()`](https://playwright.dev/docs/api/class-page#page-add-locator-handler) — 予期せぬオーバーレイの自動処理
- [Playwright #39075](https://github.com/microsoft/playwright/issues/39075) — MV3 Service Worker を取り逃がす既知のレース
- [Playwright #37347](https://github.com/microsoft/playwright/issues/37347) — `waitForEvent('serviceworker')` が CI でハングする問題（timeout 必須）
- [Chrome for Developers - Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — MV3 SW の idle termination（30 秒ルール）
- [Chrome for Developers - Manifest `"key"`](https://developer.chrome.com/docs/extensions/reference/manifest/key) — 開発時の拡張 ID 固定
- [WXT - Next-gen Web Extension Framework](https://wxt.dev/) — 本記事で使用している拡張開発フレームワーク
- [YouTube Live Chat Fullscreen - GitHub](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen) — 本記事のテストコードが含まれるリポジトリ（`e2e/` ディレクトリ）
- [Playwright の Chrome 拡張でハマったこと - Zenn](https://zenn.dev/st_little/articles/getting-stuck-with-playwright-chrome-extension) — headless モードや `--load-extension` 周りの実践的な知見
