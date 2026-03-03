# Browser APIs — Chrome Extension E2E

page.evaluate()、chrome.storage、Shadow DOM、iframe の操作パターン。テストコードを書く・修正するときに参照する。

---

## page.evaluate() のスコープ

コールバックはブラウザプロセスで実行される。Node.js の変数は参照できない。TypeScript はこのエラーを検出しない。引数は基本 JSON シリアライズ可能な値のみだが、Playwright の Handle（`ElementHandle`/`JSHandle`）は例外的に渡せる。

```ts
// NG: 実行時に ReferenceError
const SEL = '#btn'
await page.evaluate(() => document.querySelector(SEL))

// OK: 引数で渡す
await page.evaluate((sel) => document.querySelector(sel), SEL)
```

### addInitScript で共通ヘルパーを注入する

テスト全体で使う DOM ユーティリティを `window` に注入。各 `page.evaluate()` でのコピペが不要になる。

```ts
export function registerHelpers(context: BrowserContext) {
  context.addInitScript(() => {
    ;(window as any).__e2e = {
      qs: (sel: string) => document.querySelector(sel),
      shadowQs: (host: string, inner: string) =>
        document.querySelector(host)?.shadowRoot?.querySelector(inner) ?? null,
      isVisible(el: Element | null): boolean {
        if (!el) return false
        const s = getComputedStyle(el)
        return s.display !== 'none' && s.visibility !== 'hidden'
      },
    }
  })
}

// fixture で1回呼ぶ → 全 spec から参照可能
await page.evaluate(() => window.__e2e.shadowQs('#host', '.target'))
```

### addInitScript ヘルパーの型定義

注入したヘルパーに `declare global` で型を付けると、`page.evaluate()` 内で補完が効く:

```ts
declare global {
  interface Window {
    __e2e?: {
      qs: (sel: string) => Element | null
      shadowQs: (host: string, inner: string) => Element | null
      isVisible: (el: Element | null) => boolean
    }
  }
}
```

### よくある失敗

- **ReferenceError が出るが TypeScript は警告しない**: 引数で渡すか addInitScript を使う
- **ヘルパーのコピペで 500行超に膨張**: addInitScript に切り替える

---

## chrome.storage へのアクセス

テストから `chrome.storage` を読み書きするには、拡張のコンテキスト（SW または拡張ページ）を経由する。

### 2 つのアクセスパス

```ts
// Worker パス: 高速、副作用なし
const data = await worker.evaluate((keys) => chrome.storage.local.get(keys), keys)
await worker.evaluate((items) => chrome.storage.local.set(items), items)

// Page パス（推奨: e2e.html bridge）
// React/Zustand を載せない最小ページ経由で操作する
const bridgePage = await context.newPage()
await bridgePage.goto(`chrome-extension://${extensionId}/e2e.html`)
const data = await bridgePage.evaluate((keys) => chrome.storage.local.get(keys), keys)
await bridgePage.close() // rehydration リスクがないため about:blank 不要
```

### ランタイムフォールバック（e2e.html 前提で推奨）

e2e.html は副作用ゼロなので、Worker → e2e.html のランタイムフォールバックが安全に使える。Worker が mid-test で死んでも自動復旧する。

```ts
type StorageAccessor = {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  clear(): Promise<void>
}

/**
 * Worker → e2e.html 自動フォールバック付きの storage アクセサを生成する。
 *
 * Worker が生きていれば worker.evaluate() で高速に操作し、
 * Worker が停止（Target closed 等）したら e2e.html 経由に自動切替する。
 * e2e.html は React/Zustand を載せない最小ページなので rehydration の副作用がない。
 * （popup.html 経由だと Zustand persist の rehydration でテストデータが上書きされる）
 */
function createStorageAccessor(
  context: BrowserContext, extensionId: string, initialWorker: Worker | null
): StorageAccessor {
  let worker = initialWorker
  const bridgeUrl = `chrome-extension://${extensionId}/e2e.html`

  const viaE2EPage = async <T>(operation: (page: Page) => Promise<T>): Promise<T> => {
    const page = await context.newPage()
    try {
      await page.goto(bridgeUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      return await operation(page)
    } finally {
      await page.close().catch(() => null)
    }
  }

  const isRecoverableWorkerError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error)
    return ['Target closed', 'Execution context was destroyed', 'Most likely the page has been closed']
      .some(token => message.includes(token))
  }

  // Worker を試し、回復可能エラーなら e2e.html にフォールバック。
  // 回復不能なエラー（引数ミス等）はそのまま throw する。
  const withFallback = async <T>(
    viaWorker: (w: Worker) => Promise<T>, viaPage: () => Promise<T>
  ): Promise<T> => {
    if (worker) {
      try { return await viaWorker(worker) }
      catch (error) {
        if (!isRecoverableWorkerError(error)) throw error
        // Worker が停止した — 以降のすべての呼び出しを e2e.html 経由に切り替える
        worker = null
      }
    }
    return viaPage()
  }

  return {
    get: (keys) => withFallback(
      w => w.evaluate((keys) => chrome.storage.local.get(keys), keys ?? null),
      () => viaE2EPage(page => page.evaluate((keys) => chrome.storage.local.get(keys), keys ?? null)),
    ),
    set: (items) => withFallback(
      w => w.evaluate((items) => chrome.storage.local.set(items), items).then(() => {}),
      () => viaE2EPage(page => page.evaluate((items) => chrome.storage.local.set(items), items).then(() => {})),
    ),
    clear: () => withFallback(
      w => w.evaluate(() => chrome.storage.local.clear()).then(() => {}),
      () => viaE2EPage(page => page.evaluate(() => chrome.storage.local.clear()).then(() => {})),
    ),
  }
}
```

**なぜ popup.html フォールバックは危険か**: popup.html を開くと React/Zustand がマウントされ、persist ミドルウェアが storage を読み取り → デフォルト値とマージして書き戻す。テストが事前にセットしたデータが上書きされる。

**e2e.html bridge パターン（推奨）**: popup.html の代わりに React/Zustand を一切載せない最小ページ（`e2e.html`）を `public/` に配置し、拡張ビルドに含める。このページ経由なら rehydration リスクがなく、ランタイムフォールバックも安全。

**起動時分岐（boot-time bifurcation）**: popup.html しか使えない場合の設計。起動時にパスを一度だけ決め、実行時フォールバックを持たない。e2e.html があるなら不要。

### Persist ミドルウェアの地雷 (Redux Persist, Zustand persist 等)

1. **初回起動でキーが存在しない**: persist は `set()` 後にしか storage に書き込まない。persist フォーマット（例: `{ state: {...}, version: N }`）で直接書き込む
2. **async write レース**: `setState()` 後に即 `window.close()` すると書き込みが中断される。`chrome.storage.local.set()` を直接 `await` してから close する

---

## Shadow DOM の操作

### Locator の Shadow DOM 貫通

**Playwright の locator は open Shadow DOM をデフォルトで貫通する**（XPath は例外）。`page.locator('[data-testid="btn"]')` で Shadow DOM 内の要素を直接指定できる。`page.evaluate()` で `shadowRoot` を手動トラバースするのは、computed style の取得や複合条件の評価など locator では表現しにくい操作に限定する。

```ts
// ✅ locator が Shadow DOM を貫通する
await page.locator('[data-testid="btn"]').click()

// evaluate が必要なケース: computed style の取得
await page.evaluate(() => {
  const host = document.querySelector('#extension-root')
  return host?.shadowRoot?.querySelector('[data-testid="btn"]')
    ?.getAttribute('aria-pressed')
})
```

### 予期せぬオーバーレイの自動処理

`page.addLocatorHandler()` で YouTube の同意ダイアログ等を自動処理する。Cookie 事前注入と補完関係で併用する。

```ts
await page.addLocatorHandler(
  page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("同意する")'),
  async (btn) => { await btn.first().click() },
  // 同意ダイアログは消える UI → デフォルト（消滅を待機）が安定
  // noWaitAfter: true は常時表示される要素をトリガーにする特殊ケース向け
)
```

### 信頼性の高いクリック（verify-then-escalate）

ホストサイトの要素に遮蔽される場合、Playwright の `click()` が失敗する。「常に二重クリック」はトグル UI で元に戻るリスクがあるため、**verify-then-escalate** パターンで対処。Stage 3（JS fallback）は `isTrusted:false` になるため opt-in:

```ts
type ReliableClickOptions = {
  /** JS fallback（Stage 3: dispatchEvent）を有効にする。デフォルト: false */
  allowJsFallback?: boolean
  /** Stage 1 の通常クリックのタイムアウト（ms）。デフォルト: 5000 */
  timeoutMs?: number
}

/**
 * 状態検証付きの段階的クリック。
 *
 * 1. Normal click — actionability checks が走り、addLocatorHandler が発火する
 * 2. Force click — actionability checks をスキップ（オーバーレイ遮蔽時）
 * 3. (opt-in) JS click via dispatchEvent — isTrusted:false の最終手段
 *
 * verify() が true を返すまで段階をエスカレートし、
 * 「常に force:true で 2 回クリック」してトグルが戻るアンチパターンを避ける。
 */
async function reliableClick(
  locator: Locator,
  verify: () => Promise<boolean>,
  options: ReliableClickOptions = {},
) {
  const { allowJsFallback = false, timeoutMs = 5_000 } = options

  // Stage 1: Normal click — actionability checks + addLocatorHandler active
  try { await locator.click({ timeout: timeoutMs }) } catch {}
  if (await verify().catch(() => false)) return

  // Stage 2: Force click — skip actionability checks
  try { await locator.click({ force: true }) } catch {}
  if (await verify().catch(() => false)) return

  // Stage 3（opt-in）: JS click via dispatchEvent — isTrusted:false
  if (!allowJsFallback) {
    throw new Error('reliableClick: normal/force click did not produce expected state')
  }
  await locator.dispatchEvent('click')
  if (!(await verify().catch(() => false))) {
    throw new Error('reliableClick: all 3 stages failed to produce expected state')
  }
}

// 通常の Shadow DOM ボタン: 2段階で十分
await reliableClick(btn, async () => (await btn.getAttribute('aria-pressed')) === 'true')

// フルスクリーン切替など堅牢性が必要な場面: JS fallback を許可
await reliableClick(btn, verify, { allowJsFallback: true })
```

### ポーリングアサーション

Shadow DOM 内の状態変化を待つ:

```ts
await expect.poll(
  () => page.evaluate(() =>
    document.querySelector('#host')
      ?.shadowRoot?.querySelector('[data-testid="status"]')?.textContent
  ),
  { timeout: 15_000 }
).toBe('ready')
```

### よくある失敗

- **`locator.click()` がタイムアウト**: ホストサイトの要素が上に重なっている → `reliableClick` (verify-then-fallback) を使う
- **トグルが2回反転する**: 常に二重クリックしている → verify で状態確認し、成功していればフォールバックしない
- **iframe 内の DOM を直接読み取りたい**（src 取得等）: `frameLocator()` は cross-origin でも locator 操作に使えるが、属性の直接読み取りには `page.evaluate()` を使う

---

## iframe の取り扱い

### cross-origin iframe

```ts
const src = await page.evaluate(() => {
  const iframe = document.querySelector('iframe#target')
  try {
    return iframe?.contentDocument?.location?.href ?? null
  } catch {
    return iframe?.getAttribute('src') ?? null // cross-origin fallback
  }
})
```

### スロットリング回避

Chrome は `display: none` の iframe を強くスロットルする。画面外に配置して描画ツリーに残す:

```css
.offscreen-iframe {
  visibility: hidden;
  position: fixed;
  top: -200vh;
  width: 400px; /* 0 にするとスロットル対象 */
  pointer-events: none;
}
```

### Stale iframe

SPA 遷移後に前のページの iframe が DOM に残ることがある。`src` を現在ページの識別子と照合して検出する。

---

## テスト診断 API

### page.consoleMessages() / page.pageErrors()（v1.56+）

直近 200 件のコンソールメッセージ・ページエラーを取得する。`page.on('console')` のリスナー登録が不要で、`afterEach` でオンデマンド収集する用途に最適:

```ts
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return

  const logs = await page.consoleMessages()
  const errors = await page.pageErrors()

  await testInfo.attach('console-logs', {
    body: logs.map(message => `[${message.type()}] ${message.text()}`).join('\n'),
    contentType: 'text/plain',
  })
  if (errors.length > 0) {
    await testInfo.attach('page-errors', {
      body: errors.map(pageError => String(pageError)).join('\n'),
      contentType: 'text/plain',
    })
  }
})
```

### worker.on('console')（v1.57+）

Service Worker のコンソールをキャプチャする。SW 側で例外が出ているのにページのコンソールは静かという状況が頻発するため重要:

```ts
const swLogs: string[] = []

// worker-scoped fixture 内で1回だけ呼ぶ
worker.on('console', (message) => {
  swLogs.push(`[${message.type()}] ${message.text()}`)
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
