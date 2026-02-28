# Browser APIs — Chrome Extension E2E

page.evaluate()、chrome.storage、Shadow DOM、iframe の操作パターン。テストコードを書く・修正するときに参照する。

---

## page.evaluate() のスコープ

コールバックはブラウザプロセスで実行される。Node.js の変数は参照できない。TypeScript はこのエラーを検出しない。

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

### よくある失敗

- **ReferenceError が出るが TypeScript は警告しない**: 引数で渡すか addInitScript を使う
- **ヘルパーのコピペで 500行超に膨張**: addInitScript に切り替える

---

## chrome.storage へのアクセス

```ts
// 方法1: Service Worker 経由（推奨）
const data = await worker.evaluate((k) => chrome.storage.local.get(k), keys)
await worker.evaluate((i) => chrome.storage.local.set(i), items)

// 方法2: 拡張ページ経由（SW が使えない場合）
const popup = await context.newPage()
await popup.goto(`chrome-extension://${extensionId}/popup.html`)
const data = await popup.evaluate((k) => chrome.storage.local.get(k), keys)
await popup.goto('about:blank') // rehydration 防止
await popup.close()
```

### クラスにまとめる場合

```ts
export class ExtensionStorage {
  constructor(private worker: Worker | null, private context: BrowserContext, private extId: string) {}

  async get(keys?: string | string[]) {
    return this.worker
      ? this.worker.evaluate((k) => chrome.storage.local.get(k), keys)
      : this.viaPage((k) => chrome.storage.local.get(k), keys)
  }

  async set(items: Record<string, unknown>) {
    return this.worker
      ? this.worker.evaluate((i) => chrome.storage.local.set(i), items)
      : this.viaPage((i) => chrome.storage.local.set(i), items)
  }

  private async viaPage<T>(fn: (...a: any[]) => T, ...args: any[]) {
    const p = await this.context.newPage()
    await p.goto(`chrome-extension://${this.extId}/popup.html`)
    const r = await p.evaluate(fn, ...args)
    await p.goto('about:blank')
    await p.close()
    return r as T
  }
}
```

### Persist ミドルウェアの地雷 (Redux Persist, Zustand persist 等)

1. **初回起動でキーが存在しない**: persist は `set()` 後にしか storage に書き込まない。persist フォーマット（例: `{ state: {...}, version: N }`）で直接書き込む
2. **拡張ページの rehydration**: popup を開くとデフォルト値で storage が上書きされる。操作後は即 `about:blank` に遷移する
3. **async write レース**: `setState()` 後に即 `window.close()` すると書き込みが中断される。`chrome.storage.local.set()` を直接 `await` してから close する

---

## Shadow DOM の操作

### クエリ

```ts
await page.evaluate(() => {
  const host = document.querySelector('#extension-root')
  return host?.shadowRoot?.querySelector('[data-testid="btn"]')
    ?.getAttribute('aria-pressed')
})
```

### 信頼性の高いクリック

ホストサイトの要素に遮蔽される場合、Playwright の `click()` が失敗する。二重パターンで対処:

```ts
async function reliableClick(locator: Locator, page: Page, selector: string) {
  await locator.click({ force: true })
  await page.evaluate((s) => (document.querySelector(s) as HTMLElement)?.click(), selector)
}
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

- **`locator.click()` がタイムアウト**: ホストサイトの要素が上に重なっている → `reliableClick` を使う
- **`frameLocator()` が cross-origin iframe で動かない**: `page.evaluate()` で DOM を直接操作する

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
