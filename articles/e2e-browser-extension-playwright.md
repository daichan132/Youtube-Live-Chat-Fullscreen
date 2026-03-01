---
title: "Playwright × Chrome拡張 E2Eテスト完全ガイド — MV3対応・7つの落とし穴と実践パターン"
emoji: "💣"
type: "tech"
topics: ["playwright", "chrome拡張", "e2e", "testing", "typescript"]
published: false
---

## はじめに

ブラウザ拡張の E2E テスト、情報が少なすぎませんか。

Playwright の公式ドキュメントには「`--load-extension` で拡張をロードできます」という [1 ページ](https://playwright.dev/docs/chrome-extensions)があるだけで、実践的なパターンはほぼ書かれていません。Web アプリなら「Playwright E2E ベストプラクティス」で検索すれば山ほど出てくるのに、ブラウザ拡張となると途端に情報が枯れます。特に、拡張が動く外部サービス（YouTube、EC サイト、SNS など）の状態変化にテストが振り回される問題は、Web アプリの E2E とは質が違う難しさがあります。

筆者は Chrome 拡張（[YouTube Live Chat Fullscreen](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlkeccegfeelbfmlfnikoefnpgfkondj)、ユーザー 1 万人超、[WXT](https://wxt.dev/) + React + TypeScript）の E2E テストを Playwright で 1 年以上運用してきました。その過程でハマったポイントと、試行錯誤の末にたどり着いた対処法をまとめます。**すでに拡張を開発していてテストを書きたい人**、あるいは **Playwright は使っているがブラウザ拡張のテストは初めてという人**を想定しています。

:::message
この記事は以下の環境を前提としています。
- **Playwright 1.50+**
- **Chrome Extension Manifest V3**
- **TypeScript**

MV2 の拡張でも大部分は同じですが、Service Worker 周りの話は MV3 固有です。
:::

**この記事で解決する 7 つの問題:**

| # | 問題 | ひとことで |
|---|------|-----------|
| 1 | 拡張がロードされない | `launch()` では拡張非対応。`launchPersistentContext` を使う |
| 2 | Extension ID が取れない | Service Worker の遅延起動。ウォームアップで促す |
| 3 | `evaluate()` で `ReferenceError` | Node.js とブラウザのシリアライゼーション境界 |
| 4 | `chrome.storage` にアクセスできない | `page.evaluate()` は拡張の world 外。起動時分岐で Worker or e2e.html bridge 経由 |
| 5 | Shadow DOM 内のクリックが効かない | actionability check とオーバーレイ遮蔽の問題 |
| 6 | テスト対象 URL が腐る | 外部サービスの状態変化。フォールバック戦略で対処 |
| 7 | 失敗原因がわからない | ホストページと拡張の切り分けを自動化 |

必要なセクションだけ拾い読みしても大丈夫な構成にしています。この 7 つを押さえておけば、ブラウザ拡張 E2E で遭遇する主要な事故のほとんどを回避できるはずです。

### 最短で動かすまでの手順

1. `npx playwright install chromium` — Playwright 同梱の Chromium をインストール
2. ビルド済み拡張を用意（WXT なら `wxt build` → `.output/chrome-mv3/`）
3. 下記セクション 1 のテンプレート（`e2e/fixtures.ts`）をコピーし、`PATH_TO_EXTENSION` を書き換える
4. `npx playwright test` で実行

想定ディレクトリ構成:

```
e2e/
├── fixtures.ts          # 拡張ロード用の共通 fixture
├── config/
│   └── testTargets.ts   # テスト対象 URL の管理
├── scenarios/           # テストファイル
│   ├── fullscreen.spec.ts
│   └── archive.spec.ts
└── support/             # ヘルパー関数
    └── diagnostics.ts
```

## 1. 拡張を Playwright にロードする

`chromium.launch()` では拡張はロードできません。

### 最小テンプレート

```typescript
// e2e/fixtures.ts
import { test as base, chromium, type BrowserContext } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ビルド済み拡張のパス（例: WXT なら .output/chrome-mv3）
const PATH_TO_EXTENSION = path.resolve('dist')

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-ext-'))
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // headed が安定。headless にする場合は下記「CI で回す」を参照
      ignoreDefaultArgs: ['--disable-extensions'], // Playwright デフォルト引数を除去
      args: [
        `--disable-extensions-except=${PATH_TO_EXTENSION}`,
        `--load-extension=${PATH_TO_EXTENSION}`,
      ],
    })
    await use(context)
    await context.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  },

  extensionId: async ({ context }, use) => {
    // MV3: Service Worker の URL から Extension ID を取得
    let [worker] = context.serviceWorkers()
    if (!worker) {
      worker = await context.waitForEvent('serviceworker')
    }
    const extensionId = worker.url().split('/')[2]
    await use(extensionId)
  },
})

export const expect = test.expect
```

これで拡張入りの Chromium が立ち上がります。いくつか補足します。

**`ignoreDefaultArgs: ['--disable-extensions']` を指定します。** Playwright の Chromium はデフォルト引数に `--disable-extensions` を含みます（[ソース](https://github.com/nicktate/playwright/blob/main/packages/playwright-core/src/server/chromium/chromiumSwitches.ts)）。`--disable-extensions-except` で部分的に上書きされるケースも多いですが、環境によっては予期しない差分が出ることがあります。明示的に除去しておくのが安全です。

**基本は `headless: false`（headed）が安定です。** Playwright はデフォルトの headless モードで [`chrome-headless-shell`](https://playwright.dev/docs/browsers) という軽量バイナリを使いますが、これは拡張 API をサポートしていません。一方、**`channel: 'chromium'` を指定すると「New Headless」モード**（フル機能の Chromium を画面なしで動かすモード）**で起動し、headless でも拡張をロードできます。** まずは headed で動くことを確認し、CI で headless が必要になったら `channel: 'chromium'` を試してください。

**`launchPersistentContext` を使う理由。** 通常の `launch()` → `newContext()` では `--load-extension` が効きません。persistent context は User Data Directory を持つので、拡張をインストールした状態を再現できます。

**一時ディレクトリを毎回作ります。** テスト間でプロファイルを共有すると、前のテストの状態（cookie、storage、拡張の内部状態）が漏れます。`mkdtempSync` でクリーンなプロファイルを毎回作り、終了後に削除します。

### `addInitScript` でヘルパーを注入する

全テストで共通のヘルパー関数が必要なら、`addInitScript` で注入しておくと `page.evaluate()` 内で使いまわせます。

```typescript
// テスト用のヘルパーをすべてのページに注入
await context.addInitScript(() => {
  window.__testHelpers = {
    // Shadow DOM 内の拡張要素を探す汎用ヘルパー
    getExtensionRoot: () => {
      const host = document.querySelector('#my-extension-root')
      return host?.shadowRoot ?? null
    },
  }
})
```

ここで注入した関数はすべてのページ（YouTube だろうが popup だろうが）で使えるので、テストのたびに同じ DOM 操作コードを書かずに済みます。

### CI で回す

ローカルでは headed で十分ですが、CI 環境では画面がないため工夫が要ります。

**headless で回す（推奨）:** `channel: 'chromium'` を指定すれば New Headless（フル機能の Chromium headless）で拡張が動きます。

```typescript
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: 'chromium', // New Headless — 拡張 API が使える
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    `--disable-extensions-except=${PATH_TO_EXTENSION}`,
    `--load-extension=${PATH_TO_EXTENSION}`,
  ],
})
```

**headed で回す:** Linux CI では Xvfb（仮想フレームバッファ）を使います。GitHub Actions なら以下で動きます。

```yaml
- run: xvfb-run npx playwright test
```

:::message
Playwright 同梱の Chromium を使ってください。Chrome / Edge の通常インストール版は `--load-extension` 系フラグが制限されている場合があります。`npx playwright install chromium` でインストールされる Chromium なら問題ありません。
:::

### fixture のスコープ

上のテンプレートはテストごとに User Data Directory を作り直す設計です。テスト間の状態分離が確実ですが、テスト数が増えると起動コストが気になってきます。その場合は fixture を worker スコープにして context を再利用する選択肢もあります。ただしテスト間の状態リーク（cookie、storage、拡張の内部状態）には注意が必要です。

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

async function waitForExtensionWorker(context: BrowserContext) {
  const deadline = Date.now() + BOOT_TIMEOUT_MS
  const find = () =>
    context.serviceWorkers().find(w =>
      w.url().startsWith('chrome-extension://')
    ) ?? null

  // すでに起動していればそのまま返す
  let worker = find()
  if (worker) return worker

  // ウォームアップ: content script の matches に該当するページを開いて SW 起動を促す
  // 例: matches が "*://www.youtube.com/*" なら youtube.com を開く
  const warmup = await context.newPage()
  await warmup.goto('https://www.youtube.com', {
    waitUntil: 'domcontentloaded',
    timeout: 15_000,
  }).catch(() => {})

  // デッドライン付きポーリング
  while (!worker && Date.now() < deadline) {
    worker = find()
    if (worker) break
    const remaining = Math.min(3000, Math.max(1, deadline - Date.now()))
    await context.waitForEvent('serviceworker', { timeout: remaining })
      .catch(() => {})
  }
  await warmup.close()

  // CDP restart fallback (Playwright #39075 対策)
  if (!worker) {
    try {
      const cdp = await context.newCDPSession(
        context.pages()[0] ?? await context.newPage()
      )
      await cdp.send('ServiceWorker.enable')
      await cdp.send('ServiceWorker.stopAllWorkers')
      await cdp.detach()
      worker = await context
        .waitForEvent('serviceworker', { timeout: 10_000 })
        .catch(() => null)
    } catch {
      // CDP fallback is best-effort
    }
  }

  if (!worker) throw new Error('Extension Service Worker did not start')
  return worker
}
```

やっていることを補足します。

1. **ウォームアップページ** — content script の `matches` に該当するページを開きます。たとえば `matches` が `*://www.youtube.com/*` なら `youtube.com` を開きます。content script がロードされると Service Worker の起動がトリガーされます
2. **`waitForEvent('serviceworker')`** — Playwright は Service Worker の起動をイベントとして検知できます。ただしタイミングが不定なのでループで待ちます
3. **デッドライン** — 無限に待たないように 45 秒で打ち切ります
4. **CDP restart fallback** — Playwright には MV3 の Service Worker を取り逃がす[既知のレース](https://github.com/microsoft/playwright/issues/39075)が報告されています。CI の負荷が高い環境で顕在化しやすく、ウォームアップ＋ポーリングだけでは見つからないケースがあります。CDP（Chrome DevTools Protocol）経由で全 Service Worker を停止→再起動し、もう一度イベントを待つことでこのレースを回避します

### フォールバック: `chrome://extensions` から ID を取得

Service Worker がどうしても起動しないケースでは、`chrome://extensions` ページを開いて Extension ID を直接読み取る手もあります。

```typescript
async function getExtensionIdFromChromePage(context: BrowserContext) {
  const page = await context.newPage()
  try {
    await page.goto('chrome://extensions')
    // chrome://extensions は Shadow DOM が深くネストしている
    return await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager')
      const list = manager?.shadowRoot?.querySelector('extensions-item-list')
      const item = list?.shadowRoot?.querySelector('extensions-item')
      return item?.getAttribute('id') ?? null
    })
  } finally {
    await page.close()
  }
}
```

`chrome://extensions` 自体が Shadow DOM のネスト構造になっています。`querySelector` だけではたどり着けず、`shadowRoot` を 1 層ずつ掘る必要があります。

### 別解: `manifest.json` の `"key"` で Extension ID を固定する

Chrome の公式ドキュメントでは、`manifest.json` に [`"key"`](https://developer.chrome.com/docs/extensions/reference/manifest/key) を入れることで開発時の拡張 ID を固定できると明示されています。E2E 用ビルドだけ `"key"` を注入すれば、Service Worker の起動を待たずに Extension ID を確定できます。ストア提出物からは除去してください。

### Service Worker の idle termination — 実は止まっても大丈夫

MV3 の Service Worker はアイドル状態が続くと Chrome に停止されます。「テスト途中で `worker.evaluate()` が動かなくなるのでは？」と心配になりますが、**Playwright が `waitForEvent('serviceworker')` で取得した Worker 参照は、Chrome が SW を停止した後も CDP（Chrome DevTools Protocol）セッション経由で有効です。**

つまり fixture 起動時に取得した Worker 参照をそのまま使い続けても `worker.evaluate()` は正常に動きます。筆者のプロジェクトでは当初「毎回 `context.serviceWorkers()` で取り直す」設計にしていましたが、これは Chrome が SW を停止すると空配列を返すため、次のセクションで述べるフォールバック処理に副作用を持ち込む原因になりました。最終的に **起動時に取得した参照をそのまま保持する設計**に落ち着いています。

:::message
SW を意図的に再起動させたい場面（fixture 外でのアドホック操作など）では、以下のヘルパーが使えます。ただし storage accessor のような定常的な操作には不要です。

```typescript
async function getActiveWorker(context: BrowserContext): Promise<Worker | null> {
  const worker = context.serviceWorkers().find(w =>
    w.url().startsWith('chrome-extension://')
  ) ?? null
  if (worker) return worker
  return context.waitForEvent('serviceworker', { timeout: 10_000 }).catch(() => null)
}
```
:::

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

渡せるのは JSON シリアライズ可能な値のみです。関数、DOM ノード、クラスインスタンスは渡せません。

:::message alert
`page.evaluate()`、`page.waitForFunction()`、`worker.evaluate()` すべてに同じ制約があります。コールバックの中は Node.js とは別の世界だということを意識しておいてください。
:::

### 応用: 名前付き関数を渡すパターン

コールバックが長くなる場合、名前付き関数として切り出せます。ただし、その関数内で外部スコープを参照していないか注意が必要です。

```typescript
// ✅ 名前付き関数で切り出す（外部スコープに依存しないこと）
const isExtensionReady = () => {
  const root = document.querySelector('#my-extension')?.shadowRoot
  return root?.querySelector('.loaded') !== null
}

// そのまま page.evaluate や page.waitForFunction に渡せる
await page.waitForFunction(isExtensionReady, { timeout: 10_000 })
```

関数自体がシリアライズされてブラウザに送られるので動きます。ただし関数内で外側の変数を参照していると失敗するので注意してください。

## 4. `chrome.storage` にテストからアクセスする

拡張の多くは `chrome.storage` で設定やユーザーデータを永続化しています。E2E テストでは「事前に設定を注入 → テスト実行 → 結果を検証」というパターンが頻出します。

### 問題: `page.evaluate()` は拡張の world で動かない

テスト対象のページ（例: YouTube）で `page.evaluate(() => chrome.storage.local.get())` を呼んでも動きません。`page.evaluate()` はページ本体の **main world** で実行されるため、拡張の content script world とも Service Worker world とも異なるコンテキストになります。つまり `chrome.storage` などの拡張 API には一切アクセスできません。

### 設計: 起動時分岐（boot-time bifurcation）

`chrome.storage` にアクセスする手段は 2 つあり、**fixture 起動時にどちらを使うかを一度だけ決める**のがポイントです。

```
fixture 起動時
├─ SW が取得できた → Worker パス（以降 worker.evaluate() で操作）
└─ SW が取得できなかった → Page パス（操作のたびに拡張ページを一時的に開く）
```

**なぜ実行時にフォールバックしないか。** 筆者は当初「Worker を試す → 失敗 → popup にフォールバック」というランタイムチェーンを実装しました。しかし Page パスで popup.html を開くと、React アプリがマウントされ、Zustand persist ミドルウェアが storage を読み取り → マージしたデフォルト値を書き戻します。テストが事前にセットしたデータが上書きされ、2 件のテストが常に失敗する状態になりました。起動時に一度だけパスを決めれば、この問題は起きません。

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

### Page パス（SW が起動しなかった場合）

並列テスト実行時の負荷で SW 起動がタイムアウトするケースがあります。その場合は拡張ページ経由で操作します。

#### 推奨: テスト専用の storage bridge ページを用意する

popup.html を経由すると React/Vue がマウントされ、persist ミドルウェアが storage を上書きするリスクがあります。**React/Zustand を一切載せない最小ページ（`e2e.html`）** を用意するのが根本的な解決策です。

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

この方法なら rehydration の心配がなく、`about:blank` 遷移も不要です。拡張に 1 ファイル追加するだけで、Page パスの副作用が根本的に解消されます。

#### 従来パターン: popup.html 経由（e2e.html が用意できない場合）

e2e.html を追加できない事情がある場合は、popup.html 経由で操作し、**`about:blank` に遷移してから閉じる**ことで rehydration を遮断します。

```typescript
async function withExtensionPage<T>(
  context: BrowserContext,
  extensionId: string,
  pagePath: string,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const url = `chrome-extension://${extensionId}/${pagePath}`
  const page = await context.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const result = await fn(page)
    // rehydration 遮断: React アンマウントを強制する
    await page.goto('about:blank')
    return result
  } finally {
    await page.close()
  }
}
```

popup.html を開くと React（や Vue 等）がマウントされ、Zustand persist や Redux Persist が `chrome.storage` を読み取ってデフォルト値とマージした結果を書き戻します。`about:blank` に遷移すれば React がアンマウントされ、rehydration が走る前に JavaScript を停止できます。

### ファクトリ関数でまとめる

2 つのパスを起動時に分岐するファクトリ関数にまとめると、テストコードからはパスの違いを意識せずに使えます。

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
  // Worker パス: CDP が参照を keep alive するため直接使い続ける
  if (initialWorker) {
    return {
      get: (keys) => initialWorker.evaluate(
        (k) => chrome.storage.local.get(k), keys ?? null
      ),
      set: (items) => initialWorker.evaluate(
        (i) => chrome.storage.local.set(i), items
      ).then(() => {}),
      clear: () => initialWorker.evaluate(
        () => chrome.storage.local.clear()
      ).then(() => {}),
    }
  }

  // Page パス: e2e.html bridge（推奨）
  // React/Zustand なしの最小ページ → rehydration リスクなし
  const bridgeUrl = `chrome-extension://${extensionId}/e2e.html`
  const viaE2EPage = async <T>(fn: (page: Page) => Promise<T>): Promise<T> => {
    const page = await context.newPage()
    try {
      await page.goto(bridgeUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      return await fn(page)
    } finally {
      await page.close().catch(() => null)
    }
  }

  return {
    get: (keys) => viaE2EPage(p =>
      p.evaluate((k) => chrome.storage.local.get(k), keys ?? null)
    ),
    set: (items) => viaE2EPage(p =>
      p.evaluate((i) => chrome.storage.local.set(i), items).then(() => {})
    ),
    clear: () => viaE2EPage(p =>
      p.evaluate(() => chrome.storage.local.clear()).then(() => {})
    ),
  }
}
```

### 補足: 状態管理ライブラリの永続化フォーマット

Zustand + persist ミドルウェアを使っている場合、`chrome.storage` のデータは `{ state: {...}, version: N }` という JSON 文字列で保存されます。テストから直接パッチするなら、このフォーマットに合わせる必要があります。使っているライブラリの永続化フォーマットは事前に確認しておいてください。

## 5. Shadow DOM 内の要素を確実にクリックする

多くのブラウザ拡張は Shadow DOM を使って UI をホストページから隔離しています。Shadow DOM 内の要素に対する Playwright の操作は、通常の DOM と異なる挙動を示すことがあります。

### 前提: Playwright の locator は open Shadow DOM を貫通する

まず押さえておきたいのは、**Playwright の locator は open Shadow DOM をデフォルトで貫通する**ということです（[公式ドキュメント](https://playwright.dev/docs/locators)、XPath は例外）。つまり `page.locator('[data-testid="btn"]')` で Shadow DOM 内の要素を直接指定できます。`page.evaluate()` で `shadowRoot` を手動トラバースするのは、computed style の取得や複合条件の評価など locator では表現しにくい操作に限定してください。

### 問題: `click()` が効いたり効かなかったり

Shadow DOM 内のボタンに対して `locator.click()` を呼ぶと、以下の理由で失敗することがあります。

- ホストページの要素（モーダル、オーバーレイ、**GDPR 同意ダイアログ**）が上に被さっている
- Playwright の actionability check（要素が visible、enabled、stable であること）が通らない
- イベントが Shadow DOM の境界を越えて伝播しない

### 解決: 状態検証付きフォールバッククリック

Playwright のクリックを試し、期待状態に変わらなければ JavaScript で直接クリックするパターンです。

```typescript
import type { Locator } from '@playwright/test'

async function reliableClick(
  locator: Locator,
  verify: () => Promise<boolean>,
) {
  // Step 1: Playwright クリック（force で actionability check をスキップ）
  await locator.click({ force: true })

  // Step 2: 期待状態に変わったか確認
  if (await verify().catch(() => false)) return

  // Step 3: 効いていなければ JS クリックでフォールバック
  await locator.evaluate(el => (el as HTMLElement).click())
}

// 使い方
const toggle = page.locator('#my-ext').getByRole('switch')
await reliableClick(toggle, async () => {
  const value = await toggle.getAttribute('aria-pressed')
  return value === 'true'
})
```

ポイントは **「常に 2 回クリックする」のではなく「1 回目が効いたか検証してからフォールバックする」** 点です。

- **なぜ常に 2 回ではダメか** — トグル UI（スイッチボタンなど）では、1 回目が成功しているのに 2 回目で元に戻ってしまいます
- **`locator.evaluate()` を使う理由** — `document.querySelector()` は Shadow root の中を見られませんが、`locator.evaluate()` は Locator が指す要素を直接渡すので Shadow DOM 内でも確実に到達します
- **JS クリック（`el.click()`）の注意点** — `isTrusted: false` になるため、サイトやフレームワークによっては無視されることがあります。だからこそ Playwright クリックを優先し、JS クリックはフォールバックとして使います

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

`expect.poll()` は関数を繰り返し呼び出してアサーションが通るまで待ちます。`waitForSelector` は DOM の存在しかチェックできませんが、`expect.poll()` なら属性値や複合条件もチェックできます。

### テスタビリティのための `data-*` 属性

プロダクトコード側で `data-*` 属性を付けておくと、テストからの状態観測がかなり楽になります。

```html
<!-- プロダクトコード側 -->
<iframe data-ext-chat="true" data-ext-state="ready" src="..."></iframe>
```

```typescript
// テスト側: 属性の変化をポーリング
await expect.poll(async () => {
  return page.evaluate(() => {
    const root = document.querySelector('#my-ext')?.shadowRoot
    return root?.querySelector('[data-ext-state="ready"]') !== null
  })
}).toBe(true)
```

テスト用の `data-*` 属性は本番に残っても害がないので、気軽に追加できます。

## 6. 外部サービスに依存するテストを安定させる

ブラウザ拡張は特定のサイト上で動くものが多いです。そうなると、テスト対象のページが外部サービスの都合で変わってしまう問題が出てきます。

筆者の拡張は YouTube のライブ配信ページで動きます。実際に踏んだ問題を挙げます。

- **ライブ配信 URL が腐る** — テストに使っていたライブ配信が終了し、翌朝の CI が全滅した
- **アーカイブのチャットリプレイが無効化される** — 配信者がチャットリプレイを後から無効にし、「チャットが表示されること」のテストが壊れた
- **チャットなし動画をテストに使っていたら、後日ライブ配信された** — 「チャットが表示されないこと」を検証するテストなのに、チャットが存在するようになった

EC サイトの拡張なら商品ページの構造変更、SNS 拡張なら UI の A/B テストなど、同じ種類の問題は広く発生します。Web アプリの E2E では自分たちがサーバーを管理しているのでテストデータを安定させられますが、ブラウザ拡張は他人のサービス上で動く以上、この不安定さとは付き合い続ける必要があります。

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

実装は単純で、各フィールドに `process.env.YLC_ARCHIVE_URL?.trim() || DEFAULT_URL` のパターンを当てはめるだけです。ポイントは **テスト種別ごとに URL を分けている** ことです。「アーカイブのチャットリプレイ付き」「チャットリプレイなし」「チャットなし動画」「ライブ配信」はそれぞれ前提条件が異なるので、1 つの URL で賄えません。環境変数が未設定ならデフォルト URL にフォールバックし、ローカルでも CI でもそのまま動きます。

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

こうしておくと、テストレポート上で「前提条件の問題（skip）」と「拡張のバグ（fail）」が明確に区別できます。筆者の拡張では、ライブ配信テストの skip 率は月に数回程度で、skip が頻発したら URL やフォールバック戦略を見直すシグナルにしています。

### パターン 4: Cookie 事前注入で同意ダイアログを回避

外部サービスのテストで地味にハマるのが GDPR 同意ダイアログです。Cookie を事前注入して回避します。

```typescript
await page.context().addCookies([
  { name: 'CONSENT', value: 'YES+1', domain: '.youtube.com',
    path: '/', secure: true, sameSite: 'Lax' },
  { name: 'CONSENT', value: 'YES+1', domain: '.google.com',
    path: '/', secure: true, sameSite: 'Lax' },
])
```

YouTube の場合、`.google.com` にも CONSENT Cookie を設定しないとリダイレクトされることがあります。Cookie 注入だけでは回避できないケースに備えて、`page.addLocatorHandler()` で UI 上のボタンを自動クリックするフォールバックを用意しておくと安心です。

```typescript
// 共通 fixture で登録しておく
await page.addLocatorHandler(
  page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("同意する")'),
  async (btn) => {
    await btn.first().click()
  },
  { noWaitAfter: true }, // テストフローをブロックしない
)
```

[`addLocatorHandler()`](https://playwright.dev/docs/api/class-page#page-add-locator-handler) はページ上で指定した locator が出現したときに自動でハンドラを実行します。Cookie 注入と補完関係で併用すれば、地域やタイミングで Cookie が効かなかった場合のセーフティネットになります。

### 補足: ネットワーク応答を固定したい場合

Playwright の [`routeFromHAR()`](https://playwright.dev/docs/mock#recording-a-har-file) を使えば、過去に記録したネットワーク応答を再生してテストを安定させる手もあります。自チームで管理する API が相手なら有効ですが、YouTube のような大規模サービスでは HAR ファイルがすぐ陳腐化するため、筆者の環境では実用に至りませんでした。対象サービスの変化頻度に応じて検討してください。

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

### 使い方: 条件分岐で skip / fail を判定

```typescript
test('extension shows overlay', async ({ page }) => {
  await page.goto('https://example.com')

  const ready = await waitForExtensionReady(page, { timeout: 15_000 })
  if (!ready) {
    const state = await captureDiagnostics(page, test.info(), 'not-ready')

    // 診断結果を見て、外部要因ならスキップ
    if (!state?.extensionRoot) {
      test.skip(true, 'Extension root not injected — host page may have changed')
      return
    }
    // 拡張自体は注入されているのに動かない → 拡張のバグ
    expect(ready).toBe(true)
  }
})
```

Playwright の HTML レポートを開けば、失敗時に拡張がどんな状態だったかが JSON で残っています。スクリーンショットだけだと Shadow DOM の中身やフラグの状態はわからないので、地味に助かります。

### おすすめ: Playwright の組み込み診断を有効にする

`testInfo.attach()` による独自診断に加えて、Playwright の組み込み機能も有効にしておくと失敗時の調査が格段に楽になります。

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

特に **trace** は強力です。`npx playwright show-trace trace.zip` で Trace Viewer を開けば、失敗時のネットワークリクエスト、DOM スナップショット、コンソールログをステップごとに確認できます。ブラウザ拡張では「ホストページの問題か拡張の問題か」の切り分けが難しいので、タイムライン上で何が起きたかを追えるのは大きな助けになります。

## まとめ

ここまでの内容を表にまとめます。

| 問題 | 原因 | 解決パターン |
|------|------|-------------|
| 拡張がロードされない | `launch()` では拡張非対応 | `launchPersistentContext` + `--load-extension` + `ignoreDefaultArgs` |
| Extension ID が取れない | Service Worker が遅延起動 | ウォームアップ + ポーリング + CDP restart fallback + `chrome://extensions` フォールバック |
| `page.evaluate()` で `ReferenceError` | シリアライゼーション境界 | 第 2 引数で値を渡す |
| `chrome.storage` にアクセスできない | `page.evaluate()` は拡張の world 外 | 起動時分岐: Worker or e2e.html bridge 経由（runtime fallback は避ける） |
| Shadow DOM 内のクリックが効かない | actionability check / オーバーレイ遮蔽 | 状態検証付きフォールバック + `addLocatorHandler` で consent 自動処理 |
| テスト対象 URL が腐る | 外部サービスの状態変化 | 種別ごとの URL 管理 + 動的探索 + `test.skip()` |
| 失敗原因がわからない | ホストページ / 拡張の切り分け困難 | `testInfo.attach()` で診断 JSON 添付 |

ブラウザ拡張の E2E テストは、仕組みができるまでが大変です。ただ一度回り始めると、E2E でバグを先に見つけてプロダクトコードを直す、というサイクルが回り始めます。筆者の拡張でも、SPA 遷移時の iframe リークや MutationObserver の過剰発火を E2E テストが先に検出して、プロダクトコードの修正に繋がりました。

## 参考リンク

- [Playwright - Chrome Extensions](https://playwright.dev/docs/chrome-extensions) — 拡張ロードの公式ガイド（本記事のセクション 1 の出発点）
- [Playwright - Browsers](https://playwright.dev/docs/browsers) — `chrome-headless-shell` と New Headless の違い
- [Playwright - Evaluating JavaScript](https://playwright.dev/docs/evaluating) — `page.evaluate()` のシリアライゼーション仕様
- [Playwright - Service Workers](https://playwright.dev/docs/service-workers) — `context.serviceWorkers()` と `waitForEvent` の API リファレンス
- [Playwright - Locators](https://playwright.dev/docs/locators) — locator の Shadow DOM 貫通、`testIdAttribute` の設定
- [Playwright - `addLocatorHandler()`](https://playwright.dev/docs/api/class-page#page-add-locator-handler) — 予期せぬオーバーレイの自動処理
- [Playwright #39075](https://github.com/microsoft/playwright/issues/39075) — MV3 Service Worker を取り逃がす既知のレース
- [Chrome for Developers - Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) — MV3 の Service Worker ライフサイクル
- [Chrome for Developers - Manifest `"key"`](https://developer.chrome.com/docs/extensions/reference/manifest/key) — 開発時の拡張 ID 固定
- [WXT - Next-gen Web Extension Framework](https://wxt.dev/) — 本記事で使用している拡張開発フレームワーク
- [YouTube Live Chat Fullscreen - GitHub](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen) — 本記事のテストコードが含まれるリポジトリ（`e2e/` ディレクトリ）
- [Playwright の Chrome 拡張でハマったこと - Zenn](https://zenn.dev/st_little/articles/getting-stuck-with-playwright-chrome-extension) — headless モードや `--load-extension` 周りの実践的な知見
